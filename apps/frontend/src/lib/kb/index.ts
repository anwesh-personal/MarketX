/**
 * KB Module - Knowledge Base utilities
 *
 * Exports:
 * - Schema types and validation
 * - JSON ↔ Markdown converters
 * - KB Extractor (server-side only — file parsing + AI extraction)
 */

// Schema and types
export * from './kb.schema';

// Converters
export { kbToMarkdown } from './kb-to-markdown';
export { markdownToKb, type ParseResult, type ParseError } from './markdown-to-kb';

// Extractor types (the implementation is server-only)
export type { ExtractedKBSections, ExtractionResult } from './kb-extractor';
