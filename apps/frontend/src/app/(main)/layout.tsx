'use client';

import React, { useState, useEffect } from 'react';
import { MailWriterLogo } from '@/components/MailWriterLogo';
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

                        <MailWriterLogo size="md" />
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
                {/* Sidebar - Desktop - GLASSMORPHISM */}
                <aside className={`
                    hidden lg:flex flex-col
                    relative
                    backdrop-blur-xl bg-gradient-to-b from-surface/40 via-surface/30 to-surface/40
                    border-r border-border/30
                    shadow-[0_8px_32px_0_rgba(0,0,0,0.12)]
                    transition-all duration-300
                    ${sidebarOpen ? 'w-72' : 'w-0'}
                    overflow-hidden
                    before:absolute before:inset-0 
                    before:bg-gradient-to-br before:from-primary/5 before:via-transparent before:to-accent/5
                    before:pointer-events-none
                `}>
                    {/* Glass reflection overlay */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    <nav className="flex-1 p-lg space-y-2 overflow-y-auto relative z-10">
                        {navigation.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`
                                        nav-item group relative
                                        flex items-center gap-md px-md py-sm
                                        rounded-[var(--radius-lg)] font-medium text-sm
                                        transition-all duration-200
                                        backdrop-blur-sm
                                        ${isActive
                                            ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-transparent text-primary shadow-[0_4px_16px_rgba(var(--color-primary-rgb),0.15)] border border-primary/20'
                                            : 'text-textSecondary hover:text-textPrimary hover:bg-white/5 hover:backdrop-blur-md hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-transparent hover:border-border/30'
                                        }
                                        active:scale-[0.98]
                                        animate-fade-in-up
                                    `}
                                >
                                    {/* Active indicator - gradient bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary via-primary to-accent rounded-r-full shadow-[0_0_12px_var(--color-primary)] animate-pulse-glow" />
                                    )}

                                    {/* Icon container with glass effect */}
                                    <div className={`
                                        flex items-center justify-center w-9 h-9 
                                        rounded-[var(--radius-md)] 
                                        transition-all duration-200
                                        ${isActive
                                            ? 'bg-gradient-to-br from-primary/20 to-accent/10 text-primary shadow-inner'
                                            : 'bg-white/5 backdrop-blur-sm group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-md'
                                        }
                                    `}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <span className="flex-1">{item.name}</span>

                                    {/* Arrow with smooth reveal */}
                                    <ChevronRight className={`
                                        w-4 h-4 transition-all duration-200
                                        ${isActive
                                            ? 'opacity-100 text-primary'
                                            : 'opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0'
                                        }
                                    `} />

                                    {/* Subtle hover glow */}
                                    <div className="absolute inset-0 rounded-[var(--radius-lg)] bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer with glassmorphism */}
                    <div className="p-lg border-t border-border/20 space-y-sm relative z-10 backdrop-blur-md bg-surface/20">
                        {/* Status indicator with enhanced glass */}
                        <div className="flex items-center gap-sm px-sm py-xs rounded-lg bg-white/5 backdrop-blur-sm border border-border/20">
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-success" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping opacity-75" />
                            </div>
                            <span className="text-xs text-textSecondary font-medium">System Online</span>
                        </div>

                        {/* Signature with subtle glass card */}
                        <div className="px-sm py-sm rounded-lg bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-border/10">
                            <p className="text-xs text-textTertiary leading-relaxed font-mono">
                                Built by <span className="text-primary font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Anwesh Rath</span>
                            </p>
                            <p className="text-xs text-textTertiary/60 italic mt-1">Chaos ☕ Coffee ⌨️ Coding</p>
                        </div>
                    </div>

                    {/* Bottom gradient fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface/60 to-transparent pointer-events-none" />
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
