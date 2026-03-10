'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    FileEdit,
    Save,
    Copy,
    Trash2,
    Eye,
    Code,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Download,
    Upload,
    History
} from 'lucide-react';
import { kbToMarkdown, markdownToKb, KnowledgeBase, ParseResult } from '@/lib/kb';

interface KBEditorProps {
    kb: KnowledgeBase;
    kbId: string;
    kbName: string;
    onSave: (kb: KnowledgeBase) => Promise<void>;
    onDuplicate?: () => void;
    onDelete?: () => void;
    readOnly?: boolean;
}

export function KBEditor({
    kb,
    kbId,
    kbName,
    onSave,
    onDuplicate,
    onDelete,
    readOnly = false
}: KBEditorProps) {
    const [markdown, setMarkdown] = useState('');
    const [originalMarkdown, setOriginalMarkdown] = useState('');
    const [mode, setMode] = useState<'edit' | 'preview' | 'json'>('edit');
    const [errors, setErrors] = useState<ParseResult['errors']>([]);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Convert KB to Markdown on mount
    useEffect(() => {
        const md = kbToMarkdown(kb);
        setMarkdown(md);
        setOriginalMarkdown(md);
    }, [kb]);

    // Track changes
    useEffect(() => {
        setHasChanges(markdown !== originalMarkdown);
    }, [markdown, originalMarkdown]);

    // Parse and validate on change
    const validateMarkdown = useCallback((md: string): ParseResult => {
        return markdownToKb(md);
    }, []);

    // Handle save
    const handleSave = useCallback(async () => {
        const result = validateMarkdown(markdown);

        if (!result.success || !result.kb) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);
        setSaving(true);

        try {
            await onSave(result.kb);
            setOriginalMarkdown(markdown);
            setHasChanges(false);
            setLastSaved(new Date());
        } catch (error: any) {
            setErrors([{ section: 'save', message: error.message }]);
        } finally {
            setSaving(false);
        }
    }, [markdown, validateMarkdown, onSave]);

    // Handle reset
    const handleReset = useCallback(() => {
        setMarkdown(originalMarkdown);
        setErrors([]);
    }, [originalMarkdown]);

    // Handle export
    const handleExport = useCallback(() => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${kbName.toLowerCase().replace(/\s+/g, '_')}_kb.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [markdown, kbName]);

    // Handle import
    const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMarkdown(content);
        };
        reader.readAsText(file);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    // Get preview HTML
    const getPreviewContent = useCallback(() => {
        // Simple markdown to HTML conversion for preview
        return markdown
            .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
            .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mb-3 mt-6 text-info">$1</h2>')
            .replace(/^### (.+)$/gm, '<h3 class="text-xl font-medium mb-2 mt-4 text-textTertiary">$1</h3>')
            .replace(/^#### (.+)$/gm, '<h4 class="text-lg font-medium mb-2 mt-3 text-textTertiary">$1</h4>')
            .replace(/^\*\*(.+)\*\*:\s*(.+)$/gm, '<p class="mb-1"><strong class="text-textTertiary">$1:</strong> $2</p>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 text-textTertiary">$1</li>')
            .replace(/`([^`]+)`/g, '<code class="bg-surface px-1 rounded text-info">$1</code>')
            .replace(/^---$/gm, '<hr class="my-4 border-border">')
            .replace(/^\> (.+)$/gm, '<blockquote class="border-l-4 border-info pl-4 text-textTertiary italic">$1</blockquote>')
            .replace(/\n\n/g, '</p><p class="mb-2">')
            .replace(/\|([^\n]+)\|/g, (match) => {
                if (match.includes('---')) return '';
                const cells = match.split('|').filter(c => c.trim());
                return `<tr>${cells.map(c => `<td class="border border-border px-2 py-1">${c.trim()}</td>`).join('')}</tr>`;
            });
    }, [markdown]);

    return (
        <div className="flex flex-col h-full bg-background rounded-lg border border-border">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-surface/50">
                <div className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-info" />
                    <span className="font-medium text-textPrimary">{kbName}</span>
                    {hasChanges && (
                        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                            Unsaved
                        </span>
                    )}
                    {lastSaved && !hasChanges && (
                        <span className="text-xs text-textSecondary">
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Mode Toggles */}
                    <div className="flex bg-surface rounded-lg p-0.5">
                        <button
                            onClick={() => setMode('edit')}
                            className={`px-3 py-1 text-sm rounded-md transition ${mode === 'edit'
                                    ? 'bg-info text-textInverse'
                                    : 'text-textTertiary hover:text-textPrimary'
                                }`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setMode('preview')}
                            className={`px-3 py-1 text-sm rounded-md transition ${mode === 'preview'
                                    ? 'bg-info text-textInverse'
                                    : 'text-textTertiary hover:text-textPrimary'
                                }`}
                        >
                            <Eye className="w-4 h-4 inline mr-1" />
                            Preview
                        </button>
                        <button
                            onClick={() => setMode('json')}
                            className={`px-3 py-1 text-sm rounded-md transition ${mode === 'json'
                                    ? 'bg-info text-textInverse'
                                    : 'text-textTertiary hover:text-textPrimary'
                                }`}
                        >
                            <Code className="w-4 h-4 inline mr-1" />
                            JSON
                        </button>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Actions */}
                    <button
                        onClick={handleExport}
                        className="p-2 text-textTertiary hover:text-textPrimary hover:bg-surfaceHover rounded transition"
                        title="Export Markdown"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    <label className="p-2 text-textTertiary hover:text-textPrimary hover:bg-surfaceHover rounded transition cursor-pointer" title="Import Markdown">
                        <Upload className="w-4 h-4" />
                        <input type="file" accept=".md,.txt" onChange={handleImport} className="hidden" />
                    </label>

                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="p-2 text-textTertiary hover:text-textPrimary hover:bg-surfaceHover rounded transition"
                            title="Reset Changes"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}

                    {onDuplicate && (
                        <button
                            onClick={onDuplicate}
                            className="p-2 text-textTertiary hover:text-info hover:bg-surfaceHover rounded transition"
                            title="Duplicate KB"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    )}

                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 text-textTertiary hover:text-error hover:bg-surfaceHover rounded transition"
                            title="Delete KB"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    <div className="h-6 w-px bg-border" />

                    <button
                        onClick={handleSave}
                        disabled={saving || readOnly || !hasChanges}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${saving || readOnly || !hasChanges
                                ? 'bg-surface text-textSecondary cursor-not-allowed'
                                : 'bg-info text-textInverse hover:bg-info/80'
                            }`}
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save (⌘S)
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {errors.length > 0 && (
                <div className="bg-error/10 border-b border-error p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-error">Validation Errors</p>
                            <ul className="text-sm text-error/80 mt-1">
                                {errors.map((err, i) => (
                                    <li key={i}>
                                        <strong>{err.section}:</strong> {err.message}
                                        {err.suggestion && <span className="text-error/70"> - {err.suggestion}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden">
                {mode === 'edit' && (
                    <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        readOnly={readOnly}
                        className="w-full h-full p-4 bg-background text-textPrimary font-mono text-sm resize-none focus:outline-none"
                        style={{ tabSize: 2 }}
                        placeholder="# Knowledge Base..."
                        spellCheck={false}
                    />
                )}

                {mode === 'preview' && (
                    <div
                        className="w-full h-full p-6 overflow-auto prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                    />
                )}

                {mode === 'json' && (
                    <div className="w-full h-full overflow-auto">
                        {(() => {
                            const result = validateMarkdown(markdown);
                            if (!result.success) {
                                return (
                                    <div className="p-4 text-error">
                                        <p className="font-medium mb-2">Cannot convert to JSON - fix errors first:</p>
                                        <ul className="text-sm">
                                            {result.errors.map((err, i) => (
                                                <li key={i}>• {err.section}: {err.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            }
                            return (
                                <pre className="p-4 text-sm text-textTertiary font-mono">
                                    {JSON.stringify(result.kb, null, 2)}
                                </pre>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface/50 text-xs text-textSecondary">
                <div className="flex items-center gap-4">
                    <span>KB ID: {kbId}</span>
                    <span>Version: {kb.kb_version}</span>
                    <span>Stage: {kb.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>{markdown.split('\n').length} lines</span>
                    <span>{markdown.length.toLocaleString()} chars</span>
                    {errors.length === 0 && hasChanges && (
                        <span className="flex items-center gap-1 text-success">
                            <CheckCircle className="w-3 h-3" />
                            Valid
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default KBEditor;
