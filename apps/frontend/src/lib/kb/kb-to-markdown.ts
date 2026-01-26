/**
 * KB TO MARKDOWN CONVERTER
 * 
 * Converts Knowledge Base JSON to human-readable/editable Markdown
 * 
 * Design principles:
 * - Readable by humans who don't know JSON
 * - Preserves ALL data - no loss during round-trip
 * - Uses YAML frontmatter for metadata
 * - Uses headers, lists, and tables for structure
 * - Includes section anchors for navigation
 */

import {
    KnowledgeBase, ICPSegment, Offer, Angle, CTA, PageBlueprint, Layout,
    EmailFlowBlueprint, ReplyPlaybook, ReplyStrategy, SocialPillar, SocialPostBlueprint,
    RoutingRule, PausedPattern, KBLearningPreference, KBLearningUpdate, AppliesTo
} from './kb.schema';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatAppliesTo(appliesTo?: AppliesTo): string {
    if (!appliesTo) return '';

    const parts: string[] = [];
    if (appliesTo.icp_id) parts.push(`ICP: ${appliesTo.icp_id}`);
    if (appliesTo.industry_group_norm) parts.push(`Industry: ${appliesTo.industry_group_norm}`);
    if (appliesTo.revenue_band_norm) parts.push(`Revenue: ${appliesTo.revenue_band_norm}`);
    if (appliesTo.seniority_norm) parts.push(`Seniority: ${appliesTo.seniority_norm}`);
    if (appliesTo.buyer_stage) parts.push(`Stage: ${appliesTo.buyer_stage}`);
    if (appliesTo.offer_id) parts.push(`Offer: ${appliesTo.offer_id}`);

    return parts.length > 0 ? `> **Applies To**: ${parts.join(' | ')}` : '';
}

function arrayToList(arr: string[], indent = ''): string {
    return arr.map(item => `${indent}- ${item}`).join('\n');
}

function escapeMarkdown(text: string): string {
    // Escape special markdown characters in content
    return text.replace(/([*_`#\[\]])/g, '\\$1');
}

// ============================================================================
// SECTION CONVERTERS
// ============================================================================

function brandToMarkdown(brand: KnowledgeBase['brand']): string {
    return `## 1. Brand Rules

**Brand Name**: ${brand.brand_name_exact}

### Voice Rules
${arrayToList(brand.voice_rules)}

### Compliance

#### Forbidden Claims
${arrayToList(brand.compliance.forbidden_claims)}

#### Required Disclosures
${arrayToList(brand.compliance.required_disclosures)}
`;
}

function icpLibraryToMarkdown(library: KnowledgeBase['icp_library']): string {
    let md = `## 2. ICP Library\n\n`;

    for (const segment of library.segments) {
        md += `### ${segment.segment_name}\n\n`;
        md += `| Field | Value |\n`;
        md += `|-------|-------|\n`;
        md += `| ID | \`${segment.icp_id}\` |\n`;
        md += `| Industry | ${segment.industry_group_norm} |\n`;
        md += `| Revenue Band | ${segment.revenue_band_norm} |\n`;
        md += `| Seniority | ${segment.seniority_norm} |\n`;

        if (segment.firm_size) {
            const min = segment.firm_size.min_employees ?? 'N/A';
            const max = segment.firm_size.max_employees ?? 'N/A';
            md += `| Firm Size | ${min} - ${max} employees |\n`;
        }

        md += `\n#### Pain Points\n${arrayToList(segment.pain_points)}\n\n`;
        md += `#### Job Titles\n${arrayToList(segment.job_titles)}\n\n`;
        md += `#### Buying Triggers\n${arrayToList(segment.buying_triggers)}\n\n`;
        md += `#### Decision Criteria\n${arrayToList(segment.decision_criteria)}\n\n`;
        md += `---\n\n`;
    }

    return md;
}

function offerLibraryToMarkdown(library: KnowledgeBase['offer_library']): string {
    let md = `## 3. Offer Library\n\n`;

    for (const offer of library.offers) {
        md += `### ${offer.offer_name}\n\n`;
        md += `| Field | Value |\n`;
        md += `|-------|-------|\n`;
        md += `| ID | \`${offer.offer_id}\` |\n`;
        md += `| Category | ${offer.category} |\n`;
        md += `| Pricing Model | ${offer.pricing_model} |\n`;
        md += `| Delivery Timeline | ${offer.delivery_timeline} |\n\n`;

        md += `**Value Proposition**: ${offer.value_proposition}\n\n`;

        md += `#### Differentiators\n${arrayToList(offer.differentiators)}\n\n`;
        md += `#### Proof Points\n${arrayToList(offer.proof_points)}\n\n`;
        md += `---\n\n`;
    }

    return md;
}

function anglesLibraryToMarkdown(library: KnowledgeBase['angles_library']): string {
    let md = `## 4. Angles Library\n\n`;

    for (const angle of library.angles) {
        md += `### ${angle.angle_name}\n\n`;
        md += `- **ID**: \`${angle.angle_id}\`\n`;
        md += `- **Axis**: ${angle.axis}\n\n`;
        md += `**Narrative**: ${angle.narrative}\n\n`;

        const appliesTo = formatAppliesTo(angle.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;

        md += `---\n\n`;
    }

    return md;
}

function ctasLibraryToMarkdown(library: KnowledgeBase['ctas_library']): string {
    let md = `## 5. CTAs Library\n\n`;

    md += `| ID | Label | Type | Destination |\n`;
    md += `|----|-------|------|-------------|\n`;

    for (const cta of library.ctas) {
        md += `| \`${cta.cta_id}\` | ${cta.label} | ${cta.cta_type} | ${cta.destination_type}:${cta.destination_slug} |\n`;
    }

    md += `\n### CTA Details\n\n`;

    for (const cta of library.ctas) {
        const appliesTo = formatAppliesTo(cta.applies_to);
        if (appliesTo) {
            md += `#### ${cta.label} (\`${cta.cta_id}\`)\n`;
            md += `${appliesTo}\n\n`;
        }
    }

    return md;
}

function websiteLibraryToMarkdown(library: KnowledgeBase['website_library']): string {
    let md = `## 6. Website Library\n\n`;

    md += `### Page Blueprints\n\n`;

    for (const bp of library.page_blueprints) {
        md += `#### ${bp.page_type}\n\n`;
        md += `- **ID**: \`${bp.blueprint_id}\`\n`;
        md += `- **Buyer Stage**: ${bp.buyer_stage}\n`;
        md += `- **Default CTA**: ${bp.default_cta_type}\n`;

        if (bp.recommended_angle_axes) {
            md += `- **Recommended Angles**: ${bp.recommended_angle_axes.join(', ')}\n`;
        }

        md += `\n**Required Sections**: ${bp.required_sections.join(', ')}\n\n`;

        const appliesTo = formatAppliesTo(bp.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;

        md += `---\n\n`;
    }

    md += `### Layouts\n\n`;

    for (const layout of library.layouts) {
        md += `#### ${layout.layout_name}\n\n`;
        md += `- **ID**: \`${layout.layout_id}\`\n`;
        md += `- **Structure**: ${layout.structure.join(' → ')}\n\n`;

        const appliesTo = formatAppliesTo(layout.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;
    }

    return md;
}

function emailLibraryToMarkdown(library: KnowledgeBase['email_library']): string {
    let md = `## 7. Email Library\n\n`;

    md += `### Flow Blueprints\n\n`;

    for (const flow of library.flow_blueprints) {
        md += `#### ${flow.flow_name}\n\n`;
        md += `- **ID**: \`${flow.flow_blueprint_id}\`\n`;
        md += `- **Goal**: ${flow.goal}\n`;
        md += `- **Length**: ${flow.length_range.min}-${flow.length_range.max} emails\n`;
        md += `- **Default CTA**: ${flow.default_cta_type}\n`;
        md += `- **Sequence**: ${flow.sequence_structure.join(' → ')}\n`;

        if (flow.recommended_angle_axes) {
            md += `- **Recommended Angles**: ${flow.recommended_angle_axes.join(', ')}\n`;
        }

        const appliesTo = formatAppliesTo(flow.applies_to);
        if (appliesTo) md += `\n${appliesTo}\n`;

        md += `\n---\n\n`;
    }

    md += `### Subject/First Line Variants\n\n`;
    md += `| Variant ID | Subject | First Line |\n`;
    md += `|------------|---------|------------|\n`;

    for (const v of library.subject_firstline_variants) {
        md += `| \`${v.variant_id}\` | ${v.subject} | ${v.first_line} |\n`;
    }

    md += `\n### Reply Playbooks\n\n`;

    for (const pb of library.reply_playbooks) {
        md += `#### ${pb.playbook_name}\n\n`;
        md += `- **ID**: \`${pb.playbook_id}\`\n\n`;

        md += `**Scenarios**:\n`;
        for (const scenario of pb.scenarios) {
            md += `- **${scenario.scenario_id}**: ${scenario.description}\n`;
            md += `  - Allowed Strategies: ${scenario.allowed_strategy_ids.join(', ')}\n`;
        }

        const appliesTo = formatAppliesTo(pb.applies_to);
        if (appliesTo) md += `\n${appliesTo}\n`;

        md += `\n---\n\n`;
    }

    md += `### Reply Strategies\n\n`;

    for (const strat of library.reply_strategies) {
        md += `#### ${strat.strategy_name}\n\n`;
        md += `- **ID**: \`${strat.strategy_id}\`\n`;
        md += `- **Type**: ${strat.strategy_type}\n\n`;
        md += `**Rules**:\n${arrayToList(strat.rules)}\n\n`;

        const appliesTo = formatAppliesTo(strat.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;
    }

    return md;
}

function socialLibraryToMarkdown(library: KnowledgeBase['social_library']): string {
    let md = `## 8. Social Library\n\n`;

    md += `### Pillars\n\n`;

    for (const pillar of library.pillars) {
        md += `#### ${pillar.pillar_name}\n\n`;
        md += `- **ID**: \`${pillar.pillar_id}\`\n`;
        md += `- **Description**: ${pillar.description}\n\n`;

        const appliesTo = formatAppliesTo(pillar.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;
    }

    md += `### Post Blueprints\n\n`;
    md += `| ID | Platform | Type | Structure Rules |\n`;
    md += `|----|----------|------|----------------|\n`;

    for (const bp of library.post_blueprints) {
        md += `| \`${bp.post_blueprint_id}\` | ${bp.platform} | ${bp.post_type} | ${bp.structure_rules.length} rules |\n`;
    }

    md += `\n`;

    for (const bp of library.post_blueprints) {
        md += `#### ${bp.platform} - ${bp.post_type}\n\n`;
        md += `**Structure Rules**:\n${arrayToList(bp.structure_rules)}\n\n`;

        const appliesTo = formatAppliesTo(bp.applies_to);
        if (appliesTo) md += `${appliesTo}\n\n`;
    }

    return md;
}

function routingToMarkdown(routing: KnowledgeBase['routing']): string {
    let md = `## 9. Routing\n\n`;

    md += `### Defaults\n\n`;
    md += `| Context | Destination | CTA Type |\n`;
    md += `|---------|-------------|----------|\n`;

    for (const def of routing.defaults) {
        const context = Object.entries(def.context)
            .filter(([_, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ') || 'Any';
        md += `| ${context} | ${def.destination_type}:${def.destination_slug} | ${def.cta_type} |\n`;
    }

    md += `\n### Rules\n\n`;

    for (const rule of routing.rules) {
        md += `#### Rule: \`${rule.rule_id}\`\n\n`;

        const conditions: string[] = [];
        if (rule.if.entry_page_type) conditions.push(`Entry Page = ${rule.if.entry_page_type}`);
        if (rule.if.buyer_stage) conditions.push(`Buyer Stage = ${rule.if.buyer_stage}`);
        if (rule.if.icp_id) conditions.push(`ICP = ${rule.if.icp_id}`);

        md += `**IF**: ${conditions.join(' AND ')}\n`;
        md += `**THEN**: Go to \`${rule.then.next_destination_slug}\``;
        if (rule.then.preferred_cta_id) {
            md += ` (CTA: \`${rule.then.preferred_cta_id}\`)`;
        }
        md += `\n\n`;
    }

    return md;
}

function testingToMarkdown(testing: KnowledgeBase['testing']): string {
    let md = `## 10. Testing Configuration\n\n`;

    const formatPolicy = (name: string, policy: KnowledgeBase['testing']['pages']) => {
        return `| ${name} | ${policy.enabled ? '✅ Yes' : '❌ No'} | ${policy.max_variants} | ${policy.evaluation_window_days} days | ${policy.min_sample_size} |\n`;
    };

    md += `| Type | Enabled | Max Variants | Eval Window | Min Sample |\n`;
    md += `|------|---------|--------------|-------------|------------|\n`;
    md += formatPolicy('Pages', testing.pages);
    md += formatPolicy('Email Flows', testing.email_flows);
    md += formatPolicy('Email Replies', testing.email_replies);
    md += formatPolicy('Subject/First Line', testing.subject_firstline);

    if (testing.social_posts) {
        md += formatPolicy('Social Posts', testing.social_posts);
    }

    return md + '\n';
}

function guardrailsToMarkdown(guardrails: KnowledgeBase['guardrails']): string {
    let md = `## 11. Guardrails\n\n`;

    if (guardrails.paused_patterns.length === 0) {
        md += `*No patterns currently paused.*\n\n`;
        return md;
    }

    md += `### Paused Patterns\n\n`;
    md += `| Type | Pattern ID | Reason | Paused At |\n`;
    md += `|------|------------|--------|----------|\n`;

    for (const p of guardrails.paused_patterns) {
        md += `| ${p.pattern_type} | \`${p.pattern_id}\` | ${p.reason} | ${p.paused_at} |\n`;
    }

    return md + '\n';
}

function learningToMarkdown(learning: KnowledgeBase['learning']): string {
    let md = `## 12. Learning\n\n`;

    md += `### Update History\n\n`;

    if (learning.history.length === 0) {
        md += `*No updates recorded yet.*\n\n`;
    } else {
        for (const update of learning.history.slice(-10)) { // Last 10 updates
            md += `#### ${update.update_id}\n`;
            md += `- **Timestamp**: ${update.timestamp}\n`;
            md += `- **Source**: ${update.source}\n`;
            md += `- **Summary**: ${update.summary}\n\n`;
        }
    }

    md += `### Active Preferences\n\n`;

    if (learning.preferences.length === 0) {
        md += `*No active preferences.*\n\n`;
    } else {
        md += `| ID | Type | Preferred | Reason |\n`;
        md += `|----|------|-----------|--------|\n`;

        for (const pref of learning.preferences) {
            md += `| \`${pref.pref_id}\` | ${pref.preference_type} | ${pref.preferred_ids.join(', ')} | ${pref.reason} |\n`;
        }
    }

    return md + '\n';
}

// ============================================================================
// MAIN CONVERTER
// ============================================================================

export function kbToMarkdown(kb: KnowledgeBase): string {
    // YAML Frontmatter for metadata
    const frontmatter = `---
schema_version: "${kb.schema_version}"
kb_version: "${kb.kb_version}"
stage: "${kb.stage}"
---

`;

    const sections = [
        `# Knowledge Base: ${kb.kb_version}`,
        ``,
        `> Schema Version: ${kb.schema_version} | Stage: ${kb.stage}`,
        ``,
        `---`,
        ``,
        brandToMarkdown(kb.brand),
        icpLibraryToMarkdown(kb.icp_library),
        offerLibraryToMarkdown(kb.offer_library),
        anglesLibraryToMarkdown(kb.angles_library),
        ctasLibraryToMarkdown(kb.ctas_library),
        websiteLibraryToMarkdown(kb.website_library),
        emailLibraryToMarkdown(kb.email_library),
        socialLibraryToMarkdown(kb.social_library),
        routingToMarkdown(kb.routing),
        testingToMarkdown(kb.testing),
        guardrailsToMarkdown(kb.guardrails),
        learningToMarkdown(kb.learning),
    ];

    return frontmatter + sections.join('\n');
}

export default kbToMarkdown;
