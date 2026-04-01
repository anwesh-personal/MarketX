'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, RotateCcw, X, Maximize2, ChevronRight } from 'lucide-react'
import { WALKTHROUGH_SLIDES, type WalkthroughSlide } from './walkthroughSlides'

function SlideVisual({ slide }: { slide: WalkthroughSlide }) {
    if (slide.visual === 'highlight') {
        return (
            <motion.div className="flex items-center justify-center h-full"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                <div className="text-center">
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-7xl mb-6">{slide.icon}</motion.div>
                    <h2 className="text-2xl font-black text-textPrimary mb-3">{slide.title}</h2>
                    <p className="text-sm text-textSecondary max-w-md mx-auto leading-relaxed">{slide.narration}</p>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="flex flex-col h-full p-1">
            {/* Top: title + icon */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-2xl"
                    style={{ background: `${slide.color}15`, boxShadow: `0 0 20px ${slide.color}20` }}>
                    {slide.icon}
                </div>
                <div>
                    <h3 className="text-lg font-black text-textPrimary">{slide.title}</h3>
                    <p className="text-xs text-textTertiary">{slide.narration.slice(0, 80)}...</p>
                </div>
            </motion.div>

            {/* Steps */}
            {slide.steps && (
                <div className="flex-1 space-y-2.5">
                    {slide.steps.map((step, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.4 }}
                            className="flex gap-3 p-3.5 rounded-xl border border-border/60 bg-background"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                                style={{ background: `${slide.color}15`, color: slide.color }}>
                                {i + 1}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-textPrimary">{step.label}</div>
                                <div className="text-xs text-textSecondary mt-0.5">{step.desc}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Narration bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-4 p-3 rounded-xl bg-surfaceHover/50 border border-border/30">
                <p className="text-xs text-textSecondary leading-relaxed italic">"{slide.narration}"</p>
            </motion.div>
        </div>
    )
}

export function WalkthroughPlayer() {
    const [isOpen, setIsOpen] = useState(false)
    const [current, setCurrent] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const progressRef = useRef<NodeJS.Timeout | null>(null)
    const slide = WALKTHROUGH_SLIDES[current]
    const total = WALKTHROUGH_SLIDES.length

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
    }, [])

    const goTo = useCallback((idx: number) => {
        clearTimers()
        setCurrent(Math.max(0, Math.min(idx, total - 1)))
        setProgress(0)
    }, [clearTimers, total])

    const next = useCallback(() => {
        if (current < total - 1) goTo(current + 1)
        else { setPlaying(false); goTo(0) }
    }, [current, total, goTo])

    const prev = useCallback(() => { if (current > 0) goTo(current - 1) }, [current, goTo])

    useEffect(() => {
        if (!playing || !isOpen) { clearTimers(); return }
        setProgress(0)
        const dur = slide.duration * 1000
        const tick = 50
        let elapsed = 0
        progressRef.current = setInterval(() => {
            elapsed += tick
            setProgress(Math.min((elapsed / dur) * 100, 100))
        }, tick)
        timerRef.current = setTimeout(next, dur)
        return clearTimers
    }, [current, playing, isOpen, slide.duration, next, clearTimers])

    // Keyboard
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
            if (e.key === 'ArrowRight') next()
            if (e.key === 'ArrowLeft') prev()
            if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, next, prev])

    return (
        <>
            {/* Launch button */}
            <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setIsOpen(true); setPlaying(true); setCurrent(0); setProgress(0) }}
                className="group flex items-center gap-3 w-full p-5 rounded-[var(--radius-lg)] bg-surface border border-border hover:border-accent/40 transition-all cursor-pointer"
                style={{ boxShadow: '0 4px 24px var(--color-accent-muted, rgba(99,102,241,0.08))' }}
            >
                <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Play size={24} className="text-accent ml-0.5" />
                </div>
                <div className="text-left flex-1">
                    <div className="text-base font-black text-textPrimary">Watch the Walkthrough</div>
                    <div className="text-xs text-textTertiary mt-0.5">Auto-playing animated guide · ~60 seconds · 8 slides</div>
                </div>
                <ChevronRight size={20} className="text-textTertiary group-hover:text-accent transition-colors" />
            </motion.button>

            {/* Fullscreen player */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
                    >
                        <div className="absolute inset-0 bg-overlay/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="relative w-full max-w-3xl bg-surface rounded-[var(--radius-xl)] border border-border overflow-hidden flex flex-col"
                            style={{ height: 'min(80vh, 600px)', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}
                        >
                            {/* Top bar */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-surface/90 backdrop-blur-sm flex-shrink-0">
                                <div className="flex items-center gap-2 text-xs text-textTertiary">
                                    <span className="font-bold" style={{ color: slide.color }}>{current + 1}</span>
                                    <span>/</span>
                                    <span>{total}</span>
                                    <span className="mx-2 text-border">|</span>
                                    <span>{slide.title}</span>
                                </div>
                                <button onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1 bg-border/30 flex-shrink-0">
                                <motion.div className="h-full" style={{ background: slide.color, width: `${progress}%` }}
                                    transition={{ duration: 0.05 }} />
                            </div>

                            {/* Slide dots */}
                            <div className="flex justify-center gap-1.5 py-3 flex-shrink-0">
                                {WALKTHROUGH_SLIDES.map((s, i) => (
                                    <button key={s.id} onClick={() => goTo(i)}
                                        className="w-2 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            background: i === current ? slide.color : 'var(--color-border)',
                                            transform: i === current ? 'scale(1.5)' : 'scale(1)',
                                            boxShadow: i === current ? `0 0 8px ${slide.color}40` : 'none',
                                        }} />
                                ))}
                            </div>

                            {/* Slide content */}
                            <div className="flex-1 px-8 pb-4 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    <motion.div key={slide.id}
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        transition={{ duration: 0.3 }}
                                        className="h-full"
                                    >
                                        <SlideVisual slide={slide} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-3 py-4 border-t border-border/50 bg-surface/90 backdrop-blur-sm flex-shrink-0">
                                <button onClick={() => { goTo(0); setPlaying(false) }}
                                    className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors">
                                    <RotateCcw size={14} />
                                </button>
                                <button onClick={prev} disabled={current === 0}
                                    className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors disabled:opacity-30">
                                    <SkipBack size={14} />
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                    onClick={() => setPlaying(p => !p)}
                                    className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-white transition-all"
                                    style={{ background: slide.color, boxShadow: `0 4px 20px ${slide.color}40` }}
                                >
                                    {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                                </motion.button>
                                <button onClick={next} disabled={current === total - 1 && !playing}
                                    className="w-9 h-9 rounded-xl bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors disabled:opacity-30">
                                    <SkipForward size={14} />
                                </button>
                                <div className="text-xs text-textTertiary ml-2 font-mono tabular-nums w-16 text-center">
                                    {Math.ceil((slide.duration * (100 - progress)) / 100)}s left
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
