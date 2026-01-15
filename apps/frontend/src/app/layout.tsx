import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'Axiom Engine - Multi-Tenant SaaS Platform',
    description: 'Market Writer with Self-Improving Knowledge Base',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    )
}
