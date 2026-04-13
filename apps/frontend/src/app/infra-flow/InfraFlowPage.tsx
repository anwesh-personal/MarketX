'use client'

import React, { useState } from 'react'
import { PHASES, SYSTEM_LAWS, ENGINES, Phase } from './data'
import { PHASES_5_9 } from './data2'
import './infra-flow.css'

const ALL_PHASES = [...PHASES, ...PHASES_5_9]

const WORKFLOW_STATES = [
    { label: 'draft', type: 'pending' },
    { label: 'partner_qualification_pending', type: 'pending' },
    { label: 'intake_pending', type: 'pending' },
    { label: 'data_engine_pending', type: 'pending' },
    { label: 'marketwriter_pending', type: 'pending' },
    { label: 'delivery_pending', type: 'pending' },
    { label: 'validation_pending', type: 'pending' },
    { label: 'ready_for_launch', type: 'active' },
    { label: 'launch_active', type: 'active' },
    { label: 'live', type: 'active' },
    { label: 'paused', type: 'pending' },
    { label: 'failed', type: 'blocked' },
    { label: 'archived', type: 'blocked' },
]

const PROTOCOLS = [
    { from: 'Delivery → Data', color: '#f59e0b', items: 'hard bounces → suppression\nunsubscribe → suppression\ncomplaint → suppression\ninvalid domain → suppression' },
    { from: 'Delivery → MarketWriter', color: '#8b5cf6', items: 'reply text\nreply classification\nsentiment\nobjection patterns' },
    { from: 'MarketWriter → Data', color: '#06b6d4', items: 'updated targeting constraints\nupdated exclusion signals' },
    { from: 'Learning → All Engines', color: '#a855f7', items: 'rule updates\nthreshold updates\nclassification updates\ndecision weight updates' },
    { from: 'Data → Learning', color: '#06b6d4', items: 'ICP fit outcomes\nsuppression patterns\nidentity failures\nrole ambiguity\ntiming rejections' },
]

export default function InfraFlowPage() {
    const [expanded, setExpanded] = useState<number | null>(null)

    return (
        <div className="infra-flow">
            {/* Hero */}
            <div className="infra-hero">
                <h1>IIInfrastructure Unified Workflow</h1>
                <p className="subtitle">
                    A coordinated acquisition operating system composed of three independent but interdependent engines.
                    Nine phases. Zero shortcuts. Signal integrity above all.
                </p>
                <div className="engine-row">
                    {ENGINES.map(e => (
                        <div key={e.name} className="engine-badge">
                            <div className="engine-dot" style={{ background: e.color }} />
                            <span style={{ color: e.color }}>{e.name}</span>
                            <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>— {e.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* System Laws */}
            <div className="laws-section">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center', color: '#fca5a5' }}>
                    ⚖️ System Law — Non-Negotiable
                </h2>
                <div className="laws-grid">
                    {SYSTEM_LAWS.map((law, i) => (
                        <div key={i} className="law-item">
                            <div className="law-num">{i + 1}</div>
                            <span>{law}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workflow State Model */}
            <div style={{ maxWidth: 900, margin: '0 auto 3rem', padding: '0 2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#94a3b8' }}>
                    State Transition Model
                </h2>
                <div className="states-row">
                    {WORKFLOW_STATES.map((s, i) => (
                        <React.Fragment key={s.label}>
                            <div className={`state-chip ${s.type}`}>{s.label}</div>
                            {i < WORKFLOW_STATES.length - 1 && <span style={{ color: '#475569', fontSize: '0.7rem' }}>→</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Phase Timeline */}
            <div className="timeline-container">
                <div className="timeline-line" />
                {ALL_PHASES.map(phase => (
                    <PhaseNode
                        key={phase.num}
                        phase={phase}
                        expanded={expanded === phase.num}
                        onToggle={() => setExpanded(expanded === phase.num ? null : phase.num)}
                    />
                ))}
            </div>

            {/* Cross-Engine Protocol */}
            <div className="protocol-section">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', color: '#e2e8f0' }}>
                    Cross-Engine Feedback Protocol
                </h2>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    Engines never call each other directly. All communication via event-based writeback.
                </p>
                <div className="protocol-grid">
                    {PROTOCOLS.map((p, i) => (
                        <div key={i} className="protocol-card">
                            <div className="protocol-arrow" style={{ color: p.color }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                                {p.from}
                            </div>
                            <div className="protocol-items">
                                {p.items.split('\n').map((item, j) => (
                                    <div key={j}>→ {item}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.7rem', color: '#475569', maxWidth: 700, margin: '0 auto', lineHeight: 1.8 }}>
                    Canonical v1 — The system may not skip phases, bypass gates, blur engine boundaries,
                    or improvise logic outside the constraints defined here.
                </p>
            </div>
        </div>
    )
}

/* ─── Phase Node Component ─── */

function PhaseNode({ phase, expanded, onToggle }: { phase: Phase; expanded: boolean; onToggle: () => void }) {
    return (
        <div className="phase-node" onClick={onToggle}>
            <div className="phase-dot" style={{ background: phase.color, color: phase.color }} />
            <div className={`phase-card ${expanded ? 'expanded' : ''}`}>
                <div className="phase-header">
                    <div className="phase-num" style={{ background: `${phase.color}20`, color: phase.color }}>
                        {phase.num}
                    </div>
                    <div>
                        <div className="phase-title">{phase.title}</div>
                        <span className="phase-subtitle">{phase.subtitle} · {phase.engine} · {phase.owner}</span>
                    </div>
                </div>
                <div className="phase-objective">{phase.objective}</div>
                <div className="phase-tags">
                    <span className="phase-tag" style={{ color: '#3b82f6' }}>📋 {phase.steps.length} steps</span>
                    <span className="phase-tag" style={{ color: '#22c55e' }}>📤 {phase.outputs.length} outputs</span>
                    {phase.gates.length > 0 && <span className="phase-tag" style={{ color: '#a855f7' }}>🚧 {phase.gates.length} gates</span>}
                    <span className="phase-tag" style={{ color: '#94a3b8' }}>⬆ {phase.entryCondition}</span>
                </div>

                {expanded && (
                    <div className="phase-detail">
                        <DetailSection label="Operator Steps" items={phase.steps} cls="steps" />
                        <DetailSection label="Outputs" items={phase.outputs} cls="outputs" />
                        <DetailSection label="Exit Conditions" items={phase.exitConditions} cls="exits" />
                        <DetailSection label="Failure Conditions" items={phase.failureConditions} cls="failures" />
                        {phase.gates.length > 0 && <DetailSection label="Activation Gates" items={phase.gates} cls="gates" />}
                        {phase.modules.length > 0 && <DetailSection label="Interface Modules" items={phase.modules} cls="modules" />}
                        {phase.systemLaws.length > 0 && (
                            <div className="detail-section">
                                <div className="detail-label" style={{ color: '#ef4444' }}>⚖️ Governing Laws</div>
                                <ul className="detail-list failures">
                                    {phase.systemLaws.map((l, i) => <li key={i}>{l}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function DetailSection({ label, items, cls }: { label: string; items: string[]; cls: string }) {
    return (
        <div className="detail-section">
            <div className="detail-label">{label}</div>
            <ul className={`detail-list ${cls}`}>
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    )
}
