'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Building2,
    Key,
    Bell,
    Palette,
    Save,
    Loader2,
    LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    org_name: string;
    org_plan: string;
    role: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        await loadProfile(user.id, user.email || '');
    };

    const loadProfile = async (userId: string, email: string) => {
        try {
            setIsLoading(true);

            const { data: userData } = await supabase
                .from('users')
                .select(`
                    id,
                    full_name,
                    role,
                    organization:organizations(name, plan)
                `)
                .eq('id', userId)
                .single();

            if (userData) {
                const profileData = {
                    id: userData.id,
                    email,
                    full_name: userData.full_name,
                    org_name: (userData.organization as any)?.name || 'Organization',
                    org_plan: (userData.organization as any)?.plan || 'free',
                    role: userData.role,
                };

                setProfile(profileData);
                setFormData({
                    full_name: userData.full_name || '',
                    email,
                });
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profile) return;

        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: formData.full_name,
                })
                .eq('id', profile.id);

            if (error) throw error;

            toast.success('Profile updated successfully!');
            setProfile({ ...profile, full_name: formData.full_name });

        } catch (error: any) {
            console.error('Failed to update profile:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-lg">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                    Settings
                </h1>
                <p className="text-textSecondary">
                    Manage your account and preferences
                </p>
            </div>

            {/* Profile Section */}
            <div className="card">
                <div className="flex items-center gap-sm mb-md">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-textPrimary">Profile</h2>
                </div>

                <div className="space-y-md">
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
                                transition-all
                            "
                            placeholder="Your Name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-textPrimary mb-xs">
                            Email
                        </label>
                        <div className="flex items-center gap-sm px-md py-sm bg-surfaceHover border border-border rounded-[var(--radius-md)]">
                            <Mail className="w-4 h-4 text-textTertiary" />
                            <span className="text-sm text-textSecondary">{formData.email}</span>
                        </div>
                        <p className="text-xs text-textTertiary mt-xs">
                            Contact your admin to change your email
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="
                            flex items-center gap-sm
                            btn btn-primary font-semibold
                            hover:opacity-90
                            active:scale-[0.98]
                            disabled:opacity-50
                            transition-all
                        "
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Organization Info */}
            <div className="card">
                <div className="flex items-center gap-sm mb-md">
                    <Building2 className="w-5 h-5 text-info" />
                    <h2 className="text-xl font-bold text-textPrimary">Organization</h2>
                </div>

                <div className="space-y-sm">
                    <div className="flex items-center justify-between py-sm">
                        <span className="text-sm text-textSecondary">Organization Name</span>
                        <span className="text-sm font-semibold text-textPrimary">{profile?.org_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-sm">
                        <span className="text-sm text-textSecondary">Plan</span>
                        <span className="text-sm font-semibold text-textPrimary uppercase">{profile?.org_plan}</span>
                    </div>
                    <div className="flex items-center justify-between py-sm">
                        <span className="text-sm text-textSecondary">Your Role</span>
                        <span className="text-sm font-semibold text-textPrimary capitalize">{profile?.role}</span>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="card">
                <div className="flex items-center gap-sm mb-md">
                    <Key className="w-5 h-5 text-warning" />
                    <h2 className="text-xl font-bold text-textPrimary">Security</h2>
                </div>

                <div className="space-y-sm">
                    <p className="text-sm text-textSecondary">
                        Contact your organization admin to reset your password
                    </p>
                </div>
            </div>

            {/* Notifications */}
            <div className="card">
                <div className="flex items-center gap-sm mb-md">
                    <Bell className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-textPrimary">Notifications</h2>
                </div>

                <div className="space-y-sm">
                    <label className="flex items-center justify-between py-sm cursor-pointer group">
                        <div>
                            <p className="text-sm font-medium text-textPrimary">Run Completed</p>
                            <p className="text-xs text-textSecondary">Get notified when your runs complete</p>
                        </div>
                        <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-borderFocus"
                        />
                    </label>

                    <label className="flex items-center justify-between py-sm cursor-pointer group">
                        <div>
                            <p className="text-sm font-medium text-textPrimary">Run Failed</p>
                            <p className="text-xs text-textSecondary">Get notified when runs fail</p>
                        </div>
                        <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-borderFocus"
                        />
                    </label>

                    <label className="flex items-center justify-between py-sm cursor-pointer group">
                        <div>
                            <p className="text-sm font-medium text-textPrimary">Weekly Summary</p>
                            <p className="text-xs text-textSecondary">Receive weekly performance summaries</p>
                        </div>
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-borderFocus"
                        />
                    </label>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card border-error">
                <h2 className="text-xl font-bold text-error mb-md">Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-textPrimary mb-xs">Log Out</p>
                        <p className="text-xs text-textSecondary">Sign out of your account</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="
                            flex items-center gap-sm
                            btn btn-danger font-semibold
                            hover:opacity-90
                            transition-all
                        "
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
