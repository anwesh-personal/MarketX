'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
    isOpen: boolean
    onClose: () => void
    data: { title: string; icon: string; color: string; desc: string; bullets: string[]; route?: string } | null
}

export function NodeLightbox({ isOpen, onClose, data }: Props) {
    const router = useRouter()
    if (!data) return null
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <div className="absolute inset-0 bg-overlay/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-surface rounded-2xl border overflow-hidden"
                        style={{ borderColor: `${data.color}40`, boxShadow: `0 24px 80px ${data.color}15` }}
                    >
                        {/* Header */}
                        <div className="p-6 pb-4" style={{ background: `linear-gradient(135deg, ${data.color}08, transparent)` }}>
                            <button onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-surfaceHover flex items-center justify-center text-textTertiary hover:text-textPrimary transition-colors">
                                <X size={16} />
                            </button>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ background: `${data.color}15`, boxShadow: `0 0 20px ${data.color}20` }}>
                                    {data.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-textPrimary">{data.title}</h3>
                                    <p className="text-sm text-textSecondary">{data.desc}</p>
                                </div>
                            </div>
                        </div>
                        {/* Bullets */}
                        <div className="px-6 pb-6 space-y-2">
                            {data.bullets.map((b, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * i }}
                                    className="flex gap-2.5 p-3 rounded-xl bg-background border border-border/50"
                                >
                                    <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: data.color }} />
                                    <span className="text-sm text-textSecondary leading-relaxed">{b}</span>
                                </motion.div>
                            ))}
                            {data.route && (
                                <motion.button
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => { onClose(); router.push(data.route!) }}
                                    className="w-full mt-3 p-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                                    style={{ background: `${data.color}12`, color: data.color, border: `1px solid ${data.color}30` }}
                                >
                                    Open in Dashboard <ExternalLink size={14} />
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
