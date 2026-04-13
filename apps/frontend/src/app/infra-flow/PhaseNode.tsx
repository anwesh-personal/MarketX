'use client'

import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { motion } from 'framer-motion'
import type { Phase } from './data'

interface PhaseNodeProps {
    data: {
        phase: Phase
        selected: boolean
        onClick: () => void
    }
}

function PhaseNodeComponent({ data }: PhaseNodeProps) {
    const { phase, selected, onClick } = data
    return (
        <>
            <Handle type="target" position={Position.Top} style={{ background: phase.color, border: 'none', width: 8, height: 8 }} />
            <motion.div
                className={`flow-phase-node ${selected ? 'selected' : ''}`}
                onClick={onClick}
                whileHover={{ scale: 1.06, boxShadow: `0 0 40px ${phase.color}25` }}
                whileTap={{ scale: 0.98 }}
                style={{ '--glow-color': phase.color } as any}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: phase.num * 0.08 }}
            >
                {/* Glow border on hover */}
                <div style={{
                    position: 'absolute', inset: -1, borderRadius: '1rem',
                    background: `linear-gradient(135deg, ${phase.color}15, transparent, ${phase.color}10)`,
                    opacity: selected ? 1 : 0,
                    transition: 'opacity 0.4s',
                    pointerEvents: 'none',
                }} />

                <div className="node-header">
                    <div className="node-num" style={{ background: `${phase.color}20`, color: phase.color }}>
                        {phase.num}
                    </div>
                    <div>
                        <div className="node-title">{phase.title}</div>
                        <div className="node-subtitle">{phase.subtitle}</div>
                    </div>
                </div>
                <div className="node-engine" style={{ color: phase.color }}>{phase.engine}</div>
                <div className="node-meta">
                    <span className="node-chip">📋 {phase.steps.length}</span>
                    <span className="node-chip">📤 {phase.outputs.length}</span>
                    {phase.gates.length > 0 && <span className="node-chip" style={{ color: '#a855f7' }}>🚧 {phase.gates.length}</span>}
                </div>
            </motion.div>
            <Handle type="source" position={Position.Bottom} style={{ background: phase.color, border: 'none', width: 8, height: 8 }} />
        </>
    )
}

export default memo(PhaseNodeComponent)
