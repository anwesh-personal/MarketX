'use client';

/**
 * ADD NODE MODAL
 * Beautiful modal for selecting nodes to add to workflow
 * Features: Category tabs, search, grid view, animations
 * 
 * Theme-aware using CSS variables
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Sparkles } from 'lucide-react';
import {
    V2_ALL_NODES,
    V2_NODES_BY_CATEGORY,
    V2_CATEGORY_META,
    V2_CATEGORY_ORDER,
    V2NodeDefinition,
    V2NodeCategory
} from './v2-node-definitions';

// ============================================================================
// TYPES
// ============================================================================

interface AddNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNode: (node: V2NodeDefinition) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddNodeModal({ isOpen, onClose, onAddNode }: AddNodeModalProps) {
    const [selectedCategory, setSelectedCategory] = useState<V2NodeCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter nodes based on category and search
    const filteredNodes = useMemo(() => {
        let nodes = selectedCategory === 'all'
            ? V2_ALL_NODES
            : V2_NODES_BY_CATEGORY[selectedCategory] || [];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            nodes = nodes.filter(node =>
                node.name.toLowerCase().includes(query) ||
                node.description.toLowerCase().includes(query) ||
                node.features.some(f => f.toLowerCase().includes(query))
            );
        }

        return nodes;
    }, [selectedCategory, searchQuery]);

    // Handle node selection
    const handleSelectNode = useCallback((node: V2NodeDefinition) => {
        onAddNode(node);
        onClose();
    }, [onAddNode, onClose]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Get category counts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: V2_ALL_NODES.length };
        V2_CATEGORY_ORDER.forEach(cat => {
            counts[cat] = V2_NODES_BY_CATEGORY[cat]?.length || 0;
        });
        return counts;
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="add-node-modal-backdrop"
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="add-node-modal"
                    >
                        {/* Header */}
                        <div className="add-node-modal-header">
                            <div className="add-node-modal-title">
                                <Sparkles className="add-node-modal-icon" />
                                <div>
                                    <h2>Node Palette</h2>
                                    <p>Choose from {V2_ALL_NODES.length} specialized nodes</p>
                                </div>
                            </div>
                            <button className="add-node-modal-close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="add-node-search-container">
                            <Search className="add-node-search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Search nodes by name, description, or feature..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="add-node-search-input"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    className="add-node-search-clear"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Category Tabs */}
                        <div className="add-node-categories">
                            <button
                                className={`add-node-category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCategory('all')}
                            >
                                <span className="category-icon">✨</span>
                                All Nodes
                                <span className="category-count">{categoryCounts.all}</span>
                            </button>

                            {V2_CATEGORY_ORDER.map(category => {
                                const meta = V2_CATEGORY_META[category];
                                return (
                                    <button
                                        key={category}
                                        className={`add-node-category-tab ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(category)}
                                        style={{
                                            '--category-color': meta.color
                                        } as React.CSSProperties}
                                    >
                                        <span
                                            className="category-dot"
                                            style={{ background: meta.color }}
                                        />
                                        {meta.label}
                                        <span className="category-count">{categoryCounts[category]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Nodes Grid */}
                        <div className="add-node-grid-container">
                            {filteredNodes.length === 0 ? (
                                <div className="add-node-empty">
                                    <Search size={48} />
                                    <h3>No nodes found</h3>
                                    <p>Try a different search term or category</p>
                                </div>
                            ) : (
                                <div className="add-node-grid">
                                    {filteredNodes.map((node, index) => (
                                        <motion.div
                                            key={node.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02, duration: 0.2 }}
                                            className="add-node-card"
                                            onClick={() => handleSelectNode(node)}
                                            style={{
                                                '--node-color': node.color
                                            } as React.CSSProperties}
                                        >
                                            <div className="add-node-card-header">
                                                <div
                                                    className="add-node-card-icon"
                                                    style={{ background: node.color }}
                                                >
                                                    <node.icon size={20} color="white" />
                                                </div>
                                                <button className="add-node-card-add">
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <h4 className="add-node-card-name">{node.name}</h4>
                                            <p className="add-node-card-description">{node.description}</p>

                                            <div className="add-node-card-features">
                                                {node.features.slice(0, 3).map((feature, i) => (
                                                    <span key={i} className="add-node-card-feature">
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>

                                            <div
                                                className="add-node-card-category"
                                                style={{
                                                    background: V2_CATEGORY_META[node.category].color + '20',
                                                    color: V2_CATEGORY_META[node.category].color
                                                }}
                                            >
                                                {V2_CATEGORY_META[node.category].label}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AddNodeModal;
