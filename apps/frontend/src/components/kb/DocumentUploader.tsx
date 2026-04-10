'use client';

/**
 * DocumentUploader
 *
 * Drag-and-drop file uploader that:
 * 1. Accepts PDF, DOCX, TXT, MD
 * 2. POSTs to /api/kb/extract (queues extraction job)
 * 3. Polls GET /api/kb/extract?id=xxx until complete
 * 4. Returns extracted sections for review
 */

import { useState, useCallback, useRef } from 'react';
import {
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ExtractedKBSections } from '@/lib/kb/kb-extractor';

interface DocumentUploaderProps {
    onExtracted: (sections: ExtractedKBSections, fileName: string, providerUsed: string) => void;
    onCancel?: () => void;
}

type UploadStage = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error';

const STAGE_LABELS: Record<UploadStage, string> = {
    idle: '',
    uploading: 'Uploading and reading file…',
    queued: 'Queued for AI extraction…',
    processing: 'AI is analyzing your document…',
    done: 'Extraction complete',
    error: 'Extraction failed',
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // 3 min max wait

export function DocumentUploader({ onExtracted, onCancel }: DocumentUploaderProps) {
    const [stage, setStage] = useState<UploadStage>('idle');
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const pollForResult = useCallback((extractionId: string, uploadedFileName: string) => {
        let attempts = 0;
        setStage('queued');

        pollRef.current = setInterval(async () => {
            attempts++;
            if (attempts > MAX_POLL_ATTEMPTS) {
                stopPolling();
                setStage('error');
                setError('Extraction timed out. Please try again.');
                return;
            }

            try {
                const res = await fetch(`/api/kb/extract?id=${extractionId}`);
                const data = await res.json();

                if (!data.success) {
                    stopPolling();
                    setStage('error');
                    setError(data.error ?? 'Status check failed');
                    return;
                }

                const job = data.extraction;

                if (job.status === 'processing') {
                    setStage('processing');
                } else if (job.status === 'completed' && job.result) {
                    stopPolling();
                    setStage('done');
                    toast.success(`Extracted via ${job.provider_used}/${job.model_used}`);
                    onExtracted(
                        job.result,
                        uploadedFileName,
                        `${job.provider_used} / ${job.model_used}`
                    );
                } else if (job.status === 'failed') {
                    stopPolling();
                    setStage('error');
                    setError(job.error ?? 'Extraction failed');
                    toast.error(job.error ?? 'Extraction failed');
                }
            } catch {
                // Network error — keep polling
            }
        }, POLL_INTERVAL_MS);
    }, [onExtracted, stopPolling]);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        setFileName(file.name);
        setStage('uploading');
        stopPolling();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/kb/extract', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error ?? 'Upload failed');
            }

            // Start polling for result
            pollForResult(data.extractionId, file.name);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setStage('error');
            setError(msg);
            toast.error(msg);
        }
    }, [pollForResult, stopPolling]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    }, [handleFile]);

    const isProcessing = stage === 'uploading' || stage === 'queued' || stage === 'processing';

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && inputRef.current?.click()}
                className={`
                    relative flex flex-col items-center justify-center gap-3
                    rounded-xl border-2 border-dashed p-10 cursor-pointer
                    transition-all duration-200 select-none
                    ${dragging
                        ? 'border-accent bg-accent/10 scale-[1.01]'
                        : isProcessing
                            ? 'border-border bg-surfaceHover cursor-not-allowed'
                            : 'border-border hover:border-accent/50 hover:bg-surfaceHover'
                    }
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown"
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={isProcessing}
                />

                {isProcessing ? (
                    <>
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-accent animate-spin" />
                            <Sparkles className="w-5 h-5 text-accent absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <p className="font-medium text-textPrimary text-sm">{STAGE_LABELS[stage]}</p>
                        {fileName && <p className="text-xs text-textSecondary">{fileName}</p>}
                    </>
                ) : stage === 'done' ? (
                    <>
                        <CheckCircle className="w-12 h-12 text-success" />
                        <p className="font-medium text-success text-sm">Extraction complete</p>
                    </>
                ) : stage === 'error' ? (
                    <>
                        <AlertCircle className="w-12 h-12 text-error" />
                        <p className="font-medium text-error text-sm">Extraction failed</p>
                        <p className="text-xs text-textSecondary text-center max-w-xs">{error}</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setStage('idle'); setError(null); }}
                            className="mt-1 text-xs text-accent underline"
                        >
                            Try again
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <Upload className="w-7 h-7 text-accent" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-textPrimary">
                                Drop your company document here
                            </p>
                            <p className="text-sm text-textSecondary mt-1">
                                or <span className="text-accent underline cursor-pointer">browse to upload</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {['PDF', 'DOCX', 'TXT', 'MD'].map(type => (
                                <span
                                    key={type}
                                    className="px-2 py-0.5 text-xs font-mono rounded bg-surface border border-border text-textSecondary"
                                >
                                    {type}
                                </span>
                            ))}
                            <span className="text-xs text-textTertiary">• Max 20 MB</span>
                        </div>
                    </>
                )}
            </div>

            {stage === 'idle' && (
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { icon: '🏢', label: 'Brand name & voice rules' },
                        { icon: '🎯', label: 'ICP segments & pain points' },
                        { icon: '💼', label: 'Offers & value propositions' },
                        { icon: '📐', label: 'Angles & positioning' },
                        { icon: '📢', label: 'CTAs & conversion goals' },
                        { icon: '🛡️', label: 'Compliance & guardrails' },
                    ].map(item => (
                        <div
                            key={item.label}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surfaceHover/50 border border-border/50 text-xs text-textSecondary"
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {onCancel && !isProcessing && (
                <button
                    onClick={onCancel}
                    className="w-full text-sm text-textSecondary hover:text-textPrimary transition flex items-center justify-center gap-1"
                >
                    <X className="w-3 h-3" /> Cancel
                </button>
            )}
        </div>
    );
}
