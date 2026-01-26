/**
 * NODE TYPE REGISTRY
 * Central registry of all available node types for the workflow builder.
 * 
 * This file serves as the source of truth for:
 * 1. Which nodes exist
 * 2. Their categories
 * 3. Their schemas (input/output)
 * 4. Their default configurations
 * 
 * EXTENSIBILITY: To add a new node type:
 * 1. Add entry to NODE_REGISTRY below
 * 2. Create schema in apps/backend/src/schemas/nodes/index.ts
 * 3. Add icon mapping in AxiomNodes.tsx
 * 4. Add handler in workflowExecutionService.ts
 * 
 * NOTE: Node I/O type definitions are in the backend at:
 * apps/backend/src/schemas/nodes/index.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export type NodeCategory =
    | 'trigger'    // Start points
    | 'input'      // KB resolution / data input
    | 'process'    // Transformation / generation
    | 'condition'  // Branching / validation
    | 'output';    // Terminal nodes

export type NodeColor =
    | 'primary'    // Blue - Generators
    | 'success'    // Green - Output/Success
    | 'warning'    // Yellow/Orange - Triggers/Caution
    | 'error'      // Red - Validation/Error
    | 'info'       // Cyan - Input/Resolver
    | 'accent';    // Purple - Processors/Conditions

export interface NodeRegistryEntry {
    id: string;
    name: string;
    description: string;
    category: NodeCategory;
    color: NodeColor;
    icon: string;
    // Number of input handles (-1 = unlimited)
    inputs: number;
    // Number of output handles (-1 = unlimited, named for conditions)
    outputs: number | string[];
    // Default configuration
    defaultConfig: Record<string, any>;
    // Tags for search/filter
    tags: string[];
}

// ============================================================================
// NODE REGISTRY
// ============================================================================

export const NODE_REGISTRY: Record<string, NodeRegistryEntry> = {
    // =========================================================================
    // TRIGGERS (3)
    // =========================================================================
    'webhook-trigger': {
        id: 'webhook-trigger',
        name: 'Webhook Trigger',
        description: 'Receive data from n8n, Zapier, or external webhook',
        category: 'trigger',
        color: 'warning',
        icon: 'Webhook',
        inputs: 0,
        outputs: 1,
        defaultConfig: { validateSignature: false, rateLimitPerMinute: 60 },
        tags: ['trigger', 'webhook', 'n8n', 'zapier', 'api'],
    },
    'schedule-trigger': {
        id: 'schedule-trigger',
        name: 'Schedule Trigger',
        description: 'Run workflow on a schedule (cron)',
        category: 'trigger',
        color: 'warning',
        icon: 'Clock',
        inputs: 0,
        outputs: 1,
        defaultConfig: { cronExpression: '0 6 * * *', timezone: 'America/New_York' },
        tags: ['trigger', 'schedule', 'cron', 'daily', 'learning-loop'],
    },
    'manual-trigger': {
        id: 'manual-trigger',
        name: 'Manual Trigger',
        description: 'Start workflow manually for testing',
        category: 'trigger',
        color: 'info',
        icon: 'Play',
        inputs: 0,
        outputs: 1,
        defaultConfig: { testMode: false },
        tags: ['trigger', 'manual', 'test', 'debug'],
    },

    // =========================================================================
    // RESOLVERS (5) - Input Category
    // =========================================================================
    'resolve-icp': {
        id: 'resolve-icp',
        name: 'Resolve ICP',
        description: 'Match input to ICP segment from KB',
        category: 'input',
        color: 'info',
        icon: 'Target',
        inputs: 1,
        outputs: 1,
        defaultConfig: { fallbackToDefault: true, minConfidence: 0.5 },
        tags: ['resolver', 'icp', 'segment', 'audience', 'kb'],
    },
    'resolve-offer': {
        id: 'resolve-offer',
        name: 'Resolve Offer',
        description: 'Select Offer from KB',
        category: 'input',
        color: 'info',
        icon: 'Tag',
        inputs: 1,
        outputs: 1,
        defaultConfig: { requireICP: false },
        tags: ['resolver', 'offer', 'product', 'kb'],
    },
    'resolve-angle': {
        id: 'resolve-angle',
        name: 'Select Angle',
        description: 'Choose persuasion angle from KB',
        category: 'input',
        color: 'info',
        icon: 'Compass',
        inputs: 1,
        outputs: 1,
        defaultConfig: { respectKBPreferences: true },
        tags: ['resolver', 'angle', 'persuasion', 'kb', 'learning'],
    },
    'resolve-blueprint': {
        id: 'resolve-blueprint',
        name: 'Select Blueprint',
        description: 'Choose content blueprint and layout',
        category: 'input',
        color: 'info',
        icon: 'Layout',
        inputs: 1,
        outputs: 1,
        defaultConfig: { includeLayout: true },
        tags: ['resolver', 'blueprint', 'layout', 'structure', 'kb'],
    },
    'resolve-cta': {
        id: 'resolve-cta',
        name: 'Select CTA',
        description: 'Choose CTA based on routing rules',
        category: 'input',
        color: 'info',
        icon: 'MousePointer',
        inputs: 1,
        outputs: 1,
        defaultConfig: {},
        tags: ['resolver', 'cta', 'routing', 'kb'],
    },

    // =========================================================================
    // GENERATORS (5) - Process Category
    // =========================================================================
    'generate-website-page': {
        id: 'generate-website-page',
        name: 'Generate Page',
        description: 'Generate single website page with sections',
        category: 'process',
        color: 'primary',
        icon: 'FileText',
        inputs: 1,
        outputs: 1,
        defaultConfig: { generateVariant: false },
        tags: ['generator', 'website', 'page', 'landing', 'content'],
    },
    'generate-website-bundle': {
        id: 'generate-website-bundle',
        name: 'Generate Website',
        description: 'Generate multi-page website bundle',
        category: 'process',
        color: 'primary',
        icon: 'Layers',
        inputs: 1,
        outputs: 1,
        defaultConfig: { includeRouting: true },
        tags: ['generator', 'website', 'bundle', 'funnel', 'content'],
    },
    'generate-email-flow': {
        id: 'generate-email-flow',
        name: 'Generate Email Flow',
        description: 'Create email sequence with delays',
        category: 'process',
        color: 'primary',
        icon: 'Mail',
        inputs: 1,
        outputs: 1,
        defaultConfig: { defaultEmailCount: 5, defaultDelayHours: 48 },
        tags: ['generator', 'email', 'sequence', 'nurture', 'content'],
    },
    'generate-email-reply': {
        id: 'generate-email-reply',
        name: 'Generate Reply',
        description: 'Generate contextual email reply',
        category: 'process',
        color: 'primary',
        icon: 'Reply',
        inputs: 1,
        outputs: 1,
        defaultConfig: { includeThread: true },
        tags: ['generator', 'email', 'reply', 'response', 'content'],
    },
    'generate-social-post': {
        id: 'generate-social-post',
        name: 'Generate Social',
        description: 'Create platform-specific social content',
        category: 'process',
        color: 'primary',
        icon: 'Share2',
        inputs: 1,
        outputs: 1,
        defaultConfig: { generateHashtags: true },
        tags: ['generator', 'social', 'linkedin', 'twitter', 'content'],
    },

    // =========================================================================
    // PROCESSORS (4) - Process Category
    // =========================================================================
    'analyze-intent': {
        id: 'analyze-intent',
        name: 'Analyze Intent',
        description: 'Detect intent and scenario from content',
        category: 'process',
        color: 'accent',
        icon: 'Search',
        inputs: 1,
        outputs: 1,
        defaultConfig: { includeTopics: true },
        tags: ['processor', 'intent', 'scenario', 'sentiment', 'ai'],
    },
    'web-search': {
        id: 'web-search',
        name: 'Web Research',
        description: 'Search web for context',
        category: 'process',
        color: 'accent',
        icon: 'Globe',
        inputs: 1,
        outputs: 1,
        defaultConfig: { maxResults: 5, synthesize: true },
        tags: ['processor', 'search', 'research', 'context'],
    },
    'seo-optimize': {
        id: 'seo-optimize',
        name: 'SEO Optimizer',
        description: 'Optimize content for search engines',
        category: 'process',
        color: 'accent',
        icon: 'TrendingUp',
        inputs: 1,
        outputs: 1,
        defaultConfig: { targetDensity: 0.02 },
        tags: ['processor', 'seo', 'keywords', 'meta'],
    },
    'add-content-locker': {
        id: 'add-content-locker',
        name: 'Content Locker',
        description: 'Add email gates for lead generation',
        category: 'process',
        color: 'accent',
        icon: 'Lock',
        inputs: 1,
        outputs: 1,
        defaultConfig: { gateType: 'email' },
        tags: ['processor', 'locker', 'gate', 'lead-gen'],
    },

    // =========================================================================
    // VALIDATORS (2) - Condition Category
    // =========================================================================
    'validate-constitution': {
        id: 'validate-constitution',
        name: 'Constitution Check',
        description: 'Validate against organization guardrails',
        category: 'condition',
        color: 'error',
        icon: 'Shield',
        inputs: 1,
        outputs: ['pass', 'fail'], // Named outputs for branching
        defaultConfig: { autoFix: false, minScore: 70 },
        tags: ['validator', 'constitution', 'guardrails', 'compliance'],
    },
    'validate-quality': {
        id: 'validate-quality',
        name: 'Quality Gate',
        description: 'Multi-dimensional quality check',
        category: 'condition',
        color: 'success',
        icon: 'CheckCircle',
        inputs: 1,
        outputs: ['approve', 'review', 'reject'],
        defaultConfig: { minScore: 70, maxIssues: 3 },
        tags: ['validator', 'quality', 'score', 'review'],
    },

    // =========================================================================
    // CONDITIONS (3) - Condition Category
    // =========================================================================
    'route-by-stage': {
        id: 'route-by-stage',
        name: 'Route by Stage',
        description: 'Branch by buyer awareness stage',
        category: 'condition',
        color: 'accent',
        icon: 'GitBranch',
        inputs: 1,
        outputs: ['UNAWARE', 'PROBLEM_AWARE', 'SOLUTION_AWARE', 'PRODUCT_AWARE', 'MOST_AWARE'],
        defaultConfig: {},
        tags: ['condition', 'routing', 'stage', 'awareness'],
    },
    'route-by-validation': {
        id: 'route-by-validation',
        name: 'Route by Validation',
        description: 'Branch by pass/fail result',
        category: 'condition',
        color: 'accent',
        icon: 'Split',
        inputs: 1,
        outputs: ['pass', 'fail'],
        defaultConfig: {},
        tags: ['condition', 'routing', 'validation'],
    },
    'route-by-type': {
        id: 'route-by-type',
        name: 'Route by Type',
        description: 'Branch by content type',
        category: 'condition',
        color: 'accent',
        icon: 'Shuffle',
        inputs: 1,
        outputs: ['website', 'email_flow', 'email_reply', 'social_post'],
        defaultConfig: {},
        tags: ['condition', 'routing', 'content-type'],
    },

    // =========================================================================
    // OUTPUTS (3)
    // =========================================================================
    'output-webhook': {
        id: 'output-webhook',
        name: 'Send Webhook',
        description: 'Send result via HTTP webhook',
        category: 'output',
        color: 'success',
        icon: 'Send',
        inputs: 1,
        outputs: 0,
        defaultConfig: { method: 'POST', retryOnFailure: true },
        tags: ['output', 'webhook', 'api', 'n8n'],
    },
    'output-store': {
        id: 'output-store',
        name: 'Store Content',
        description: 'Save to database with versioning',
        category: 'output',
        color: 'success',
        icon: 'Database',
        inputs: 1,
        outputs: 0,
        defaultConfig: { autoVersion: true },
        tags: ['output', 'store', 'database', 'save'],
    },
    'output-analytics': {
        id: 'output-analytics',
        name: 'Log Analytics',
        description: 'Record event for learning loop',
        category: 'output',
        color: 'success',
        icon: 'BarChart3',
        inputs: 1,
        outputs: 0,
        defaultConfig: {},
        tags: ['output', 'analytics', 'learning', 'tracking'],
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all nodes in a category
 */
export function getNodesByCategory(category: NodeCategory): NodeRegistryEntry[] {
    return Object.values(NODE_REGISTRY).filter(n => n.category === category);
}

/**
 * Get all node IDs
 */
export function getAllNodeIds(): string[] {
    return Object.keys(NODE_REGISTRY);
}

/**
 * Check if a node type exists
 */
export function isValidNodeType(nodeId: string): boolean {
    return nodeId in NODE_REGISTRY;
}

/**
 * Get node info or throw
 */
export function getNodeInfo(nodeId: string): NodeRegistryEntry {
    const entry = NODE_REGISTRY[nodeId];
    if (!entry) {
        throw new Error(`Unknown node type: ${nodeId}`);
    }
    return entry;
}

/**
 * Search nodes by tag or name
 */
export function searchNodes(query: string): NodeRegistryEntry[] {
    const q = query.toLowerCase();
    return Object.values(NODE_REGISTRY).filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.tags.some(t => t.includes(q))
    );
}

/**
 * Get nodes grouped by category
 */
export function getNodesGrouped(): Record<NodeCategory, NodeRegistryEntry[]> {
    return {
        trigger: getNodesByCategory('trigger'),
        input: getNodesByCategory('input'),
        process: getNodesByCategory('process'),
        condition: getNodesByCategory('condition'),
        output: getNodesByCategory('output'),
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default NODE_REGISTRY;
