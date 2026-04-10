/**
 * KB Extractor — Frontend-side utilities
 *
 * This file contains:
 * 1. File → plain text extraction (PDF, DOCX, TXT, MD) — used by API route
 * 2. Type definitions for extraction results — shared between frontend and worker
 *
 * The actual AI extraction logic lives in the WORKER:
 *   apps/workers/src/processors/kb/kb-extraction-processor.ts
 *
 * The AI provider resolution also lives in the worker, using the org's
 * assigned provider from ai_providers + ai_models tables.
 */

// ─── Types ───────────────────────────────────────────────────

export interface ExtractedKBSections {
    brand_name: string;
    voice_rules: string[];
    forbidden_claims: string[];
    required_disclosures: string[];

    icp_segments: Array<{
        segment_name: string;
        industry: string;
        revenue_band: 'SMB' | 'LMM' | 'MM' | 'ENT';
        seniority: 'IC' | 'MANAGER' | 'DIRECTOR' | 'EXEC';
        pain_points: string[];
        job_titles: string[];
        buying_triggers: string[];
        decision_criteria: string[];
    }>;

    offers: Array<{
        offer_name: string;
        category: string;
        value_proposition: string;
        differentiators: string[];
        pricing_model: string;
        delivery_timeline: string;
        proof_points: string[];
    }>;

    angles: Array<{
        angle_name: string;
        axis: 'risk' | 'speed' | 'control' | 'loss' | 'upside' | 'identity';
        narrative: string;
    }>;

    ctas: Array<{
        cta_type: 'REPLY' | 'CLICK' | 'BOOK_CALL' | 'DOWNLOAD' | 'OTHER';
        label: string;
        destination_type: string;
        destination_slug: string;
    }>;

    confidence: number;
    missing_sections: string[];
}

export interface ExtractionResult {
    success: boolean;
    sections?: ExtractedKBSections;
    raw_text?: string;
    error?: string;
    provider_used?: string;
    model_used?: string;
}

// ─── File Text Extraction (server-side only) ─────────────────

/**
 * Extracts plain text from a buffer based on MIME type.
 * Supports: PDF, DOCX, TXT, MD
 */
export async function extractTextFromFile(
    buffer: Buffer,
    mimeType: string,
    fileName: string
): Promise<string> {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

    // PDF
    if (mimeType === 'application/pdf' || ext === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const result = await pdfParse(buffer);
        if (!result.text?.trim()) {
            throw new Error('PDF appears to be image-only (scanned). Please upload a text-based PDF.');
        }
        return result.text;
    }

    // DOCX
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'docx'
    ) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    // TXT / MD
    if (['txt', 'md', 'markdown'].includes(ext) || mimeType.startsWith('text/')) {
        return buffer.toString('utf-8');
    }

    throw new Error(`Unsupported file type: ${mimeType || ext}. Use PDF, DOCX, TXT, or MD.`);
}
