'use client';

import React, { useState, useEffect } from 'react';
import { MailWriterLogo } from '@/components/MailWriterLogo';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    BarChart3,
    Server,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    Bot,
    Brain,
    Database,
    ChevronRight,
    Cpu,
    Workflow,
    BookOpen,
    Mail,
    Send,
    Activity,
    Target,
    Sparkles,
    Package,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { ThemeSelector } from '@/components/ThemeSelector';
import {
    getSession,
    clearSession,
    validateSession,
    isAuthenticated
} from '@/lib/superadmin-auth';

interface SuperAdminLayoutProps {
    children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // Determine if this is the login page
    const isLoginPage = pathname === '/superadmin/login';

    // Check authentication with server-side validation
    // This hook MUST be called unconditionally (React Rules of Hooks)
    useEffect(() => {
        // Skip auth for login page
        if (isLoginPage) {
            setIsAuthChecking(false);
            setIsReady(true);
            return;
        }

        const checkAuth = async () => {
            // Quick client-side check first
            if (!isAuthenticated()) {
                router.push('/superadmin/login');
                return;
            }

            // Get session data
            const session = getSession();
            if (!session) {
                router.push('/superadmin/login');
                return;
            }

            // Validate token with server
            const isValid = await validateSession();

            if (!isValid) {
                clearSession();
                router.push('/superadmin/login');
                return;
            }

            // Session is valid
            setAdminEmail(session.email);
            setIsReady(true);
            setIsAuthChecking(false);
        };

        checkAuth();
    }, [pathname, router, isLoginPage]);

    // If login page, render without layout (AFTER hooks are called)
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Show nothing while checking auth (prevents flicker)
    if (isAuthChecking || !isReady) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-md">
                    <Shield className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-textSecondary text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    const handleLogout = () => {
        clearSession();
        router.push('/superadmin/login');
    };

    const navigation = [
        // Platform Overview
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard, group: 'Platform' },
        { name: 'Organizations', href: '/superadmin/organizations', icon: Building2, group: 'Platform' },
        { name: 'Users', href: '/superadmin/users', icon: Users, group: 'Platform' },
        { name: 'Licenses', href: '/superadmin/licenses', icon: FileText, group: 'Platform' },

        // MarketX OS (Briefs, Beliefs, ICP)
        { name: 'Briefs', href: '/superadmin/briefs', icon: BookOpen, group: 'MarketX OS' },
        { name: 'Belief Dashboard', href: '/superadmin/belief-dashboard', icon: Activity, group: 'MarketX OS' },
        { name: 'ICP Manager', href: '/superadmin/icp-manager', icon: Target, group: 'MarketX OS' },
        { name: 'Mastery Agents', href: '/superadmin/mastery-agents', icon: Bot, group: 'MarketX OS' },

        // Workflows & Engines
        { name: 'Workflow Manager', href: '/superadmin/workflow-manager', icon: Workflow, group: 'Automation' },
        { name: 'Engine Bundles', href: '/superadmin/engine-bundles', icon: Package, group: 'Automation' },
        { name: 'Deployed Engines', href: '/superadmin/engines', icon: Cpu, group: 'Automation' },

        // AI & Brain
        { name: 'AI Providers', href: '/superadmin/ai-providers', icon: Bot, group: 'AI & Brain' },
        { name: 'AI Models', href: '/superadmin/ai-management', icon: Cpu, group: 'AI & Brain' },
        { name: 'AI Playground', href: '/superadmin/ai-playground', icon: Sparkles, group: 'AI & Brain' },
        { name: 'Brain Templates', href: '/superadmin/brains', icon: Brain, group: 'AI & Brain' },
        { name: 'Agent Templates', href: '/superadmin/agents', icon: Sparkles, group: 'AI & Brain' },
        { name: 'Prompt Library', href: '/superadmin/prompt-library', icon: BookOpen, group: 'AI & Brain' },
        { name: 'Tool Registry', href: '/superadmin/tool-registry', icon: Settings, group: 'AI & Brain' },

        // Infrastructure
        { name: 'Infrastructure', href: '/superadmin/infrastructure', icon: Cpu, group: 'Infrastructure' },
        { name: 'Email Providers', href: '/superadmin/email-providers', icon: Mail, group: 'Infrastructure' },
        { name: 'Background Jobs', href: '/superadmin/redis', icon: Database, group: 'Infrastructure' },
        { name: 'Workers', href: '/superadmin/workers', icon: Server, group: 'Infrastructure' },
        { name: 'Platform Config', href: '/superadmin/platform-config', icon: Settings, group: 'Infrastructure' },
        { name: 'Portal Tiers', href: '/superadmin/portal-tiers', icon: Shield, group: 'Infrastructure' },
        { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3, group: 'Infrastructure' },
        { name: 'Settings', href: '/superadmin/settings', icon: Settings, group: 'Infrastructure' },

        // Reference
        { name: 'Interactive Tutorial', href: '/superadmin/tutorial', icon: BookOpen, group: 'Reference' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar - PREMIUM REDESIGN */}
            <header className="
                sticky top-0 z-50 
                bg-surface/95 backdrop-blur-md
                border-b border-border
                shadow-[var(--shadow-sm)]
            ">
                <div className="flex items-center justify-between h-16 px-lg">
                    {/* Left: Logo + Menu Toggle */}
                    <div className="flex items-center gap-lg">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="
                                hidden lg:flex items-center justify-center
                                w-10 h-10
                                rounded-[var(--radius-lg)]
                                text-textSecondary
                                hover:text-textPrimary
                                hover:bg-surfaceHover
                                transition-all duration-[var(--duration-fast)]
                                active:scale-95
                            "
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="
                                lg:hidden flex items-center justify-center
                                w-10 h-10
                                rounded-[var(--radius-lg)]
                                text-textSecondary
                                hover:text-textPrimary
                                hover:bg-surfaceHover
                                transition-all duration-[var(--duration-fast)]
                                active:scale-95
                            "
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>

                        {/* Logo */}
                        <MailWriterLogo size="md" showText={false} />
                    </div>

                    {/* Right: Theme Selector + User */}
                    <div className="flex items-center gap-md">
                        <ThemeSelector />

                        {/* User Info */}
                        <div className="
                            hidden sm:flex items-center gap-sm
                            px-sm py-xs
                            rounded-[var(--radius-lg)]
                            bg-surfaceHover/50
                        ">
                            <div className="
                                w-8 h-8
                                rounded-[var(--radius-md)]
                                bg-surfaceElevated
                                flex items-center justify-center
                                text-primary font-semibold text-sm
                            ">
                                {adminEmail.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-textSecondary pr-xs">
                                {adminEmail}
                            </span>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="
                                flex items-center gap-xs
                                px-md py-sm
                                text-textSecondary
                                hover:text-error
                                hover:bg-surfaceElevated
                                rounded-[var(--radius-lg)]
                                transition-all duration-[var(--duration-fast)]
                                active:scale-95
                            "
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-4rem)]">
                {/* Sidebar - PREMIUM REDESIGN */}
                <aside
                    className={`
                        hidden lg:flex flex-col
                        bg-surface
                        border-r border-border
                        transition-all duration-300 ease-in-out
                        ${sidebarOpen ? 'w-72' : 'w-0'}
                        overflow-hidden
                    `}
                >
                    <nav className="flex-1 py-sm overflow-y-auto hide-scrollbar">
                        {(() => {
                            const groups = ['Platform', 'MarketX OS', 'Automation', 'AI & Brain', 'Infrastructure', 'Reference'];
                            return groups.map((group) => {
                                const items = navigation.filter(item => item.group === group);
                                if (items.length === 0) return null;

                                return (
                                    <div key={group} className="sidebar-group">
                                        <div className="sidebar-group-label">{group}</div>
                                        {items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className={`
                                                        nav-item sidebar-item
                                                        ${isActive ? 'sidebar-item-active' : ''}
                                                    `}
                                                >
                                                    <div className={`
                                                        flex items-center justify-center
                                                        w-7 h-7
                                                        rounded-[var(--radius-sm)]
                                                        transition-all duration-[var(--duration-fast)]
                                                        ${isActive
                                                            ? 'bg-[rgba(var(--color-accent-rgb),0.15)] text-accent'
                                                            : 'bg-transparent'
                                                        }
                                                    `}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="flex-1">{item.name}</span>
                                                    <ChevronRight className={`
                                                        w-3 h-3
                                                        transition-all duration-[var(--duration-fast)]
                                                        ${isActive ? 'opacity-50 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-25 group-hover:translate-x-0'}
                                                    `} />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            });
                        })()}
                    </nav>

                    {/* Sidebar Footer - Witty Signature */}
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

                {/* Mobile Menu - PREMIUM REDESIGN */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-overlay backdrop-blur-sm"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Slide-in Menu */}
                        <div className="
                            absolute left-0 top-0 bottom-0 w-80
                            bg-surface
                            border-r border-border
                            shadow-[var(--shadow-lg)]
                            animate-slide-in-left
                        ">
                            <div className="flex items-center justify-between p-lg border-b border-border">
                                <MailWriterLogo size="sm" showText={false} />
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="
                                        w-10 h-10
                                        rounded-[var(--radius-lg)]
                                        text-textSecondary
                                        hover:text-textPrimary
                                        hover:bg-surfaceHover
                                        flex items-center justify-center
                                        transition-all
                                    "
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mobile Nav */}
                            <nav className="p-lg space-y-2">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`
                                                nav-item
                                                flex items-center gap-md
                                                px-md py-sm
                                                rounded-[var(--radius-lg)]
                                                font-medium text-sm
                                                transition-all
                                                ${isActive
                                                    ? 'bg-surfaceElevated text-primary'
                                                    : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
                                                }
                                            `}
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
                    {pathname === '/superadmin/workflow-manager' ? (
                        <div className="h-full">
                            {children}
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto p-lg">
                            {children}
                        </div>
                    )}
                </main>
            </div>
            <Toaster position="top-right" richColors />
        </div>
    );
}
