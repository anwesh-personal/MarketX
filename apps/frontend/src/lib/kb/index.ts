/**
 * KB Module - Knowledge Base utilities
 * 
 * Exports:
 * - Schema types and validation
 * - JSON ↔ Markdown converters
 */

// Schema and types
export * from './kb.schema';

// Converters
export { kbToMarkdown } from './kb-to-markdown';
export { markdownToKb, type ParseResult, type ParseError } from './markdown-to-kb';
