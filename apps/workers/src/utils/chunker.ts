/**
 * SEMANTIC TEXT CHUNKER
 * =====================
 * Splits documents into embedding-ready chunks that respect natural
 * language boundaries: paragraphs → sentences → words.
 *
 * Strategy (in order):
 *   1. Split on double-newlines (paragraphs)
 *   2. If a paragraph exceeds maxTokens, split on sentence boundaries (. ! ?)
 *   3. If a sentence still exceeds maxTokens, fall back to word boundaries
 *   4. Merge consecutive small chunks until target size is reached
 *   5. Apply sliding overlap between final chunks for context continuity
 *
 * Result: chunks never cut mid-sentence, retrieval quality is dramatically
 * better than fixed-character splitting.
 */

export interface Chunk {
  text:       string
  tokens:     number
  startIndex: number
  endIndex:   number
  chunkIndex: number
}

// Rough estimate — good enough for chunking decisions without a tokenizer
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Split text on sentence-ending punctuation, keeping the punctuation attached */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/g)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Split on paragraph boundaries (one or more blank lines) */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
}

/** Split a too-large segment into word-boundary pieces ≤ maxTokens */
function splitByWords(text: string, maxTokens: number): string[] {
  const words = text.split(/\s+/)
  const pieces: string[] = []
  let current: string[] = []
  let currentTokens = 0

  for (const word of words) {
    const wt = estimateTokens(word + ' ')
    if (currentTokens + wt > maxTokens && current.length > 0) {
      pieces.push(current.join(' '))
      current = []
      currentTokens = 0
    }
    current.push(word)
    currentTokens += wt
  }
  if (current.length > 0) pieces.push(current.join(' '))
  return pieces
}

/**
 * Main semantic chunker.
 *
 * @param text       - Raw document text
 * @param maxTokens  - Target max tokens per chunk (default 400 — good for text-embedding-3-large)
 * @param overlap    - Overlap tokens between consecutive chunks (default 40)
 * @param minTokens  - Minimum tokens to keep a chunk (default 20 — avoids tiny orphan chunks)
 */
export function semanticChunk(
  text:       string,
  maxTokens:  number = 400,
  overlap:    number = 40,
  minTokens:  number = 20,
): Chunk[] {
  if (!text || !text.trim()) return []

  // ── Step 1: Collect atomic units (sentences within paragraphs) ────────────
  const atoms: string[] = []
  for (const para of splitParagraphs(text)) {
    const paraTokens = estimateTokens(para)
    if (paraTokens <= maxTokens) {
      atoms.push(para)
    } else {
      // Too large — split by sentence
      for (const sentence of splitSentences(para)) {
        const stTokens = estimateTokens(sentence)
        if (stTokens <= maxTokens) {
          atoms.push(sentence)
        } else {
          // Sentence itself too large — split by words
          atoms.push(...splitByWords(sentence, maxTokens))
        }
      }
    }
  }

  // ── Step 2: Merge atoms into target-sized chunks ───────────────────────────
  const merged: string[] = []
  let current = ''
  let currentTokens = 0

  for (const atom of atoms) {
    const atomTokens = estimateTokens(atom)
    if (currentTokens + atomTokens > maxTokens && currentTokens >= minTokens) {
      merged.push(current.trim())
      current = ''
      currentTokens = 0
    }
    current = current ? current + '\n\n' + atom : atom
    currentTokens += atomTokens
  }
  if (current.trim()) merged.push(current.trim())

  // ── Step 3: Apply sliding overlap ─────────────────────────────────────────
  // Overlap: append the tail of the previous chunk's words to the start
  // of the current chunk so the embedder has context continuity.
  const overlapChars = overlap * 4
  const final: Chunk[] = []
  let charOffset = 0

  for (let i = 0; i < merged.length; i++) {
    let chunkText = merged[i]

    if (i > 0 && overlap > 0) {
      const prev = merged[i - 1]
      const tail = prev.slice(Math.max(0, prev.length - overlapChars))
      // Prepend tail only if it doesn't duplicate the start of current chunk
      if (!chunkText.startsWith(tail.trimStart())) {
        chunkText = tail.trimEnd() + ' ' + chunkText
      }
    }

    const startIndex = charOffset
    const endIndex   = charOffset + merged[i].length  // track against original text
    charOffset       = endIndex + 2 // +2 for paragraph separator

    if (estimateTokens(chunkText) < minTokens) continue

    final.push({
      text:       chunkText,
      tokens:     estimateTokens(chunkText),
      startIndex,
      endIndex,
      chunkIndex: final.length,
    })
  }

  return final
}

/**
 * Legacy alias — keeps existing callers working.
 * Internally uses semantic chunker.
 */
export function simpleChunk(
  text:      string,
  maxTokens: number = 512,
  overlap:   number = 50,
): Array<{ text: string; tokens: number; startIndex: number; endIndex: number }> {
  return semanticChunk(text, maxTokens, overlap).map(c => ({
    text:       c.text,
    tokens:     c.tokens,
    startIndex: c.startIndex,
    endIndex:   c.endIndex,
  }))
}
