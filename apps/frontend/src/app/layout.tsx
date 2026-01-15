import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Activity } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'Axiom Engine - Mission Control',
    description: 'Deterministic Content Execution System',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="flex h-screen">
                    {/* Sidebar Navigation */}
                    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                        <div className="h-16 flex items-center px-6 border-b border-slate-800">
                            <Activity className="text-blue-500 mr-2" size={24} />
                            <span className="font-bold text-lg">Axiom Engine</span>
                        </div>

                        <nav className="flex-1 p-4 space-y-2">
                            <NavLink href="/dashboard" label="Command Center" />
                            <NavLink href="/kb-manager" label="Knowledge Base" />
                            <NavLink href="/analytics" label="Analytics" />
                        </nav>

                        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                System Online
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}

function NavLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="block px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors"
        >
            {label}
        </Link>
    )
}
