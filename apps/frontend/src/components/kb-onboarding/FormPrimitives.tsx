/**
 * Shared UI primitives for the KB Onboarding Wizard steps.
 * Field, Textarea, MultiSelect, HelpTooltip, etc.
 */

import React from 'react'
import { HelpCircle, X, Plus } from 'lucide-react'

// ─── Field wrapper with label + optional help text ──────────────
export function Field({ label, hint, required, children }: {
    label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-textSecondary">
                {label}
                {required && <span className="text-accent text-xs">*</span>}
                {hint && (
                    <span className="tooltip ml-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-textTertiary" />
                        <span className="tooltip-content max-w-[280px] whitespace-normal text-left">
                            {hint}
                        </span>
                    </span>
                )}
            </label>
            {children}
        </div>
    )
}

// ─── Chip multi-select (toggle-based) ───────────────────────────
export function ChipSelect({ options, selected, onChange, allowCustom }: {
    options: string[]; selected: string[]; onChange: (val: string[]) => void; allowCustom?: boolean
}) {
    const [customInput, setCustomInput] = React.useState('')

    const toggle = (val: string) => {
        onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])
    }

    const addCustom = () => {
        const trimmed = customInput.trim()
        if (trimmed && !selected.includes(trimmed)) {
            onChange([...selected, trimmed])
            setCustomInput('')
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(opt)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                            selected.includes(opt)
                                ? 'bg-accent/10 border-accent text-accent font-medium'
                                : 'border-border text-textSecondary hover:border-borderHover hover:text-textPrimary'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            {allowCustom && (
                <div className="flex gap-2">
                    <input
                        className="input flex-1 text-sm"
                        placeholder="Add custom..."
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    />
                    <button
                        type="button"
                        onClick={addCustom}
                        className="btn btn-secondary btn-sm"
                        disabled={!customInput.trim()}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
            {/* Show custom selections that aren't in the options list */}
            {selected.filter(s => !options.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.filter(s => !options.includes(s)).map(custom => (
                        <span
                            key={custom}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/30"
                        >
                            {custom}
                            <button
                                type="button"
                                onClick={() => onChange(selected.filter(s => s !== custom))}
                                className="hover:text-error"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Section header inside a step ───────────────────────────────
export function SectionHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="mb-4 pb-3 border-b border-border/50">
            <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
            {description && <p className="text-xs text-textTertiary mt-0.5">{description}</p>}
        </div>
    )
}

// ─── Character counter for textareas ────────────────────────────
export function CharCount({ value, min }: { value: string; min: number }) {
    const len = (value || '').length
    const ok = len >= min
    return (
        <span className={`text-[10px] font-mono ${ok ? 'text-success' : 'text-textTertiary'}`}>
            {len}/{min} min
        </span>
    )
}
