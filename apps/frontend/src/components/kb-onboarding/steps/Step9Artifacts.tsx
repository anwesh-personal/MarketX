'use client'

import React, { useRef, useState } from 'react'
import { Upload, FileText, X, Loader2, Check, AlertTriangle } from 'lucide-react'
import { ArtifactUpload, ARTIFACT_CATEGORIES } from '../types'
import { SectionHeader } from '../FormPrimitives'

interface Props {
    artifacts: ArtifactUpload[]
    onArtifactsChange: (arts: ArtifactUpload[]) => void
    questionnaireId: string | null
}

export default function Step9Artifacts({ artifacts, onArtifactsChange, questionnaireId }: Props) {
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length || !questionnaireId || !selectedCategory) return

        setUploading(true)
        setUploadError('')

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const formData = new FormData()
                formData.append('file', file)
                formData.append('questionnaire_id', questionnaireId)
                formData.append('category', selectedCategory)

                const res = await fetch('/api/kb/onboarding/artifacts', {
                    method: 'POST',
                    body: formData,
                })

                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Upload failed')

                onArtifactsChange([...artifacts, json.artifact])
            }
        } catch (e: any) {
            setUploadError(e.message)
        } finally {
            setUploading(false)
            setSelectedCategory('')
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const removeArtifact = async (id: string) => {
        try {
            await fetch(`/api/kb/onboarding/artifacts?artifact_id=${id}`, { method: 'DELETE' })
            onArtifactsChange(artifacts.filter(a => a.id !== id))
        } catch (e) {
            console.error('Delete failed:', e)
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <span className="badge badge-success text-[10px]"><Check className="w-3 h-3" /> Extracted</span>
            case 'processing': return <span className="badge badge-info text-[10px]"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>
            case 'failed': return <span className="badge badge-error text-[10px]"><AlertTriangle className="w-3 h-3" /> Failed</span>
            default: return <span className="badge text-[10px]">Pending</span>
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Supporting Materials"
                description="Upload documents that provide evidence for your knowledge base. At least 1 is required."
            />

            {/* Upload area */}
            <div className="card p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-1.5">
                            Document Category
                        </label>
                        <select
                            className="input w-full"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Select category...</option>
                            {ARTIFACT_CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-1.5">
                            File
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={ARTIFACT_CATEGORIES.find(c => c.value === selectedCategory)?.accept || '*'}
                            multiple
                            onChange={e => handleUpload(e.target.files)}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!selectedCategory || uploading}
                            className="btn btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                            ) : (
                                <><Upload className="w-4 h-4" /> Choose File</>
                            )}
                        </button>
                    </div>
                </div>

                {uploadError && (
                    <div className="p-2 bg-error/5 border border-error/20 rounded-lg text-error text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                    </div>
                )}
            </div>

            {/* Uploaded files list */}
            {artifacts.length > 0 ? (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-textPrimary">
                        Uploaded Materials ({artifacts.length})
                    </h3>
                    {artifacts.map(art => (
                        <div key={art.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-surfaceHover transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-textPrimary truncate">{art.file_name}</div>
                                <div className="text-[10px] text-textTertiary">
                                    {ARTIFACT_CATEGORIES.find(c => c.value === art.category)?.label || art.category} · {formatSize(art.file_size)}
                                </div>
                            </div>
                            {statusBadge(art.extraction_status)}
                            <button
                                onClick={() => removeArtifact(art.id)}
                                className="p-1.5 rounded-lg hover:bg-error/10 text-textTertiary hover:text-error transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-8 text-center">
                    <Upload className="w-10 h-10 text-textTertiary mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-textSecondary mb-1">No materials uploaded yet</p>
                    <p className="text-xs text-textTertiary">
                        Upload sales decks, case studies, or competitive docs to enrich your Knowledge Base.
                    </p>
                </div>
            )}

            {/* Category checklist */}
            <div className="card p-5">
                <h3 className="text-sm font-semibold text-textPrimary mb-3">Upload Checklist</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                    {ARTIFACT_CATEGORIES.map(cat => {
                        const hasUploads = artifacts.some(a => a.category === cat.value)
                        return (
                            <div key={cat.value} className="flex items-center gap-2 text-sm">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasUploads ? 'bg-success/10' : 'bg-surface border border-border'}`}>
                                    {hasUploads ? <Check className="w-2.5 h-2.5 text-success" /> : <div className="w-1 h-1 rounded-full bg-border" />}
                                </div>
                                <span className={hasUploads ? 'text-textPrimary' : 'text-textTertiary'}>
                                    {cat.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
