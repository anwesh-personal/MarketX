'use client'
import React from 'react'
import { motion } from 'framer-motion'

export function H3({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <h3 className="text-base font-bold mt-6 mb-3 flex items-center gap-2" style={{ color }}>
            <span className="w-1.5 h-5 rounded-full" style={{ background: color }} />
            {children}
        </h3>
    )
}

export function P({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-textSecondary leading-relaxed mb-4">{children}</p>
}

export function StepList({ color, steps }: { color: string; steps: { title: string; desc: string }[] }) {
    return (
        <div className="space-y-3 mb-6">
            {steps.map((s, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-3 p-3 rounded-xl bg-background border border-border/60 hover:border-borderHover transition-colors"
                >
                    <span
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: `${color}15`, color }}
                    >
                        {i + 1}
                    </span>
                    <div>
                        <div className="text-sm font-semibold text-textPrimary">{s.title}</div>
                        <div className="text-xs text-textSecondary mt-0.5 leading-relaxed">{s.desc}</div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

export function FeatureGrid({ items, color }: { items: { icon: React.ReactNode; title: string; desc: string }[]; color: string }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    whileHover={{ scale: 1.02, borderColor: color }}
                    className="p-4 rounded-xl bg-background border border-border/60 transition-all"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
                            {item.icon}
                        </span>
                        <span className="text-sm font-bold text-textPrimary">{item.title}</span>
                    </div>
                    <p className="text-xs text-textSecondary leading-relaxed">{item.desc}</p>
                </motion.div>
            ))}
        </div>
    )
}

export function Tip({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
    return (
        <div
            className="flex gap-3 p-4 rounded-xl border text-sm leading-relaxed mb-4"
            style={{ borderColor: `${color}30`, background: `${color}08`, color }}
        >
            <span className="flex-shrink-0 mt-0.5">{icon}</span>
            <div>{children}</div>
        </div>
    )
}

export function CodeBlock({ title, children }: { title?: string; children: string }) {
    return (
        <div className="mb-4 rounded-xl overflow-hidden border border-border/60">
            {title && (
                <div className="px-4 py-2 bg-surfaceHover text-xs font-semibold text-textSecondary border-b border-border/40">
                    {title}
                </div>
            )}
            <pre className="p-4 text-xs font-mono bg-background text-textSecondary overflow-x-auto whitespace-pre-wrap">
                {children}
            </pre>
        </div>
    )
}

export function DataTable({ headers, rows, color }: { headers: string[]; rows: string[][]; color: string }) {
    return (
        <div className="overflow-x-auto mb-6 rounded-xl border border-border/60">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-surfaceHover">
                        {headers.map((h, i) => (
                            <th key={i} className="text-left px-4 py-2.5 font-bold text-textPrimary border-b border-border/40">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-surfaceHover/50 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-semibold' : 'text-textSecondary'}`}
                                    style={j === 0 ? { color } : undefined}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
