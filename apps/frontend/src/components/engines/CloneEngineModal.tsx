import React, { useState } from 'react';
import { X, Check, Copy, Loader2 } from 'lucide-react';
import { WorkflowTemplate, Organization } from '@/types/engine';

interface CloneEngineModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: WorkflowTemplate[];
    organizations: Organization[];
    onSubmit: (templateId: string, name: string, orgId: string | null) => void;
    loading: boolean;
}

export function CloneEngineModal({
    isOpen,
    onClose,
    templates,
    organizations,
    onSubmit,
    loading,
}: CloneEngineModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedOrg, setSelectedOrg] = useState<string>('');
    const [engineName, setEngineName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (selectedTemplate && engineName) {
            onSubmit(selectedTemplate, engineName, selectedOrg || null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-40" onClick={onClose} />
            <div className="
                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                z-50 w-full max-w-lg
                bg-surface border border-border
                rounded-[var(--radius-xl)]
                shadow-[var(--shadow-xl)]
                p-lg
            ">
                <div className="flex items-center justify-between mb-lg">
                    <h2 className="text-xl font-bold text-textPrimary">Clone New Engine</h2>
                    <button
                        onClick={onClose}
                        className="p-sm rounded-[var(--radius-md)] hover:bg-surfaceHover text-textSecondary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-md">
                    {/* Template Selection */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Select Template
                        </label>
                        {templates.length === 0 ? (
                            <p className="text-sm text-textTertiary">No templates available. Create a workflow template first.</p>
                        ) : (
                            <div className="space-y-xs max-h-48 overflow-y-auto">
                                {templates.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => setSelectedTemplate(tmpl.id)}
                                        className={`
                                            w-full p-md text-left
                                            rounded-[var(--radius-lg)]
                                            border transition-all duration-[var(--duration-fast)]
                                            ${selectedTemplate === tmpl.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/40'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-textPrimary">{tmpl.name}</p>
                                                <p className="text-sm text-textSecondary">{tmpl.description || 'No description'}</p>
                                            </div>
                                            {selectedTemplate === tmpl.id && (
                                                <Check className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Engine Name */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Engine Name
                        </label>
                        <input
                            type="text"
                            value={engineName}
                            onChange={(e) => setEngineName(e.target.value)}
                            placeholder="e.g., IMT Reply #3"
                            className="
                                w-full px-md py-sm
                                bg-background border border-border
                                rounded-[var(--radius-md)]
                                text-textPrimary placeholder:text-textTertiary
                                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                            "
                        />
                    </div>

                    {/* Organization Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Assign to Organization (Optional)
                        </label>
                        <select
                            value={selectedOrg}
                            onChange={(e) => setSelectedOrg(e.target.value)}
                            className="
                                w-full px-md py-sm
                                bg-background border border-border
                                rounded-[var(--radius-md)]
                                text-textPrimary
                                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                            "
                        >
                            <option value="">Select an organization...</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-sm pt-md">
                        <button
                            onClick={onClose}
                            className="
                                px-md py-sm
                                text-textSecondary
                                hover:text-textPrimary hover:bg-surfaceHover
                                rounded-[var(--radius-md)]
                                transition-colors
                            "
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedTemplate || !engineName || loading}
                            className="
                                flex items-center gap-xs
                                px-md py-sm
                                bg-primary text-white
                                rounded-[var(--radius-md)]
                                hover:bg-primary/90
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all
                            "
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            Clone Engine
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default CloneEngineModal;
