/**
 * WORKFLOW TEMPLATE LOADER
 * 
 * Loads all V2 workflow templates from JSON files.
 * Used by migration scripts and API endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    status: string;
    version: string;
    nodes: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        data: {
            label: string;
            nodeType: string;
            description?: string;
            config?: Record<string, any>;
        };
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        animated?: boolean;
    }>;
}

const TEMPLATE_DIR = path.join(__dirname, 'templates');

const TEMPLATE_FILES = [
    'email_reply_engine.json',
    'email_flow_generator.json',
    'landing_page_builder.json',
    'sales_funnel_pack.json',
    'social_multiplatform.json',
    'blog_social_engine.json',
    'sales_copy_engine.json',
    'vsl_script_writer.json',
    'mini_ebook_generator.json',
    'gated_content_pack.json',
];

/**
 * Load a single template by filename
 */
export function loadTemplate(filename: string): WorkflowTemplate | null {
    try {
        const filePath = path.join(TEMPLATE_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as WorkflowTemplate;
    } catch (error) {
        console.error(`Failed to load template ${filename}:`, error);
        return null;
    }
}

/**
 * Load all templates
 */
export function loadAllTemplates(): WorkflowTemplate[] {
    const templates: WorkflowTemplate[] = [];

    for (const filename of TEMPLATE_FILES) {
        const template = loadTemplate(filename);
        if (template) {
            templates.push(template);
        }
    }

    console.log(`📁 Loaded ${templates.length} workflow templates`);
    return templates;
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): WorkflowTemplate | null {
    for (const filename of TEMPLATE_FILES) {
        const template = loadTemplate(filename);
        if (template && template.id === templateId) {
            return template;
        }
    }
    return null;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
    const templates = loadAllTemplates();
    return templates.filter(t => t.category === category);
}

/**
 * Convert template to database format for workflow_templates table
 */
export function toDbFormat(template: WorkflowTemplate): {
    id: string;
    name: string;
    description: string;
    nodes: string; // JSON string
    edges: string; // JSON string
    status: string;
    category: string;
} {
    return {
        id: template.id,
        name: template.name,
        description: template.description,
        nodes: JSON.stringify(template.nodes),
        edges: JSON.stringify(template.edges),
        status: template.status,
        category: template.category,
    };
}

/**
 * Generate SQL INSERT statements for all templates
 */
export function generateSeedSQL(): string {
    const templates = loadAllTemplates();

    const inserts = templates.map(template => {
        const nodesJson = JSON.stringify(template.nodes).replace(/'/g, "''");
        const edgesJson = JSON.stringify(template.edges).replace(/'/g, "''");

        return `
INSERT INTO workflow_templates (id, name, description, nodes, edges, status, category, created_at, updated_at)
VALUES (
    '${template.id}',
    '${template.name.replace(/'/g, "''")}',
    '${template.description.replace(/'/g, "''")}',
    '${nodesJson}'::jsonb,
    '${edgesJson}'::jsonb,
    '${template.status}',
    '${template.category}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    nodes = EXCLUDED.nodes,
    edges = EXCLUDED.edges,
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    updated_at = NOW();`;
    });

    return `-- Auto-generated workflow template seed data
-- Generated at: ${new Date().toISOString()}
-- Templates: ${templates.length}

${inserts.join('\n')}
`;
}

// Export template IDs for convenience
export const TEMPLATE_IDS = {
    EMAIL_REPLY_ENGINE: 'template-email-reply-engine',
    EMAIL_FLOW_GENERATOR: 'template-email-flow-generator',
    LANDING_PAGE_BUILDER: 'template-landing-page-builder',
    SALES_FUNNEL_PACK: 'template-sales-funnel-pack',
    SOCIAL_MULTIPLATFORM: 'template-social-multiplatform',
    BLOG_SOCIAL_ENGINE: 'template-blog-social-engine',
    SALES_COPY_ENGINE: 'template-sales-copy-engine',
    VSL_SCRIPT_WRITER: 'template-vsl-script-writer',
    MINI_EBOOK_GENERATOR: 'template-mini-ebook-generator',
    GATED_CONTENT_PACK: 'template-gated-content-pack',
} as const;

export default {
    loadTemplate,
    loadAllTemplates,
    getTemplateById,
    getTemplatesByCategory,
    toDbFormat,
    generateSeedSQL,
    TEMPLATE_IDS,
};
