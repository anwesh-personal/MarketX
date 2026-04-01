'use client'
import { Shield, Tag, Hash, Eye, Clock } from 'lucide-react'
import { PromptBlock, CATEGORIES } from './types'

export function PromptBlockCard({ block }: { block: PromptBlock }) {
    const cat = CATEGORIES.find(c => c.value === block.category)
    const preview = block.content.slice(0, 140).replace(/\n/g, ' ') + (block.content.length > 140 ? '…' : '')
    const wordCount = block.content.split(/\s+/).filter(Boolean).length

    return (
        <div className="group relative rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden transition-all duration-200 hover:border-borderHover hover:shadow-[var(--shadow-sm)]">
            {/* Card Header */}
            <div className="flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-lg flex-shrink-0 border border-border/60 bg-surfaceElevated">
                    {cat?.emoji || '📝'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-textPrimary truncate">{block.name}</p>
                        {block.is_system && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-info-muted text-info border border-border/50">
                                <Shield className="w-2.5 h-2.5" /> SYS
                            </span>
                        )}
                    </div>
                    {block.description && (
                        <p className="text-xs text-textSecondary mt-0.5 line-clamp-1">{block.description}</p>
                    )}
                    <p className="text-[11px] text-textTertiary mt-1.5 line-clamp-2 font-mono leading-relaxed opacity-60">
                        {preview}
                    </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-sm)] border uppercase tracking-wider flex-shrink-0
                    ${cat?.color === 'info' ? 'bg-info-muted text-info border-border/60' : ''}
                    ${cat?.color === 'accent' ? 'bg-accent/10 text-accent border-accent/20' : ''}
                    ${cat?.color === 'success' ? 'bg-success-muted text-success border-border/60' : ''}
                    ${cat?.color === 'warning' ? 'bg-warning-muted text-warning border-border/60' : ''}
                `}>
                    {block.category}
                </span>
            </div>

            {/* Footer stats */}
            <div className="flex items-center gap-3 px-4 pb-3 -mt-1">
                {block.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="w-2.5 h-2.5 text-textTertiary" />
                        {block.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-surfaceHover text-textTertiary border border-border/40">{t}</span>
                        ))}
                        {block.tags.length > 3 && <span className="text-[10px] text-textTertiary">+{block.tags.length - 3}</span>}
                    </div>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-textTertiary flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />v{block.version}</span>
                <span className="text-[10px] text-textTertiary">{wordCount}w</span>
                <span className="text-[10px] text-textTertiary flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(block.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    )
}
