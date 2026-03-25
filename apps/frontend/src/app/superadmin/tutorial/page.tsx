'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, ExternalLink, Rocket, Shield, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SECTIONS, type TutorialSection } from './sectionData'
import { MWOverviewSection, MWOnboardingSection } from './SectionsMWFlow'
import { MWContentSection, MWDeliverySection, MWLearningSection } from './SectionsMWOps'
import { SuperadminGuide } from './SectionsSuperadmin'
import { MemberGuide } from './SectionsMember'
import { WalkthroughPlayer } from './WalkthroughPlayer'

const GROUP_META: Record<string, { label: string; desc: string; icon: React.ReactNode; accent: string }> = {
    flow: { label: 'MarketWriter Flow', desc: 'How the product works end-to-end', icon: <Rocket size={18} />, accent: 'var(--color-accent)' },
    superadmin: { label: 'Superadmin Reference', desc: 'Every admin page explained', icon: <Shield size={18} />, accent: '#f59e0b' },
    member: { label: 'Member Portal', desc: 'What clients see & can do', icon: <Users size={18} />, accent: '#10b981' },
}

function Content({ id, c }: { id: string; c: string }) {
    switch (id) {
        case 'mw-overview': return <MWOverviewSection color={c} />
        case 'mw-onboarding': return <MWOnboardingSection color={c} />
        case 'mw-content': return <MWContentSection color={c} />
        case 'mw-delivery': return <MWDeliverySection color={c} />
        case 'mw-learning': return <MWLearningSection color={c} />
        case 'sa-guide': return <SuperadminGuide color={c} />
        case 'mb-guide': return <MemberGuide color={c} />
        default: return null
    }
}

function Card({ s, idx, open, toggle }: { s: TutorialSection; idx: number; open: boolean; toggle: () => void }) {
    const router = useRouter()
    return (
        <motion.div
            id={`sec-${s.id}`}
            layout
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
            className="group"
        >
            {/* Card Header */}
            <motion.div
                whileHover={{ y: -2 }}
                onClick={toggle}
                className="relative cursor-pointer rounded-2xl bg-surface border overflow-hidden transition-shadow duration-300"
                style={{
                    borderColor: open ? `${s.color}50` : 'var(--color-border)',
                    boxShadow: open ? `0 8px 32px ${s.color}12` : 'none',
                    borderBottomLeftRadius: open ? 0 : undefined,
                    borderBottomRightRadius: open ? 0 : undefined,
                }}
            >
                {/* Colored top line */}
                <div className="h-[3px] transition-all duration-300"
                    style={{ background: open ? s.color : 'transparent' }} />

                <div className="flex items-center gap-4 p-5">
                    {/* Icon */}
                    <motion.div
                        animate={{ scale: open ? 1.1 : 1, rotate: open ? 5 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                        style={{
                            background: `${s.color}12`,
                            color: s.color,
                            boxShadow: open ? `0 0 24px ${s.color}25` : 'none',
                        }}
                    >
                        {s.icon}
                    </motion.div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-textPrimary mb-0.5 truncate">{s.title}</h3>
                        <p className="text-xs text-textTertiary truncate">{s.subtitle}</p>
                    </div>

                    {/* Route button */}
                    {s.route && (
                        <motion.button
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); router.push(s.route!) }}
                            className="hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1.5 transition-all"
                            style={{ background: `${s.color}10`, color: s.color, border: `1px solid ${s.color}25` }}
                        >
                            Open <ExternalLink size={10} />
                        </motion.button>
                    )}

                    {/* Chevron */}
                    <motion.div
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="w-8 h-8 rounded-lg bg-surfaceHover flex items-center justify-center flex-shrink-0"
                    >
                        <ChevronDown size={16} className="text-textTertiary" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Card Body */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="p-6 pt-5 bg-surface rounded-b-2xl border-x border-b"
                            style={{ borderColor: `${s.color}50` }}>
                            <Content id={s.id} c={s.color} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default function TutorialPage() {
    const [openSection, setOpenSection] = useState<string | null>('mw-overview')
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const heroRef = useRef<HTMLDivElement>(null)
    const groups: ('flow' | 'superadmin' | 'member')[] = ['flow', 'superadmin', 'member']

    return (
        <div className="pb-32 max-w-5xl mx-auto">
            {/* Hero */}
            <motion.div ref={heroRef}
                onMouseMove={e => { if (!heroRef.current) return; const r = heroRef.current.getBoundingClientRect(); setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top }) }}
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
                className="relative px-8 py-20 text-center bg-surface rounded-3xl border border-border overflow-hidden mb-12"
            >
                {/* Mouse spotlight */}
                <div className="absolute pointer-events-none opacity-50" style={{
                    top: mousePos.y - 300, left: mousePos.x - 300, width: 600, height: 600,
                    background: 'radial-gradient(circle, var(--color-accent-muted, rgba(99,102,241,0.12)) 0%, transparent 65%)',
                    transition: 'top 0.1s, left 0.1s',
                }} />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                }} />
                <div className="relative z-10 max-w-2xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-accent/10 border border-accent/30 text-accent text-xs font-black uppercase tracking-[0.15em]">
                        <Sparkles size={14} /> Interactive Tutorial
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-textPrimary mb-5" style={{ lineHeight: 1.05 }}>
                        How <span className="text-accent">MarketWriter</span> Works
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="text-sm text-textSecondary leading-relaxed max-w-lg mx-auto">
                        From client onboarding to self-improving AI campaigns. Click nodes in the architecture diagram. Explore every superadmin and member portal page.
                    </motion.p>
                    {/* Quick nav pills */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                        className="flex flex-wrap justify-center gap-2 mt-8">
                        {groups.map(g => {
                            const m = GROUP_META[g]
                            return (
                                <motion.button key={g} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                        const first = SECTIONS.find(s => s.group === g)
                                        if (first) { setOpenSection(first.id); document.getElementById(`sec-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all"
                                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                                >
                                    {m.icon} {m.label}
                                </motion.button>
                            )
                        })}
                    </motion.div>
                </div>
            </motion.div>

            {/* Walkthrough Video */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
                className="mb-12">
                <WalkthroughPlayer />
            </motion.div>

            {/* Groups */}
            {groups.map(gk => {
                const meta = GROUP_META[gk]
                const secs = SECTIONS.filter(s => s.group === gk)
                return (
                    <div key={gk} className="mb-14">
                        <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }} transition={{ duration: 0.5 }}
                            className="flex items-center gap-3 mb-5 ml-1">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: `${meta.accent}12`, color: meta.accent }}>
                                {meta.icon}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-textPrimary tracking-tight">{meta.label}</h2>
                                <p className="text-xs text-textTertiary">{meta.desc}</p>
                            </div>
                            <div className="flex-1 h-px ml-4" style={{ background: `linear-gradient(90deg, ${meta.accent}20, transparent)` }} />
                        </motion.div>
                        <div className="flex flex-col gap-3">
                            {secs.map((sec, i) => (
                                <Card key={sec.id} s={sec} idx={i}
                                    open={openSection === sec.id}
                                    toggle={() => setOpenSection(p => p === sec.id ? null : sec.id)} />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
