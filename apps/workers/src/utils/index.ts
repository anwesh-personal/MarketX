/**
 * Workers Utils Index
 * 
 * Centralized exports for all worker utilities
 */

// AI Service
export { aiService } from './ai-service';

// KB Resolution
export {
    kbResolutionService,
    type KnowledgeBase,
    type ResolutionContext,
    type ResolvedICP,
    type ResolvedOffer,
    type ResolvedAngle,
    type ResolvedBlueprint,
    type ResolvedCTA,
    type ICPSegment,
    type Offer,
    type Angle,
    type CTA,
    type PageBlueprint,
    type Layout,
    type EmailFlowBlueprint,
    type ReplyPlaybook,
    type ReplyStrategy,
    type SocialPostBlueprint,
} from './kb-resolution-service';

// Content Generator
export {
    contentGeneratorService,
    type PageOutput,
    type WebsiteBundle,
    type EmailFlowBundle,
    type EmailReplyBundle,
    type SocialPostBundle,
    type GeneratorContext,
    type PageGeneratorInput,
    type BundleGeneratorInput,
    type EmailFlowGeneratorInput,
    type EmailReplyGeneratorInput,
    type SocialPostGeneratorInput,
} from './content-generator-service';

// Embeddings
export { generateEmbedding } from './embeddings';

// Chunker
export { simpleChunk } from './chunker';
