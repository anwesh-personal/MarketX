'use client'

import React, { useState, useEffect } from 'react'
import {
    Settings, Save, Plus, X, Loader2, GripVertical, ChevronDown, ChevronUp,
    AlertTriangle, Check,
} from 'lucide-react'
import { superadminFetch } from '@/lib/superadmin-auth'
import {
    SuperadminPageHero, SuperadminPanel, SuperadminLoadingState,
    SuperadminBadge,
} from '@/components/SuperAdmin/surfaces'

interface ConfigRow {
    id: string
    config_key: string
    config_value: any
    description: string | null
    updated_at: string
}

// Human-readable labels for config keys
const KEY_LABELS: Record<string, string> = {
    dropdown_industries: 'Industries',
    dropdown_company_sizes: 'Company Sizes',
    dropdown_revenue_ranges: 'Revenue Ranges',
    dropdown_geographies: 'Geographies',
    dropdown_pricing_models: 'Pricing Models',
    dropdown_communication_styles: 'Communication Styles',
    dropdown_cta_types: 'CTA Types',
    dropdown_meeting_lengths: 'Meeting Lengths',
    dropdown_sales_cycle: 'Sales Cycle Options',
    dropdown_stakeholder_count: 'Stakeholder Count',
    dropdown_artifact_categories: 'Artifact Categories',
    steps: 'Wizard Steps',
}

export default function SuperadminFormConfigPage() {
    const [loading, setLoading] = useState(true)
    const [configs, setConfigs] = useState<ConfigRow[]>([])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState<string | null>(null)
    const [expandedKey, setExpandedKey] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<Record<string, any>>({})
    const [successKey, setSuccessKey] = useState<string | null>(null)

    useEffect(() => { loadConfigs() }, [])

    const loadConfigs = async () => {
        try {
            setLoading(true)
            const res = await superadminFetch('/api/superadmin/kb/form-config')
            const json = await res.json()
            if (json.success) {
                setConfigs(json.configs || [])
                // Initialize edit values
                const vals: Record<string, any> = {}
                for (const c of (json.configs || [])) {
                    vals[c.config_key] = c.config_value
                }
                setEditValues(vals)
            } else {
                setError(json.error)
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const saveConfig = async (key: string) => {
        setSaving(key)
        setError('')
        try {
            const res = await superadminFetch('/api/superadmin/kb/form-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config_key: key, config_value: editValues[key] }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            setSuccessKey(key)
            setTimeout(() => setSuccessKey(null), 2000)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(null)
        }
    }

    if (loading) return <SuperadminLoadingState label="Loading Form Config" />

    // Separate dropdowns from other configs
    const dropdowns = configs.filter(c => c.config_key.startsWith('dropdown_'))
    const otherConfigs = configs.filter(c => !c.config_key.startsWith('dropdown_'))

    return (
        <div className="space-y-6">
            <SuperadminPageHero
                eyebrow="Knowledge Base"
                title="Form Configuration"
                description="Edit dropdown options, wizard steps, and field configs. Changes take effect immediately for all clients."
            />

            {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {/* Dropdown Options */}
            <SuperadminPanel
                title="Dropdown Options"
                description={`${dropdowns.length} configurable dropdowns — add, remove, or reorder options`}
            >
                <div className="space-y-1">
                    {dropdowns.map(cfg => (
                        <DropdownEditor
                            key={cfg.config_key}
                            configKey={cfg.config_key}
                            label={KEY_LABELS[cfg.config_key] || cfg.config_key}
                            description={cfg.description}
                            values={editValues[cfg.config_key] || []}
                            onChange={(vals) => setEditValues(prev => ({ ...prev, [cfg.config_key]: vals }))}
                            onSave={() => saveConfig(cfg.config_key)}
                            saving={saving === cfg.config_key}
                            success={successKey === cfg.config_key}
                            expanded={expandedKey === cfg.config_key}
                            onToggle={() => setExpandedKey(expandedKey === cfg.config_key ? null : cfg.config_key)}
                            isComplex={cfg.config_key === 'dropdown_artifact_categories'}
                            updatedAt={cfg.updated_at}
                        />
                    ))}
                </div>
            </SuperadminPanel>

            {/* Other configs (steps, etc.) */}
            {otherConfigs.length > 0 && (
                <SuperadminPanel
                    title="Other Configuration"
                    description="Step definitions and structural configuration"
                >
                    <div className="space-y-1">
                        {otherConfigs.map(cfg => (
                            <DropdownEditor
                                key={cfg.config_key}
                                configKey={cfg.config_key}
                                label={KEY_LABELS[cfg.config_key] || cfg.config_key}
                                description={cfg.description}
                                values={editValues[cfg.config_key] || []}
                                onChange={(vals) => setEditValues(prev => ({ ...prev, [cfg.config_key]: vals }))}
                                onSave={() => saveConfig(cfg.config_key)}
                                saving={saving === cfg.config_key}
                                success={successKey === cfg.config_key}
                                expanded={expandedKey === cfg.config_key}
                                onToggle={() => setExpandedKey(expandedKey === cfg.config_key ? null : cfg.config_key)}
                                isComplex={cfg.config_key === 'steps'}
                                updatedAt={cfg.updated_at}
                            />
                        ))}
                    </div>
                </SuperadminPanel>
            )}
        </div>
    )
}

// ─── Dropdown Editor Component ──────────────────────────────────

interface DropdownEditorProps {
    configKey: string
    label: string
    description: string | null
    values: any[]
    onChange: (vals: any[]) => void
    onSave: () => void
    saving: boolean
    success: boolean
    expanded: boolean
    onToggle: () => void
    isComplex: boolean
    updatedAt: string
}

function DropdownEditor({
    configKey, label, description, values, onChange, onSave,
    saving, success, expanded, onToggle, isComplex, updatedAt,
}: DropdownEditorProps) {
    const [newValue, setNewValue] = useState('')

    const addItem = () => {
        if (!newValue.trim()) return
        if (isComplex) {
            // For artifact categories: add as object
            onChange([...values, { value: newValue.trim().toLowerCase().replace(/\s+/g, '_'), label: newValue.trim(), accept: '.pdf,.docx,.doc,.txt,.md' }])
        } else {
            onChange([...values, newValue.trim()])
        }
        setNewValue('')
    }

    const removeItem = (idx: number) => {
        onChange(values.filter((_, i) => i !== idx))
    }

    const moveItem = (idx: number, dir: -1 | 1) => {
        const arr = [...values]
        const target = idx + dir
        if (target < 0 || target >= arr.length) return
        ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
        onChange(arr)
    }

    const updateItem = (idx: number, val: string) => {
        const arr = [...values]
        if (isComplex) {
            arr[idx] = { ...arr[idx], label: val }
        } else {
            arr[idx] = val
        }
        onChange(arr)
    }

    const getDisplayLabel = (item: any) => {
        return typeof item === 'object' ? item.label : item
    }

    return (
        <div className="rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surfaceHover/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-textPrimary">{label}</div>
                        <div className="text-[10px] text-textTertiary">
                            {values.length} options · {description || configKey}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <SuperadminBadge tone="primary">{values.length}</SuperadminBadge>
                    {expanded ? <ChevronUp className="w-4 h-4 text-textTertiary" /> : <ChevronDown className="w-4 h-4 text-textTertiary" />}
                </div>
            </button>

            {/* Expanded editor */}
            {expanded && (
                <div className="border-t border-border/50 px-4 py-4 space-y-3 bg-surface/50">
                    {/* Item list */}
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                        {values.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                                <div className="flex flex-col gap-0.5">
                                    <button onClick={() => moveItem(idx, -1)} className="p-0.5 text-textTertiary hover:text-textPrimary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => moveItem(idx, 1)} className="p-0.5 text-textTertiary hover:text-textPrimary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-textTertiary/50 shrink-0" />
                                <input
                                    className="input flex-1 text-sm py-1.5"
                                    value={getDisplayLabel(item)}
                                    onChange={e => updateItem(idx, e.target.value)}
                                />
                                {isComplex && typeof item === 'object' && (
                                    <input
                                        className="input w-48 text-xs py-1.5 text-textTertiary"
                                        value={item.accept || ''}
                                        onChange={e => {
                                            const arr = [...values]
                                            arr[idx] = { ...arr[idx], accept: e.target.value }
                                            onChange(arr)
                                        }}
                                        placeholder="File types (.pdf,.docx)"
                                        title="Accepted file extensions"
                                    />
                                )}
                                <button
                                    onClick={() => removeItem(idx)}
                                    className="p-1.5 rounded-lg hover:bg-error/10 text-textTertiary hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add new */}
                    <div className="flex items-center gap-2">
                        <input
                            className="input flex-1 text-sm py-1.5"
                            placeholder={isComplex ? "New category label..." : "Add new option..."}
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addItem()}
                        />
                        <button
                            onClick={addItem}
                            disabled={!newValue.trim()}
                            className="btn btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>

                    {/* Save */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-[10px] text-textTertiary">
                            Last updated: {new Date(updatedAt).toLocaleString()}
                        </span>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="btn btn-accent-gradient px-4 py-1.5 text-sm flex items-center gap-1.5 rounded-lg"
                        >
                            {saving ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                            ) : success ? (
                                <><Check className="w-3.5 h-3.5" /> Saved!</>
                            ) : (
                                <><Save className="w-3.5 h-3.5" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
