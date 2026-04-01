'use client';

import React, { useState, useEffect } from 'react';
import {
    Users as UsersIcon,
    Search,
    Filter,
    LogIn,
    Edit,
    Ban,
    Building2,
    Mail,
    Calendar,
    Loader2,
    ExternalLink,
    AlertTriangle,
    UserPlus,
    Key,
} from 'lucide-react';
import CreateUserModal from '@/components/modals/CreateUserModal';
import EditUserModal from '@/components/modals/EditUserModal';
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    org_id: string;
    org_name: string;
    org_slug: string;
    org_plan: string;
    org_status: string;
    can_upload_kb: boolean;
    can_trigger_runs: boolean;
    can_view_analytics: boolean;
    can_manage_team: boolean;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [impersonating, setImpersonating] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [resettingPassword, setResettingPassword] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [pendingImpersonate, setPendingImpersonate] = useState<User | null>(null);
    const [pendingReset, setPendingReset] = useState<User | null>(null);
    const [pendingCopyLink, setPendingCopyLink] = useState<{ user: User; link: string } | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) return;

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to load users');

            const data = await response.json();
            setUsers(data.users);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const executeImpersonate = async (user: User) => {
        setImpersonating(user.id);

        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) return;

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/users/impersonate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: user.id }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Impersonation failed');
            }

            const data = await response.json();

            // Store superadmin session so we can return later
            sessionStorage.setItem('impersonation_superadmin_session', session);
            sessionStorage.setItem('impersonation_target', JSON.stringify(data.user));

            // Swap to impersonated user's real Supabase session
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
            });

            // Open the main app as the impersonated user
            window.open('/', '_blank');
        } catch (error: any) {
            console.error('Error impersonating user:', error);
            alert(error.message || 'Failed to impersonate user');
        } finally {
            setImpersonating(null);
        }
    };

    const executeResetPassword = async (user: User) => {
        setResettingPassword(user.id);

        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) return;

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/users/reset-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: user.email }),
            });

            if (!response.ok) throw new Error('Failed to send reset email');

            const data = await response.json();

            if (data.reset_link) {
                setPendingCopyLink({ user, link: data.reset_link });
            }
        } catch (error) {
            console.error('Error sending reset email:', error);
            alert('Failed to send password reset email');
        } finally {
            setResettingPassword(null);
        }
    };


    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.org_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPlan = filterPlan === 'all' || user.org_plan === filterPlan;
        const matchesRole = filterRole === 'all' || user.role === filterRole;

        return matchesSearch && matchesPlan && matchesRole;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-accent/10 text-accent';
            case 'admin': return 'bg-surfaceElevated text-primary';
            case 'member': return 'bg-surfaceElevated text-info';
            case 'viewer': return 'bg-textTertiary/10 text-textTertiary';
            default: return 'bg-textSecondary/10 text-textSecondary';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        All Users
                    </h1>
                    <p className="text-textSecondary">
                        Manage users across all organizations
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="
                        flex items-center gap-xs
                        btn btn-primary font-semibold
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:opacity-90
                        active:scale-[0.98]
                        transition-all
                    "
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Add User</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                    {/* Search */}
                    <div className="sm:col-span-1">
                        <div className="relative">
                            <Search className="absolute left-sm top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="
                  w-full
                  bg-background
                  text-textPrimary
                  border border-border
                  rounded-[var(--radius-md)]
                  pl-10 pr-sm py-xs
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:ring-borderFocus
                "
                            />
                        </div>
                    </div>

                    {/* Plan Filter */}
                    <div>
                        <select
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                            className="
                w-full
                bg-background
                text-textPrimary
                border border-border
                rounded-[var(--radius-md)]
                px-sm py-xs
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-borderFocus
              "
                        >
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="
                w-full
                bg-background
                text-textPrimary
                border border-border
                rounded-[var(--radius-md)]
                px-sm py-xs
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-borderFocus
              "
                        >
                            <option value="all">All Roles</option>
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-surfaceElevated border border-warning rounded-[var(--radius-lg)] p-md flex items-start gap-sm">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-warning font-medium mb-xs">
                        User Impersonation Notice
                    </p>
                    <p className="text-warning/80 text-sm">
                        All impersonation sessions are fully logged for security and compliance.
                        IP address, duration, and actions taken will be recorded.
                    </p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surfaceHover border-b border-border">
                            <tr>
                                <th className="text-left px-md py-sm text-textSecondary text-sm font-medium">
                                    User
                                </th>
                                <th className="text-left px-md py-sm text-textSecondary text-sm font-medium">
                                    Organization
                                </th>
                                <th className="text-left px-md py-sm text-textSecondary text-sm font-medium">
                                    Role
                                </th>
                                <th className="text-left px-md py-sm text-textSecondary text-sm font-medium">
                                    Plan
                                </th>
                                <th className="text-left px-md py-sm text-textSecondary text-sm font-medium">
                                    Joined
                                </th>
                                <th className="text-right px-md py-sm text-textSecondary text-sm font-medium">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-surfaceHover transition-colors"
                                >
                                    {/* User */}
                                    <td className="px-md py-sm">
                                        <div className="flex items-center gap-sm">
                                            <div className="w-10 h-10 rounded-full bg-surfaceElevated flex items-center justify-center">
                                                <span className="text-primary font-medium">
                                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-textPrimary font-medium">
                                                    {user.full_name || 'Unnamed User'}
                                                </p>
                                                <p className="text-textSecondary text-sm">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Organization */}
                                    <td className="px-md py-sm">
                                        <div className="flex items-center gap-xs">
                                            <Building2 className="w-4 h-4 text-textTertiary" />
                                            <span className="text-textPrimary">
                                                {user.org_name}
                                            </span>
                                        </div>
                                        <p className="text-textSecondary text-sm">
                                            /{user.org_slug}
                                        </p>
                                    </td>

                                    {/* Role */}
                                    <td className="px-md py-sm">
                                        <span className={`px-sm py-xs text-xs font-medium rounded-[var(--radius-sm)] ${getRoleBadgeColor(user.role)}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>

                                    {/* Plan */}
                                    <td className="px-md py-sm">
                                        <span className="text-textPrimary capitalize">
                                            {user.org_plan}
                                        </span>
                                    </td>

                                    {/* Joined */}
                                    <td className="px-md py-sm">
                                        <div className="flex items-center gap-xs text-textSecondary text-sm">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-md py-sm">
                                        <div className="flex items-center justify-end gap-xs">
                                            <button
                                                onClick={() => setPendingImpersonate(user)}
                                                disabled={impersonating === user.id || !user.is_active}
                                                className="
                          flex items-center gap-xs
                          px-sm py-xs
                          text-primary
                          hover:bg-surfaceElevated
                          rounded-[var(--radius-sm)]
                          transition-all
                          text-sm
                          font-medium
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                        "
                                                title="Login as this user"
                                            >
                                                {impersonating === user.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <LogIn className="w-4 h-4" />
                                                )}
                                                <span>Login as User</span>
                                            </button>

                                            <button
                                                onClick={() => setPendingReset(user)}
                                                disabled={resettingPassword === user.id}
                                                className="
                          flex items-center gap-xs
                          px-sm py-xs
                          text-warning
                          hover:bg-surfaceElevated
                          rounded-[var(--radius-sm)]
                          transition-all
                          text-sm
                          font-medium
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                        "
                                                title="Reset password"
                                            >
                                                {resettingPassword === user.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Key className="w-4 h-4" />
                                                )}
                                                <span>Reset Password</span>
                                            </button>

                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="
                          p-xs
                          text-textSecondary
                          hover:text-textPrimary
                          hover:bg-surfaceHover
                          rounded-[var(--radius-sm)]
                          transition-all
                        "
                                                title="Edit user"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                    <div className="p-2xl text-center">
                        <UsersIcon className="w-12 h-12 text-textTertiary mx-auto mb-md" />
                        <h3 className="text-lg font-bold text-textPrimary mb-xs">
                            No users found
                        </h3>
                        <p className="text-textSecondary">
                            {searchQuery || filterPlan !== 'all' || filterRole !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No users in the system yet'}
                        </p>
                    </div>
                )}
            </div>

            {/* Results Count */}
            <p className="text-textSecondary text-sm text-center">
                Showing {filteredUsers.length} of {users.length} users
            </p>

            {/* Create User Modal */}
            <CreateUserModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={loadUsers}
            />

            {/* Edit User Modal */}
            <EditUserModal
                isOpen={!!editingUser}
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSuccess={loadUsers}
            />

            <SuperadminConfirmDialog
                open={Boolean(pendingImpersonate)}
                title="Impersonate user"
                description={`Login as ${pendingImpersonate?.email ?? 'this user'}? This action will be fully logged for security and compliance.`}
                confirmLabel="Login as user"
                tone="primary"
                onCancel={() => setPendingImpersonate(null)}
                onConfirm={() => {
                    if (pendingImpersonate) void executeImpersonate(pendingImpersonate);
                    setPendingImpersonate(null);
                }}
            />

            <SuperadminConfirmDialog
                open={Boolean(pendingReset)}
                title="Reset password"
                description={`Send password reset email to ${pendingReset?.email ?? 'this user'}?`}
                confirmLabel="Send reset email"
                tone="primary"
                onCancel={() => setPendingReset(null)}
                onConfirm={() => {
                    if (pendingReset) void executeResetPassword(pendingReset);
                    setPendingReset(null);
                }}
            />

            <SuperadminConfirmDialog
                open={Boolean(pendingCopyLink)}
                title="Password reset sent"
                description={`Reset email sent to ${pendingCopyLink?.user.email ?? ''}. If the email doesn't arrive, click "Copy link" to copy the reset link manually.`}
                confirmLabel="Copy link"
                cancelLabel="Done"
                tone="primary"
                onCancel={() => setPendingCopyLink(null)}
                onConfirm={async () => {
                    if (pendingCopyLink?.link) {
                        await navigator.clipboard.writeText(pendingCopyLink.link);
                    }
                    setPendingCopyLink(null);
                }}
            />
        </div>
    );
}
