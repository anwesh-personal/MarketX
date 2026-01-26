'use client';

import React, { useState, useEffect } from 'react';
import { FileCode, Plus, Copy, Edit, Trash2, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
    id: string;
    name: string;
    description: string;
    worker_type: string;
    code_template: string;
    environment_vars: Record<string, string>;
    config: Record<string, any>;
}

export function TemplateManager() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await fetch('/api/superadmin/worker-templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data.templates || []);
            }
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (templateId: string) => {
        try {
            const response = await fetch('/api/superadmin/worker-templates/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template_id: templateId }),
            });

            if (response.ok) {
                toast.success('Template duplicated');
                loadTemplates();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to duplicate');
            }
        } catch (error) {
            toast.error('Failed to duplicate template');
        }
    };

    const handleDelete = async (templateId: string, templateName: string) => {
        if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;

        try {
            const response = await fetch('/api/superadmin/worker-templates', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: templateId }),
            });

            if (response.ok) {
                toast.success('Template deleted');
                loadTemplates();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to delete');
            }
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <h2 className="text-xl font-bold text-textPrimary">Worker Templates</h2>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    New Template
                </button>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {templates.map(template => (
                    <div
                        key={template.id}
                        className="
                            bg-surface border border-border rounded-[var(--radius-lg)] p-md
                            hover:shadow-lg transition-all
                        "
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-md">
                            <div className="flex items-center gap-sm">
                                <FileCode className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="font-semibold text-textPrimary">{template.name}</h3>
                                    <p className="text-xs text-textTertiary">{template.worker_type}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-textSecondary mb-md line-clamp-2">
                            {template.description || 'No description'}
                        </p>

                        {/* Environment Variables Count */}
                        <div className="text-xs text-textTertiary mb-md">
                            {Object.keys(template.environment_vars || {}).length} environment variables
                        </div>

                        {/* Actions */}
                        <div className="flex gap-xs border-t border-border/50 pt-md">
                            <button
                                onClick={() => setEditingTemplate(template)}
                                className="btn btn-secondary btn-sm flex-1"
                            >
                                <Edit className="w-3 h-3" />
                                Edit
                            </button>

                            <button
                                onClick={() => handleDuplicate(template.id)}
                                className="btn btn-secondary btn-sm"
                                title="Duplicate"
                            >
                                <Copy className="w-3 h-3" />
                            </button>

                            <button
                                onClick={() => handleDelete(template.id, template.name)}
                                className="btn btn-secondary btn-sm text-error hover:bg-error/10"
                                title="Delete"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Template Editor Modal */}
            {editingTemplate && (
                <TemplateEditor
                    template={editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSave={() => {
                        setEditingTemplate(null);
                        loadTemplates();
                    }}
                />
            )}

            {/* Create Form Modal */}
            {showCreateForm && (
                <TemplateEditor
                    template={null}
                    onClose={() => setShowCreateForm(false)}
                    onSave={() => {
                        setShowCreateForm(false);
                        loadTemplates();
                    }}
                />
            )}
        </div>
    );
}

/**
 * Template Editor Modal
 */
function TemplateEditor({
    template,
    onClose,
    onSave,
}: {
    template: Template | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        name: template?.name || '',
        description: template?.description || '',
        worker_type: template?.worker_type || 'queue',
        code_template: template?.code_template || '',
        environment_vars: template?.environment_vars || {},
        config: template?.config || {},
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = template
                ? '/api/superadmin/worker-templates'
                : '/api/superadmin/worker-templates';

            const method = template ? 'PATCH' : 'POST';
            const body = template
                ? { id: template.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast.success(template ? 'Template updated' : 'Template created');
                onSave();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to save');
            }
        } catch (error) {
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-lg">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-4xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-lg border-b border-border sticky top-0 bg-surface">
                    <h2 className="text-xl font-bold text-textPrimary">
                        {template ? 'Edit Template' : 'New Template'}
                    </h2>
                    <button onClick={onClose} className="btn btn-secondary btn-sm">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-lg space-y-md">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            placeholder="e.g., Standard Worker"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            rows={3}
                            placeholder="Describe what this worker does..."
                        />
                    </div>

                    {/* Worker Type */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">Worker Type</label>
                        <select
                            value={formData.worker_type}
                            onChange={(e) => setFormData({ ...formData, worker_type: e.target.value })}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                        >
                            <option value="queue">Queue</option>
                            <option value="writer">Writer</option>
                            <option value="learning">Learning</option>
                            <option value="analytics">Analytics</option>
                            <option value="brain">Brain</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {/* Code Template */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">Code Template</label>
                        <textarea
                            value={formData.code_template}
                            onChange={(e) => setFormData({ ...formData, code_template: e.target.value })}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary font-mono text-sm"
                            rows={15}
                            placeholder="Enter worker code..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-md p-lg border-t border-border sticky bottom-0 bg-surface">
                    <button onClick={onClose} className="btn btn-secondary" disabled={saving}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Template</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
