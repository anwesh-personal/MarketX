'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';

interface SuperAdminLayoutProps {
    children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [isReady, setIsReady] = useState(false);

    // Check authentication
    useEffect(() => {
        const session = localStorage.getItem('superadmin_session');
        if (!session) {
            router.push('/superadmin/login');
        } else {
            try {
                const sessionData = JSON.parse(session);
                setAdminEmail(sessionData.email);
                setIsReady(true);
            } catch {
                router.push('/superadmin/login');
            }
        }
    }, [router]);

    // Show nothing until ready (prevents FOUC)
    if (!isReady) {
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem('superadmin_session');
        router.push('/superadmin/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
        { name: 'Users', href: '/superadmin/users', icon: Users },
        { name: 'AI Management', href: '/superadmin/ai-management', icon: Bot },
        { name: 'Licenses', href: '/superadmin/licenses', icon: FileText },
        { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
        { name: 'Workers', href: '/superadmin/workers', icon: Server },
        { name: 'Settings', href: '/superadmin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 bg-surface border-b border-border">
                <div className="flex items-center justify-between px-md py-sm">
                    {/* Left: Logo + Menu Toggle */}
                    <div className="flex items-center gap-md">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-xs rounded-[var(--radius-md)] hover:bg-surfaceHover transition-colors hidden lg:block"
                        >
                            <Menu className="w-5 h-5 text-textPrimary" />
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-xs rounded-[var(--radius-md)] hover:bg-surfaceHover transition-colors lg:hidden"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5 text-textPrimary" />
                            ) : (
                                <Menu className="w-5 h-5 text-textPrimary" />
                            )}
                        </button>

                        <div className="flex items-center gap-xs">
                            <Shield className="w-6 h-6 text-primary" />
                            <span className="font-bold text-textPrimary text-lg">
                                Superadmin
                            </span>
                        </div>
                    </div>

                    {/* Right: Theme Selector + User */}
                    <div className="flex items-center gap-md">
                        <ThemeSelector />

                        <div className="hidden sm:flex items-center gap-xs text-sm text-textSecondary">
                            <span>{adminEmail}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="
                flex items-center gap-xs
                px-sm py-xs
                text-textSecondary
                hover:text-textPrimary
                hover:bg-surfaceHover
                rounded-[var(--radius-md)]
                transition-all
              "
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Sidebar - Desktop */}
                <aside
                    className={`
            hidden lg:block
            bg-surface border-r border-border
            transition-all duration-[var(--duration-normal)]
            ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
          `}
                >
                    <nav className="p-md space-y-xs">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className="
                    flex items-center gap-sm
                    px-sm py-xs
                    text-textSecondary
                    hover:text-textPrimary
                    hover:bg-surfaceHover
                    rounded-[var(--radius-md)]
                    transition-all duration-[var(--duration-fast)]
                    group
                  "
                                >
                                    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium">{item.name}</span>
                                </a>
                            );
                        })}
                    </nav>
                </aside>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div
                            className="absolute inset-0 bg-overlay"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border p-md">
                            <nav className="space-y-xs mt-16">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="
                        flex items-center gap-sm
                        px-sm py-xs
                        text-textSecondary
                        hover:text-textPrimary
                        hover:bg-surfaceHover
                        rounded-[var(--radius-md)]
                        transition-all
                      "
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{item.name}</span>
                                        </a>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 p-md lg:p-lg max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
