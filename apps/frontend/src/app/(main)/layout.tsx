'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    Database,
    BarChart3,
    Brain,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Zap,
    Sparkles,
} from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
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

    // Navigation items
    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Writer Studio', href: '/writer', icon: Zap },
        { name: 'Brain Control', href: '/brain-control', icon: Brain },
        { name: 'Brain Chat', href: '/brain-chat', icon: Sparkles },
        { name: 'Knowledge Base', href: '/kb-manager', icon: Database },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Learning Loop', href: '/learning', icon: Brain },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    // Check authentication
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUserEmail(user.email || '');
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between px-lg py-md">
                    {/* Left: Mobile menu + Logo */}
                    <div className="flex items-center gap-md">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-sm rounded-[var(--radius-md)] hover:bg-surfaceHover transition-all"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center gap-sm">
                            <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-textPrimary leading-tight">Axiom</span>
                                <span className="text-xs text-textTertiary leading-tight">Engine</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Theme + User */}
                    <div className="flex items-center gap-md">
                        <ThemeSelector />

                        <div className="hidden sm:flex items-center gap-sm px-sm py-xs rounded-[var(--radius-lg)] bg-surfaceHover/50">
                            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                                {userEmail.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-textSecondary pr-xs">{userEmail}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-xs px-md py-sm text-textSecondary hover:text-error hover:bg-error/10 rounded-[var(--radius-lg)] transition-all active:scale-95"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-4rem)]">
                {/* Sidebar - Desktop */}
                <aside className={`hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden`}>
                    <nav className="flex-1 p-lg space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                        nav-item group relative
                                        flex items-center gap-md px-md py-sm
                                        rounded-[var(--radius-lg)] font-medium text-sm
                                        transition-all duration-[var(--duration-fast)]
                                        ${isActive
                                            ? 'bg-primary/10 text-primary shadow-[var(--shadow-sm)]'
                                            : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
                                        }
                                        active:scale-[0.98]
                                    `}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_8px_var(--color-primary)]" />
                                    )}

                                    <div className={`flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] transition-all ${isActive ? 'bg-primary/20 text-primary' : 'bg-transparent group-hover:bg-surfaceHover group-hover:scale-110'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <span className="flex-1">{item.name}</span>

                                    <ChevronRight className={`w-4 h-4 transition-all ${isActive ? 'opacity-100' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'}`} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer Signature */}
                    <div className="p-lg border-t border-border space-y-sm">
                        <div className="flex items-center gap-sm text-xs text-textTertiary">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span>System Online</span>
                        </div>
                        <div className="text-xs text-textTertiary leading-relaxed">
                            <p className="font-mono">Built by <span className="text-primary font-semibold">Anwesh Rath</span></p>
                            <p className="italic opacity-75">Chaos ☕ Coffee ⌨️ Coding</p>
                        </div>
                    </div>
                </aside>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                        <div className="absolute left-0 top-0 bottom-0 w-80 bg-surface border-r border-border shadow-xl animate-slide-in-left">
                            <nav className="p-lg space-y-2">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`nav-item flex items-center gap-md px-md py-sm rounded-[var(--radius-lg)] font-medium text-sm transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}
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

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-background">
                    <div className="max-w-7xl mx-auto p-lg">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
