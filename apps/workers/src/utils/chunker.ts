/**
 * Simplified text chunking for workers
 * Splits text into manageable chunks for embedding generation
 */
export function simpleChunk(text: string, maxTokens: number = 512, overlap: number = 50): Array<{
    text: string
    tokens: number
    startIndex: number
    endIndex: number
}> {
    const chunks: Array<{ text: string; tokens: number; startIndex: number; endIndex: number }> = []

    // Rough estimate: 1 token ~= 4 characters
    const charsPerChunk = maxTokens * 4
    const overlapChars = overlap * 4

    let startIndex = 0

    while (startIndex < text.length) {
        const endIndex = Math.min(startIndex + charsPerChunk, text.length)
        const chunkText = text.slice(startIndex, endIndex)

        chunks.push({
            text: chunkText,
            tokens: Math.ceil(chunkText.length / 4),
            startIndex,
            endIndex,
        })

        // Move start by charsPerChunk - overlap
        startIndex += charsPerChunk - overlapChars

        // Prevent infinite loop
        if (startIndex >= text.length) break
    }

    return chunks
}
