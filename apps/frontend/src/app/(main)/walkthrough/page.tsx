'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, RotateCcw, X, ChevronRight, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MEMBER_SLIDES, type MemberSlide } from './memberSlides'

function FeatureCard({ f, i, color }: { f: { icon: string; label: string; desc: string }; i: number; color: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 300, damping: 22 }}
            className="p-4 rounded-2xl bg-background border border-border/60 hover:border-opacity-100 transition-all group cursor-default"
            style={{ borderColor: `${color}20` }}>
            <div className="flex items-start gap-3">
                <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                    className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</motion.div>
                <div>
                    <div className="text-sm font-bold text-textPrimary mb-1">{f.label}</div>
                    <div className="text-xs text-textSecondary leading-relaxed">{f.desc}</div>
                </div>
            </div>
        </motion.div>
    )
}

function SlideView({ slide }: { slide: MemberSlide }) {
    const router = useRouter()
    const isBookend = slide.id === 'welcome' || slide.id === 'outro'

    if (isBookend) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-8xl mb-8">{slide.icon}</motion.div>
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black text-textPrimary mb-4 tracking-tight">{slide.title}</motion.h2>
                <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="text-sm text-textSecondary max-w-md leading-relaxed">{slide.narration}</motion.p>
                {slide.id === 'outro' && (
                    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/kb-manager')}
                        className="mt-8 px-6 py-3 rounded-2xl bg-accent text-white font-bold text-sm flex items-center gap-2"
                        style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                        Upload Your First KB <ChevronRight size={16} />
                    </motion.button>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: `${slide.color}12`, boxShadow: `0 0 24px ${slide.color}15` }}>{slide.icon}</div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-textPrimary">{slide.title}</h3>
                    {slide.route && (
                        <button onClick={() => router.push(slide.route!)}
                            className="text-xs font-bold flex items-center gap-1 mt-1 transition-colors" style={{ color: slide.color }}>
                            Go to page <ExternalLink size={10} />
                        </button>
                    )}
                </div>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-sm text-textSecondary leading-relaxed mb-5 italic px-1">"{slide.narration}"</motion.p>
            {slide.features && (
                <div className="grid gap-3 flex-1">
                    {slide.features.map((f, i) => <FeatureCard key={i} f={f} i={i} color={slide.color} />)}
                </div>
            )}
        </div>
    )
}

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
        <div className="max-w-3xl mx-auto py-8">
            <div className="rounded-3xl bg-surface border border-border overflow-hidden" style={{ boxShadow: '0 16px 64px rgba(0,0,0,0.08)' }}>
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-surface/90 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-xs text-textTertiary">
                        <span className="font-black" style={{ color: sl.color }}>{cur + 1}</span>
                        <span>/</span><span>{total}</span>
                        <span className="mx-2 text-border">|</span>
                        <span className="font-medium">{sl.title}</span>
                    </div>
                    <div className="text-xs text-textTertiary font-mono tabular-nums">{Math.ceil((sl.duration * (100 - progress)) / 100)}s</div>
                </div>

                {/* Progress */}
                <div className="h-1 bg-border/20">
                    <div className="h-full transition-all duration-75" style={{ background: sl.color, width: `${progress}%` }} />
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 py-3">
                    {MEMBER_SLIDES.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)}
                            className="rounded-full transition-all duration-300"
                            style={{
                                width: i === cur ? 20 : 8, height: 8,
                                background: i === cur ? sl.color : 'var(--color-border)',
                                boxShadow: i === cur ? `0 0 10px ${sl.color}40` : 'none',
                                borderRadius: 999,
                            }} />
                    ))}
                </div>

                {/* Content */}
                <div className="px-8 pb-6" style={{ minHeight: 420 }}>
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
        </div>
    )
}
