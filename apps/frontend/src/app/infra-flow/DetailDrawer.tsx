'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import type { Phase } from './data'

interface Props {
    phase: Phase | null
    onClose: () => void
}

export default function DetailDrawer({ phase, onClose }: Props) {
    if (!phase) return null

    return (
        <AnimatePresence>
            {phase && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    />
                    {/* Drawer */}
                    <motion.div
                        className="detail-drawer"
                        initial={{ x: 500, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 500, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <button className="drawer-close" onClick={onClose}>
                            <X size={16} />
                        </button>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: `${phase.color}20`, color: phase.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.1rem', fontWeight: 800,
                            }}>
                                {phase.num}
                            </div>
                            <div>
                                <div className="drawer-phase-title" style={{ color: phase.color }}>{phase.title}</div>
                                <div className="drawer-subtitle">{phase.subtitle} · {phase.engine} · {phase.owner}</div>
                            </div>
                        </div>

                        {/* Objective */}
                        <div className="drawer-objective" style={{ borderColor: phase.color }}>
                            {phase.objective}
                        </div>

                        {/* Accordions */}
                        <Accordion label="Operator Steps" count={phase.steps.length} items={phase.steps} cls="acc-steps" defaultOpen />
                        <Accordion label="Outputs" count={phase.outputs.length} items={phase.outputs} cls="acc-outputs" />
                        <Accordion label="Exit Conditions" count={phase.exitConditions.length} items={phase.exitConditions} cls="acc-exits" />
                        <Accordion label="Failure Conditions" count={phase.failureConditions.length} items={phase.failureConditions} cls="acc-failures" />
                        {phase.gates.length > 0 && (
                            <Accordion label="Activation Gates" count={phase.gates.length} items={phase.gates} cls="acc-gates" />
                        )}
                        {phase.modules.length > 0 && (
                            <Accordion label="Interface Modules" count={phase.modules.length} items={phase.modules} cls="acc-modules" />
                        )}
                        {phase.systemLaws.length > 0 && (
                            <Accordion label="Governing Laws" count={phase.systemLaws.length} items={phase.systemLaws} cls="acc-laws" />
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function Accordion({ label, count, items, cls, defaultOpen = false }: {
    label: string; count: number; items: string[]; cls: string; defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="accordion-section">
            <div className="accordion-header" onClick={() => setOpen(!open)}>
                <span>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="accordion-badge">{count}</span>
                    <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={14} />
                    </motion.div>
                </div>
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="accordion-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <ul className={cls}>
                            {items.map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    {item}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
