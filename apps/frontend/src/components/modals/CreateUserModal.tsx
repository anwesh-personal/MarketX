'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: string;
}

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        org_id: '',
        role: 'member',
        can_upload_kb: false,
        can_trigger_runs: false,
        can_view_analytics: true,
        can_manage_team: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadOrganizations();
        }
    }, [isOpen]);

    const loadOrganizations = async () => {
        setIsLoadingOrgs(true);
        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) return;

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/organizations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (response.ok) {
                setOrganizations(data.organizations.filter((org: any) => org.status === 'active'));
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
        } finally {
            setIsLoadingOrgs(false);
        }
    };

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

            const response = await fetch('/api/superadmin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            toast.success('User created! Invite email sent.');
            setFormData({
                email: '',
                full_name: '',
                org_id: '',
                role: 'member',
                can_upload_kb: false,
                can_trigger_runs: false,
                can_view_analytics: true,
                can_manage_team: false,
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
            <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-lg border-b border-border pb-md">
                    <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-primary/10 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">Create User</h2>
                            <p className="text-sm text-textSecondary">Add a new user to an organization</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-sm hover:bg-surfaceHover rounded-[var(--radius-md)] transition-colors"
                    >
                        <X className="w-5 h-5 text-textTertiary" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-md">
                    <div className="grid grid-cols-2 gap-md">
                        {/* Email */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                                placeholder="user@example.com"
                                required
                            />
                        </div>

                        {/* Full Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                                placeholder="John Doe"
                            />
                        </div>

                        {/* Info */}
                        <div className="col-span-2">
                            <div className="bg-info/10 border border-info rounded-[var(--radius-md)] p-md">
                                <p className="text-info text-sm font-medium">
                                    📧 An invite email will be sent to the user with a link to set their password.
                                </p>
                            </div>
                        </div>

                        {/* Organization */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Organization *
                            </label>
                            <select
                                value={formData.org_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, org_id: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                                required
                                disabled={isLoadingOrgs}
                            >
                                <option value="">Select organization...</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} ({org.plan})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Role *
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all duration-[var(--duration-normal)]
                                    hover:border-borderHover
                                "
                            >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="border border-border rounded-[var(--radius-lg)] p-md">
                        <h3 className="text-sm font-bold text-textPrimary mb-md">Permissions</h3>
                        <div className="space-y-sm">
                            {[
                                { key: 'can_upload_kb', label: 'Can Upload Knowledge Base' },
                                { key: 'can_trigger_runs', label: 'Can Trigger Runs' },
                                { key: 'can_view_analytics', label: 'Can View Analytics' },
                                { key: 'can_manage_team', label: 'Can Manage Team' },
                            ].map(perm => (
                                <label key={perm.key} className="flex items-center gap-sm cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData[perm.key as keyof typeof formData] as boolean}
                                        onChange={(e) => setFormData(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                                        className="
                                            w-4 h-4
                                            text-primary
                                            border-border rounded
                                            focus:ring-2 focus:ring-borderFocus
                                        "
                                    />
                                    <span className="text-sm text-textSecondary group-hover:text-textPrimary transition-colors">
                                        {perm.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-md pt-md border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
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
                                    <UserPlus className="w-4 h-4" />
                                    <span>Create User</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
