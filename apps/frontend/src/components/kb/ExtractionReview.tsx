'use client';

/**
 * ExtractionReview
 *
 * Shown after AI extraction completes. Displays all extracted sections
 * in a clean, editable format. User can review, edit, then confirm
 * to merge into their Knowledge Base.
 *
 * Sections are grouped by category. Missing sections are highlighted
 * so the user knows what to fill in manually.
 */

import { useState, useCallback } from 'react';
import {
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Edit3,
    Save,
    Plus,
    Trash2,
    Loader2,
    Sparkles,
    Info,
} from 'lucide-react';
import type { ExtractedKBSections } from '@/lib/kb/kb-extractor';

interface ExtractionReviewProps {
    sections: ExtractedKBSections;
    fileName: string;
    providerUsed: string;
    onConfirm: (sections: ExtractedKBSections) => Promise<void>;
    onDiscard: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-error';
    const bg = pct >= 80 ? 'bg-success/10' : pct >= 60 ? 'bg-warning/10' : 'bg-error/10';
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${color}`}>
            <Sparkles className="w-3 h-3" />
            {pct}% confidence
        </span>
    );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surfaceHover transition"
            >
                <span className="flex items-center gap-2 font-semibold text-sm text-textPrimary">
                    <span>{icon}</span>{title}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-textTertiary" /> : <ChevronDown className="w-4 h-4 text-textTertiary" />}
            </button>
            {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
        </div>
    );
}

function InlineEdit({
    value,
    onChange,
    placeholder,
    multiline = false,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
}) {
    const cls = 'w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition';
    return multiline ? (
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`${cls} resize-none`}
        />
    ) : (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={cls}
        />
    );
}

function TagListEditor({
    items,
    onChange,
    placeholder,
}: {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
}) {
    const addItem = () => onChange([...items, '']);
    const updateItem = (i: number, v: string) => {
        const next = [...items];
        next[i] = v;
        onChange(next);
    };
    const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={item}
                        onChange={e => updateItem(i, e.target.value)}
                        placeholder={placeholder ?? 'Enter value…'}
                        className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                    />
                    <button
                        onClick={() => removeItem(i)}
                        className="p-1 text-textTertiary hover:text-error transition"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-accent hover:underline transition"
            >
                <Plus className="w-3 h-3" /> Add
            </button>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────

export function ExtractionReview({
    sections: initialSections,
    fileName,
    providerUsed,
    onConfirm,
    onDiscard,
}: ExtractionReviewProps) {
    const [sections, setSections] = useState<ExtractedKBSections>(initialSections);
    const [saving, setSaving] = useState(false);

    const update = useCallback(<K extends keyof ExtractedKBSections>(
        key: K,
        value: ExtractedKBSections[K]
    ) => {
        setSections(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleConfirm = async () => {
        setSaving(true);
        try {
            await onConfirm(sections);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
                <div className="space-y-1">
                    <p className="font-semibold text-textPrimary text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        AI Extraction Complete
                    </p>
                    <p className="text-xs text-textSecondary">
                        From <strong>{fileName}</strong> via {providerUsed}
                    </p>
                    {sections.missing_sections?.length > 0 && (
                        <p className="text-xs text-warning flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {sections.missing_sections.length} section(s) need manual input: {sections.missing_sections.join(', ')}
                        </p>
                    )}
                </div>
                <ConfidenceBadge confidence={sections.confidence} />
            </div>

            {/* Brand */}
            <SectionCard title="Brand & Voice" icon="🏢">
                <div className="space-y-1">
                    <label className="text-xs text-textSecondary font-medium">Brand Name (exact)</label>
                    <InlineEdit
                        value={sections.brand_name}
                        onChange={v => update('brand_name', v)}
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-textSecondary font-medium">Voice & Tone Rules</label>
                    <TagListEditor
                        items={sections.voice_rules}
                        onChange={v => update('voice_rules', v)}
                        placeholder="e.g. Direct and confident"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-textSecondary font-medium">Forbidden Claims</label>
                    <TagListEditor
                        items={sections.forbidden_claims}
                        onChange={v => update('forbidden_claims', v)}
                        placeholder="e.g. We guarantee results"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-textSecondary font-medium">Required Disclosures</label>
                    <TagListEditor
                        items={sections.required_disclosures}
                        onChange={v => update('required_disclosures', v)}
                        placeholder="e.g. Results may vary"
                    />
                </div>
            </SectionCard>

            {/* ICP Segments */}
            <SectionCard title={`ICP Segments (${sections.icp_segments.length})`} icon="🎯">
                {sections.icp_segments.map((seg, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent">Segment {i + 1}</span>
                            <button
                                onClick={() => update('icp_segments', sections.icp_segments.filter((_, idx) => idx !== i))}
                                className="p-1 text-textTertiary hover:text-error transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <InlineEdit
                            value={seg.segment_name}
                            onChange={v => { const next = [...sections.icp_segments]; next[i] = { ...next[i], segment_name: v }; update('icp_segments', next); }}
                            placeholder="Segment name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-textTertiary">Revenue Band</label>
                                <select
                                    value={seg.revenue_band}
                                    onChange={e => { const next = [...sections.icp_segments]; next[i] = { ...next[i], revenue_band: e.target.value as any }; update('icp_segments', next); }}
                                    className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                >
                                    {['SMB', 'LMM', 'MM', 'ENT'].map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-textTertiary">Seniority</label>
                                <select
                                    value={seg.seniority}
                                    onChange={e => { const next = [...sections.icp_segments]; next[i] = { ...next[i], seniority: e.target.value as any }; update('icp_segments', next); }}
                                    className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                >
                                    {['IC', 'MANAGER', 'DIRECTOR', 'EXEC'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-textTertiary">Pain Points</label>
                            <TagListEditor
                                items={seg.pain_points}
                                onChange={v => { const next = [...sections.icp_segments]; next[i] = { ...next[i], pain_points: v }; update('icp_segments', next); }}
                                placeholder="e.g. Manual outreach is too slow"
                            />
                        </div>
                    </div>
                ))}
                <button
                    onClick={() => update('icp_segments', [...sections.icp_segments, {
                        segment_name: '', industry: '', revenue_band: 'MM', seniority: 'DIRECTOR',
                        pain_points: [], job_titles: [], buying_triggers: [], decision_criteria: [],
                    }])}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add Segment
                </button>
            </SectionCard>

            {/* Offers */}
            <SectionCard title={`Offers (${sections.offers.length})`} icon="💼">
                {sections.offers.map((offer, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent">Offer {i + 1}</span>
                            <button
                                onClick={() => update('offers', sections.offers.filter((_, idx) => idx !== i))}
                                className="p-1 text-textTertiary hover:text-error transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <InlineEdit
                            value={offer.offer_name}
                            onChange={v => { const next = [...sections.offers]; next[i] = { ...next[i], offer_name: v }; update('offers', next); }}
                            placeholder="Offer name"
                        />
                        <InlineEdit
                            value={offer.value_proposition}
                            onChange={v => { const next = [...sections.offers]; next[i] = { ...next[i], value_proposition: v }; update('offers', next); }}
                            placeholder="Value proposition"
                            multiline
                        />
                        <div>
                            <label className="text-xs text-textTertiary">Proof Points</label>
                            <TagListEditor
                                items={offer.proof_points}
                                onChange={v => { const next = [...sections.offers]; next[i] = { ...next[i], proof_points: v }; update('offers', next); }}
                                placeholder="e.g. 40% higher reply rates"
                            />
                        </div>
                    </div>
                ))}
                <button
                    onClick={() => update('offers', [...sections.offers, {
                        offer_name: '', category: '', value_proposition: '',
                        differentiators: [], pricing_model: '', delivery_timeline: '', proof_points: [],
                    }])}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add Offer
                </button>
            </SectionCard>

            {/* Angles */}
            <SectionCard title={`Angles (${sections.angles.length})`} icon="📐">
                {sections.angles.map((angle, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent">Angle {i + 1}</span>
                            <button
                                onClick={() => update('angles', sections.angles.filter((_, idx) => idx !== i))}
                                className="p-1 text-textTertiary hover:text-error transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <InlineEdit
                            value={angle.angle_name}
                            onChange={v => { const next = [...sections.angles]; next[i] = { ...next[i], angle_name: v }; update('angles', next); }}
                            placeholder="Angle name"
                        />
                        <div>
                            <label className="text-xs text-textTertiary">Axis</label>
                            <select
                                value={angle.axis}
                                onChange={e => { const next = [...sections.angles]; next[i] = { ...next[i], axis: e.target.value as any }; update('angles', next); }}
                                className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/30"
                            >
                                {['risk', 'speed', 'control', 'loss', 'upside', 'identity'].map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                        <InlineEdit
                            value={angle.narrative}
                            onChange={v => { const next = [...sections.angles]; next[i] = { ...next[i], narrative: v }; update('angles', next); }}
                            placeholder="How the company frames this angle"
                            multiline
                        />
                    </div>
                ))}
                <button
                    onClick={() => update('angles', [...sections.angles, { angle_name: '', axis: 'upside', narrative: '' }])}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add Angle
                </button>
            </SectionCard>

            {/* CTAs */}
            <SectionCard title={`CTAs (${sections.ctas.length})`} icon="📢">
                {sections.ctas.map((cta, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent">CTA {i + 1}</span>
                            <button
                                onClick={() => update('ctas', sections.ctas.filter((_, idx) => idx !== i))}
                                className="p-1 text-textTertiary hover:text-error transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-textTertiary">Type</label>
                                <select
                                    value={cta.cta_type}
                                    onChange={e => { const next = [...sections.ctas]; next[i] = { ...next[i], cta_type: e.target.value as any }; update('ctas', next); }}
                                    className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                >
                                    {['REPLY', 'CLICK', 'BOOK_CALL', 'DOWNLOAD', 'OTHER'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-textTertiary">Label</label>
                                <input
                                    type="text"
                                    value={cta.label}
                                    onChange={e => { const next = [...sections.ctas]; next[i] = { ...next[i], label: e.target.value }; update('ctas', next); }}
                                    placeholder="e.g. Book a 15-min call"
                                    className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                <button
                    onClick={() => update('ctas', [...sections.ctas, { cta_type: 'BOOK_CALL', label: '', destination_type: 'calendar', destination_slug: 'book-call' }])}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add CTA
                </button>
            </SectionCard>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                    onClick={onDiscard}
                    disabled={saving}
                    className="text-sm text-textSecondary hover:text-textPrimary transition"
                >
                    Discard & Upload Again
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={saving || !sections.brand_name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                        <><Save className="w-4 h-4" /> Save to Knowledge Base</>
                    )}
                </button>
            </div>
        </div>
    );
}
