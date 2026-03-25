'use client'
import { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, Position, MarkerType, type NodeMouseHandler } from 'reactflow'
import 'reactflow/dist/style.css'
import { NODE_DETAILS } from './nodeDetails'
import { NodeLightbox } from './NodeLightbox'

function nodeStyle(color: string) {
    return {
        background: 'var(--color-surface)',
        border: `2px solid ${color}`,
        borderRadius: 14,
        padding: '12px 18px',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        boxShadow: `0 4px 24px ${color}20`,
        cursor: 'pointer',
    }
}

const nodes: Node[] = [
    { id: 'refinery', position: { x: 0, y: 0 }, data: { label: '🏭 Refinery Nexus' }, style: nodeStyle('#10b981'), sourcePosition: Position.Right, targetPosition: Position.Left },
    { id: 'kb', position: { x: 280, y: 0 }, data: { label: '📚 Knowledge Base' }, style: nodeStyle('#a78bfa'), sourcePosition: Position.Right, targetPosition: Position.Left },
    { id: 'brain', position: { x: 560, y: 0 }, data: { label: '🧠 Brain' }, style: nodeStyle('#8b5cf6'), sourcePosition: Position.Bottom, targetPosition: Position.Left },
    { id: 'prompts', position: { x: 120, y: 140 }, data: { label: '✨ Prompt Studio' }, style: nodeStyle('#f59e0b'), sourcePosition: Position.Right, targetPosition: Position.Top },
    { id: 'agents', position: { x: 400, y: 140 }, data: { label: '🤖 Agent Swarm' }, style: nodeStyle('#60a5fa'), sourcePosition: Position.Right, targetPosition: Position.Left },
    { id: 'workflow', position: { x: 680, y: 140 }, data: { label: '⚙️ Workflow Engine' }, style: nodeStyle('#14b8a6'), sourcePosition: Position.Bottom, targetPosition: Position.Left },
    { id: 'content', position: { x: 200, y: 280 }, data: { label: '📝 Generated Content' }, style: nodeStyle('#ec4899'), sourcePosition: Position.Right, targetPosition: Position.Top },
    { id: 'mailwizz', position: { x: 500, y: 280 }, data: { label: '📧 MailWizz Satellites' }, style: nodeStyle('#ef4444'), sourcePosition: Position.Bottom, targetPosition: Position.Left },
    { id: 'signals', position: { x: 200, y: 400 }, data: { label: '📊 Signal Events' }, style: nodeStyle('#f43f5e'), sourcePosition: Position.Right, targetPosition: Position.Top },
    { id: 'coach', position: { x: 500, y: 400 }, data: { label: '🎓 Marketing Coach' }, style: nodeStyle('#6366f1'), sourcePosition: Position.Top, targetPosition: Position.Left },
]

const edges: Edge[] = [
    { id: 'e1', source: 'refinery', target: 'kb', animated: true, style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }, label: 'Verified leads' },
    { id: 'e2', source: 'kb', target: 'brain', animated: true, style: { stroke: '#a78bfa' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, label: 'ICP · Brand' },
    { id: 'e3', source: 'prompts', target: 'agents', animated: true, style: { stroke: '#f59e0b' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, label: 'Prompt blocks' },
    { id: 'e4', source: 'brain', target: 'agents', animated: true, style: { stroke: '#8b5cf6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' }, label: 'Persona · Guardrails' },
    { id: 'e5', source: 'agents', target: 'workflow', animated: true, style: { stroke: '#60a5fa' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, label: 'Execute tasks' },
    { id: 'e6', source: 'workflow', target: 'content', animated: true, style: { stroke: '#14b8a6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' }, label: 'Emails · Pages' },
    { id: 'e7', source: 'content', target: 'mailwizz', animated: true, style: { stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' }, label: 'Campaign dispatch' },
    { id: 'e8', source: 'mailwizz', target: 'signals', animated: true, style: { stroke: '#ef4444', strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }, label: 'Webhooks' },
    { id: 'e9', source: 'signals', target: 'coach', animated: true, style: { stroke: '#f43f5e', strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' }, label: 'Analyze' },
    { id: 'e10', source: 'coach', target: 'brain', animated: true, style: { stroke: '#6366f1', strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, label: 'Learnings' },
]

export function ArchitectureDiagram() {
    const [selected, setSelected] = useState<string | null>(null)
    const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelected(node.id), [])

    return (
        <>
            <div className="relative" style={{ height: 520, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-surface/90 backdrop-blur-sm border border-border text-xs text-textTertiary">
                    👆 Click any node to learn more
                </div>
                <ReactFlow
                    nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.25 }}
                    nodesDraggable={false} nodesConnectable={false}
                    onNodeClick={onNodeClick}
                    panOnDrag={true} zoomOnScroll={true}
                    proOptions={{ hideAttribution: true }}
                    style={{ background: 'var(--color-background)' }}
                >
                    <Background gap={28} size={1} color="var(--color-border)" />
                    <Controls showInteractive={false} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10 }} />
                </ReactFlow>
            </div>
            <NodeLightbox isOpen={!!selected} onClose={() => setSelected(null)} data={selected ? NODE_DETAILS[selected] ?? null : null} />
        </>
    )
}
