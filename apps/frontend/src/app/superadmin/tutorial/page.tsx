'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SECTIONS, type TutorialSection } from './sectionData'
import { OverviewSection, BrainSection, AgentSection } from './SectionsTop'
import { PromptsSection } from './SectionPrompts'
import { WorkflowSection } from './SectionWorkflows'
import { BeliefsSection, MasterySection, MeasurementSection } from './SectionsBelief'
import { LearningSection, DeliverySection, SecuritySection } from './SectionsBottom'

const spring = { type: 'spring' as const, stiffness: 300, damping: 24 }

function SectionContent({ id, color }: { id: string; color: string }) {
    switch (id) {
        case 'overview': return <OverviewSection color={color} />
        case 'brain': return <BrainSection color={color} />
        case 'agents': return <AgentSection color={color} />
        case 'prompts': return <PromptsSection color={color} />
        case 'workflows': return <WorkflowSection color={color} />
        case 'beliefs': return <BeliefsSection color={color} />
        case 'mastery': return <MasterySection color={color} />
        case 'measurement': return <MeasurementSection color={color} />
        case 'learning': return <LearningSection color={color} />
        case 'delivery': return <DeliverySection color={color} />
        case 'security': return <SecuritySection color={color} />
        default: return null
    }
}

function Section({ section: s, index, isOpen, onToggle }: {
    section: TutorialSection; index: number; isOpen: boolean; onToggle: () => void
}) {
    const router = useRouter()
    return (
        <motion.div
            id={`sec-${s.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.04 * index }}
        >
            <motion.div
                onClick={onToggle}
                whileHover={{ scale: 1.003 }}
                className={`flex items-center gap-3.5 p-4 cursor-pointer transition-all ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'} bg-surface border hover:shadow-md`}
                style={{ borderColor: isOpen ? `${s.color}40` : 'var(--color-border)', borderBottom: isOpen ? 'none' : undefined }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: `${s.color}15`, color: s.color, boxShadow: isOpen ? `0 0 16px ${s.color}30` : 'none' }}>
                    {s.icon}
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-textPrimary">{s.title}</div>
                    <div className="text-xs text-textTertiary mt-0.5">{s.subtitle}</div>
                </div>
                {s.route && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={e => { e.stopPropagation(); router.push(s.route!) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                        style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                        Open <ExternalLink size={10} />
                    </motion.button>
                )}
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}>
                    <ChevronDown size={18} className="text-textTertiary" />
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="p-6 bg-surface rounded-b-2xl"
                            style={{ border: `1px solid ${s.color}40`, borderTop: 'none' }}>
                            <SectionContent id={s.id} color={s.color} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default function TutorialPage() {
    const [openSection, setOpenSection] = useState<string | null>('overview')
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const heroRef = useRef<HTMLDivElement>(null)

    return (
        <div className="pb-32">
            {/* Hero */}
            <motion.div ref={heroRef}
                onMouseMove={e => { if (!heroRef.current) return; const r = heroRef.current.getBoundingClientRect(); setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top }) }}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                className="relative p-16 text-center bg-surface rounded-3xl border border-border overflow-hidden mb-10"
            >
                <div className="absolute pointer-events-none opacity-40" style={{
                    top: mousePos.y - 250, left: mousePos.x - 250, width: 500, height: 500,
                    background: 'radial-gradient(circle, var(--color-accent-muted, rgba(99,102,241,0.15)) 0%, transparent 70%)',
                    transition: 'top 0.15s, left 0.15s',
                }} />
                <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                }} />
                <div className="relative z-10 max-w-2xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-5 bg-accent/10 border border-accent text-accent text-xs font-bold uppercase tracking-widest">
                        <Sparkles size={14} /> Complete Reference
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-textPrimary mb-4" style={{ lineHeight: 1.08 }}>
                        Master <span className="text-accent">MarketX</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="text-sm text-textSecondary leading-relaxed max-w-xl mx-auto">
                        The complete 3-in-1 multi-tenant marketing intelligence platform. Every system, every data flow, every decision explained in detail.
                    </motion.p>
                </div>
            </motion.div>

            {/* Table of Contents */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-2 mb-8">
                {SECTIONS.map(s => (
                    <motion.button key={s.id} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setOpenSection(s.id); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all"
                        style={{
                            background: openSection === s.id ? `${s.color}12` : 'var(--color-surface)',
                            borderColor: openSection === s.id ? `${s.color}40` : 'var(--color-border)',
                            color: openSection === s.id ? s.color : 'var(--color-text-secondary)',
                        }}>
                        {s.icon} {s.title}
                    </motion.button>
                ))}
            </motion.div>

            {/* Sections */}
            <div className="flex flex-col gap-3">
                {SECTIONS.map((sec, idx) => (
                    <Section key={sec.id} section={sec} index={idx}
                        isOpen={openSection === sec.id}
                        onToggle={() => setOpenSection(prev => prev === sec.id ? null : sec.id)} />
                ))}
            </div>
        </div>
    )
}
