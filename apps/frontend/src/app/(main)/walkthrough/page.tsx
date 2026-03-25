'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, RotateCcw, ChevronRight, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MEMBER_SLIDES, type MemberSlide } from './memberSlides'

/* ── Feature card with bounce icon ── */
function FeatureCard({ f, i, color }: { f: { icon: string; label: string; desc: string }; i: number; color: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 300, damping: 22 }}
            className="p-3 rounded-xl bg-background border border-border/60 transition-all group cursor-default"
            style={{ borderColor: `${color}20` }}>
            <div className="flex items-start gap-3">
                <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                    className="text-xl flex-shrink-0 mt-0.5">{f.icon}</motion.div>
                <div className="min-w-0">
                    <div className="text-xs font-bold text-textPrimary mb-0.5">{f.label}</div>
                    <div className="text-[11px] text-textSecondary leading-relaxed">{f.desc}</div>
                </div>
            </div>
        </motion.div>
    )
}

/* ── Slide content renderer ── */
function SlideView({ slide }: { slide: MemberSlide }) {
    const router = useRouter()
    const isBookend = slide.id === 'welcome' || slide.id === 'outro'

    if (isBookend) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-7xl mb-6">{slide.icon}</motion.div>
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-textPrimary mb-3 tracking-tight">{slide.title}</motion.h2>
                <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="text-sm text-textSecondary max-w-lg leading-relaxed mb-3">{slide.narration}</motion.p>
                {slide.why && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                        className="max-w-md text-xs leading-relaxed px-4 py-3 rounded-xl border border-border/50"
                        style={{ background: `${slide.color}08`, color: 'var(--color-text-secondary)' }}>
                        💡 <span className="italic">{slide.why}</span>
                    </motion.div>
                )}
                {slide.id === 'outro' && (
                    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/kb-manager')}
                        className="mt-6 px-6 py-3 rounded-2xl bg-accent text-white font-bold text-sm flex items-center gap-2"
                        style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                        Get Started <ChevronRight size={16} />
                    </motion.button>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto hide-scrollbar">
            {/* Header: step badge + title + link */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-2">
                {slide.step && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: slide.color }}>
                        {slide.step}
                    </div>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${slide.color}12` }}>{slide.icon}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-textPrimary truncate">{slide.title}</h3>
                    {slide.route && (
                        <button onClick={() => router.push(slide.route!)}
                            className="text-[11px] font-bold flex items-center gap-1 transition-colors" style={{ color: slide.color }}>
                            Open this page <ExternalLink size={9} />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Narration */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="text-xs text-textSecondary leading-relaxed mb-2 px-0.5">
                {slide.narration}
            </motion.p>

            {/* Why box */}
            {slide.why && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="text-[11px] leading-relaxed px-3 py-2 rounded-lg border border-border/40 mb-3"
                    style={{ background: `${slide.color}06` }}>
                    <span className="font-bold" style={{ color: slide.color }}>Why this matters:</span>{' '}
                    <span className="text-textSecondary">{slide.why}</span>
                </motion.div>
            )}

            {/* Feature cards grid */}
            {slide.features && (
                <div className="grid grid-cols-2 gap-2 flex-1">
                    {slide.features.map((f, i) => <FeatureCard key={i} f={f} i={i} color={slide.color} />)}
                </div>
            )}
        </div>
    )
}

/* ── Main walkthrough player ── */
export default function MemberWalkthroughPage() {
    const [cur, setCur] = useState(0)
    const [playing, setPlaying] = useState(true)
    const [progress, setProgress] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const progRef = useRef<NodeJS.Timeout | null>(null)
    const sl = MEMBER_SLIDES[cur]
    const total = MEMBER_SLIDES.length

    const clear = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); if (progRef.current) clearInterval(progRef.current) }, [])
    const goTo = useCallback((i: number) => { clear(); setCur(Math.max(0, Math.min(i, total - 1))); setProgress(0) }, [clear, total])
    const next = useCallback(() => { if (cur < total - 1) goTo(cur + 1); else { setPlaying(false); goTo(0) } }, [cur, total, goTo])
    const prev = useCallback(() => { if (cur > 0) goTo(cur - 1) }, [cur, goTo])

    useEffect(() => {
        if (!playing) { clear(); return }
        setProgress(0)
        const dur = sl.duration * 1000, tick = 50
        let el = 0
        progRef.current = setInterval(() => { el += tick; setProgress(Math.min((el / dur) * 100, 100)) }, tick)
        timerRef.current = setTimeout(next, dur)
        return clear
    }, [cur, playing, sl.duration, next, clear])

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev()
            if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
        }
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }, [next, prev])

    return (
        <div className="max-w-3xl mx-auto py-6">
            {/* Title */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-textPrimary tracking-tight mb-1">MarketWriter Guide</h1>
                <p className="text-sm text-textSecondary">Step-by-step walkthrough · {total} slides · ~{MEMBER_SLIDES.reduce((a, s) => a + s.duration, 0)}s</p>
            </div>

            <div className="rounded-3xl bg-surface border border-border overflow-hidden" style={{ boxShadow: '0 16px 64px rgba(0,0,0,0.08)' }}>
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-surface/90 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-xs text-textTertiary">
                        {sl.step ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black text-white" style={{ background: sl.color }}>
                                Step {sl.step}/7
                            </span>
                        ) : (
                            <span className="font-bold" style={{ color: sl.color }}>{cur + 1}/{total}</span>
                        )}
                        <span className="font-medium text-textSecondary">{sl.title}</span>
                    </div>
                    <div className="text-xs text-textTertiary font-mono tabular-nums">{Math.ceil((sl.duration * (100 - progress)) / 100)}s</div>
                </div>

                {/* Progress */}
                <div className="h-1 bg-border/20">
                    <div className="h-full transition-all duration-75" style={{ background: sl.color, width: `${progress}%` }} />
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 py-3">
                    {MEMBER_SLIDES.map((s, i) => (
                        <button key={i} onClick={() => goTo(i)} title={s.title}
                            className="rounded-full transition-all duration-300"
                            style={{
                                width: i === cur ? 20 : 8, height: 8,
                                background: i === cur ? sl.color : i < cur ? `${sl.color}60` : 'var(--color-border)',
                                boxShadow: i === cur ? `0 0 10px ${sl.color}40` : 'none',
                                borderRadius: 999,
                            }} />
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 pb-5" style={{ minHeight: 440 }}>
                    <AnimatePresence mode="wait">
                        <motion.div key={sl.id}
                            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
                            className="h-full">
                            <SlideView slide={sl} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 py-4 border-t border-border/50 bg-surface/90">
                    <button onClick={() => { goTo(0); setPlaying(false) }}
                        className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors">
                        <RotateCcw size={14} />
                    </button>
                    <button onClick={prev} disabled={cur === 0}
                        className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors disabled:opacity-30">
                        <SkipBack size={14} />
                    </button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setPlaying(p => !p)}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: sl.color, boxShadow: `0 6px 24px ${sl.color}40` }}>
                        {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </motion.button>
                    <button onClick={next} disabled={cur === total - 1 && !playing}
                        className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors disabled:opacity-30">
                        <SkipForward size={14} />
                    </button>
                </div>
            </div>

            {/* Quick-jump nav */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                {MEMBER_SLIDES.filter(s => s.step).map(s => (
                    <button key={s.id} onClick={() => goTo(MEMBER_SLIDES.indexOf(s))}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-border/50 bg-surface hover:bg-surfaceHover transition-colors flex items-center gap-1.5"
                        style={{ color: s.color }}>
                        <span className="w-4 h-4 rounded text-[9px] text-white flex items-center justify-center" style={{ background: s.color }}>
                            {s.step}
                        </span>
                        {s.title.replace(/^Step \d: /, '')}
                    </button>
                ))}
            </div>
        </div>
    )
}
