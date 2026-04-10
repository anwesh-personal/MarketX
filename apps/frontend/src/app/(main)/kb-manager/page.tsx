'use client';

/**
 * KB Manager — User-facing Knowledge Base management page.
 *
 * Two modes:
 *   1. UPLOAD mode — user drags in a company document, AI extracts KB sections,
 *      user reviews and saves.
 *   2. EDITOR mode — raw markdown editor for advanced edits (existing KBEditor).
 *
 * Navigation: Brain > Knowledge Base (sidebar Intelligence group)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Database,
    Plus,
    Search,
    RefreshCw,
    FileText,
    Clock,
    Trash2,
    X,
    Loader2,
    ChevronRight,
    Upload,
    Edit3,
    Sparkles,
} from 'lucide-react';
import { KBEditor } from '@/components/kb/KBEditor';
import { DocumentUploader } from '@/components/kb/DocumentUploader';
import { ExtractionReview } from '@/components/kb/ExtractionReview';
import { KnowledgeBase } from '@/lib/kb';
import type { ExtractedKBSections } from '@/lib/kb/kb-extractor';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useFeatureGate } from '@/lib/useFeatureGate';
import { UpgradeWall } from '@/components/UpgradeWall';

// ─── Types ────────────────────────────────────────────────────

interface KBListItem {
    id: string;
    name: string;
    description?: string;
    version: number;
    stage?: string;
    data?: KnowledgeBase;
    created_at: string;
    updated_at: string;
}

interface KBFull extends KBListItem {
    data: KnowledgeBase;
}

type PageMode = 'list' | 'upload' | 'review' | 'editor';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Maps AI-extracted sections into the KnowledgeBase schema shape.
 * Any sections not extractable get sensible defaults for the user to fill in.
 */
function buildKBFromExtraction(sections: ExtractedKBSections, kbName: string): KnowledgeBase {
    return {
        schema_version: '1.0.0',
        kb_version: '1.0.0',
        stage: 'pre-embeddings' as const,

        brand: {
            brand_name_exact: sections.brand_name || kbName,
            voice_rules: sections.voice_rules.length ? sections.voice_rules : ['Professional and direct'],
            compliance: {
                forbidden_claims: sections.forbidden_claims,
                required_disclosures: sections.required_disclosures,
            },
        },

        icp_library: {
            segments: sections.icp_segments.length
                ? sections.icp_segments.map((seg, i) => ({
                    icp_id: `icp_${i + 1}`,
                    segment_name: seg.segment_name || `Segment ${i + 1}`,
                    industry_group_norm: seg.industry || 'General',
                    revenue_band_norm: seg.revenue_band,
                    seniority_norm: seg.seniority,
                    pain_points: seg.pain_points.length ? seg.pain_points : ['Pain point to be defined'],
                    job_titles: seg.job_titles.length ? seg.job_titles : ['Decision Maker'],
                    buying_triggers: seg.buying_triggers.length ? seg.buying_triggers : ['Trigger to be defined'],
                    decision_criteria: seg.decision_criteria.length ? seg.decision_criteria : ['Criteria to be defined'],
                }))
                : [{
                    icp_id: 'icp_1',
                    segment_name: 'Primary ICP',
                    industry_group_norm: 'To be defined',
                    revenue_band_norm: 'MM' as const,
                    seniority_norm: 'DIRECTOR' as const,
                    pain_points: ['Define your ICP pain points'],
                    job_titles: ['Define target job titles'],
                    buying_triggers: ['Define buying triggers'],
                    decision_criteria: ['Define decision criteria'],
                }],
        },

        offer_library: {
            offers: sections.offers.length
                ? sections.offers.map((offer, i) => ({
                    offer_id: `offer_${i + 1}`,
                    offer_name: offer.offer_name || `Offer ${i + 1}`,
                    category: offer.category || 'Service',
                    value_proposition: offer.value_proposition || 'To be defined',
                    differentiators: offer.differentiators.length ? offer.differentiators : ['Define differentiators'],
                    pricing_model: offer.pricing_model || 'To be defined',
                    delivery_timeline: offer.delivery_timeline || 'To be defined',
                    proof_points: offer.proof_points.length ? offer.proof_points : ['Add case studies and proof points'],
                }))
                : [{
                    offer_id: 'offer_1',
                    offer_name: 'Primary Offer',
                    category: 'Service',
                    value_proposition: 'Define your value proposition',
                    differentiators: ['Define your differentiators'],
                    pricing_model: 'To be defined',
                    delivery_timeline: 'To be defined',
                    proof_points: ['Add proof points'],
                }],
        },

        angles_library: {
            angles: sections.angles.length
                ? sections.angles.map((a, i) => ({
                    angle_id: `angle_${i + 1}`,
                    angle_name: a.angle_name || `Angle ${i + 1}`,
                    axis: a.axis,
                    narrative: a.narrative || 'Define this angle narrative',
                }))
                : [{
                    angle_id: 'angle_1',
                    angle_name: 'Primary Angle',
                    axis: 'upside' as const,
                    narrative: 'Define your primary positioning angle',
                }],
        },

        ctas_library: {
            ctas: sections.ctas.length
                ? sections.ctas.map((c, i) => ({
                    cta_id: `cta_${i + 1}`,
                    cta_type: c.cta_type,
                    label: c.label || 'Learn more',
                    destination_type: c.destination_type || 'calendar',
                    destination_slug: c.destination_slug || 'book-call',
                }))
                : [{
                    cta_id: 'cta_1',
                    cta_type: 'BOOK_CALL' as const,
                    label: 'Book a 15-minute call',
                    destination_type: 'calendar',
                    destination_slug: 'book-call',
                }],
        },

        // Populate remaining required sections with sensible defaults
        // Users can refine these via the markdown editor
        website_library: {
            page_blueprints: [{
                blueprint_id: 'bp_1',
                page_type: 'LANDING',
                buyer_stage: 'CONSIDERATION' as const,
                required_sections: ['hero', 'value', 'proof', 'cta'],
                default_cta_type: 'BOOK_CALL' as const,
            }],
            layouts: [{
                layout_id: 'layout_1',
                layout_name: 'Standard',
                structure: ['hero', 'features', 'proof', 'cta'],
            }],
        },

        email_library: {
            flow_blueprints: [{
                flow_blueprint_id: 'flow_1',
                flow_name: 'Primary Outreach',
                goal: 'MEANINGFUL_REPLY' as const,
                length_range: { min: 3, max: 5 },
                sequence_structure: ['intro', 'value', 'proof', 'ask'],
                default_cta_type: 'REPLY' as const,
            }],
            subject_firstline_variants: [{
                variant_id: 'v_1',
                subject: 'Quick question about {company_name}',
                first_line: 'I noticed {trigger_event} — wanted to reach out.',
            }],
            reply_playbooks: [{
                playbook_id: 'pb_1',
                playbook_name: 'Standard Reply Playbook',
                scenarios: [{
                    scenario_id: 'sc_1',
                    description: 'Positive reply',
                    allowed_strategy_ids: ['rs_1'],
                }],
            }],
            reply_strategies: [{
                strategy_id: 'rs_1',
                strategy_name: 'Calendar First',
                strategy_type: 'CALENDAR_FIRST' as const,
                rules: ['If positive intent detected, send calendar link immediately'],
            }],
        },

        social_library: {
            pillars: [{
                pillar_id: 'p_1',
                pillar_name: 'Thought Leadership',
                description: 'Education-first content that builds authority',
            }],
            post_blueprints: [{
                post_blueprint_id: 'spb_1',
                platform: 'LinkedIn' as const,
                post_type: 'insight' as const,
                structure_rules: ['Hook (1 line)', 'Insight (3–5 lines)', 'CTA (1 line)'],
            }],
        },

        routing: { defaults: [], rules: [] },

        testing: {
            pages: { enabled: false, max_variants: 2, evaluation_window_days: 7, min_sample_size: 100 },
            email_flows: { enabled: true, max_variants: 2, evaluation_window_days: 7, min_sample_size: 100 },
            email_replies: { enabled: false, max_variants: 2, evaluation_window_days: 7, min_sample_size: 100 },
            subject_firstline: { enabled: true, max_variants: 5, evaluation_window_days: 7, min_sample_size: 100 },
        },

        guardrails: { paused_patterns: [] },
        learning: { history: [], preferences: [] },
    };
}

// ─── Component ────────────────────────────────────────────────

export default function KBManagerPage() {
    const router = useRouter();
    const supabase = createClient();
    const { allowed: canViewKb, loading: gateLoading, tier } = useFeatureGate('can_view_kb');

    const [mode, setMode] = useState<PageMode>('list');
    const [kbs, setKbs] = useState<KBListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKb, setSelectedKb] = useState<KBFull | null>(null);
    const [loadingKb, setLoadingKb] = useState(false);
    const [search, setSearch] = useState('');
    const [orgId, setOrgId] = useState<string | null>(null);

    // Extraction state
    const [extractedSections, setExtractedSections] = useState<ExtractedKBSections | null>(null);
    const [extractedFileName, setExtractedFileName] = useState('');
    const [extractedProvider, setExtractedProvider] = useState('');
    const [pendingKbName, setPendingKbName] = useState('');

    // ── Auth ──
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            const { data: userData } = await supabase
                .from('users').select('org_id').eq('id', user.id).single();
            if (userData?.org_id) setOrgId(userData.org_id);
        };
        init();
    }, [router, supabase]);

    // ── Fetch KB list ──
    const fetchKbs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/kb' + (orgId ? `?orgId=${orgId}` : ''));
            const data = await res.json();
            if (data.success) setKbs(data.kbs || []);
            else toast.error(data.error || 'Failed to fetch knowledge bases');
        } catch {
            toast.error('Failed to fetch knowledge bases');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { fetchKbs(); }, [fetchKbs]);

    // ── Select KB for editing ──
    const selectKb = useCallback(async (kb: KBListItem) => {
        setLoadingKb(true);
        try {
            const res = await fetch(`/api/kb/${kb.id}`);
            const data = await res.json();
            if (data.success) {
                setSelectedKb(data.kb);
                setMode('editor');
            } else toast.error(data.error || 'Failed to load knowledge base');
        } catch {
            toast.error('Failed to load knowledge base');
        } finally {
            setLoadingKb(false);
        }
    }, []);

    // ── Save KB ──
    const saveKb = useCallback(async (kb: KnowledgeBase) => {
        if (!selectedKb) return;
        const res = await fetch(`/api/kb/${selectedKb.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: kb, incrementVersion: true }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to save');
        toast.success('Knowledge base saved');
        setSelectedKb(data.kb);
        fetchKbs();
    }, [selectedKb, fetchKbs]);

    // ── Delete KB ──
    const deleteKb = useCallback(async () => {
        if (!selectedKb || !confirm(`Delete "${selectedKb.name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/kb/${selectedKb.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            toast.success('Knowledge base deleted');
            setSelectedKb(null);
            setMode('list');
            fetchKbs();
        } else toast.error(data.error || 'Failed to delete');
    }, [selectedKb, fetchKbs]);

    // ── After extraction: AI returns sections ──
    const handleExtracted = useCallback((
        sections: ExtractedKBSections,
        fileName: string,
        providerUsed: string
    ) => {
        setExtractedSections(sections);
        setExtractedFileName(fileName);
        setExtractedProvider(providerUsed);
        // Pre-fill the KB name from the brand name
        setPendingKbName(sections.brand_name || fileName.replace(/\.(pdf|docx|txt|md)$/i, ''));
        setMode('review');
    }, []);

    // ── Confirm extracted sections → save as new KB ──
    const handleConfirmExtraction = useCallback(async (sections: ExtractedKBSections) => {
        const kbName = pendingKbName.trim() || sections.brand_name || 'New Knowledge Base';
        const kbData = buildKBFromExtraction(sections, kbName);

        const res = await fetch('/api/kb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: kbName, data: kbData, orgId }),
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Failed to save knowledge base');

        toast.success(`"${kbName}" saved to your Knowledge Base`);
        fetchKbs();
        setSelectedKb(data.kb);
        setExtractedSections(null);
        setMode('editor');
    }, [pendingKbName, orgId, fetchKbs]);

    const filteredKbs = kbs.filter(kb =>
        kb.name.toLowerCase().includes(search.toLowerCase())
    );

    // ── Feature gate ──
    if (gateLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-5 h-5 animate-spin text-textTertiary" />
            </div>
        );
    }
    if (!canViewKb) {
        return <UpgradeWall feature="Knowledge Base" tier={tier} />;
    }

    // ── Render ──
    return (
        <div className="flex h-[calc(100vh-64px)] bg-background text-textPrimary overflow-hidden">

            {/* ── Sidebar: KB List ── */}
            <aside className="w-80 border-r border-border flex flex-col bg-surface flex-shrink-0">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-accent" />
                            <h1 className="font-semibold text-sm">Knowledge Bases</h1>
                        </div>
                        <button
                            id="kb-upload-new-btn"
                            onClick={() => { setSelectedKb(null); setMode('upload'); }}
                            className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition"
                            title="Upload company document"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textTertiary" />
                        <input
                            type="text"
                            placeholder="Search…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-20">
                            <Loader2 className="w-4 h-4 animate-spin text-textTertiary" />
                        </div>
                    ) : filteredKbs.length === 0 ? (
                        <div className="p-6 text-center text-textTertiary text-sm space-y-2">
                            <Database className="w-8 h-8 mx-auto opacity-30" />
                            {search ? (
                                <p>No matching knowledge bases</p>
                            ) : (
                                <>
                                    <p className="font-medium">No knowledge bases yet</p>
                                    <p className="text-xs">Upload your company document to get started</p>
                                    <button
                                        onClick={() => setMode('upload')}
                                        className="mt-2 text-xs text-accent hover:underline flex items-center gap-1 mx-auto"
                                    >
                                        <Upload className="w-3 h-3" /> Upload document
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredKbs.map(kb => (
                                <button
                                    key={kb.id}
                                    id={`kb-item-${kb.id}`}
                                    onClick={() => selectKb(kb)}
                                    className={`w-full text-left p-3 rounded-lg transition border ${
                                        selectedKb?.id === kb.id
                                            ? 'bg-surfaceElevated border-accent/30'
                                            : 'hover:bg-surfaceHover border-transparent'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-textTertiary flex-shrink-0" />
                                                <span className="font-medium text-sm truncate">{kb.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-textTertiary">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(kb.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                    kb.stage === 'embeddings-enabled'
                                                        ? 'bg-success/10 text-success'
                                                        : 'bg-warning/10 text-warning'
                                                }`}>
                                                    v{kb.version}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 text-textTertiary transition ${selectedKb?.id === kb.id ? 'text-accent' : ''}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-border">
                    <button
                        onClick={fetchKbs}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-textSecondary hover:text-textPrimary transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                {/* UPLOAD MODE */}
                {mode === 'upload' && (
                    <div className="max-w-xl mx-auto p-8 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">Upload Company Document</h2>
                            <p className="text-sm text-textSecondary mt-1">
                                Drop your company PDF, DOCX, TXT, or MD file. The AI will extract your brand, ICP,
                                offers, angles, and CTAs automatically.
                            </p>
                        </div>
                        <DocumentUploader
                            onExtracted={handleExtracted}
                            onCancel={() => setMode('list')}
                        />
                    </div>
                )}

                {/* REVIEW MODE */}
                {mode === 'review' && extractedSections && (
                    <div className="max-w-2xl mx-auto p-8 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-textPrimary">Review Extracted Data</h2>
                            <p className="text-sm text-textSecondary">
                                Review what the AI extracted from your document. Edit any fields, add missing info,
                                then save to your Knowledge Base.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-textSecondary">Knowledge Base Name</label>
                            <input
                                type="text"
                                value={pendingKbName}
                                onChange={e => setPendingKbName(e.target.value)}
                                placeholder="e.g. Acme Corp Q2 2026"
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                        </div>
                        <ExtractionReview
                            sections={extractedSections}
                            fileName={extractedFileName}
                            providerUsed={extractedProvider}
                            onConfirm={handleConfirmExtraction}
                            onDiscard={() => {
                                setExtractedSections(null);
                                setMode('upload');
                            }}
                        />
                    </div>
                )}

                {/* EDITOR MODE */}
                {mode === 'editor' && (
                    <>
                        {loadingKb ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                            </div>
                        ) : selectedKb ? (
                            <KBEditor
                                kb={selectedKb.data}
                                kbId={selectedKb.id}
                                kbName={selectedKb.name}
                                onSave={saveKb}
                                onDelete={deleteKb}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-textTertiary">
                                <p>Select a knowledge base from the list</p>
                            </div>
                        )}
                    </>
                )}

                {/* LIST EMPTY STATE */}
                {mode === 'list' && (
                    <div className="flex flex-col items-center justify-center h-full text-textTertiary space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-accent/50" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="font-semibold text-textSecondary">Select a knowledge base</p>
                            <p className="text-sm">or upload a company document to create one</p>
                        </div>
                        <button
                            onClick={() => setMode('upload')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Document
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
