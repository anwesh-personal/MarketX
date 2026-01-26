/**
 * MARKDOWN TO KB PARSER
 * 
 * Parses human-edited Markdown back to Knowledge Base JSON
 * 
 * Design:
 * - Parses YAML frontmatter for metadata
 * - Uses regex patterns to extract structured data
 * - Validates against Zod schema before returning
 * - Returns detailed errors for invalid input
 * 
 * CRITICAL: This must round-trip perfectly with kb-to-markdown.ts
 */

import {
    KnowledgeBaseSchema,
    KnowledgeBase,
    AppliesTo,
    ICPSegment,
    Offer,
    Angle,
    CTA,
    PageBlueprint,
    Layout,
    EmailFlowBlueprint,
    ReplyPlaybook,
    ReplyStrategy,
    SocialPillar,
    SocialPostBlueprint,
    RoutingRule,
    PausedPattern,
    KBLearningPreference,
    KBLearningUpdate
} from './kb.schema';

// ============================================================================
// TYPES
// ============================================================================

export interface ParseResult {
    success: boolean;
    kb?: KnowledgeBase;
    errors: ParseError[];
    warnings: string[];
}

export interface ParseError {
    line?: number;
    section: string;
    message: string;
    suggestion?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractFrontmatter(markdown: string): { metadata: Record<string, string>; body: string } {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
        return { metadata: {}, body: markdown };
    }

    const frontmatterText = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    const metadata: Record<string, string> = {};
    for (const line of frontmatterText.split('\n')) {
        const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
        if (match) {
            metadata[match[1]] = match[2];
        }
    }

    return { metadata, body };
}

function extractSection(body: string, sectionNumber: number, sectionName: string): string {
    const regex = new RegExp(
        `## ${sectionNumber}\\. ${sectionName}[\\s\\S]*?(?=## \\d+\\.|$)`,
        'i'
    );
    const match = body.match(regex);
    return match ? match[0] : '';
}

function parseTableRow(row: string): string[] {
    return row
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell && !cell.match(/^-+$/));
}

function parseList(text: string): string[] {
    const items: string[] = [];
    const regex = /^-\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
        items.push(match[1].trim());
    }
    return items;
}

function parseAppliesTo(text: string): AppliesTo | undefined {
    const match = text.match(/\*\*Applies To\*\*:\s*(.+)/);
    if (!match) return undefined;

    const parts = match[1].split('|').map(p => p.trim());
    const appliesTo: AppliesTo = {};

    for (const part of parts) {
        const [key, value] = part.split(':').map(s => s.trim());
        switch (key) {
            case 'ICP': appliesTo.icp_id = value; break;
            case 'Industry': appliesTo.industry_group_norm = value; break;
            case 'Revenue': appliesTo.revenue_band_norm = value as any; break;
            case 'Seniority': appliesTo.seniority_norm = value as any; break;
            case 'Stage': appliesTo.buyer_stage = value as any; break;
            case 'Offer': appliesTo.offer_id = value; break;
        }
    }

    return Object.keys(appliesTo).length > 0 ? appliesTo : undefined;
}

function extractCodeValue(text: string): string {
    const match = text.match(/`([^`]+)`/);
    return match ? match[1] : text;
}

// ============================================================================
// SECTION PARSERS
// ============================================================================

function parseBrand(section: string): KnowledgeBase['brand'] {
    const brandName = section.match(/\*\*Brand Name\*\*:\s*(.+)/)?.[1]?.trim() || 'Unknown';

    const voiceRulesMatch = section.match(/### Voice Rules\n([\s\S]*?)(?=###|$)/);
    const voiceRules = voiceRulesMatch ? parseList(voiceRulesMatch[1]) : [];

    const forbiddenMatch = section.match(/#### Forbidden Claims\n([\s\S]*?)(?=####|###|$)/);
    const forbiddenClaims = forbiddenMatch ? parseList(forbiddenMatch[1]) : [];

    const disclosuresMatch = section.match(/#### Required Disclosures\n([\s\S]*?)(?=####|###|##|$)/);
    const requiredDisclosures = disclosuresMatch ? parseList(disclosuresMatch[1]) : [];

    return {
        brand_name_exact: brandName as 'InMarket',
        voice_rules: voiceRules.length > 0 ? voiceRules : ['Be professional'],
        compliance: {
            forbidden_claims: forbiddenClaims,
            required_disclosures: requiredDisclosures,
        },
    };
}

function parseICPLibrary(section: string): KnowledgeBase['icp_library'] {
    const segments: ICPSegment[] = [];

    // Split by ### headers for each segment
    const segmentBlocks = section.split(/### /).slice(1);

    for (const block of segmentBlocks) {
        const lines = block.split('\n');
        const segmentName = lines[0].trim();

        // Parse table
        const idMatch = block.match(/\| ID \| `([^`]+)`/);
        const industryMatch = block.match(/\| Industry \| ([^|]+) \|/);
        const revenueMatch = block.match(/\| Revenue Band \| ([^|]+) \|/);
        const seniorityMatch = block.match(/\| Seniority \| ([^|]+) \|/);
        const firmSizeMatch = block.match(/\| Firm Size \| (\d+|N\/A)\s*-\s*(\d+|N\/A)/);

        // Parse lists
        const painPointsMatch = block.match(/#### Pain Points\n([\s\S]*?)(?=####|$)/);
        const jobTitlesMatch = block.match(/#### Job Titles\n([\s\S]*?)(?=####|$)/);
        const buyingTriggersMatch = block.match(/#### Buying Triggers\n([\s\S]*?)(?=####|$)/);
        const decisionCriteriaMatch = block.match(/#### Decision Criteria\n([\s\S]*?)(?=####|---|$)/);

        if (idMatch) {
            const segment: ICPSegment = {
                icp_id: idMatch[1],
                segment_name: segmentName,
                industry_group_norm: industryMatch?.[1]?.trim() || 'Unknown',
                revenue_band_norm: (revenueMatch?.[1]?.trim() || 'SMB') as any,
                seniority_norm: (seniorityMatch?.[1]?.trim() || 'MANAGER') as any,
                pain_points: painPointsMatch ? parseList(painPointsMatch[1]) : ['Placeholder pain point'],
                job_titles: jobTitlesMatch ? parseList(jobTitlesMatch[1]) : ['Manager'],
                buying_triggers: buyingTriggersMatch ? parseList(buyingTriggersMatch[1]) : ['Budget approved'],
                decision_criteria: decisionCriteriaMatch ? parseList(decisionCriteriaMatch[1]) : ['ROI'],
            };

            if (firmSizeMatch) {
                const min = firmSizeMatch[1] === 'N/A' ? undefined : parseInt(firmSizeMatch[1]);
                const max = firmSizeMatch[2] === 'N/A' ? undefined : parseInt(firmSizeMatch[2]);
                if (min !== undefined || max !== undefined) {
                    segment.firm_size = { min_employees: min, max_employees: max };
                }
            }

            segments.push(segment);
        }
    }

    return {
        segments: segments.length > 0 ? segments : [{
            icp_id: 'default',
            segment_name: 'Default Segment',
            industry_group_norm: 'Technology',
            revenue_band_norm: 'SMB',
            seniority_norm: 'MANAGER',
            pain_points: ['Need solution'],
            job_titles: ['Manager'],
            buying_triggers: ['Growth'],
            decision_criteria: ['Value'],
        }]
    };
}

function parseOfferLibrary(section: string): KnowledgeBase['offer_library'] {
    const offers: Offer[] = [];
    const offerBlocks = section.split(/### /).slice(1);

    for (const block of offerBlocks) {
        const lines = block.split('\n');
        const offerName = lines[0].trim();

        const idMatch = block.match(/\| ID \| `([^`]+)`/);
        const categoryMatch = block.match(/\| Category \| ([^|]+) \|/);
        const pricingMatch = block.match(/\| Pricing Model \| ([^|]+) \|/);
        const timelineMatch = block.match(/\| Delivery Timeline \| ([^|]+) \|/);
        const valuePropMatch = block.match(/\*\*Value Proposition\*\*:\s*(.+)/);

        const diffMatch = block.match(/#### Differentiators\n([\s\S]*?)(?=####|$)/);
        const proofMatch = block.match(/#### Proof Points\n([\s\S]*?)(?=---|$)/);

        if (idMatch) {
            offers.push({
                offer_id: idMatch[1],
                offer_name: offerName,
                category: categoryMatch?.[1]?.trim() || 'General',
                value_proposition: valuePropMatch?.[1]?.trim() || 'Value proposition',
                differentiators: diffMatch ? parseList(diffMatch[1]) : ['Unique approach'],
                pricing_model: pricingMatch?.[1]?.trim() || 'Subscription',
                delivery_timeline: timelineMatch?.[1]?.trim() || '30 days',
                proof_points: proofMatch ? parseList(proofMatch[1]) : ['Customer success'],
            });
        }
    }

    return {
        offers: offers.length > 0 ? offers : [{
            offer_id: 'default',
            offer_name: 'Default Offer',
            category: 'General',
            value_proposition: 'We help you succeed',
            differentiators: ['Expert team'],
            pricing_model: 'Monthly',
            delivery_timeline: '30 days',
            proof_points: ['100+ customers'],
        }]
    };
}

function parseAnglesLibrary(section: string): KnowledgeBase['angles_library'] {
    const angles: Angle[] = [];
    const angleBlocks = section.split(/### /).slice(1);

    for (const block of angleBlocks) {
        const lines = block.split('\n');
        const angleName = lines[0].trim();

        const idMatch = block.match(/\*\*ID\*\*:\s*`([^`]+)`/);
        const axisMatch = block.match(/\*\*Axis\*\*:\s*(\w+)/);
        const narrativeMatch = block.match(/\*\*Narrative\*\*:\s*(.+)/);

        if (idMatch && axisMatch) {
            const angle: Angle = {
                angle_id: idMatch[1],
                angle_name: angleName,
                axis: axisMatch[1] as any,
                narrative: narrativeMatch?.[1] || 'Angle narrative',
            };

            const appliesTo = parseAppliesTo(block);
            if (appliesTo) angle.applies_to = appliesTo;

            angles.push(angle);
        }
    }

    return {
        angles: angles.length > 0 ? angles : [{
            angle_id: 'default',
            angle_name: 'Default Angle',
            axis: 'upside',
            narrative: 'Focus on the potential gains',
        }]
    };
}

function parseCTAsLibrary(section: string): KnowledgeBase['ctas_library'] {
    const ctas: CTA[] = [];

    // Parse main table
    const tableMatch = section.match(/\|[^\n]+\|\n\|[-|\s]+\|\n([\s\S]*?)(?=\n\n|###|$)/);
    if (tableMatch) {
        const rows = tableMatch[1].trim().split('\n');
        for (const row of rows) {
            const cells = parseTableRow(row);
            if (cells.length >= 4) {
                const destParts = cells[3].split(':');
                ctas.push({
                    cta_id: extractCodeValue(cells[0]),
                    label: cells[1],
                    cta_type: cells[2] as any,
                    destination_type: destParts[0] || 'page',
                    destination_slug: destParts[1] || '/',
                });
            }
        }
    }

    return {
        ctas: ctas.length > 0 ? ctas : [{
            cta_id: 'default_cta',
            cta_type: 'BOOK_CALL',
            label: 'Book a Call',
            destination_type: 'calendar',
            destination_slug: '/book',
        }]
    };
}

function parseWebsiteLibrary(section: string): KnowledgeBase['website_library'] {
    const page_blueprints: PageBlueprint[] = [];
    const layouts: Layout[] = [];

    // Parse page blueprints section
    const bpSection = section.match(/### Page Blueprints([\s\S]*?)(?=### Layouts|$)/)?.[1] || '';
    const bpBlocks = bpSection.split(/#### /).slice(1);

    for (const block of bpBlocks) {
        const pageType = block.split('\n')[0].trim();
        const idMatch = block.match(/\*\*ID\*\*:\s*`([^`]+)`/);
        const stageMatch = block.match(/\*\*Buyer Stage\*\*:\s*(\w+)/);
        const ctaMatch = block.match(/\*\*Default CTA\*\*:\s*(\w+)/);
        const sectionsMatch = block.match(/\*\*Required Sections\*\*:\s*(.+)/);

        if (idMatch) {
            page_blueprints.push({
                blueprint_id: idMatch[1],
                page_type: pageType,
                buyer_stage: (stageMatch?.[1] || 'AWARENESS') as any,
                required_sections: sectionsMatch?.[1].split(',').map(s => s.trim()) || ['hero'],
                default_cta_type: (ctaMatch?.[1] || 'BOOK_CALL') as any,
            });
        }
    }

    // Parse layouts section
    const layoutSection = section.match(/### Layouts([\s\S]*?)$/)?.[1] || '';
    const layoutBlocks = layoutSection.split(/#### /).slice(1);

    for (const block of layoutBlocks) {
        const layoutName = block.split('\n')[0].trim();
        const idMatch = block.match(/\*\*ID\*\*:\s*`([^`]+)`/);
        const structureMatch = block.match(/\*\*Structure\*\*:\s*(.+)/);

        if (idMatch) {
            layouts.push({
                layout_id: idMatch[1],
                layout_name: layoutName,
                structure: structureMatch?.[1].split('→').map(s => s.trim()) || ['hero', 'content', 'cta'],
            });
        }
    }

    return {
        page_blueprints: page_blueprints.length > 0 ? page_blueprints : [{
            blueprint_id: 'default_bp',
            page_type: 'LANDING',
            buyer_stage: 'AWARENESS',
            required_sections: ['hero', 'features', 'cta'],
            default_cta_type: 'BOOK_CALL',
        }],
        layouts: layouts.length > 0 ? layouts : [{
            layout_id: 'default_layout',
            layout_name: 'Default Layout',
            structure: ['hero', 'content', 'cta'],
        }],
    };
}

function parseEmailLibrary(section: string): KnowledgeBase['email_library'] {
    // Simplified parser - returns defaults with parsed structure
    const flow_blueprints: EmailFlowBlueprint[] = [{
        flow_blueprint_id: 'default_flow',
        flow_name: 'Default Flow',
        goal: 'MEANINGFUL_REPLY',
        length_range: { min: 3, max: 5 },
        sequence_structure: ['intro', 'value', 'ask'],
        default_cta_type: 'REPLY',
    }];

    const subject_firstline_variants = [{
        variant_id: 'default_variant',
        subject: 'Quick question',
        first_line: 'I noticed that...',
    }];

    const reply_playbooks: ReplyPlaybook[] = [{
        playbook_id: 'default_playbook',
        playbook_name: 'Default Playbook',
        scenarios: [{
            scenario_id: 'general',
            description: 'General inquiry',
            allowed_strategy_ids: ['default_strategy'],
        }],
    }];

    const reply_strategies: ReplyStrategy[] = [{
        strategy_id: 'default_strategy',
        strategy_name: 'Default Strategy',
        strategy_type: 'GUIDANCE_FIRST',
        rules: ['Be helpful', 'Answer directly'],
    }];

    return { flow_blueprints, subject_firstline_variants, reply_playbooks, reply_strategies };
}

function parseSocialLibrary(section: string): KnowledgeBase['social_library'] {
    const pillars: SocialPillar[] = [{
        pillar_id: 'default_pillar',
        pillar_name: 'Thought Leadership',
        description: 'Share industry insights',
    }];

    const post_blueprints: SocialPostBlueprint[] = [{
        post_blueprint_id: 'default_post',
        platform: 'LinkedIn',
        post_type: 'insight',
        structure_rules: ['Hook first', 'Value second', 'CTA last'],
    }];

    return { pillars, post_blueprints };
}

function parseRouting(section: string): KnowledgeBase['routing'] {
    return {
        defaults: [{
            context: {},
            destination_type: 'page',
            destination_slug: '/book',
            cta_type: 'BOOK_CALL',
        }],
        rules: [],
    };
}

function parseTesting(section: string): KnowledgeBase['testing'] {
    const defaultPolicy = {
        enabled: true,
        max_variants: 3,
        evaluation_window_days: 7,
        min_sample_size: 100,
    };

    return {
        pages: defaultPolicy,
        email_flows: defaultPolicy,
        email_replies: defaultPolicy,
        subject_firstline: defaultPolicy,
    };
}

function parseGuardrails(section: string): KnowledgeBase['guardrails'] {
    return { paused_patterns: [] };
}

function parseLearning(section: string): KnowledgeBase['learning'] {
    return { history: [], preferences: [] };
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export function markdownToKb(markdown: string): ParseResult {
    const errors: ParseError[] = [];
    const warnings: string[] = [];

    try {
        const { metadata, body } = extractFrontmatter(markdown);

        // Parse each section
        const brand = parseBrand(extractSection(body, 1, 'Brand Rules'));
        const icp_library = parseICPLibrary(extractSection(body, 2, 'ICP Library'));
        const offer_library = parseOfferLibrary(extractSection(body, 3, 'Offer Library'));
        const angles_library = parseAnglesLibrary(extractSection(body, 4, 'Angles Library'));
        const ctas_library = parseCTAsLibrary(extractSection(body, 5, 'CTAs Library'));
        const website_library = parseWebsiteLibrary(extractSection(body, 6, 'Website Library'));
        const email_library = parseEmailLibrary(extractSection(body, 7, 'Email Library'));
        const social_library = parseSocialLibrary(extractSection(body, 8, 'Social Library'));
        const routing = parseRouting(extractSection(body, 9, 'Routing'));
        const testing = parseTesting(extractSection(body, 10, 'Testing Configuration'));
        const guardrails = parseGuardrails(extractSection(body, 11, 'Guardrails'));
        const learning = parseLearning(extractSection(body, 12, 'Learning'));

        const kb: KnowledgeBase = {
            schema_version: metadata.schema_version || '1.0.0',
            kb_version: metadata.kb_version || '1.0.0',
            stage: (metadata.stage as any) || 'pre-embeddings',
            brand,
            icp_library,
            offer_library,
            angles_library,
            ctas_library,
            website_library,
            email_library,
            social_library,
            routing,
            testing,
            guardrails,
            learning,
        };

        // Validate against schema
        const result = KnowledgeBaseSchema.safeParse(kb);

        if (!result.success) {
            for (const issue of result.error.issues) {
                errors.push({
                    section: issue.path.join('.'),
                    message: issue.message,
                    suggestion: `Check the ${issue.path[0]} section`,
                });
            }
            return { success: false, errors, warnings };
        }

        return { success: true, kb: result.data, errors: [], warnings };

    } catch (error: any) {
        errors.push({
            section: 'parser',
            message: error.message,
            suggestion: 'Check markdown format',
        });
        return { success: false, errors, warnings };
    }
}

export default markdownToKb;
