'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Database,
    Upload,
    Trash2,
    Eye,
    FileText,
    Calendar,
    Loader2,
    Plus,
    Search,
    AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface KnowledgeBase {
    id: string;
    name: string;
    version: number;
    data: any;
    created_at: string;
    updated_at: string;
}

export default function KBManagerPage() {
    const router = useRouter();
    const supabase = createClient();
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [orgId, setOrgId] = useState('');
    const [quota, setQuota] = useState({ current: 0, max: 1 });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        await loadKBs(user.id);
    };

    const loadKBs = async (userId: string) => {
        try {
            setIsLoading(true);

            // Get user's org
            const { data: userData } = await supabase
                .from('users')
                .select(`
                    org_id,
                    organization:organizations(max_kbs)
                `)
                .eq('id', userId)
                .single();

            if (!userData) return;

            setOrgId(userData.org_id);

            // Get KBs
            const { data: kbsData } = await supabase
                .from('knowledge_bases')
                .select('*')
                .eq('org_id', userData.org_id)
                .order('created_at', { ascending: false });

            setKbs(kbsData || []);
            setQuota({
                current: kbsData?.length || 0,
                max: (userData.organization as any)?.max_kbs || 1,
            });

        } catch (error) {
            console.error('Failed to load KBs:', error);
            toast.error('Failed to load knowledge bases');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredKBs = kbs.filter(kb =>
        kb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const canUpload = quota.current < quota.max;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Knowledge Bases
                    </h1>
                    <p className="text-textSecondary">
                        Upload and manage your knowledge bases ({quota.current}/{quota.max} used)
                    </p>
                </div>

                <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={!canUpload}
                    className="
                        flex items-center gap-xs
                        bg-primary text-white font-semibold
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:opacity-90
                        active:scale-[0.98]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all
                    "
                >
                    <Plus className="w-5 h-5" />
                    <span>Upload KB</span>
                </button>
            </div>

            {/* Quota Warning */}
            {!canUpload && (
                <div className="card bg-warning/10 border-warning">
                    <div className="flex items-start gap-sm">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-xs" />
                        <div>
                            <p className="text-sm font-semibold text-textPrimary mb-xs">
                                Knowledge Base Limit Reached
                            </p>
                            <p className="text-sm text-textSecondary">
                                You've used all {quota.max} knowledge base slots. Upgrade your plan or delete an existing KB to upload new ones.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search knowledge bases..."
                    className="
                        w-full pl-xl pr-md py-sm
                        bg-background text-textPrimary
                        border border-border rounded-[var(--radius-md)]
                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                        transition-all
                    "
                />
            </div>

            {/* KB List */}
            {filteredKBs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {filteredKBs.map((kb) => (
                        <div
                            key={kb.id}
                            className="card group hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start justify-between mb-md">
                                <div className="p-sm rounded-[var(--radius-md)] bg-info/10">
                                    <Database className="w-5 h-5 text-info" />
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-textPrimary mb-xs truncate">
                                {kb.name}
                            </h3>



                            <div className="flex items-center gap-xs text-xs text-textTertiary mb-md">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(kb.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center gap-xs pt-md border-t border-border">
                                <button
                                    className="
                                        flex-1 flex items-center justify-center gap-xs
                                        py-sm px-sm
                                        text-textSecondary text-sm
                                        hover:text-textPrimary hover:bg-surfaceHover
                                        rounded-[var(--radius-sm)]
                                        transition-all
                                    "
                                    title="View details"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>View</span>
                                </button>

                                <button
                                    className="
                                        flex-1 flex items-center justify-center gap-xs
                                        py-sm px-sm
                                        text-error text-sm
                                        hover:bg-error/10
                                        rounded-[var(--radius-sm)]
                                        transition-all
                                    "
                                    title="Delete KB"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-xl">
                    <Database className="w-16 h-16 text-textTertiary mx-auto mb-md opacity-20" />
                    <h3 className="text-lg font-bold text-textPrimary mb-xs">
                        {searchQuery ? 'No knowledge bases found' : 'No knowledge bases yet'}
                    </h3>
                    <p className="text-sm text-textSecondary mb-md">
                        {searchQuery ? 'Try a different search term' : 'Upload your first knowledge base to get started'}
                    </p>
                    {!searchQuery && canUpload && (
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="
                                inline-flex items-center gap-xs
                                bg-primary text-white font-semibold
                                px-md py-sm
                                rounded-[var(--radius-md)]
                                hover:opacity-90
                                transition-all
                            "
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload KB</span>
                        </button>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadKBModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => {
                        setShowUploadModal(false);
                        checkAuth();
                    }}
                    orgId={orgId}
                />
            )}
        </div>
    );
}

// Upload Modal Component
function UploadKBModal({ onClose, onSuccess, orgId }: any) {
    const supabase = createClient();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        setIsUploading(true);

        try {
            // Upload file to Supabase storage
            const filePath = `${orgId}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('knowledge-bases')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Create KB record
            const { error: dbError } = await supabase
                .from('knowledge_bases')
                .insert({
                    org_id: orgId,
                    name: formData.name,
                    version: 1,
                    data: {
                        description: formData.description || '',
                        file_path: filePath,
                        uploaded_at: new Date().toISOString(),
                    },
                });

            if (dbError) throw dbError;

            toast.success('Knowledge base uploaded successfully!');
            onSuccess();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload knowledge base');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
            <div className="card max-w-lg w-full">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Upload Knowledge Base
                </h2>

                <form onSubmit={handleSubmit} className="space-y-md">
                    <div>
                        <label className="block text-sm font-semibold text-textPrimary mb-xs">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="
                                w-full px-md py-sm
                                bg-background text-textPrimary
                                border border-border rounded-[var(--radius-md)]
                                focus:outline-none focus:ring-2 focus:ring-borderFocus
                                transition-all
                            "
                            placeholder="My Knowledge Base"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-textPrimary mb-xs">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="
                                w-full px-md py-sm
                                bg-background text-textPrimary
                                border border-border rounded-[var(--radius-md)]
                                focus:outline-none focus:ring-2 focus:ring-borderFocus
                                transition-all
                                min-h-[80px]
                            "
                            placeholder="What is this knowledge base about?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-textPrimary mb-xs">
                            File *
                        </label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            accept=".txt,.pdf,.doc,.docx"
                            className="
                                w-full px-md py-sm
                                bg-background text-textPrimary
                                border border-border rounded-[var(--radius-md)]
                                focus:outline-none focus:ring-2 focus:ring-borderFocus
                                transition-all
                                file:mr-sm file:py-xs file:px-sm
                                file:rounded-full file:border-0
                                file:bg-primary/10 file:text-primary
                                file:cursor-pointer
                            "
                            required
                        />
                        <p className="text-xs text-textTertiary mt-xs">
                            Supported: TXT, PDF, DOC, DOCX (max 10MB)
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-md pt-md border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="
                                px-lg py-sm
                                text-textSecondary font-semibold
                                hover:bg-surfaceHover
                                rounded-[var(--radius-md)]
                                transition-all
                            "
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="
                                flex items-center gap-sm
                                bg-primary text-white font-semibold
                                px-lg py-sm
                                rounded-[var(--radius-md)]
                                hover:opacity-90
                                disabled:opacity-50
                                transition-all
                            "
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Upload</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
