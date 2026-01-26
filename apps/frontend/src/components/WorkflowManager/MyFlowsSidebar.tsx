'use client';

/**
 * MY FLOWS SIDEBAR
 * Slide-out sidebar showing saved workflows/templates
 * Features: Search, categorization, quick actions
 * 
 * Theme-aware using CSS variables
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, Plus, Folder, Clock,
    MoreVertical, Edit, Copy, Trash, Play,
    ChevronRight, Layout
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SavedFlow {
    id: string;
    name: string;
    description?: string;
    category?: string;
    nodeCount: number;
    createdAt: string;
    updatedAt: string;
    isTemplate?: boolean;
    thumbnail?: string;
}

interface MyFlowsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFlow: (flow: SavedFlow) => void;
    onNewFlow: () => void;
    flows: SavedFlow[];
    templates: SavedFlow[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MyFlowsSidebar({
    isOpen,
    onClose,
    onSelectFlow,
    onNewFlow,
    flows = [],
    templates = []
}: MyFlowsSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'flows' | 'templates'>('flows');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Recent']));

    // Filter flows based on search
    const filteredFlows = useMemo(() => {
        const items = activeTab === 'flows' ? flows : templates;
        if (!searchQuery.trim()) return items;

        const query = searchQuery.toLowerCase();
        return items.filter(flow =>
            flow.name.toLowerCase().includes(query) ||
            flow.description?.toLowerCase().includes(query) ||
            flow.category?.toLowerCase().includes(query)
        );
    }, [activeTab, flows, templates, searchQuery]);

    // Group flows by category
    const groupedFlows = useMemo(() => {
        const groups: Record<string, SavedFlow[]> = {};

        filteredFlows.forEach(flow => {
            const category = flow.category || 'Uncategorized';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(flow);
        });

        return groups;
    }, [filteredFlows]);

    // Toggle category expansion
    const toggleCategory = useCallback((category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    }, []);

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="my-flows-backdrop"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="my-flows-sidebar"
                    >
                        {/* Header */}
                        <div className="my-flows-header">
                            <div className="my-flows-title">
                                <Folder className="my-flows-icon" />
                                <h2>{activeTab === 'flows' ? 'My Flows' : 'Templates'}</h2>
                            </div>
                            <button className="my-flows-close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="my-flows-tabs">
                            <button
                                className={`my-flows-tab ${activeTab === 'flows' ? 'active' : ''}`}
                                onClick={() => setActiveTab('flows')}
                            >
                                <Layout size={16} />
                                My Flows
                                <span className="tab-count">{flows.length}</span>
                            </button>
                            <button
                                className={`my-flows-tab ${activeTab === 'templates' ? 'active' : ''}`}
                                onClick={() => setActiveTab('templates')}
                            >
                                <Folder size={16} />
                                Templates
                                <span className="tab-count">{templates.length}</span>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="my-flows-search">
                            <Search className="my-flows-search-icon" size={16} />
                            <input
                                type="text"
                                placeholder="Search flows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="my-flows-search-input"
                            />
                        </div>

                        {/* New Flow Button */}
                        <button className="my-flows-new-btn" onClick={onNewFlow}>
                            <Plus size={18} />
                            Create New Flow
                        </button>

                        {/* Flows List */}
                        <div className="my-flows-list">
                            {Object.keys(groupedFlows).length === 0 ? (
                                <div className="my-flows-empty">
                                    <Folder size={40} />
                                    <h4>No {activeTab} found</h4>
                                    <p>
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : `Create your first ${activeTab === 'flows' ? 'flow' : 'template'}`
                                        }
                                    </p>
                                </div>
                            ) : (
                                Object.entries(groupedFlows).map(([category, categoryFlows]) => (
                                    <div key={category} className="my-flows-category">
                                        <button
                                            className="my-flows-category-header"
                                            onClick={() => toggleCategory(category)}
                                        >
                                            <ChevronRight
                                                size={16}
                                                className={`category-chevron ${expandedCategories.has(category) ? 'expanded' : ''}`}
                                            />
                                            <span className="category-name">{category}</span>
                                            <span className="category-count">{categoryFlows.length}</span>
                                        </button>

                                        <AnimatePresence>
                                            {expandedCategories.has(category) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="my-flows-category-items"
                                                >
                                                    {categoryFlows.map(flow => (
                                                        <div
                                                            key={flow.id}
                                                            className="my-flows-item"
                                                            onClick={() => onSelectFlow(flow)}
                                                        >
                                                            <div className="flow-item-main">
                                                                <h5 className="flow-item-name">{flow.name}</h5>
                                                                {flow.description && (
                                                                    <p className="flow-item-description">
                                                                        {flow.description}
                                                                    </p>
                                                                )}
                                                                <div className="flow-item-meta">
                                                                    <span className="flow-item-nodes">
                                                                        <Layout size={12} />
                                                                        {flow.nodeCount} nodes
                                                                    </span>
                                                                    <span className="flow-item-date">
                                                                        <Clock size={12} />
                                                                        {formatDate(flow.updatedAt)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flow-item-actions">
                                                                <button className="flow-action-btn" title="Run">
                                                                    <Play size={14} />
                                                                </button>
                                                                <button className="flow-action-btn" title="Edit">
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button className="flow-action-btn" title="Duplicate">
                                                                    <Copy size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default MyFlowsSidebar;
