'use client';

/**
 * WORKFLOW TEMPLATES PAGE - PREMIUM CARD-BASED UI
 * SuperAdmin page for managing workflow templates
    * Beautiful card layout with hover animations and tooltips
        */

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Node, Edge } from 'reactflow';
import {
    Plus,
    Save,
    ChevronDown,
    ChevronRight,
    Zap,
    Brain,
    Send,
    Search,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle,
    FileText,
    Settings,
    Filter,
    Clock,
    Eye,
    Trash2,
    Copy,
    Sparkles,
    GitBranch,
    ArrowLeft,
    Grid3X3,
    List,
    Play,
    MoreVertical,
    Rocket,
} from 'lucide-react';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';
import { allSubNodes, getSubNodesByCategory, SubNodeDefinition } from '@/components/WorkflowBuilder/AxiomSubNodes';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowTemplate {
    id: string;
    name: string;
    description: string | null;
    nodes: Node[];
    edges: Edge[];
    node_count: number;
    status: 'draft' | 'active' | 'disabled';
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// DYNAMIC IMPORTS
// ============================================================================

const WorkflowBuilder = dynamic(
    () => import('@/components/WorkflowBuilder/WorkflowBuilder'),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 bg-background flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-md" />
                    <p className="text-textSecondary">Loading workflow builder...</p>
                </div>
            </div>
        )
    }
);

// ============================================================================
// CATEGORY COLORS FOR CARDS
// ============================================================================

const statusColors = {
    active: {
        bg: 'var(--color-surface)',
        border: 'var(--color-success)',
        text: 'var(--color-success)',
        badge: 'bg-surface border-success text-success',
    },
    draft: {
        bg: 'var(--color-surface)',
        border: 'var(--color-warning)',
        text: 'var(--color-warning)',
        badge: 'bg-surface border-warning text-warning',
    },
    disabled: {
        bg: 'var(--color-surface)',
        border: 'var(--color-text-tertiary)',
        text: 'var(--color-text-tertiary)',
        badge: 'bg-surface border-textTertiary text-textTertiary',
    },
};

// ============================================================================
// WORKFLOW CARD COMPONENT - PREMIUM DESIGN
// ============================================================================

interface WorkflowCardProps {
    workflow: WorkflowTemplate;
    onSelect: (wf: WorkflowTemplate) => void;
    onDelete: (id: string) => void;
    onDuplicate: (wf: WorkflowTemplate) => void;
    onDeploy: (wf: WorkflowTemplate) => void;
}

function WorkflowCard({ workflow, onSelect, onDelete, onDuplicate, onDeploy }: WorkflowCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const colors = statusColors[workflow.status] || statusColors.draft;
    const nodeCount = workflow.node_count || workflow.nodes?.length || 0;
    const edgeCount = workflow.edges?.length || 0;

    // Generate a visual preview of node types in the workflow
    const getNodeTypeSummary = () => {
        if (!workflow.nodes || workflow.nodes.length === 0) return [];
        const categories = workflow.nodes.reduce((acc: Record<string, number>, node) => {
            const cat = node.data?.category || node.type || 'unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(categories).slice(0, 4);
    };

    const nodeSummary = getNodeTypeSummary();

    const categoryIcons: Record<string, React.ReactNode> = {
        trigger: <Zap className="w-3 h-3" />,
        input: <FileText className="w-3 h-3" />,
        process: <Brain className="w-3 h-3" />,
        condition: <GitBranch className="w-3 h-3" />,
        preview: <Eye className="w-3 h-3" />,
        output: <Send className="w-3 h-3" />,
    };

    const categoryColors: Record<string, string> = {
        trigger: '#F59E0B',
        input: '#3B82F6',
        process: '#A855F7',
        condition: '#10B981',
        preview: '#F59E0B',
        output: '#F43F5E',
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => { setIsHovered(true); setShowTooltip(true); }}
            onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); setShowMenu(false); }}
        >
            {/* MAIN CARD */}
            <div
                onClick={() => onSelect(workflow)}
                style={{
                    background: colors.bg,
                    borderColor: colors.border,
                    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                    boxShadow: isHovered
                        ? `0 20px 40px rgba(0,0,0,0.15), 0 0 0 2px ${colors.border}`
                        : '0 4px 12px rgba(0,0,0,0.08)',
                }}
                className="
                    relative overflow-hidden cursor-pointer
                    rounded-2xl border-2 p-5
                    transition-all duration-300 ease-out
                "
            >
                {/* GLOW EFFECT */}
                {isHovered && (
                    <div
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                            background: `radial-gradient(circle at 50% 0%, ${colors.border}40, transparent 70%)`,
                        }}
                    />
                )}

                {/* STATUS BADGE */}
                <div className="absolute top-4 right-4">
                    <span className={`
                        px-2 py-1 text-xs font-bold rounded-full border
                        ${colors.badge}
                    `}>
                        {workflow.status.toUpperCase()}
                    </span>
                </div>

                {/* HEADER */}
                <div className="mb-4">
                    <div className="flex items-start gap-3">
                        {/* ICON */}
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, ${colors.border}, ${colors.border}CC)`,
                            }}
                        >
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>

                        {/* TITLE */}
                        <div className="flex-1 min-w-0 pr-16">
                            <h3 className="font-bold text-lg text-textPrimary truncate mb-1">
                                {workflow.name}
                            </h3>
                            <p
                                className="text-sm line-clamp-2"
                                style={{ color: colors.text }}
                            >
                                {workflow.description || 'No description provided'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* NODE PREVIEW */}
                {nodeSummary.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Node Composition
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {nodeSummary.map(([cat, count]) => (
                                <div
                                    key={cat}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-border"
                                    style={{
                                        background: 'var(--color-surface-hover)',
                                        color: 'var(--color-text-secondary)',
                                    }}
                                >
                                    {categoryIcons[cat] || <GitBranch className="w-3 h-3" />}
                                    {count} {cat}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STATS BAR */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 text-xs text-textSecondary">
                        <span className="flex items-center gap-1">
                            <Grid3X3 className="w-3.5 h-3.5" />
                            {nodeCount} nodes
                        </span>
                        <span className="flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5" />
                            {edgeCount} connections
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(workflow.updated_at).toLocaleDateString()}
                    </div>
                </div>

                {/* HOVER ACTIONS */}
                <div
                    className={`
                        absolute bottom-4 right-4 flex items-center gap-2
                        transition-all duration-200
                        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                    `}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(workflow); }}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all hover:scale-110"
                        title="Duplicate"
                    >
                        <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeploy(workflow); }}
                        className="p-2 bg-white/90 hover:bg-emerald-50 rounded-lg shadow-md transition-all hover:scale-110"
                        title="Deploy as Engine"
                    >
                        <Rocket className="w-4 h-4 text-gray-600 hover:text-emerald-600" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(workflow.id); }}
                        className="p-2 bg-white/90 hover:bg-red-50 rounded-lg shadow-md transition-all hover:scale-110"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(workflow); }}
                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg shadow-md transition-all hover:scale-105 flex items-center gap-1 text-sm font-medium"
                    >
                        <Play className="w-4 h-4" />
                        Open
                    </button>
                </div>
            </div>

            {/* TOOLTIP */}
            {showTooltip && workflow.description && (
                <div
                    className="
                        absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                        px-4 py-3 max-w-xs
                        bg-gray-900 text-white text-sm rounded-xl shadow-xl
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        pointer-events-none
                    "
                >
                    <div className="font-semibold mb-1">{workflow.name}</div>
                    <div className="text-gray-300 text-xs">{workflow.description}</div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900" />
                </div>
            )}
        </div>
    );
}

// ============================================================================
// CREATE WORKFLOW CARD
// ============================================================================

function CreateWorkflowCard({ onClick }: { onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered ? '0 12px 24px rgba(168, 85, 247, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
            }}
            className="
                relative overflow-hidden cursor-pointer
                shadow-sm border border-border border-dashed
                bg-surface hover:bg-surface-hover
                p-8 min-h-[280px]
                flex flex-col items-center justify-center gap-4
                transition-all duration-300 ease-out
                hover:border-primary
                group
            "
        >
            <div
                className="
                    w-16 h-16 rounded-2xl
                    bg-gradient-to-br from-purple-500 to-violet-600
                    flex items-center justify-center
                    shadow-lg shadow-purple-500/30
                    group-hover:scale-110 transition-transform duration-300
                "
            >
                <Plus className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
                <h3 className="font-bold text-lg text-textPrimary mb-1">
                    Create New Template
                </h3>
                <p className="text-sm text-textSecondary">
                    Build a new workflow from scratch
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// NODE PALETTE
// ============================================================================

function NodePalette() {
    const [expandedSection, setExpandedSection] = useState<string | null>('trigger');

    // Click-to-add: dispatch event for WorkflowBuilder to handle
    const handleNodeClick = (node: SubNodeDefinition) => {
        const event = new CustomEvent('add-node-from-palette', {
            detail: node
        });
        window.dispatchEvent(event);
    };

    // Also support drag for users who prefer it
    const handleDragStart = (e: React.DragEvent, node: SubNodeDefinition) => {
        const data = JSON.stringify({
            nodeId: node.nodeId,
            category: node.category,
        });
        e.dataTransfer.setData('application/json', data);
        e.dataTransfer.setData('text/plain', data);
        e.dataTransfer.effectAllowed = 'move';
    };

    const sections = [
        { id: 'trigger', label: 'Triggers', icon: Zap, color: '#F59E0B', nodes: getSubNodesByCategory('trigger') },
        { id: 'input', label: 'Inputs', icon: FileText, color: '#3B82F6', nodes: getSubNodesByCategory('input') },
        { id: 'process', label: 'Process', icon: Brain, color: '#A855F7', nodes: getSubNodesByCategory('process') },
        { id: 'condition', label: 'Conditions', icon: GitBranch, color: '#10B981', nodes: getSubNodesByCategory('condition') },
        { id: 'preview', label: 'Preview', icon: Eye, color: '#FBBF24', nodes: getSubNodesByCategory('preview') },
        { id: 'output', label: 'Outputs', icon: Send, color: '#F43F5E', nodes: getSubNodesByCategory('output') },
    ];

    return (
        <div className="w-72 bg-surface border-r border-border overflow-y-auto">
            <div className="p-4 border-b border-border">
                <h3 className="font-bold text-textPrimary text-sm uppercase tracking-wider">
                    Node Palette
                </h3>
                <p className="text-xs text-textSecondary mt-1">
                    Click or drag nodes to add
                </p>
            </div>

            {sections.map((section) => {
                const isExpanded = expandedSection === section.id;
                const SectionIcon = section.icon;

                return (
                    <div key={section.id} className="border-b border-border last:border-b-0">
                        <button
                            onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: `${section.color}20` }}
                                >
                                    <SectionIcon className="w-4 h-4" style={{ color: section.color }} />
                                </div>
                                <span className="font-semibold text-textPrimary text-sm">{section.label}</span>
                                <span className="text-xs text-textSecondary">({section.nodes.length})</span>
                            </div>
                            <ChevronRight
                                className={`w-4 h-4 text-textTertiary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                        </button>

                        {isExpanded && (
                            <div className="px-4 pb-4 space-y-2">
                                {section.nodes.map((node) => (
                                    <button
                                        key={node.nodeId}
                                        onClick={() => handleNodeClick(node)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, node)}
                                        className="
                                            w-full p-3 rounded-xl cursor-pointer
                                            border-2 border-transparent
                                            hover:border-border hover:bg-surface-hover
                                            hover:shadow-md active:scale-95
                                            transition-all duration-200 text-left
                                        "
                                        style={{
                                            borderLeftWidth: '4px',
                                            borderLeftColor: section.color,
                                        }}
                                    >
                                        <div className="font-medium text-sm text-textPrimary">{node.name}</div>
                                        <div className="text-xs text-textSecondary mt-1 line-clamp-1">{node.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WorkflowsPage() {
    const { fetchWithAuth } = useSuperadminAuth();

    // State
    const [view, setView] = useState<'list' | 'builder'>('list');
    const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // Fetch workflows
    const fetchWorkflows = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterStatus) params.append('status', filterStatus);

            const response = await fetchWithAuth(`/api/superadmin/workflows?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch workflows');
            }

            setWorkflows(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, searchTerm, filterStatus]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    // Handlers
    const handleCreateNew = () => {
        setSelectedWorkflow(null);
        setView('builder');
    };

    const handleSelectWorkflow = (wf: WorkflowTemplate) => {
        setSelectedWorkflow(wf);
        setView('builder');
    };

    const handleSave = async (nodes: Node[], edges: Edge[]) => {
        setSaving(true);
        setSaveSuccess(false);

        try {
            const isNew = !selectedWorkflow?.id;
            const method = isNew ? 'POST' : 'PATCH';
            const body = isNew
                ? {
                    name: 'New Workflow Template',
                    nodes,
                    edges,
                    status: 'draft',
                }
                : {
                    id: selectedWorkflow.id,
                    nodes,
                    edges,
                };

            const response = await fetchWithAuth('/api/superadmin/workflows', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to save workflow');
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            if (isNew) {
                setSelectedWorkflow(data.data);
            }
            await fetchWorkflows();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow template?')) return;

        try {
            const response = await fetchWithAuth(`/api/superadmin/workflows?id=${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete workflow');
            }

            await fetchWorkflows();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDuplicate = async (wf: WorkflowTemplate) => {
        try {
            const response = await fetchWithAuth('/api/superadmin/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${wf.name} (Copy)`,
                    description: wf.description,
                    nodes: wf.nodes,
                    edges: wf.edges,
                    status: 'draft',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to duplicate workflow');
            }

            await fetchWorkflows();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeploy = async (wf: WorkflowTemplate) => {
        if (!wf.id) {
            alert('Please save the workflow first before deploying as an engine.');
            return;
        }

        const engineName = prompt('Enter a name for the engine:', `${wf.name} Engine`);
        if (!engineName) return;

        try {
            // Call the new backend deploy API
            const response = await fetch('http://localhost:8080/api/engines/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: engineName,
                    description: wf.description || `Engine deployed from ${wf.name}`,
                    templateId: wf.id,
                    flowConfig: {
                        nodes: wf.nodes,
                        edges: wf.edges,
                    },
                    tier: 'pro',
                    executionMode: 'sync',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to deploy engine');
            }

            alert(`✅ Engine "${engineName}" deployed successfully!\n\nGo to Engines page to activate and run it.`);
        } catch (err: any) {
            setError(err.message);
            alert(`❌ Failed to deploy: ${err.message}`);
        }
    };

    // LIST VIEW
    if (view === 'list') {
        return (
            <div className="min-h-[calc(100vh-8rem)] bg-background">
                {/* Header */}
                <div className="bg-surface border-b border-border px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                Workflow Templates
                            </h1>
                            <p className="text-textSecondary mt-2">
                                Build visual workflows that define how the Brain processes requests
                            </p>
                        </div>

                        <button
                            onClick={handleCreateNew}
                            className="
                                flex items-center gap-2 px-5 py-3
                                bg-gradient-to-r from-purple-600 to-violet-600
                                text-white font-semibold rounded-xl
                                shadow-lg shadow-purple-500/30
                                hover:shadow-xl hover:shadow-purple-500/40
                                hover:from-purple-700 hover:to-violet-700
                                transition-all duration-200
                            "
                        >
                            <Plus className="w-5 h-5" />
                            New Template
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-4 mt-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="
                                    w-full pl-12 pr-4 py-3 rounded-xl
                                    border border-border bg-surface
                                    focus:border-primary focus:ring-2 focus:ring-primary/20
                                    transition-all outline-none
                                    placeholder:text-textTertiary
                                    text-textPrimary
                                "
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="
                                px-4 py-3 rounded-xl
                                border border-border bg-surface
                                focus:border-primary focus:ring-2 focus:ring-primary/20
                                transition-all outline-none
                                text-textPrimary font-medium
                            "
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="disabled">Disabled</option>
                        </select>

                        <button
                            onClick={fetchWorkflows}
                            className="p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {error && (
                        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <CreateWorkflowCard onClick={handleCreateNew} />
                            {workflows.map((wf) => (
                                <WorkflowCard
                                    key={wf.id}
                                    workflow={wf}
                                    onSelect={handleSelectWorkflow}
                                    onDelete={handleDelete}
                                    onDuplicate={handleDuplicate}
                                    onDeploy={handleDeploy}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && workflows.length === 0 && (
                        <div className="text-center py-16">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No templates yet</h3>
                            <p className="text-gray-400">Create your first workflow template to get started</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // BUILDER VIEW
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('list')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                        <h2 className="font-bold text-lg text-gray-900">
                            {selectedWorkflow?.name || 'New Workflow'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedWorkflow?.description || 'Drag nodes from the palette to build your workflow'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {saveSuccess && (
                        <span className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Saved!
                        </span>
                    )}
                    <button
                        onClick={() => {
                            const event = new CustomEvent('workflow-save');
                            window.dispatchEvent(event);
                        }}
                        disabled={saving}
                        className="
                            flex items-center gap-2 px-5 py-2.5
                            bg-gradient-to-r from-purple-600 to-violet-600
                            text-white font-semibold rounded-xl
                            shadow-lg shadow-purple-500/30
                            hover:shadow-xl hover:shadow-purple-500/40
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                        "
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>

            {/* Builder */}
            <div className="flex-1 flex overflow-hidden">
                <NodePalette />
                <div className="flex-1 bg-gray-100">
                    <WorkflowBuilder
                        initialNodes={selectedWorkflow?.nodes}
                        initialEdges={selectedWorkflow?.edges}
                        onSave={handleSave}
                        nodePalette={allSubNodes}
                    />
                </div>
            </div>
        </div>
    );
}
