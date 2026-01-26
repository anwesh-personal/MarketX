'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Database,
    Plus,
    Search,
    RefreshCw,
    ChevronRight,
    FileText,
    Clock,
    Trash2,
    X,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { KBEditor } from '@/components/kb/KBEditor';
import { KnowledgeBase } from '@/lib/kb';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface KBListItem {
    id: string;
    name: string;
    version: number;
    data?: KnowledgeBase;
    created_at: string;
    updated_at: string;
}

interface KBFull extends KBListItem {
    data: KnowledgeBase;
}

export default function KBManagerPage() {
    const router = useRouter();
    const supabase = createClient();
    const [kbs, setKbs] = useState<KBListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKb, setSelectedKb] = useState<KBFull | null>(null);
    const [loadingKb, setLoadingKb] = useState(false);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [newKbDescription, setNewKbDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Check auth and get org
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', user.id)
                .single();

            if (userData?.org_id) {
                setOrgId(userData.org_id);
            }
        };

        checkAuth();
    }, [router, supabase]);

    // Fetch KB list
    const fetchKbs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/kb' + (orgId ? `?orgId=${orgId}` : ''));
            const data = await res.json();
            if (data.success) {
                setKbs(data.kbs || []);
            } else {
                toast.error(data.error || 'Failed to fetch KBs');
            }
        } catch (error: any) {
            toast.error('Failed to fetch KBs');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchKbs();
    }, [fetchKbs]);

    // Select a KB
    const selectKb = useCallback(async (kb: KBListItem) => {
        setLoadingKb(true);
        try {
            const res = await fetch(`/api/kb/${kb.id}`);
            const data = await res.json();
            if (data.success) {
                setSelectedKb(data.kb);
            } else {
                toast.error(data.error || 'Failed to load KB');
            }
        } catch (error: any) {
            toast.error('Failed to load KB');
        } finally {
            setLoadingKb(false);
        }
    }, []);

    // Create new KB
    const createKb = useCallback(async () => {
        if (!newKbName.trim()) {
            toast.error('Name is required');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/kb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newKbName.trim(),
                    description: newKbDescription.trim() || null,
                    orgId,
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('KB created');
                setShowCreateModal(false);
                setNewKbName('');
                setNewKbDescription('');
                fetchKbs();
                setSelectedKb(data.kb);
            } else {
                toast.error(data.error || 'Failed to create KB');
            }
        } catch (error: any) {
            toast.error('Failed to create KB');
        } finally {
            setCreating(false);
        }
    }, [newKbName, newKbDescription, orgId, fetchKbs]);

    // Save KB
    const saveKb = useCallback(async (kb: KnowledgeBase) => {
        if (!selectedKb) return;

        const res = await fetch(`/api/kb/${selectedKb.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: kb,
                incrementVersion: true,
            }),
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to save');
        }

        toast.success('KB saved');
        setSelectedKb(data.kb);
        fetchKbs();
    }, [selectedKb, fetchKbs]);

    // Duplicate KB
    const duplicateKb = useCallback(async () => {
        if (!selectedKb) return;

        try {
            const res = await fetch(`/api/kb/${selectedKb.id}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('KB duplicated');
                fetchKbs();
                setSelectedKb(data.kb);
            } else {
                toast.error(data.error || 'Failed to duplicate');
            }
        } catch (error: any) {
            toast.error('Failed to duplicate KB');
        }
    }, [selectedKb, fetchKbs]);

    // Delete KB
    const deleteKb = useCallback(async () => {
        if (!selectedKb) return;

        if (!confirm(`Delete "${selectedKb.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/kb/${selectedKb.id}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (data.success) {
                toast.success('KB deleted');
                setSelectedKb(null);
                fetchKbs();
            } else {
                toast.error(data.error || 'Failed to delete');
            }
        } catch (error: any) {
            toast.error('Failed to delete KB');
        }
    }, [selectedKb, fetchKbs]);

    // Filter KBs
    const filteredKbs = kbs.filter(kb =>
        kb.name.toLowerCase().includes(search.toLowerCase()) ||
        kb.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-64px)] bg-background text-textPrimary">
            {/* Sidebar - KB List */}
            <div className="w-80 border-r border-border flex flex-col bg-surface">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <h1 className="font-semibold">Knowledge Bases</h1>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="p-2 bg-primary rounded-lg hover:opacity-90 transition text-white"
                            title="Create new KB"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary" />
                        <input
                            type="text"
                            placeholder="Search KBs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                </div>

                {/* KB List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-5 h-5 animate-spin text-textTertiary" />
                        </div>
                    ) : filteredKbs.length === 0 ? (
                        <div className="p-4 text-center text-textTertiary">
                            {search ? 'No matching KBs' : 'No KBs yet. Create one!'}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredKbs.map((kb) => (
                                <button
                                    key={kb.id}
                                    onClick={() => selectKb(kb)}
                                    className={`w-full text-left p-3 rounded-lg transition ${selectedKb?.id === kb.id
                                        ? 'bg-primary/10 border border-primary/30'
                                        : 'hover:bg-surfaceHover border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-textTertiary shrink-0" />
                                                <span className="font-medium truncate">{kb.name}</span>
                                            </div>
                                            {kb.description && (
                                                <p className="text-xs text-textTertiary mt-1 truncate">
                                                    {kb.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 text-xs text-textTertiary">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(kb.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded ${kb.stage === 'embeddings-enabled'
                                                    ? 'bg-success/20 text-success'
                                                    : 'bg-warning/20 text-warning'
                                                    }`}>
                                                    v{kb.version || '1.0.0'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-textTertiary transition ${selectedKb?.id === kb.id ? 'text-primary' : ''
                                            }`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Refresh */}
                <div className="p-3 border-t border-border">
                    <button
                        onClick={fetchKbs}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-textSecondary hover:text-textPrimary transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 flex flex-col">
                {loadingKb ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : selectedKb ? (
                    <KBEditor
                        kb={selectedKb.data}
                        kbId={selectedKb.id}
                        kbName={selectedKb.name}
                        onSave={saveKb}
                        onDuplicate={duplicateKb}
                        onDelete={deleteKb}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-textTertiary">
                        <div className="text-center">
                            <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg text-textSecondary">Select a Knowledge Base to edit</p>
                            <p className="text-sm mt-2">or create a new one</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 px-4 py-2 bg-primary rounded-lg hover:opacity-90 transition text-white"
                            >
                                <Plus className="w-4 h-4 inline mr-2" />
                                Create KB
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Create Knowledge Base</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-surfaceHover rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-textSecondary mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newKbName}
                                    onChange={(e) => setNewKbName(e.target.value)}
                                    placeholder="e.g., InMarket Core KB"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-textSecondary mb-1">Description</label>
                                <textarea
                                    value={newKbDescription}
                                    onChange={(e) => setNewKbDescription(e.target.value)}
                                    placeholder="Optional description..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                            </div>

                            <p className="text-xs text-textTertiary">
                                A new KB will be created with the default structure matching Tommy's 12-section schema.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-textSecondary hover:text-textPrimary transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createKb}
                                disabled={creating || !newKbName.trim()}
                                className="px-4 py-2 bg-primary rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create KB'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
