import { v4 as uuidv4 } from "uuid";
import { WriterInput } from "../schemas/writer.input";
import { KnowledgeBase, ICPSegment, Offer, PageBlueprint } from "../schemas/kb.schema";
import { WebsiteBundle, PageOutput } from "../schemas/writer.output";

/**
 * MODULE 1: The Writer Engine
 * Goal: Transform WriterInput + KnowledgeBase -> WriterOutput
 * 
 * Logic is DETERMINISTIC. No hallucinations allowed.
 */
export async function executeRun(input: WriterInput, kb: KnowledgeBase): Promise<WebsiteBundle> {
    // STEP 1: Context Resolution (Pre-Embeddings: Exact Match)
    const icp = resolveICP(input.icp.icp_id, kb);
    const offer = resolveOffer(input.offer.offer_id, kb);

    // STEP 2: Blueprint Selection
    const pages: PageOutput[] = [];

    for (const pageType of input.generation_requests.website.page_types) {
        const blueprint = selectBlueprint(pageType, kb);
        const page = assembleContent(icp, offer, blueprint, kb);
        pages.push(page);
    }

    // STEP 3: Return the Bundle
    return {
        type: "website_bundle",
        bundle_id: uuidv4(),
        generated_at: new Date().toISOString(),
        pages,
    };
}

/**
 * Resolve ICP by exact ID match
 */
function resolveICP(icpId: string, kb: KnowledgeBase): ICPSegment {
    const icp = kb.icp_library.segments.find((s) => s.icp_id === icpId);

    if (!icp) {
        throw new Error(`Context ID ${icpId} not found in Active KB`);
    }

    return icp;
}

/**
 * Resolve Offer by exact ID match
 */
function resolveOffer(offerId: string, kb: KnowledgeBase): Offer {
    const offer = kb.offer_library.offers.find((o) => o.offer_id === offerId);

    if (!offer) {
        throw new Error(`Context ID ${offerId} not found in Active KB`);
    }

    return offer;
}

/**
 * Select Blueprint (Deterministic)
 */
function selectBlueprint(
    pageType: "LANDING" | "HOW_IT_WORKS" | "PRICING_PHILOSOPHY",
    kb: KnowledgeBase
): PageBlueprint {
    const blueprints = kb.libraries.website.page_blueprints.filter(
        (bp) => bp.page_type === pageType
    );

    if (blueprints.length === 0) {
        throw new Error(`No blueprint found for page_type: ${pageType}`);
    }

    // V1 Logic: Select default or first
    const defaultBlueprint = blueprints.find((bp) => bp.is_default);
    return defaultBlueprint || blueprints[0];
}

/**
 * Content Assembly (The "Generation")
 * 
 * DO NOT simply ask AI "Write a landing page"
 * Construct content using strict rules from KB
 */
function assembleContent(
    icp: ICPSegment,
    offer: Offer,
    blueprint: PageBlueprint,
    kb: KnowledgeBase
): PageOutput {
    // Construct slug from offer name
    const slug = "/" + offer.offer_name.toLowerCase().replace(/ /g, "-");

    // Build content using deterministic template
    // In production, this would use LLM with STRICT constraints
    const contentMarkdown = buildMarkdownContent(icp, offer, blueprint, kb);

    return {
        page_id: uuidv4(),
        variant_id: "v1_baseline",
        slug,
        page_type: blueprint.page_type,
        buyer_stage: "AWARENESS", // V1: Default to AWARENESS
        content_markdown: contentMarkdown,
        primary_cta: {
            cta_type: "BOOK_CALL",
            label: "Schedule Strategy Session",
            destination_slug: "/book",
        },
    };
}

/**
 * Build markdown content following Blueprint structure
 */
function buildMarkdownContent(
    icp: ICPSegment,
    offer: Offer,
    blueprint: PageBlueprint,
    kb: KnowledgeBase
): string {
    // Combine context into structured content
    const sections = [
        `# ${offer.value_proposition}`,
        ``,
        `## For: ${icp.industry_group_norm}`,
        ``,
        `### Key Pain Points We Solve:`,
        ...icp.pain_points.map((p) => `- ${p}`),
        ``,
        `### Pricing Model:`,
        `${offer.pricing_model}`,
        ``,
        `---`,
        ``,
        `*Brand: ${kb.brand.brand_name_exact}*`,
    ];

    return sections.join("\n");
}
