'use client'

import { useEffect, useState } from 'react'
import { fetchActiveKB, uploadKB } from '@/lib/api'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function KBManagerPage() {
    const [kb, setKB] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [validation, setValidation] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        loadKB()
    }, [])

    async function loadKB() {
        try {
            const data = await fetchActiveKB()
            setKB(data)
        } catch (error) {
            console.error('Failed to load KB:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        setValidation(null)

        try {
            const text = await file.text()
            const json = JSON.parse(text)

            const result = await uploadKB(json, '1.0.1')
            setValidation({ success: true, message: result.message })
            await loadKB()
        } catch (error) {
            setValidation({ success: false, message: (error as Error).message })
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading Knowledge Base...</div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base Manager</h1>
                <p className="text-slate-400">Upload and manage your brand contracts</p>
            </div>

            {/* Upload Section */}
            <div className="card mb-8">
                <h2 className="text-xl font-bold mb-4">Upload New KB</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Upload a JSON file that matches the KB schema. It will be validated against Zod before activation.
                </p>

                <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Select JSON File'}
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>

                {validation && (
                    <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${validation.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                        {validation.success ? (
                            <CheckCircle className="text-green-400" size={20} />
                        ) : (
                            <AlertCircle className="text-red-400" size={20} />
                        )}
                        <div>
                            <div className={`font-medium ${validation.success ? 'text-green-400' : 'text-red-400'}`}>
                                {validation.success ? 'Success' : 'Validation Failed'}
                            </div>
                            <div className="text-sm text-slate-400 mt-1">{validation.message}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Current KB Viewer */}
            {kb && (
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Active Knowledge Base</h2>

                    <div className="space-y-4 mb-6">
                        <InfoRow label="Version" value={kb.version} />
                        <InfoRow label="Stage" value={kb.stage} />
                        <InfoRow label="Brand Name" value={kb.data?.brand?.brand_name_exact} />
                        <InfoRow label="ICP Segments" value={kb.data?.icp_library?.segments?.length || 0} />
                        <InfoRow label="Offers" value={kb.data?.offer_library?.offers?.length || 0} />
                        <InfoRow label="Page Blueprints" value={kb.data?.libraries?.website?.page_blueprints?.length || 0} />
                    </div>

                    <details className="mt-6">
                        <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                            View Full JSON
                        </summary>
                        <pre className="mt-4 p-4 bg-slate-950 rounded-lg overflow-auto text-xs font-mono">
                            {JSON.stringify(kb.data, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-slate-400">{label}</span>
            <span className="font-mono text-sm">{value}</span>
        </div>
    )
}
