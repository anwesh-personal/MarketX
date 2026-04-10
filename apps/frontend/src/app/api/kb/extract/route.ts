/**
 * POST /api/kb/extract
 *
 * Accepts multipart upload (PDF, DOCX, TXT, MD).
 * Extracts plain text → creates a kb_extraction_jobs row → queues to BullMQ.
 * Returns the extraction ID for the frontend to poll.
 *
 * GET /api/kb/extract?id=xxx
 *
 * Polls extraction job status. Returns result when complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth';
import { requireFeature } from '@/lib/requireFeature';
import { extractTextFromFile } from '@/lib/kb/kb-extractor';
import { queues } from '@/lib/worker-queues';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'markdown']);

// ─── POST: Upload + queue extraction ─────────────────────────

export async function POST(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_view_kb');
        if (gate.denied) return gate.response;

        const ctx = await getAuthContext();
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file uploaded. Attach a PDF, DOCX, TXT, or MD file.' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 20 MB.` },
                { status: 400 }
            );
        }

        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json(
                { success: false, error: `Unsupported file type ".${ext}". Use PDF, DOCX, TXT, or MD.` },
                { status: 400 }
            );
        }

        // Extract text from file
        const buffer = Buffer.from(await file.arrayBuffer());
        let rawText: string;
        try {
            rawText = await extractTextFromFile(buffer, file.type, file.name);
        } catch (parseErr: unknown) {
            const msg = parseErr instanceof Error ? parseErr.message : 'Could not read file';
            return NextResponse.json({ success: false, error: msg }, { status: 422 });
        }

        if (!rawText?.trim()) {
            return NextResponse.json(
                { success: false, error: 'File appears empty or unreadable.' },
                { status: 422 }
            );
        }

        // Create extraction job row
        const { data: job, error: insertErr } = await supabaseAdmin
            .from('kb_extraction_jobs')
            .insert({
                org_id: ctx.orgId,
                user_id: ctx.userId,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type || null,
                status: 'pending',
            })
            .select('id')
            .single();

        if (insertErr || !job) {
            console.error('[KB Extract] Insert failed:', insertErr);
            return NextResponse.json(
                { success: false, error: 'Failed to create extraction job.' },
                { status: 500 }
            );
        }

        // Queue to worker
        await queues.kbExtraction.add(
            `extract-${job.id}`,
            {
                extractionId: job.id,
                orgId: ctx.orgId,
                userId: ctx.userId,
                rawText,
                fileName: file.name,
                fileSize: file.size,
            },
            { jobId: `kb-extract-${job.id}` }
        );

        return NextResponse.json({
            success: true,
            extractionId: job.id,
            message: 'Extraction queued. Poll GET /api/kb/extract?id=<extractionId> for status.',
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[KB Extract] Error:', msg);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

// ─── GET: Poll extraction status ─────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_view_kb');
        if (gate.denied) return gate.response;

        const ctx = await getAuthContext();
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing extraction ID. Pass ?id=xxx' },
                { status: 400 }
            );
        }

        const { data: job, error } = await supabaseAdmin
            .from('kb_extraction_jobs')
            .select('id, status, result, error, provider_used, model_used, file_name, file_size, created_at, completed_at')
            .eq('id', id)
            .eq('org_id', ctx.orgId)
            .single();

        if (error || !job) {
            return NextResponse.json(
                { success: false, error: 'Extraction job not found.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            extraction: job,
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
