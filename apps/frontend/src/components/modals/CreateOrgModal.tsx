'use client';

import React, { useState } from 'react';
import { X, Building2, Loader2, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface OwnerCredentials {
    email: string;
    password: string;
}

export default function CreateOrgModal({ isOpen, onClose, onSuccess }: CreateOrgModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        plan: 'free',
        owner_email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ownerCredentials, setOwnerCredentials] = useState<OwnerCredentials | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) {
                toast.error('Not authenticated');
                return;
            }

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create organization');
            }

            if (data.owner_credentials) {
                // Show credentials instead of closing
                setOwnerCredentials(data.owner_credentials);
                toast.success('Organization and owner created! Save these credentials.');
            } else {
                toast.success('Organization created successfully!');
                setFormData({ name: '', slug: '', plan: 'free', owner_email: '' });
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to create organization');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({ name: '', slug: '', plan: 'free', owner_email: '' });
        setOwnerCredentials(null);
        setCopiedField(null);
        onClose();
    };

    const handleFinish = () => {
        onSuccess();
        handleClose();
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            toast.success(`${field} copied!`);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (error) {
            toast.error('Failed to copy');
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: generateSlug(name),
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-lg border-b border-border pb-md">
                    <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">Create Organization</h2>
                            <p className="text-sm text-textSecondary">Add a new organization to the platform</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-sm hover:bg-surfaceHover rounded-[var(--radius-md)] transition-colors"
                    >
                        <X className="w-5 h-5 text-textTertiary" />
                    </button>
                </div>

                {/* Credentials Display (shown after owner creation) */}
                {ownerCredentials ? (
                    <div className="space-y-md">
                        <div className="bg-success/10 border border-success rounded-[var(--radius-lg)] p-md">
                            <div className="flex items-center gap-sm mb-sm">
                                <CheckCircle className="w-5 h-5 text-success" />
                                <h3 className="font-bold text-success">Owner Created Successfully!</h3>
                            </div>
                            <p className="text-sm text-textSecondary">
                                Save these credentials and share them securely with the owner. They will NOT be shown again.
                            </p>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Email
                            </label>
                            <div className="flex gap-sm">
                                <input
                                    type="text"
                                    value={ownerCredentials.email}
                                    readOnly
                                    className="
                                        flex-1 px-md py-sm
                                        bg-surfaceHover text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        font-mono text-sm
                                    "
                                />
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(ownerCredentials.email, 'Email')}
                                    className="
                                        px-md py-sm
                                        bg-surfaceHover text-textSecondary
                                        rounded-[var(--radius-md)]
                                        hover:bg-primary hover:text-white
                                        transition-all
                                    "
                                >
                                    {copiedField === 'Email' ? (
                                        <CheckCircle className="w-5 h-5 text-success" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Password
                            </label>
                            <div className="flex gap-sm">
                                <input
                                    type="text"
                                    value={ownerCredentials.password}
                                    readOnly
                                    className="
                                        flex-1 px-md py-sm
                                        bg-surfaceHover text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        font-mono text-sm
                                    "
                                />
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(ownerCredentials.password, 'Password')}
                                    className="
                                        px-md py-sm
                                        bg-surfaceHover text-textSecondary
                                        rounded-[var(--radius-md)]
                                        hover:bg-primary hover:text-white
                                        transition-all
                                    "
                                >
                                    {copiedField === 'Password' ? (
                                        <CheckCircle className="w-5 h-5 text-success" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-warning/10 border border-warning rounded-[var(--radius-md)] p-sm">
                            <p className="text-warning text-sm font-medium">
                                ⚠️ Make sure to copy and securely share these credentials. You won't be able to see the password again!
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-md pt-md border-t border-border">
                            <button
                                type="button"
                                onClick={handleFinish}
                                className="
                                    flex items-center gap-sm
                                    bg-primary text-white font-semibold
                                    px-lg py-sm
                                    rounded-[var(--radius-md)]
                                    hover:opacity-90
                                    transition-all
                                "
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="space-y-md">
                        {/* Organization Name */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Organization Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                                placeholder="Acme Corporation"
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Slug *
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                    font-mono text-sm
                                "
                                placeholder="acme-corporation"
                                pattern="[a-z0-9-]+"
                                required
                            />
                            <p className="text-xs text-textTertiary mt-xs">
                                Lowercase letters, numbers, and hyphens only
                            </p>
                        </div>

                        {/* Plan */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Plan *
                            </label>
                            <select
                                value={formData.plan}
                                onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                            >
                                <option value="free">Free (1 KB, 10 runs/month, 3 members)</option>
                                <option value="starter">Starter (5 KBs, 100 runs/month, 5 members)</option>
                                <option value="pro">Pro (20 KBs, 1000 runs/month, 20 members)</option>
                                <option value="enterprise">Enterprise (100 KBs, 10000 runs/month, 100 members)</option>
                            </select>
                        </div>

                        {/* Owner Email (Optional) */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Owner Email (Optional)
                            </label>
                            <input
                                type="email"
                                value={formData.owner_email}
                                onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                                placeholder="owner@acme.com"
                            />
                            <p className="text-xs text-textTertiary mt-xs">
                                If provided, an owner user will be created with a generated password
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-md pt-md border-t border-border">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="
                                    px-lg py-sm
                                    text-textSecondary font-semibold
                                    hover:bg-surfaceHover
                                    rounded-[var(--radius-md)]
                                    transition-all
                                "
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="
                                    flex items-center gap-sm
                                    bg-gradient-to-r from-primary to-accent
                                    text-white font-semibold
                                    px-lg py-sm
                                    rounded-[var(--radius-md)]
                                    hover:scale-[var(--hover-scale)]
                                    active:scale-[var(--active-scale)]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-[var(--duration-normal)]
                                    shadow-lg hover:shadow-glow-lg
                                "
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="w-4 h-4" />
                                        <span>Create Organization</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
