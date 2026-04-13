'use client'

import React, { useState, useCallback, useMemo } from 'react'
import ReactFlow, {
    Background, Controls, MiniMap,
    Node, Edge, ConnectionLineType,
    useNodesState, useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { PHASES, SYSTEM_LAWS, ENGINES, Phase } from './data'
import { PHASES_5_9 } from './data2'
import PhaseNodeComponent from './PhaseNode'
import DetailDrawer from './DetailDrawer'
import './infra-flow.css'
import './infra-flow2.css'

const ALL_PHASES = [...PHASES, ...PHASES_5_9]

const WORKFLOW_STATES = [
    { label: 'draft', type: 's-pending' },
    { label: 'partner_qualification_pending', type: 's-pending' },
    { label: 'intake_pending', type: 's-pending' },
    { label: 'data_engine_pending', type: 's-pending' },
    { label: 'marketwriter_pending', type: 's-pending' },
    { label: 'delivery_pending', type: 's-pending' },
    { label: 'validation_pending', type: 's-pending' },
    { label: 'ready_for_launch', type: 's-active' },
    { label: 'launch_active', type: 's-active' },
    { label: 'live', type: 's-active' },
    { label: 'paused', type: 's-pending' },
    { label: 'failed', type: 's-blocked' },
    { label: 'archived', type: 's-blocked' },
]

const PROTOCOLS = [
    { from: 'Delivery → Data Engine', color: '#f59e0b', items: ['hard bounces → suppression', 'unsubscribe → suppression', 'complaint → suppression', 'invalid domain → suppression'] },
    { from: 'Delivery → MarketWriter', color: '#8b5cf6', items: ['reply text', 'reply classification', 'sentiment', 'objection patterns'] },
    { from: 'MarketWriter → Data Engine', color: '#06b6d4', items: ['updated targeting constraints', 'updated exclusion signals'] },
    { from: 'Learning → All Engines', color: '#a855f7', items: ['rule updates', 'threshold updates', 'classification updates', 'decision weight updates'] },
    { from: 'Data Engine → Learning', color: '#06b6d4', items: ['ICP fit outcomes', 'suppression patterns', 'identity failures', 'role ambiguity', 'timing rejections'] },
]

const nodeTypes = { phaseNode: PhaseNodeComponent }

// Wider 3-column stagger layout with generous spacing
function buildInitialNodes(onSelect: (p: Phase) => void, selected: Phase | null): Node[] {
    const cols = [0, 380, 190] // left, right, center pattern
    return ALL_PHASES.map((phase, i) => ({
        id: `phase-${phase.num}`,
        type: 'phaseNode',
        draggable: true,
        position: { x: cols[i % 3], y: i * 200 },
        data: {
            phase,
            selected: selected?.num === phase.num,
            onClick: () => onSelect(phase),
        },
    }))
}

const INITIAL_EDGES: Edge[] = [
    ...ALL_PHASES.slice(0, -1).map((phase) => ({
        id: `e-${phase.num}-${phase.num + 1}`,
        source: `phase-${phase.num}`,
        target: `phase-${phase.num + 1}`,
        type: 'smoothstep',
        animated: true,
        label: `Phase ${phase.num} → ${phase.num + 1}`,
        labelStyle: { fill: '#71717a', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#09090f', fillOpacity: 0.9 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 6,
        style: { stroke: phase.color, strokeWidth: 2.5, opacity: 0.6 },
    })),
    // Regression edges
    { id: 'reg-5-4', source: 'phase-5', target: 'phase-4', type: 'smoothstep', animated: false,
      label: '⚠ routing fail', labelStyle: { fill: '#fca5a5', fontSize: 10, fontWeight: 600 }, labelBgStyle: { fill: '#1c1017', fillOpacity: 0.95 }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6,
      style: { stroke: '#ef4444', strokeDasharray: '6,4', strokeWidth: 2, opacity: 0.4 } },
    { id: 'reg-5-2', source: 'phase-5', target: 'phase-2', type: 'smoothstep', animated: false,
      label: '⚠ suppression fail', labelStyle: { fill: '#fca5a5', fontSize: 10, fontWeight: 600 }, labelBgStyle: { fill: '#1c1017', fillOpacity: 0.95 }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6,
      style: { stroke: '#ef4444', strokeDasharray: '6,4', strokeWidth: 2, opacity: 0.4 } },
    { id: 'reg-5-3', source: 'phase-5', target: 'phase-3', type: 'smoothstep', animated: false,
      label: '⚠ reply fail', labelStyle: { fill: '#fca5a5', fontSize: 10, fontWeight: 600 }, labelBgStyle: { fill: '#1c1017', fillOpacity: 0.95 }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6,
      style: { stroke: '#ef4444', strokeDasharray: '6,4', strokeWidth: 2, opacity: 0.4 } },
] as Edge[]

export default function InfraFlowPage() {
    const [selected, setSelected] = useState<Phase | null>(null)
    const handleSelect = useCallback((phase: Phase) => {
        setSelected(s => s?.num === phase.num ? null : phase)
    }, [])

    const initialNodes = useMemo(() => buildInitialNodes(handleSelect, selected), [selected, handleSelect])
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges] = useEdgesState(INITIAL_EDGES)

    // Sync selection state into existing nodes
    React.useEffect(() => {
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, selected: selected?.num === n.data.phase.num, onClick: () => handleSelect(n.data.phase) },
        })))
    }, [selected, handleSelect, setNodes])

    return (
        <div className="infra-flow-root">
            <div className="infra-bg-mesh" />
            <div className="infra-content">
                {/* ─── Hero ─── */}
                <div className="infra-hero">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        IIInfrastructure Unified Workflow
                    </motion.h1>
                    <motion.p
                        className="tagline"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                    >
                        A coordinated acquisition operating system composed of three independent
                        but interdependent engines. Nine phases. Zero shortcuts. Signal integrity above all.
                    </motion.p>
                    <motion.div
                        className="engine-pills"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        {ENGINES.map(e => (
                            <div key={e.name} className="engine-pill">
                                <div className="engine-pulse" style={{ background: e.color }}>
                                    <div style={{ background: e.color }} />
                                </div>
                                <span style={{ color: e.color }}>{e.name}</span>
                                <span style={{ color: '#475569', fontSize: '0.72rem' }}>— {e.desc}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* ─── System Laws ─── */}
                <div className="laws-panel">
                    <div className="laws-title">⚖️ System Law — Non-Negotiable</div>
                    <div className="laws-grid">
                        {SYSTEM_LAWS.map((law, i) => (
                            <motion.div
                                key={i}
                                className="law-card"
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                            >
                                <div className="law-num">{i + 1}</div>
                                <span>{law}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ─── State Model ─── */}
                <div className="states-section">
                    <div className="section-title">Deterministic State Transition Model</div>
                    <div className="section-desc">No undefined transitions. No silent transitions. All logged, timestamped, versioned.</div>
                    <div className="states-wrap">
                        {WORKFLOW_STATES.map((s, i) => (
                            <React.Fragment key={s.label}>
                                <motion.div
                                    className={`state-pill ${s.type}`}
                                    whileHover={{ y: -4, scale: 1.08 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                >
                                    {s.label}
                                </motion.div>
                                {i < WORKFLOW_STATES.length - 1 && <span className="state-arrow">→</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* ─── React Flow Canvas ─── */}
                <div className="section-title">Phase Architecture</div>
                <div className="section-desc">Click any phase node to inspect. Drag to pan. Scroll to zoom. Dashed red = regression paths.</div>
                <div className="flow-canvas">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        nodeTypes={nodeTypes}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        nodesDraggable={true}
                        fitView
                        fitViewOptions={{ padding: 0.4 }}
                        minZoom={0.2}
                        maxZoom={2.5}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#1e1e2e" gap={20} size={1} />
                        <Controls />
                        <MiniMap
                            nodeColor={(n: any) => n.data?.phase?.color || '#64748b'}
                            maskColor="rgba(0,0,0,0.7)"
                        />
                    </ReactFlow>
                </div>

                {/* ─── Cross-Engine Protocol ─── */}
                <div className="protocol-section">
                    <div className="section-title">Cross-Engine Feedback Protocol</div>
                    <div className="section-desc">Engines never call each other directly. All communication via event-based writeback and governed consumption.</div>
                    <div className="protocol-grid">
                        {PROTOCOLS.map((p, i) => (
                            <motion.div
                                key={i}
                                className="protocol-card"
                                whileHover={{ y: -4, borderColor: `${p.color}40` }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: p.color, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                                    {p.from}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.7 }}>
                                    {p.items.map((item, j) => <div key={j}>→ {item}</div>)}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ─── Footer ─── */}
                <div style={{ textAlign: 'center', padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: '0.72rem', color: '#334155', maxWidth: 700, margin: '0 auto', lineHeight: 2 }}>
                        Canonical v1 — The system may not skip phases, bypass gates, blur engine boundaries,
                        or improvise logic outside the constraints defined here. Every output must be reconstructable.
                    </p>
                </div>
            </div>

            {/* ─── Detail Drawer ─── */}
            <DetailDrawer phase={selected} onClose={() => setSelected(null)} />
        </div>
    )
}
