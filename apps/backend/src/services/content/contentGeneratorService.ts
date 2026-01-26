/**
 * CONTENT GENERATOR SERVICE
 * 
 * Unified service for generating all content types:
 * - Website Pages / Bundles (uses writer.engine.ts)
 * - Email Flows
 * - Email Replies
 * - Social Posts
 * 
 * PRINCIPLES:
 * - Structure comes from KB (blueprints, layouts)
 * - LLM only for "creative glue" between structured elements
 * - Output always matches defined schemas
 * - Context (ICP, Offer, Angle) propagated throughout
 * 
 * SCHEMA REFERENCES:
 * - apps/backend/src/schemas/kb.schema.ts
 * - apps/backend/src/schemas/writer.output.ts
 * - apps/backend/src/schemas/nodes/index.ts
 */

import { v4 as uuidv4 } from 'uuid';
import {
    KnowledgeBase,
    ICPSegment,
    Offer,
    Angle,
    PageBlueprint,
    Layout,
    CTA,
    EmailFlowBlueprint,
    ReplyPlaybook,
    ReplyStrategy,
    SocialPostBlueprint,
    SocialPillar,
} from '../../schemas/kb.schema';
import {
    WebsiteBundle,
    PageOutput,
    ContentSection,
    CTAOutput
} from '../../schemas/writer.output';
import { aiService } from '../ai/aiService';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratorContext {
    kb: KnowledgeBase;
    icp: ICPSegment;
    offer?: Offer;
    angle: Angle;
    initialInput: Record<string, unknown>; // Original trigger input - never lost
}

export interface PageGeneratorInput extends GeneratorContext {
    blueprint: PageBlueprint;
    layout: Layout;
    cta: CTA;
}

export interface BundleGeneratorInput extends GeneratorContext {
    pageTypes: string[];
}

export interface EmailFlowGeneratorInput extends GeneratorContext {
    flowBlueprint: EmailFlowBlueprint;
    emailCount?: number;
}

export interface EmailReplyGeneratorInput {
    kb: KnowledgeBase;
    incomingEmail: {
        subject: string;
        body: string;
        sender: string;
        threadContext?: string[];
    };
    detectedScenario: string;
    playbook: ReplyPlaybook;
    strategy: ReplyStrategy;
    initialInput: Record<string, unknown>;
}

export interface SocialPostGeneratorInput extends GeneratorContext {
    platform: 'LinkedIn' | 'X' | 'YouTube';
    postBlueprint: SocialPostBlueprint;
    pillar?: SocialPillar;
}

// Output types
export interface EmailFlowBundle {
    type: 'email_flow_bundle';
    bundleId: string;
    generatedAt: string;
    flows: Array<{
        flowId: string;
        variantId: string;
        flowBlueprintId: string;
        goal: string;
        angleId: string;
        sequence: Array<{
            emailId: string;
            position: number;
            subjectVariantId: string;
            subject: string;
            firstLine: string;
            bodyMarkdown: string;
            cta: CTAOutput | null;
            delayFromPreviousHours: number;
        }>;
    }>;
}

export interface EmailReplyBundle {
    type: 'email_reply_bundle';
    bundleId: string;
    generatedAt: string;
    replies: Array<{
        replyId: string;
        variantId: string;
        scenarioId: string;
        strategyId: string;
        replyMarkdown: string;
        cta: CTAOutput | null;
    }>;
}

export interface SocialPostBundle {
    type: 'social_post_bundle';
    bundleId: string;
    generatedAt: string;
    posts: Array<{
        postId: string;
        variantId: string;
        platform: string;
        postType: string;
        pillarId: string | null;
        angleId: string;
        contentMarkdown: string;
        hashtags: string[];
        cta: CTAOutput | null;
    }>;
}

// ============================================================================
// CONTENT GENERATOR SERVICE
// ============================================================================

class ContentGeneratorService {

    // =========================================================================
    // WEBSITE PAGE GENERATION
    // Uses deterministic assembly from KB data
    // =========================================================================

    async generateWebsitePage(input: PageGeneratorInput): Promise<PageOutput> {
        const { kb, icp, offer, angle, blueprint, layout, cta } = input;
        const generatedAt = new Date().toISOString();

        // Build content sections based on layout structure
        const contentSections: ContentSection[] = [];

        for (const sectionType of layout.structure) {
            const content = await this.buildSectionContent(sectionType, {
                icp,
                offer,
                angle,
                kb,
            });

            contentSections.push({
                section_id: sectionType, // Use section type as ID per schema
                content_markdown: content,
            });
        }

        // Build CTA output
        const primaryCta: CTAOutput = {
            cta_id: cta.cta_id,
            cta_type: cta.cta_type,
            label: cta.label,
            destination_type: cta.destination_type,
            destination_slug: cta.destination_slug,
        };

        return {
            page_id: uuidv4(),
            variant_id: `v1_${uuidv4().slice(0, 8)}`,
            slug: this.generateSlug(blueprint.page_type, icp),
            page_type: blueprint.page_type,
            buyer_stage: blueprint.buyer_stage,
            blueprint_id: blueprint.blueprint_id,
            layout_id: layout.layout_id,
            angle_id: angle.angle_id,
            content_sections: contentSections,
            primary_cta: primaryCta,
            supporting_ctas: [],
            routing_suggestions: this.buildRoutingSuggestions(blueprint, kb),
            generated_at: generatedAt,
        };
    }

    // =========================================================================
    // WEBSITE BUNDLE GENERATION
    // Generates multiple pages with consistent routing
    // =========================================================================

    async generateWebsiteBundle(input: BundleGeneratorInput): Promise<WebsiteBundle> {
        const { kb, icp, offer, angle, pageTypes, initialInput } = input;
        const generatedAt = new Date().toISOString();
        const bundleId = uuidv4();

        const pages: PageOutput[] = [];
        const routingMap: Array<{
            from_slug: string;
            to_slug: string;
            via_cta_id: string;
            context?: string;
        }> = [];

        for (let i = 0; i < pageTypes.length; i++) {
            const pageType = pageTypes[i];

            // Select blueprint and layout for this page type
            const blueprint = this.selectBlueprintForType(pageType, kb);
            const layout = this.selectLayoutForBlueprint(blueprint, kb);
            const cta = this.selectCTAForPage(blueprint, kb);

            const page = await this.generateWebsitePage({
                kb,
                icp,
                offer,
                angle,
                blueprint,
                layout,
                cta,
                initialInput,
            });

            pages.push(page);

            // Build routing from previous page
            if (i > 0) {
                const prevPage = pages[i - 1];
                routingMap.push({
                    from_slug: prevPage.slug,
                    to_slug: page.slug,
                    via_cta_id: prevPage.primary_cta.cta_id,
                    context: `From ${prevPage.page_type} to ${page.page_type}`,
                });
            }
        }

        // Validate buyer_stage type
        const validStages = ['AWARENESS', 'CONSIDERATION', 'EVALUATION', 'RISK_RESOLUTION', 'READY'] as const;
        type BuyerStage = typeof validStages[number];
        const buyerStage: BuyerStage = validStages.includes(initialInput.buyer_stage as BuyerStage)
            ? (initialInput.buyer_stage as BuyerStage)
            : 'AWARENESS';

        return {
            type: 'website_bundle',
            bundle_id: bundleId,
            run_id: uuidv4(),
            generated_at: generatedAt,
            icp_id: icp.icp_id,
            offer_id: offer?.offer_id || 'default',
            buyer_stage: buyerStage,
            pages,
            routing_map: routingMap.length > 0 ? routingMap : undefined,
        };
    }

    // =========================================================================
    // EMAIL FLOW GENERATION
    // Creates nurture sequences with proper story arc
    // =========================================================================

    async generateEmailFlow(input: EmailFlowGeneratorInput): Promise<EmailFlowBundle> {
        const { kb, icp, offer, angle, flowBlueprint, emailCount, initialInput } = input;
        const generatedAt = new Date().toISOString();

        // Determine email count
        const count = emailCount || flowBlueprint.length_range.min || 5;

        // Build email sequence
        const sequence = await this.buildEmailSequence(count, {
            icp,
            offer,
            angle,
            flowBlueprint,
            kb,
        });

        return {
            type: 'email_flow_bundle',
            bundleId: uuidv4(),
            generatedAt,
            flows: [{
                flowId: uuidv4(),
                variantId: `v1_${uuidv4().slice(0, 8)}`,
                flowBlueprintId: flowBlueprint.flow_blueprint_id,
                goal: flowBlueprint.goal,
                angleId: angle.angle_id,
                sequence,
            }],
        };
    }

    // =========================================================================
    // EMAIL REPLY GENERATION
    // Context-aware replies using scenario/strategy matching
    // =========================================================================

    async generateEmailReply(input: EmailReplyGeneratorInput): Promise<EmailReplyBundle> {
        const { kb, incomingEmail, detectedScenario, playbook, strategy, initialInput } = input;
        const generatedAt = new Date().toISOString();

        // Build reply using strategy rules
        const replyMarkdown = await this.buildReplyContent(incomingEmail, strategy, kb);

        // Determine CTA based on strategy type
        const cta = this.selectCTAForReply(strategy, kb);

        return {
            type: 'email_reply_bundle',
            bundleId: uuidv4(),
            generatedAt,
            replies: [{
                replyId: uuidv4(),
                variantId: `v1_${uuidv4().slice(0, 8)}`,
                scenarioId: detectedScenario,
                strategyId: strategy.strategy_id,
                replyMarkdown,
                cta,
            }],
        };
    }

    // =========================================================================
    // SOCIAL POST GENERATION
    // Platform-specific content with proper constraints
    // =========================================================================

    async generateSocialPost(input: SocialPostGeneratorInput): Promise<SocialPostBundle> {
        const { kb, icp, offer, angle, platform, postBlueprint, pillar, initialInput } = input;
        const generatedAt = new Date().toISOString();

        // Build post content using constraints
        const contentMarkdown = await this.buildSocialContent(
            platform,
            postBlueprint,
            pillar,
            { icp, offer, angle, kb }
        );

        // Generate hashtags
        const hashtags = this.generateHashtags(platform, postBlueprint, pillar);

        return {
            type: 'social_post_bundle',
            bundleId: uuidv4(),
            generatedAt,
            posts: [{
                postId: uuidv4(),
                variantId: `v1_${uuidv4().slice(0, 8)}`,
                platform,
                postType: postBlueprint.post_type,
                pillarId: pillar?.pillar_id || null,
                angleId: angle.angle_id,
                contentMarkdown,
                hashtags,
                cta: null, // Social posts often don't have explicit CTAs
            }],
        };
    }

    // =========================================================================
    // SECTION BUILDERS - Deterministic content from KB
    // =========================================================================

    private async buildSectionContent(
        sectionType: string,
        context: { icp: ICPSegment; offer?: Offer; angle: Angle; kb: KnowledgeBase }
    ): Promise<string> {
        const { icp, offer, angle, kb } = context;

        switch (sectionType.toLowerCase()) {
            case 'hero':
                return this.buildHeroSection(icp, offer, angle, kb);
            case 'features':
                return this.buildFeaturesSection(offer, kb);
            case 'proof':
            case 'testimonials':
                return this.buildProofSection(offer, kb);
            case 'cta':
                return this.buildCTASection(offer, kb);
            case 'pain_points':
            case 'problem':
                return this.buildPainPointsSection(icp, kb);
            case 'solution':
                return this.buildSolutionSection(offer, kb);
            case 'pricing':
                return this.buildPricingSection(offer, kb);
            case 'faq':
                return this.buildFAQSection(offer, kb);
            default:
                return this.buildGenericSection(sectionType, offer, kb);
        }
    }

    private buildHeroSection(
        icp: ICPSegment,
        offer: Offer | undefined,
        angle: Angle,
        kb: KnowledgeBase
    ): string {
        const headline = offer?.value_proposition || `Solution for ${icp.segment_name}`;
        const subheadline = icp.pain_points[0] || '';

        return `# ${headline}

${angle.narrative}

**${subheadline}**

[Get Started →](#cta)
`;
    }

    private buildFeaturesSection(offer: Offer | undefined, kb: KnowledgeBase): string {
        if (!offer) return '## Features\n\nContact us to learn about our key differentiators.';

        const features = offer.differentiators.slice(0, 4);
        return `## Why ${kb.brand.brand_name_exact}?

${features.map(f => `- ✓ ${f}`).join('\n')}
`;
    }

    private buildProofSection(offer: Offer | undefined, kb: KnowledgeBase): string {
        if (!offer) return '## Results\n\nOur clients consistently see measurable improvements.';

        const proofs = offer.proof_points.slice(0, 3);
        return `## Results That Speak

${proofs.map(p => `> "${p}"`).join('\n\n')}
`;
    }

    private buildCTASection(offer: Offer | undefined, kb: KnowledgeBase): string {
        return `## Ready to Get Started?

Take the first step toward better results.

[Schedule a Call →](#book) | [Learn More](#learn)
`;
    }

    private buildPainPointsSection(icp: ICPSegment, kb: KnowledgeBase): string {
        const painPoints = icp.pain_points.slice(0, 4);
        return `## Sound Familiar?

${painPoints.map(p => `- ${p}`).join('\n')}

You're not alone. And there's a better way.
`;
    }

    private buildSolutionSection(offer: Offer | undefined, kb: KnowledgeBase): string {
        if (!offer) return '## Our Solution\n\nWe provide tailored solutions for your specific needs.';

        return `## The Solution

${offer.value_proposition}

**How It Works:**
${offer.differentiators.slice(0, 3).map((d, i) => `${i + 1}. ${d}`).join('\n')}
`;
    }

    private buildPricingSection(offer: Offer | undefined, kb: KnowledgeBase): string {
        if (!offer) return '## Pricing\n\nContact us for pricing.';

        return `## Investment

**Pricing Model:** ${offer.pricing_model}
**Timeline:** ${offer.delivery_timeline}

[Get a Custom Quote →](#pricing)
`;
    }

    private buildFAQSection(offer: Offer | undefined, kb: KnowledgeBase): string {
        return `## Frequently Asked Questions

**Q: How does ${kb.brand.brand_name_exact} work?**
A: We combine ${offer?.differentiators[0] || 'best practices'} with proven methodologies.

**Q: How long until I see results?**
A: ${offer?.delivery_timeline || 'Most clients see results within 30 days.'}
`;
    }

    private buildGenericSection(sectionType: string, offer: Offer | undefined, kb: KnowledgeBase): string {
        return `## ${sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

Content for ${sectionType} section.
`;
    }

    // =========================================================================
    // EMAIL SEQUENCE BUILDER
    // =========================================================================

    private async buildEmailSequence(
        count: number,
        context: {
            icp: ICPSegment;
            offer?: Offer;
            angle: Angle;
            flowBlueprint: EmailFlowBlueprint;
            kb: KnowledgeBase;
        }
    ): Promise<EmailFlowBundle['flows'][0]['sequence']> {
        const { icp, offer, angle, flowBlueprint, kb } = context;
        const sequence: EmailFlowBundle['flows'][0]['sequence'] = [];

        // Email positions and their purposes (Soap Opera style)
        const emailPurposes = [
            { purpose: 'intro', delay: 0 },
            { purpose: 'value', delay: 48 },
            { purpose: 'proof', delay: 72 },
            { purpose: 'objection', delay: 48 },
            { purpose: 'ask', delay: 24 },
        ];

        for (let i = 0; i < count; i++) {
            const position = i + 1;
            const emailPurpose = emailPurposes[i % emailPurposes.length];

            // Build subject line
            const subject = this.buildSubjectLine(position, emailPurpose.purpose, icp, offer);

            // Build first line
            const firstLine = this.buildFirstLine(position, emailPurpose.purpose, icp);

            // Build body
            const bodyMarkdown = await this.buildEmailBody(
                position,
                emailPurpose.purpose,
                { icp, offer, angle, kb }
            );

            // CTA increases in intensity as sequence progresses
            const cta = position >= count - 1
                ? this.buildEmailCTA(flowBlueprint.goal, kb)
                : null;

            sequence.push({
                emailId: uuidv4(),
                position,
                subjectVariantId: `subj_v1_${position}`,
                subject,
                firstLine,
                bodyMarkdown,
                cta,
                delayFromPreviousHours: emailPurpose.delay,
            });
        }

        return sequence;
    }

    private buildSubjectLine(
        position: number,
        purpose: string,
        icp: ICPSegment,
        offer?: Offer
    ): string {
        const templates: Record<string, string[]> = {
            intro: [
                `Quick question about ${icp.industry_group_norm}...`,
                `${icp.segment_name} — noticed something`,
            ],
            value: [
                `The ${icp.pain_points[0]?.split(' ').slice(0, 3).join(' ')} fix`,
                `How we solved ${icp.pain_points[0]?.split(' ').slice(0, 4).join(' ')}`,
            ],
            proof: [
                `[Case Study] ${offer?.proof_points[0]?.slice(0, 40) || 'Results'}...`,
                `What our clients are saying`,
            ],
            objection: [
                `Re: Your concerns`,
                `FAQ: ${icp.decision_criteria[0] || 'Common questions'}`,
            ],
            ask: [
                `Next step?`,
                `15 mins this week?`,
            ],
        };

        const options = templates[purpose] || templates.intro;
        return options[position % options.length];
    }

    private buildFirstLine(position: number, purpose: string, icp: ICPSegment): string {
        const templates: Record<string, string> = {
            intro: `I've been researching ${icp.industry_group_norm} companies and noticed something interesting...`,
            value: `Most ${icp.job_titles[0] || 'leaders'} I talk to share a common frustration:`,
            proof: `I wanted to share a quick story from a ${icp.industry_group_norm} client...`,
            objection: `Before we go further, let me address something that often comes up:`,
            ask: `I'll keep this brief:`,
        };

        return templates[purpose] || templates.intro;
    }

    private async buildEmailBody(
        position: number,
        purpose: string,
        context: { icp: ICPSegment; offer?: Offer; angle: Angle; kb: KnowledgeBase }
    ): Promise<string> {
        const { icp, offer, angle, kb } = context;

        // Deterministic templates based on KB data
        // LLM integration available via aiService when creative variation needed
        const bodies: Record<string, string> = {
            intro: `${angle.narrative}

What we've found is that ${icp.pain_points[0] || 'this challenge'} isn't inevitable.

${kb.brand.brand_name_exact} helps ${icp.segment_name} like you address this head-on.

More on that tomorrow.

Best,
[Your Name]`,
            value: `Here's the thing about ${icp.pain_points[0] || 'your situation'}:

${offer?.value_proposition || 'There is a better way.'}

Key differentiators:
${offer?.differentiators.slice(0, 3).map(d => `• ${d}`).join('\n') || '• Proven approach'}

I'd love to share how this applies to your specific case.

[Your Name]`,
            proof: `Quick story:

${offer?.proof_points[0] || 'A client in your industry saw significant results.'}

${offer?.proof_points[1] || 'This is becoming the norm for our clients.'}

Want to see how this could work for you?

[Your Name]`,
            objection: `A common question I get:

"${icp.decision_criteria[0] || 'How do I know this will work for us?'}"

Here's my honest answer:

${offer?.differentiators[0] || 'We have a proven track record.'} We stand behind our work.

Would you like to see some examples?

[Your Name]`,
            ask: `${icp.job_titles[0] || 'Leader'} at ${icp.industry_group_norm} company,

I've shared a few emails about how ${kb.brand.brand_name_exact} helps with ${icp.pain_points[0] || 'your challenge'}.

If any of this resonated, I'd love 15 minutes to discuss your specific situation.

When works best this week?

[Your Name]`,
        };

        return bodies[purpose] || bodies.intro;
    }

    private buildEmailCTA(goal: string, kb: KnowledgeBase): CTAOutput {
        const ctaMap: Record<string, CTAOutput> = {
            MEANINGFUL_REPLY: {
                cta_id: 'cta_reply',
                cta_type: 'REPLY',
                label: 'Just hit reply',
                destination_type: 'email',
                destination_slug: '/reply',
            },
            CLICK: {
                cta_id: 'cta_click',
                cta_type: 'CLICK',
                label: 'Learn More',
                destination_type: 'page',
                destination_slug: '/learn-more',
            },
            BOOK_CALL: {
                cta_id: 'cta_book',
                cta_type: 'BOOK_CALL',
                label: 'Book a Call',
                destination_type: 'calendar',
                destination_slug: '/book',
            },
        };

        return ctaMap[goal] || ctaMap.MEANINGFUL_REPLY;
    }

    // =========================================================================
    // REPLY BUILDER
    // =========================================================================

    private async buildReplyContent(
        incomingEmail: EmailReplyGeneratorInput['incomingEmail'],
        strategy: ReplyStrategy,
        kb: KnowledgeBase
    ): Promise<string> {
        // Apply strategy rules
        const strategyActions: Record<string, () => string> = {
            CLARIFYING_QUESTION_FIRST: () => `Thanks for reaching out!

Before I dive in with specifics, I'd love to understand more about your situation:

- What's your biggest challenge right now?
- What have you tried so far?
- What would success look like for you?

Once I understand your context better, I can give you a much more targeted answer.

Best,
[Your Name]`,

            GUIDANCE_FIRST: () => `Great question!

Here's what I typically recommend:

${strategy.rules.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}

If you'd like to dive deeper into any of these, I'm happy to jump on a quick call.

Best,
[Your Name]`,

            PAGE_FIRST: () => `Thanks for asking!

I put together a detailed page that covers exactly this:
[Link to resource]

After you've reviewed it, let me know if you have any follow-up questions.

Best,
[Your Name]`,

            CALENDAR_FIRST: () => `Thanks for reaching out!

This is actually something that's best discussed live — there are a lot of variables specific to your situation.

Would you be open to a 15-minute call this week? Here's my calendar: [Link]

Looking forward to connecting!

Best,
[Your Name]`,

            TWO_STEP_ESCALATION: () => `Thanks for your email!

Quick question: Is this a priority you're actively working on right now, or more of a future consideration?

That'll help me know how best to help.

Best,
[Your Name]`,
        };

        const builder = strategyActions[strategy.strategy_type];
        return builder ? builder() : strategyActions.GUIDANCE_FIRST();
    }

    private selectCTAForReply(strategy: ReplyStrategy, kb: KnowledgeBase): CTAOutput | null {
        if (strategy.strategy_type === 'CALENDAR_FIRST' || strategy.strategy_type === 'PAGE_FIRST') {
            return {
                cta_id: 'cta_reply_action',
                cta_type: strategy.strategy_type === 'CALENDAR_FIRST' ? 'BOOK_CALL' : 'CLICK',
                label: strategy.strategy_type === 'CALENDAR_FIRST' ? 'Book a Call' : 'View Resource',
                destination_type: strategy.strategy_type === 'CALENDAR_FIRST' ? 'calendar' : 'page',
                destination_slug: strategy.strategy_type === 'CALENDAR_FIRST' ? '/book' : '/resource',
            };
        }
        return null;
    }

    // =========================================================================
    // SOCIAL CONTENT BUILDER
    // =========================================================================

    private async buildSocialContent(
        platform: 'LinkedIn' | 'X' | 'YouTube',
        postBlueprint: SocialPostBlueprint,
        pillar: SocialPillar | undefined,
        context: { icp: ICPSegment; offer?: Offer; angle: Angle; kb: KnowledgeBase }
    ): Promise<string> {
        const { icp, offer, angle, kb } = context;

        // Platform constraints
        const constraints: Record<string, { maxLength: number; style: string }> = {
            LinkedIn: { maxLength: 3000, style: 'professional, thoughtful' },
            X: { maxLength: 280, style: 'punchy, direct' },
            YouTube: { maxLength: 5000, style: 'descriptive, engagement-focused' },
        };

        const constraint = constraints[platform];

        // Build post based on post_type
        const postBuilders: Record<string, () => string> = {
            insight: () => `${angle.narrative.split('.')[0]}.

Here's what I've learned working with ${icp.industry_group_norm} companies:

${icp.pain_points[0]}

The fix? ${offer?.differentiators[0] || 'A better approach.'}

What's your experience been?`,

            narrative: () => `Story time 🧵

A ${icp.segment_name} client came to us with a challenge:
"${icp.pain_points[0]}"

What we discovered surprised us all.

${offer?.proof_points[0] || 'The results spoke for themselves.'}

The lesson? Sometimes the best solution is the simplest one.`,

            comparison: () => `Before ${kb.brand.brand_name_exact}:
❌ ${icp.pain_points[0]}
❌ ${icp.pain_points[1] || 'Inconsistent results'}

After ${kb.brand.brand_name_exact}:
✅ ${offer?.differentiators[0] || 'Better outcomes'}
✅ ${offer?.differentiators[1] || 'Sustainable growth'}

The difference? ${angle.axis === 'control' ? 'Control.' : angle.axis === 'speed' ? 'Speed.' : 'Results.'}`,

            proof: () => `Result alert 🚀

${offer?.proof_points[0] || 'Major milestone achieved.'}

How?
1. ${offer?.differentiators[0] || 'Step one'}
2. ${offer?.differentiators[1] || 'Step two'}
3. Consistent execution

Want to see how this applies to ${icp.industry_group_norm}? Link in comments.`,

            objection: () => `"${icp.decision_criteria[0] || 'This probably won\'t work for us.'}"

I hear this a lot from ${icp.segment_name}s.

Here's the truth: ${angle.narrative.slice(0, 150)}...

The question isn't whether it works. It's whether you're ready to try something different.

Thoughts?`,
        };

        const builder = postBuilders[postBlueprint.post_type] || postBuilders.insight;
        let content = builder();

        // Truncate for X if needed
        if (platform === 'X' && content.length > constraint.maxLength) {
            content = content.slice(0, constraint.maxLength - 3) + '...';
        }

        return content;
    }

    private generateHashtags(
        platform: 'LinkedIn' | 'X' | 'YouTube',
        postBlueprint: SocialPostBlueprint,
        pillar?: SocialPillar
    ): string[] {
        const baseHashtags = ['#growth', '#business'];

        const platformHashtags: Record<string, string[]> = {
            LinkedIn: ['#leadership', '#marketing', '#sales', '#B2B'],
            X: ['#tips', '#thread', '#mustread'],
            YouTube: ['#tutorial', '#howto', '#explained'],
        };

        const pillarHashtag = pillar ? [`#${pillar.pillar_name.toLowerCase().replace(/\s+/g, '')}`] : [];
        const typeHashtag = [`#${postBlueprint.post_type}`];

        return Array.from(new Set([...baseHashtags, ...platformHashtags[platform].slice(0, 2), ...pillarHashtag, ...typeHashtag]));
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private generateSlug(pageType: string, icp: ICPSegment): string {
        const base = pageType.toLowerCase().replace(/_/g, '-');
        const suffix = uuidv4().slice(0, 8);
        return `${base}-${suffix}`;
    }

    private buildRoutingSuggestions(
        blueprint: PageBlueprint,
        kb: KnowledgeBase
    ): Array<{ next_page_slug: string; condition: string }> {
        const suggestions: Array<{ next_page_slug: string; condition: string }> = [];

        // Find routing rules that apply
        if (kb.routing?.rules) {
            for (const rule of kb.routing.rules) {
                if (rule.if.buyer_stage === blueprint.buyer_stage) {
                    suggestions.push({
                        next_page_slug: rule.then.next_destination_slug,
                        condition: `Buyer stage: ${blueprint.buyer_stage}`,
                    });
                }
            }
        }

        return suggestions;
    }

    private selectBlueprintForType(pageType: string, kb: KnowledgeBase): PageBlueprint {
        const blueprints = kb.website_library.page_blueprints;
        return blueprints.find(b => b.page_type === pageType) || blueprints[0];
    }

    private selectLayoutForBlueprint(blueprint: PageBlueprint, kb: KnowledgeBase): Layout {
        const layouts = kb.website_library.layouts;
        return layouts.find(l => l.applies_to?.buyer_stage === blueprint.buyer_stage) || layouts[0];
    }

    private selectCTAForPage(blueprint: PageBlueprint, kb: KnowledgeBase): CTA {
        const ctas = kb.ctas_library.ctas;
        return ctas.find(c => c.cta_type === blueprint.default_cta_type) || ctas[0];
    }
}

// Singleton export
export const contentGeneratorService = new ContentGeneratorService();
export default contentGeneratorService;
