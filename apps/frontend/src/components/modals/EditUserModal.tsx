'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    can_upload_kb: boolean;
    can_trigger_runs: boolean;
    can_view_analytics: boolean;
    can_manage_team: boolean;
    org_name: string;
}

interface EditUserModalProps {
    isOpen: boolean;
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        role: 'member',
        is_active: true,
        can_upload_kb: false,
        can_trigger_runs: false,
        can_view_analytics: true,
        can_manage_team: false,
        new_password: '', // Optional - only if changing password
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update form when user changes
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                role: user.role,
                is_active: user.is_active,
                can_upload_kb: user.can_upload_kb,
                can_trigger_runs: user.can_trigger_runs,
                can_view_analytics: user.can_view_analytics,
                can_manage_team: user.can_manage_team,
                new_password: '', // Always start empty
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);

        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) {
                toast.error('Not authenticated');
                return;
            }

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: user.id,
                    ...formData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update user');
            }

            toast.success('User updated successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-lg border-b border-border pb-md">
                    <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-surfaceElevated flex items-center justify-center">
                            <Edit className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">Edit User</h2>
                            <p className="text-sm text-textSecondary">{user.email}</p>
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
                    {/* Organization Info (Read-only) */}
                    <div className="bg-surfaceHover border border-border rounded-[var(--radius-md)] p-md">
                        <p className="text-sm text-textSecondary">
                            <span className="font-semibold">Organization:</span> {user.org_name}
                        </p>
                        <p className="text-sm text-textSecondary mt-xs">
                            <span className="font-semibold">Email:</span> {user.email}
                        </p>
                    </div>

                    {/* Full Name */}
                    <div>
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

                    {/* Active Status */}
                    <div>
                        <label className="flex items-center gap-sm cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="
                                    w-4 h-4
                                    text-primary
                                    border-border rounded
                                    focus:ring-2 focus:ring-borderFocus
                                "
                            />
                            <span className="text-sm font-semibold text-textPrimary group-hover:text-primary transition-colors">
                                Active User
                            </span>
                        </label>
                        <p className="text-xs text-textTertiary mt-xs ml-6">
                            Inactive users cannot log in
                        </p>
                    </div>

                    {/* New Password (Optional) */}
                    <div>
                        <label className="block text-sm font-semibold text-textPrimary mb-xs">
                            New Password (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.new_password}
                            onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
                            className="
                                w-full px-md py-sm
                                bg-background text-textPrimary
                                border border-border rounded-[var(--radius-md)]
                                focus:outline-none focus:ring-2 focus:ring-borderFocus
                                transition-all duration-[var(--duration-normal)]
                                hover:border-borderHover
                                font-mono
                            "
                            placeholder="Leave empty to keep current password"
                            minLength={8}
                        />
                        <p className="text-xs text-textTertiary mt-xs">
                            Enter new password (min 8 chars) to change. Password will be active IMMEDIATELY. Supabase will send notification email.
                        </p>
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
                                bg-primary text-white font-semibold
                                px-lg py-sm
                                rounded-[var(--radius-md)]
                                hover:opacity-90
                                active:scale-[0.98]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all
                            "
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <>
                                    <Edit className="w-4 h-4" />
                                    <span>Update User</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
