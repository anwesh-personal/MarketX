// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Chunk {
    content: string
    index: number
    metadata: {
        startChar: number
        endChar: number
        sentenceCount: number
        wordCount: number
        tokenEstimate: number
    }
}

export interface ChunkingOptions {
    maxChunkSize?: number       // Maximum characters per chunk (default: 1000)
    chunkOverlap?: number        // Overlap between chunks in characters (default: 200)
    respectSentences?: boolean   // Split on sentence boundaries (default: true)
    respectParagraphs?: boolean  // Split on paragraph boundaries (default: false)
    respectCodeBlocks?: boolean  // Don't split code blocks (default: true)
}

// ============================================================
// TEXT CHUNKER SERVICE
// ============================================================

export class TextChunker {
    /**
     * Intelligent text chunking with multiple strategies
     * Main entry point for chunking operations
     */
    static chunk(
        text: string,
        options: ChunkingOptions = {}
    ): Chunk[] {
        const {
            maxChunkSize = 1000,
            chunkOverlap = 200,
            respectSentences = true,
            respectParagraphs = false,
            respectCodeBlocks = true
        } = options

        // Handle empty text
        if (!text || text.trim().length === 0) {
            return []
        }

        // Extract code blocks if needed
        let codeBlocks: { placeholder: string, content: string }[] = []
        let processedText = text

        if (respectCodeBlocks) {
            const extraction = this.extractCodeBlocks(text)
            processedText = extraction.text
            codeBlocks = extraction.blocks
        }

        // Choose chunking strategy
        let chunks: Chunk[]

        if (respectParagraphs) {
            chunks = this.paragraphAwareChunking(processedText, maxChunkSize, chunkOverlap)
        } else if (respectSentences) {
            chunks = this.sentenceAwareChunking(processedText, maxChunkSize, chunkOverlap)
        } else {
            chunks = this.simpleChunking(processedText, maxChunkSize, chunkOverlap)
        }

        // Restore code blocks
        if (respectCodeBlocks && codeBlocks.length > 0) {
            chunks = this.restoreCodeBlocks(chunks, codeBlocks)
        }

        return chunks
    }

    /**
     * Sentence-aware chunking
     * Best for most content types - maintains semantic integrity
     */
    private static sentenceAwareChunking(
        text: string,
        maxChunkSize: number,
        chunkOverlap: number
    ): Chunk[] {
        // Split into sentences
        const sentences = this.splitIntoSentences(text)

        if (sentences.length === 0) {
            return []
        }

        const chunks: Chunk[] = []
        let currentChunk: string[] = []
        let currentLength = 0
        let charPosition = 0

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i]
            const sentenceLength = sentence.length

            // If adding this sentence exceeds max size and we have content, finalize chunk
            if (currentLength + sentenceLength > maxChunkSize && currentChunk.length > 0) {
                const chunkText = currentChunk.join(' ')
                chunks.push(this.createChunk(chunkText, chunks.length, charPosition))

                // Start new chunk with overlap
                const overlapSentences = this.getOverlapSentences(currentChunk, chunkOverlap)
                const overlapText = overlapSentences.join(' ')

                charPosition += chunkText.length - overlapText.length
                currentChunk = overlapSentences
                currentLength = overlapText.length
            }

            currentChunk.push(sentence)
            currentLength += sentenceLength + 1 // +1 for space
        }

        // Add final chunk
        if (currentChunk.length > 0) {
            const chunkText = currentChunk.join(' ')
            chunks.push(this.createChunk(chunkText, chunks.length, charPosition))
        }

        return chunks
    }

    /**
     * Paragraph-aware chunking
     * Best for structured documents with clear paragraph breaks
     */
    private static paragraphAwareChunking(
        text: string,
        maxChunkSize: number,
        chunkOverlap: number
    ): Chunk[] {
        // Split into paragraphs (double newline or more)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)

        const chunks: Chunk[] = []
        let currentChunk: string[] = []
        let currentLength = 0
        let charPosition = 0

        for (const paragraph of paragraphs) {
            const paragraphLength = paragraph.length

            // If paragraph itself is too long, fall back to sentence chunking
            if (paragraphLength > maxChunkSize) {
                // Finalize current chunk first
                if (currentChunk.length > 0) {
                    const chunkText = currentChunk.join('\n\n')
                    chunks.push(this.createChunk(chunkText, chunks.length, charPosition))
                    charPosition += chunkText.length
                    currentChunk = []
                    currentLength = 0
                }

                // Chunk this paragraph with sentence-aware method
                const paragraphChunks = this.sentenceAwareChunking(paragraph, maxChunkSize, chunkOverlap)
                chunks.push(...paragraphChunks.map((c, i) => ({
                    ...c,
                    index: chunks.length + i
                })))

                charPosition += paragraph.length
                continue
            }

            // If adding this paragraph exceeds max size, finalize chunk
            if (currentLength + paragraphLength > maxChunkSize && currentChunk.length > 0) {
                const chunkText = currentChunk.join('\n\n')
                chunks.push(this.createChunk(chunkText, chunks.length, charPosition))

                charPosition += chunkText.length
                currentChunk = []
                currentLength = 0
            }

            currentChunk.push(paragraph)
            currentLength += paragraphLength + 2 // +2 for \n\n
        }

        // Add final chunk
        if (currentChunk.length > 0) {
            const chunkText = currentChunk.join('\n\n')
            chunks.push(this.createChunk(chunkText, chunks.length, charPosition))
        }

        return chunks
    }

    /**
     * Simple character-based chunking
     * Fastest, but may break semantic units - use as fallback
     */
    private static simpleChunking(
        text: string,
        maxChunkSize: number,
        chunkOverlap: number
    ): Chunk[] {
        const chunks: Chunk[] = []
        let position = 0

        while (position < text.length) {
            const end = Math.min(position + maxChunkSize, text.length)
            const chunk = text.substring(position, end)

            chunks.push(this.createChunk(chunk, chunks.length, position))

            position += maxChunkSize - chunkOverlap
        }

        return chunks
    }

    /**
     * Split text into sentences with intelligent detection
     * Handles abbreviations, decimals, URLs, etc.
     */
    private static splitIntoSentences(text: string): string[] {
        const sentences: string[] = []

        // Complex regex that handles most sentence terminators
        // Looks for . ! ? followed by space or end of string
        const sentencePattern = /([^.!?]+[.!?]+)(\s+|$)/g

        let match
        let lastIndex = 0
        let current = ''

        while ((match = sentencePattern.exec(text)) !== null) {
            const sentence = match[1]
            current += sentence

            // Check if this is a real sentence end
            if (this.isRealSentenceEnd(current)) {
                sentences.push(current.trim())
                current = ''
            } else {
                current += match[2] // Add the whitespace back
            }

            lastIndex = sentencePattern.lastIndex
        }

        // Add remaining text
        if (lastIndex < text.length) {
            current += text.substring(lastIndex)
        }

        if (current.trim()) {
            sentences.push(current.trim())
        }

        return sentences.filter(s => s.length > 0)
    }

    /**
     * Check if sentence terminator is real or false positive
     */
    private static isRealSentenceEnd(text: string): boolean {
        const trimmed = text.trim()

        // Get last few words
        const words = trimmed.split(/\s+/)
        const lastWord = words[words.length - 1] || ''

        // Common abbreviations that don't end sentences
        const abbreviations = [
            'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.',
            'etc.', 'vs.', 'i.e.', 'e.g.', 'Inc.', 'Ltd.', 'Co.',
            'a.m.', 'p.m.', 'U.S.', 'U.K.'
        ]

        for (const abbr of abbreviations) {
            if (lastWord.endsWith(abbr)) {
                return false
            }
        }

        // Check for decimals (e.g., "3.14")
        if (/\d+\.$/.test(lastWord)) {
            return false
        }

        // Check for URLs
        if (lastWord.includes('www.') || lastWord.includes('http')) {
            return false
        }

        // Check for file extensions
        if (/\.[a-z]{2,4}$/i.test(lastWord)) {
            return false
        }

        return true
    }

    /**
     * Get sentences for overlap
     * Returns last N sentences that fit within target overlap size
     */
    private static getOverlapSentences(
        sentences: string[],
        targetOverlap: number
    ): string[] {
        const overlap: string[] = []
        let length = 0

        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentence = sentences[i]
            if (length + sentence.length <= targetOverlap) {
                overlap.unshift(sentence)
                length += sentence.length + 1
            } else {
                break
            }
        }

        return overlap
    }

    /**
     * Extract code blocks to prevent splitting them
     */
    private static extractCodeBlocks(text: string): {
        text: string
        blocks: { placeholder: string, content: string }[]
    } {
        const blocks: { placeholder: string, content: string }[] = []
        let processedText = text

        // Markdown code blocks (```...```)
        const codeBlockPattern = /```[\s\S]*?```/g
        let match
        let index = 0

        while ((match = codeBlockPattern.exec(text)) !== null) {
            const placeholder = `__CODE_BLOCK_${index}__`
            blocks.push({
                placeholder,
                content: match[0]
            })
            processedText = processedText.replace(match[0], placeholder)
            index++
        }

        // Inline code (`...`)
        const inlineCodePattern = /`[^`]+`/g
        while ((match = inlineCodePattern.exec(processedText)) !== null) {
            const placeholder = `__INLINE_CODE_${index}__`
            blocks.push({
                placeholder,
                content: match[0]
            })
            processedText = processedText.replace(match[0], placeholder)
            index++
        }

        return { text: processedText, blocks }
    }

    /**
     * Restore code blocks to chunks
     */
    private static restoreCodeBlocks(
        chunks: Chunk[],
        codeBlocks: { placeholder: string, content: string }[]
    ): Chunk[] {
        return chunks.map(chunk => {
            let content = chunk.content

            for (const block of codeBlocks) {
                content = content.replace(block.placeholder, block.content)
            }

            return {
                ...chunk,
                content
            }
        })
    }

    /**
     * Create chunk with metadata
     */
    private static createChunk(
        content: string,
        index: number,
        startChar: number
    ): Chunk {
        const wordCount = this.countWords(content)
        const sentenceCount = this.countSentences(content)
        const tokenEstimate = this.estimateTokens(content)

        return {
            content,
            index,
            metadata: {
                startChar,
                endChar: startChar + content.length,
                sentenceCount,
                wordCount,
                tokenEstimate
            }
        }
    }

    /**
     * Count words in text
     */
    private static countWords(text: string): number {
        return text.split(/\s+/).filter(w => w.length > 0).length
    }

    /**
     * Count sentences in text
     */
    private static countSentences(text: string): number {
        const sentences = this.splitIntoSentences(text)
        return sentences.length
    }

    /**
     * Estimate token count (rough)
     * Rule of thumb: 1 token ≈ 4 characters for English
     */
    private static estimateTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }
}
