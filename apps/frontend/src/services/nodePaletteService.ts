/**
 * NODE PALETTE SERVICE
 * Database operations for workflow node palette
 * Ported from Lekhika's alchemistNodePaletteService.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

export interface NodePaletteItem {
    id: string;
    node_id: string;
    name: string;
    description: string | null;
    category: 'trigger' | 'input' | 'process' | 'condition' | 'preview' | 'output';
    icon: string;
    color: string;
    features: string[];
    capabilities: string[];
    default_config: Record<string, any>;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface NodePaletteByCategory {
    triggers: NodePaletteItem[];
    inputs: NodePaletteItem[];
    processes: NodePaletteItem[];
    conditions: NodePaletteItem[];
    previews: NodePaletteItem[];
    outputs: NodePaletteItem[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class NodePaletteService {
    private tableName = 'node_palette';

    /**
     * Get all active node types
     */
    async getAllNodeTypes(): Promise<NodePaletteItem[]> {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching node types:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Get node types grouped by category
     */
    async getNodeTypesByCategory(): Promise<NodePaletteByCategory> {
        const allNodes = await this.getAllNodeTypes();

        return {
            triggers: allNodes.filter(n => n.category === 'trigger'),
            inputs: allNodes.filter(n => n.category === 'input'),
            processes: allNodes.filter(n => n.category === 'process'),
            conditions: allNodes.filter(n => n.category === 'condition'),
            previews: allNodes.filter(n => n.category === 'preview'),
            outputs: allNodes.filter(n => n.category === 'output'),
        };
    }

    /**
     * Get single node type by node_id
     */
    async getNodeType(nodeId: string): Promise<NodePaletteItem | null> {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('node_id', nodeId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            console.error('Error fetching node type:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get unique categories
     */
    async getCategories(): Promise<string[]> {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('category')
            .eq('is_active', true)
            .order('category', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }

        const categories = [...new Set(data?.map(item => item.category) || [])];
        return categories;
    }

    /**
     * Update node configuration (SuperAdmin only)
     */
    async updateNode(nodeId: string, updates: Partial<NodePaletteItem>): Promise<NodePaletteItem> {
        const { data, error } = await supabase
            .from(this.tableName)
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('node_id', nodeId)
            .select()
            .single();

        if (error) {
            console.error('Error updating node:', error);
            throw error;
        }

        return data;
    }

    /**
     * Create new node type (SuperAdmin only)
     */
    async createNode(node: Omit<NodePaletteItem, 'id' | 'created_at' | 'updated_at'>): Promise<NodePaletteItem> {
        const { data, error } = await supabase
            .from(this.tableName)
            .insert(node)
            .select()
            .single();

        if (error) {
            console.error('Error creating node:', error);
            throw error;
        }

        return data;
    }

    /**
     * Toggle node active status (SuperAdmin only)
     */
    async toggleNodeActive(nodeId: string, isActive: boolean): Promise<NodePaletteItem> {
        return this.updateNode(nodeId, { is_active: isActive });
    }

    /**
     * Delete node type (SuperAdmin only)
     */
    async deleteNode(nodeId: string): Promise<void> {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('node_id', nodeId);

        if (error) {
            console.error('Error deleting node:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const nodePaletteService = new NodePaletteService();
export default nodePaletteService;
