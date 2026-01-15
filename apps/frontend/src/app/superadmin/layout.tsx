'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';

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

    // If login page, render without layout
    if (pathname === '/superadmin/login') {
        return <>{children}</>;
    }

    // Check authentication - OPTIMIZED
    useEffect(() => {
        const checkAuth = () => {
            const session = localStorage.getItem('superadmin_session');
            if (!session) {
                router.push('/superadmin/login');
                return;
            }

            try {
                const sessionData = JSON.parse(session);
                setAdminEmail(sessionData.email);
                setIsReady(true);
            } catch {
                router.push('/superadmin/login');
            } finally {
                setIsAuthChecking(false);
            }
        };

        checkAuth();
    }, []); // Run once on mount

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
        localStorage.removeItem('superadmin_session');
        router.push('/superadmin/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
        { name: 'Users', href: '/superadmin/users', icon: Users },
        { name: 'AI Providers', href: '/superadmin/ai-providers', icon: Bot },
        { name: 'AI Management', href: '/superadmin/ai-management', icon: Settings },
        { name: 'Brain Management', href: '/superadmin/brains', icon: Brain },
        { name: 'Background Jobs', href: '/superadmin/redis', icon: Database },
        { name: 'Licenses', href: '/superadmin/licenses', icon: FileText },
        { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
        { name: 'Settings', href: '/superadmin/settings', icon: Settings },
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
                        <div className="flex items-center gap-sm">
                            <div className="
                                flex items-center justify-center
                                w-9 h-9
                                rounded-[var(--radius-lg)]
                                bg-primary/10
                                transition-all duration-[var(--duration-normal)]
                                group-hover:scale-110
                            ">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-textPrimary text-base leading-tight">
                                    Axiom
                                </span>
                                <span className="text-xs text-textTertiary leading-tight">
                                    Superadmin
                                </span>
                            </div>
                        </div>
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
                                bg-primary/20
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
                                hover:bg-error/10
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
                    {/* Navigation */}
                    <nav className="flex-1 p-lg space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                        nav-item
                                        group relative
                                        flex items-center gap-md
                                        px-md py-sm
                                        rounded-[var(--radius-lg)]
                                        font-medium text-sm
                                        transition-all duration-[var(--duration-fast)]
                                        ${isActive
                                            ? 'bg-primary/10 text-primary shadow-[var(--shadow-sm)]'
                                            : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
                                        }
                                        active:scale-[0.98]
                                    `}
                                >
                                    {/* Active Indicator */}
                                    {isActive && (
                                        <div className="
                                            absolute left-0 top-1/2 -translate-y-1/2
                                            w-1 h-8
                                            bg-primary rounded-r-full
                                            shadow-[0_0_8px_var(--color-primary)]
                                        " />
                                    )}

                                    {/* Icon */}
                                    <div className={`
                                        flex items-center justify-center
                                        w-9 h-9
                                        rounded-[var(--radius-md)]
                                        transition-all duration-[var(--duration-fast)]
                                        ${isActive
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-transparent group-hover:bg-surfaceHover group-hover:scale-110'
                                        }
                                    `}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Label */}
                                    <span className="flex-1">{item.name}</span>

                                    {/* Chevron - Shows on hover or active */}
                                    <ChevronRight className={`
                                        w-4 h-4
                                        transition-all duration-[var(--duration-fast)]
                                        ${isActive
                                            ? 'opacity-100 translate-x-0'
                                            : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
                                        }
                                    `} />
                                </Link>
                            );
                        })}
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
                            {/* Mobile Header */}
                            <div className="flex items-center justify-between p-lg border-b border-border">
                                <div className="flex items-center gap-sm">
                                    <div className="
                                        w-9 h-9
                                        rounded-[var(--radius-lg)]
                                        bg-primary/10
                                        flex items-center justify-center
                                    ">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="font-bold text-textPrimary">Menu</span>
                                </div>
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
                                                    ? 'bg-primary/10 text-primary'
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
                    <div className="max-w-7xl mx-auto p-lg">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
