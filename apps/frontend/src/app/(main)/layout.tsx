'use client';

import React, { useState, useEffect } from 'react';
import { MailWriterLogo } from '@/components/MailWriterLogo';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Menu,
    X,
    Zap,
    Mail,
    Sparkles,
    BookOpen,
} from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { createClient } from '@/lib/supabase/client';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [features, setFeatures] = useState<Record<string, boolean>>({});

    // Nav items with their required feature flag from member_portal_config.
    // Items with requiredFeature: null always show (Dashboard, Settings).
    // Items gated by a feature only render if the user's tier permits it.
    const allNavItems = [
        { name: 'Walkthrough', href: '/walkthrough', icon: BookOpen, group: 'Guide', highlight: true, requiredFeature: null },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Home', requiredFeature: null },
        { name: 'Writer Studio', href: '/writer', icon: Zap, group: 'Home', requiredFeature: 'can_write_emails' as const },
        { name: 'Email Hub', href: '/email-hub', icon: Mail, group: 'Home', requiredFeature: 'can_view_metrics' as const },
        { name: 'Brain', href: '/brain-chat', icon: Sparkles, group: 'Intelligence', requiredFeature: 'can_chat_brain' as const },
        { name: 'Settings', href: '/settings', icon: Settings, group: 'System', requiredFeature: null },
    ];

    // Filter nav to only items the user's tier allows
    const navigation = allNavItems.filter(item =>
        item.requiredFeature === null || features[item.requiredFeature] !== false
    );

    // Derive sidebar groups dynamically from visible nav items (no hardcoded list)
    const sidebarGroups = [...new Set(navigation.map(item => item.group))];

    // Load auth + portal config on mount
    useEffect(() => {
        loadUserContext();
    }, []);

    const loadUserContext = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUserEmail(user.email || '');

        // Load portal config (feature flags for this user's org/tier)
        try {
            const res = await fetch('/api/portal/config');
            if (res.ok) {
                const config = await res.json();
                setFeatures(config.features || {});
            }
        } catch {
            // On failure, features stays {} — all gates default to visible
            // (matches ENTERPRISE_FALLBACK behavior in requireFeature.ts)
        }

        setIsReady(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (!isReady) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Impersonation Banner — above everything */}
            <ImpersonationBanner />

            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            {/* Outer App Shell (Floating Window Effect) */}
            <div className="w-full max-w-[1600px] h-[calc(100vh-4rem)] bg-surface border border-border rounded-[var(--radius-2xl)] shadow-float flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <header className="h-16 flex-shrink-0 border-b border-border/40 bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
                    {/* Left: Mobile menu + Logo */}
                    <div className="flex items-center gap-md">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-sm rounded-[var(--radius-md)] hover:bg-surfaceHover transition-all"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <MailWriterLogo size="md" showText={false} />
                    </div>

                    {/* Right: Theme + User */}
                    <div className="flex items-center gap-md">
                        <ThemeSelector />

                        <div className="hidden sm:flex items-center gap-sm px-sm py-xs rounded-[var(--radius-lg)] bg-surfaceHover/50 border border-border/50">
                            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                                {userEmail.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-textSecondary pr-xs">{userEmail}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="btn btn-ghost text-textSecondary hover:text-error"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative z-10">
                    {/* Sidebar - Desktop */}
                    <aside className={`
                        hidden lg:flex flex-col
                        bg-surfaceHover/30 border-r border-border/50
                        transition-all duration-300 ease-in-out
                        ${sidebarOpen ? 'w-[var(--sidebar-width,260px)]' : 'w-0'}
                        overflow-hidden
                    `}>
                        <nav className="flex-1 py-md px-sm overflow-y-auto hide-scrollbar space-y-6">
                            {(() => {
                                return sidebarGroups.map((group) => {
                                    const items = navigation.filter(item => item.group === group);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={group} className="sidebar-group">
                                            <div className="sidebar-group-label">{group}</div>
                                            {items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                                const isHighlight = (item as any).highlight;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        className={`nav-item sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                                                        style={isHighlight && !isActive ? {
                                                            background: 'rgba(var(--color-accent-rgb, 99,102,241), 0.06)',
                                                            borderColor: 'rgba(var(--color-accent-rgb, 99,102,241), 0.2)',
                                                            borderWidth: '1px',
                                                            borderStyle: 'solid',
                                                            borderRadius: 'var(--radius-lg)',
                                                        } : undefined}
                                                    >
                                                        <div className={`
                                                            flex items-center justify-center w-8 h-8
                                                            rounded-[var(--radius-md)]
                                                            transition-all duration-[var(--duration-fast)]
                                                            ${isActive ? 'bg-accent text-onAccent shadow-md' : isHighlight ? 'bg-accent/20 text-accent' : 'bg-surface border border-border text-textSecondary group-hover:border-borderHover'}
                                                        `}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <span className={`flex-1 font-medium ${isHighlight && !isActive ? 'text-accent' : ''}`}>{item.name}</span>
                                                        {isHighlight && !isActive && (
                                                            <div className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                                                            </div>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    );
                                });
                            })()}
                        </nav>

                        <div className="p-md border-t border-border/50 bg-surface/50 backdrop-blur-sm">
                            <div className="flex items-center gap-sm text-xs font-medium text-textSecondary mb-2">
                                <div className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                </div>
                                <span>System Online</span>
                            </div>
                        </div>
                    </aside>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                            <div className="absolute left-0 top-0 bottom-0 w-80 bg-surface border-r border-border shadow-xl animate-slide-in-left flex flex-col">
                                <div className="p-md border-b border-border flex justify-between items-center">
                                    <MailWriterLogo size="md" showText={false} />
                                    <button onClick={() => setMobileMenuOpen(false)} className="btn btn-ghost p-2">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <nav className="flex-1 p-md overflow-y-auto space-y-2">
                                    {navigation.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href;

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`nav-item flex items-center gap-md px-md py-sm rounded-[var(--radius-lg)] font-medium text-sm transition-all ${isActive ? 'bg-[rgba(var(--color-accent-rgb),0.1)] text-accent' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>
                    )}

                <main className="flex-1 overflow-y-auto bg-background/50 relative p-6 lg:p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-surface/30 to-background pointer-events-none" />
                    <div className="relative z-10 h-full max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </main>
                </div>
            </div>
            </div>
        </div>
    );
}
