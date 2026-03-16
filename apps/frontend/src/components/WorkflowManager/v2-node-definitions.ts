/**
 * V2 NODE DEFINITIONS
 * Complete node palette for Workflow Manager v2
 * 36 nodes across 8 categories
 * 
 * @author Axiom AI
 */

import {
    Webhook, Clock, Play, Mail, // Trigger
    User, Package, Compass, Layout, MousePointer, // Resolver
    FileText, Layers, Globe, Send, MessageSquare, // Generator
    CheckCircle, Shield, Search, // Validator
    Globe as Globe2, Building, Users, Database, // Enricher
    Lock, RefreshCw, UserCog, // Transform
    Send as WebhookOut, HardDrive, Mail as MailOut, BarChart, // Output
    GitBranch, Workflow, Repeat, Merge, Clock as ClockDelay, UserCheck, AlertTriangle, GitFork // Utility
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface V2NodeDefinition {
    id: string;
    nodeType: string;
    category: V2NodeCategory;
    name: string;
    description: string;
    icon: LucideIcon;
    color: string;
    features: string[];
    capabilities: string[];
    defaultConfig: Record<string, any>;
    configSchema?: ConfigField[];
    /** Reference to Zod input schema name in workers/src/schemas/nodes/ */
    inputSchema?: string;
    /** Reference to Zod output schema name in workers/src/schemas/nodes/ */
    outputSchema?: string;
    /** If true, node is not yet implemented in runtime; show as "Coming soon" and do not allow add */
    comingSoon?: boolean;
}

export interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json' | 'array';
    required?: boolean;
    default?: any;
    options?: { label: string; value: any }[];
    placeholder?: string;
    description?: string;
}

export type V2NodeCategory =
    | 'trigger'
    | 'resolver'
    | 'generator'
    | 'validator'
    | 'enricher'
    | 'transform'
    | 'output'
    | 'utility';

// ============================================================================
// CATEGORY METADATA
// ============================================================================

export const V2_CATEGORY_META: Record<V2NodeCategory, {
    label: string;
    description: string;
    color: string;
    gradient: string;
}> = {
    trigger: {
        label: 'Triggers',
        description: 'Start workflow execution',
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    },
    resolver: {
        label: 'Resolvers',
        description: 'Pull data from Knowledge Base',
        color: '#8B5CF6',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    },
    generator: {
        label: 'Generators',
        description: 'Create content deterministically',
        color: '#10B981',
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
    },
    validator: {
        label: 'Validators',
        description: 'Check quality and compliance',
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
    },
    enricher: {
        label: 'Enrichers',
        description: 'Add external data',
        color: '#EC4899',
        gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
    },
    transform: {
        label: 'Transforms',
        description: 'Modify and process content',
        color: '#14B8A6',
        gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)'
    },
    output: {
        label: 'Outputs',
        description: 'Send results to destinations',
        color: '#EF4444',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
    },
    utility: {
        label: 'Utilities',
        description: 'Flow control and logic',
        color: '#6366F1',
        gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
    }
};

// ============================================================================
// TRIGGER NODES
// ============================================================================

const triggerNodes: V2NodeDefinition[] = [
    {
        id: 'nd-trigger-webhook',
        nodeType: 'trigger-webhook',
        category: 'trigger',
        name: 'Webhook Trigger',
        description: 'Receive data from external webhooks',
        icon: Webhook,
        color: '#F59E0B',
        features: ['REST Endpoint', 'Auth Support', 'Payload Validation'],
        capabilities: ['Receives HTTP POST', 'Validates payload', 'Extracts data'],
        defaultConfig: { authType: 'none' },
        inputSchema: 'WebhookTriggerInput',
        outputSchema: 'WebhookTriggerOutput',
        configSchema: [
            {
                key: 'authType', label: 'Authentication', type: 'select', options: [
                    { label: 'None', value: 'none' },
                    { label: 'API Key', value: 'api_key' },
                    { label: 'Bearer Token', value: 'bearer' }
                ]
            }
        ]
    },
    {
        id: 'nd-trigger-schedule',
        nodeType: 'trigger-schedule',
        category: 'trigger',
        name: 'Schedule Trigger',
        description: 'Run workflow on a schedule',
        icon: Clock,
        color: '#F59E0B',
        features: ['Cron Support', 'Timezone Aware', 'Recurring'],
        capabilities: ['Cron expressions', 'One-time scheduling', 'Timezone handling'],
        defaultConfig: { cronExpression: '0 9 * * 1-5', timezone: 'UTC' },
        inputSchema: 'ScheduleTriggerInput',
        outputSchema: 'ScheduleTriggerOutput'
    },
    {
        id: 'nd-trigger-manual',
        nodeType: 'trigger-manual',
        category: 'trigger',
        name: 'Manual Trigger',
        description: 'Start workflow manually with custom input',
        icon: Play,
        color: '#F59E0B',
        features: ['Form Input', 'Variable Mapping', 'Quick Start'],
        capabilities: ['User-triggered', 'Custom input form', 'Variable injection'],
        defaultConfig: { inputSchema: {} },
        inputSchema: 'ManualTriggerInput',
        outputSchema: 'ManualTriggerOutput'
    },
    {
        id: 'nd-trigger-email',
        nodeType: 'trigger-email-inbound',
        category: 'trigger',
        name: 'Email Trigger',
        description: 'Trigger on incoming email',
        icon: Mail,
        color: '#F59E0B',
        features: ['Email Parsing', 'Attachment Support', 'Sender Filtering'],
        capabilities: ['Monitors inbox', 'Parses content', 'Extracts metadata'],
        defaultConfig: { parseAttachments: true },
        inputSchema: 'EmailTriggerInput',
        outputSchema: 'EmailTriggerOutput'
    }
];

// ============================================================================
// RESOLVER NODES
// ============================================================================

const resolverNodes: V2NodeDefinition[] = [
    {
        id: 'nd-resolve-icp',
        nodeType: 'resolve-icp',
        category: 'resolver',
        name: 'Resolve ICP',
        description: 'Select target audience from Knowledge Base',
        icon: User,
        color: '#8B5CF6',
        features: ['Context Matching', 'Segment Selection', 'Pain Point Extraction'],
        capabilities: ['Matches context to ICP', 'Returns segment details', 'Provides pain points'],
        defaultConfig: { selectionMode: 'auto' },
        inputSchema: 'ResolveICPInput',
        outputSchema: 'ResolveICPOutput'
    },
    {
        id: 'nd-resolve-offer',
        nodeType: 'resolve-offer',
        category: 'resolver',
        name: 'Resolve Offer',
        description: 'Select product/offer from Knowledge Base',
        icon: Package,
        color: '#8B5CF6',
        features: ['Product Matching', 'Pricing Info', 'Feature Extraction'],
        capabilities: ['Matches context to offers', 'Returns value props', 'Includes pricing'],
        defaultConfig: { selectionMode: 'auto' },
        inputSchema: 'ResolveOfferInput',
        outputSchema: 'ResolveOfferOutput'
    },
    {
        id: 'nd-resolve-angle',
        nodeType: 'resolve-angle',
        category: 'resolver',
        name: 'Resolve Angle',
        description: 'Select marketing angle from Knowledge Base',
        icon: Compass,
        color: '#8B5CF6',
        features: ['Narrative Selection', 'Hook Generation', 'Tone Matching'],
        capabilities: ['Picks best angle', 'Provides narrative', 'Sets emotional tone'],
        defaultConfig: { selectionMode: 'auto' },
        inputSchema: 'ResolveAngleInput',
        outputSchema: 'ResolveAngleOutput'
    },
    {
        id: 'nd-resolve-blueprint',
        nodeType: 'resolve-blueprint',
        category: 'resolver',
        name: 'Resolve Blueprint',
        description: 'Select content blueprint from KB',
        icon: Layout,
        color: '#8B5CF6',
        features: ['Template Selection', 'Structure Matching', 'Format Rules'],
        capabilities: ['Selects blueprint', 'Provides structure', 'Includes format rules'],
        defaultConfig: { selectionMode: 'auto' },
        inputSchema: 'ResolveBlueprintInput',
        outputSchema: 'ResolveBlueprintOutput'
    },
    {
        id: 'nd-resolve-cta',
        nodeType: 'resolve-cta',
        category: 'resolver',
        name: 'Resolve CTA',
        description: 'Select call-to-action from KB',
        icon: MousePointer,
        color: '#8B5CF6',
        features: ['CTA Matching', 'Urgency Level', 'Link Generation'],
        capabilities: ['Selects best CTA', 'Sets urgency', 'Provides action items'],
        defaultConfig: { selectionMode: 'auto' },
        inputSchema: 'ResolveCTAInput',
        outputSchema: 'ResolveCTAOutput'
    }
];

// ============================================================================
// GENERATOR NODES
// ============================================================================

const generatorNodes: V2NodeDefinition[] = [
    {
        id: 'nd-generate-email-reply',
        nodeType: 'generate-email-reply',
        category: 'generator',
        name: 'Generate Email Reply',
        description: 'Create reply emails from KB data',
        icon: MessageSquare,
        color: '#10B981',
        features: ['Context-Aware', 'Personalization', 'Multi-Variant'],
        capabilities: ['Generates subject', 'Creates body', 'Adds personalization'],
        defaultConfig: { includeSignature: true, tone: 'professional' },
        inputSchema: 'GenerateEmailReplyInput',
        outputSchema: 'GenerateEmailReplyOutput'
    },
    {
        id: 'nd-generate-email-flow',
        nodeType: 'generate-email-flow',
        category: 'generator',
        name: 'Generate Email Flow',
        description: 'Create nurture email sequences',
        icon: Send,
        color: '#10B981',
        features: ['Sequence Builder', 'Timing Control', 'A/B Variants'],
        capabilities: ['Creates multi-email flow', 'Sets timing', 'Generates variants'],
        defaultConfig: { emailCount: 5, daysBetween: 2 },
        inputSchema: 'GenerateEmailFlowInput',
        outputSchema: 'GenerateEmailFlowOutput'
    },
    {
        id: 'nd-generate-page',
        nodeType: 'generate-website-page',
        category: 'generator',
        name: 'Generate Page',
        description: 'Create landing pages and web content',
        icon: FileText,
        color: '#10B981',
        features: ['SEO Optimized', 'Responsive', 'Section-Based'],
        capabilities: ['Generates full page', 'Includes SEO meta', 'Responsive structure'],
        defaultConfig: { pageType: 'landing' },
        inputSchema: 'GenerateWebsitePageInput',
        outputSchema: 'GenerateWebsitePageOutput'
    },
    {
        id: 'nd-generate-bundle',
        nodeType: 'generate-website-bundle',
        category: 'generator',
        name: 'Generate Bundle',
        description: 'Create multi-page content packages',
        icon: Layers,
        color: '#10B981',
        features: ['Multi-Page', 'Linked Assets', 'Cohesive Branding'],
        capabilities: ['Creates page set', 'Links pages', 'Consistent style'],
        defaultConfig: { bundleType: 'funnel' },
        inputSchema: 'GenerateWebsiteBundleInput',
        outputSchema: 'GenerateWebsiteBundleOutput'
    },
    {
        id: 'nd-generate-social',
        nodeType: 'generate-social-post',
        category: 'generator',
        name: 'Generate Social Post',
        description: 'Create social media content',
        icon: Globe,
        color: '#10B981',
        features: ['Multi-Platform', 'Hashtags', 'Image Prompts'],
        capabilities: ['Creates posts', 'Adds hashtags', 'Suggests images'],
        defaultConfig: { platforms: ['linkedin', 'twitter'] },
        inputSchema: 'GenerateSocialPostInput',
        outputSchema: 'GenerateSocialPostOutput'
    }
];

// ============================================================================
// VALIDATOR NODES
// ============================================================================

const validatorNodes: V2NodeDefinition[] = [
    {
        id: 'nd-validate-quality',
        nodeType: 'validate-quality',
        category: 'validator',
        name: 'Validate Quality',
        description: 'Check content quality and coherence',
        icon: CheckCircle,
        color: '#3B82F6',
        features: ['Grammar Check', 'Readability', 'Brand Voice'],
        capabilities: ['Checks grammar', 'Scores readability', 'Validates voice'],
        defaultConfig: { minScore: 70 },
        inputSchema: 'QualityGateInput',
        outputSchema: 'QualityGateOutput'
    },
    {
        id: 'nd-validate-constitution',
        nodeType: 'validate-constitution',
        category: 'validator',
        name: 'Validate Constitution',
        description: 'Check against org guardrails',
        icon: Shield,
        color: '#3B82F6',
        features: ['Rule Checks', 'Forbidden Terms', 'Required Elements'],
        capabilities: ['Applies rules', 'Flags violations', 'Suggests fixes'],
        defaultConfig: { strictMode: false },
        inputSchema: 'ConstitutionCheckInput',
        outputSchema: 'ConstitutionCheckOutput'
    },
    {
        id: 'nd-analyze-intent',
        nodeType: 'analyze-intent',
        category: 'validator',
        name: 'Analyze Intent',
        description: 'Classify user intent from input',
        icon: Search,
        color: '#3B82F6',
        features: ['Intent Classification', 'Entity Extraction', 'Confidence Score'],
        capabilities: ['Classifies intent', 'Extracts entities', 'Provides confidence'],
        defaultConfig: { minConfidence: 0.7 },
        inputSchema: 'AnalyzeIntentInput',
        outputSchema: 'AnalyzeIntentOutput'
    }
];

// ============================================================================
// ENRICHER NODES
// ============================================================================

const enricherNodes: V2NodeDefinition[] = [
    {
        id: 'nd-enrich-web',
        nodeType: 'enrich-web-search',
        category: 'enricher',
        name: 'Web Search',
        description: 'Enrich with web search results',
        icon: Globe2,
        color: '#EC4899',
        features: ['Live Search', 'Source Attribution', 'Summarization'],
        capabilities: ['Searches web', 'Summarizes results', 'Adds citations'],
        defaultConfig: { maxResults: 5, summarize: true },
        inputSchema: 'WebSearchInput',
        outputSchema: 'WebSearchOutput'
    },
    {
        id: 'nd-enrich-linkedin',
        nodeType: 'enrich-linkedin',
        category: 'enricher',
        name: 'LinkedIn Enrichment',
        description: 'Enrich with LinkedIn profile and company data',
        icon: Users,
        color: '#EC4899',
        features: ['Profile Data', 'Company Info', 'Job History'],
        capabilities: ['Fetches LinkedIn profiles', 'Gets company data', 'Extracts experience'],
        defaultConfig: { enrichProfile: true, enrichCompany: false },
        comingSoon: true
    },
    {
        id: 'nd-enrich-crm',
        nodeType: 'enrich-crm',
        category: 'enricher',
        name: 'CRM Lookup',
        description: 'Enrich with data from your CRM',
        icon: Database,
        color: '#EC4899',
        features: ['HubSpot', 'Salesforce', 'Pipedrive'],
        capabilities: ['Looks up contacts', 'Fetches deal data', 'Gets company info'],
        defaultConfig: { crmProvider: 'hubspot', crmObject: 'contact' },
        comingSoon: true
    },
    {
        id: 'nd-enrich-email',
        nodeType: 'enrich-email-validation',
        category: 'enricher',
        name: 'Email Validation',
        description: 'Validate and enrich email addresses',
        icon: Mail,
        color: '#EC4899',
        features: ['MX Check', 'Deliverability', 'Disposable Detection'],
        capabilities: ['Validates emails', 'Checks deliverability', 'Detects disposable'],
        defaultConfig: { checkMxRecords: true, rejectInvalid: true },
        comingSoon: true
    }
];

// ============================================================================
// TRANSFORM NODES
// ============================================================================

const transformNodes: V2NodeDefinition[] = [
    {
        id: 'nd-transform-locker',
        nodeType: 'transform-locker',
        category: 'transform',
        name: 'Content Locker',
        description: 'Gate content behind actions',
        icon: Lock,
        color: '#14B8A6',
        features: ['Email Gate', 'Social Gate', 'Payment Gate'],
        capabilities: ['Partially locks content', 'Tracks unlocks', 'A/B testing'],
        defaultConfig: { unlockMethod: 'email_capture' },
        inputSchema: 'ContentLockerInput',
        outputSchema: 'ContentLockerOutput'
    },
    {
        id: 'nd-transform-format',
        nodeType: 'transform-format',
        category: 'transform',
        name: 'Format Converter',
        description: 'Convert content between formats',
        icon: RefreshCw,
        color: '#14B8A6',
        features: ['Markdown', 'HTML', 'PDF', 'JSON'],
        capabilities: ['Converts formats', 'Preserves structure', 'Handles media'],
        defaultConfig: { outputFormat: 'html' }
    },
    {
        id: 'nd-transform-personalize',
        nodeType: 'transform-personalize',
        category: 'transform',
        name: 'Personalizer',
        description: 'Add personalization to content',
        icon: UserCog,
        color: '#14B8A6',
        features: ['Name Insertion', 'Company Details', 'Dynamic Fields'],
        capabilities: ['Inserts variables', 'Personalizes content', 'Fallback handling'],
        defaultConfig: { fallbackBehavior: 'remove' }
    }
];

// ============================================================================
// OUTPUT NODES
// ============================================================================

const outputNodes: V2NodeDefinition[] = [
    {
        id: 'nd-output-webhook',
        nodeType: 'output-webhook',
        category: 'output',
        name: 'Webhook Output',
        description: 'Send results to external webhook',
        icon: WebhookOut,
        color: '#EF4444',
        features: ['HTTP POST', 'Custom Headers', 'Retry Logic'],
        capabilities: ['Sends to webhook', 'Custom formatting', 'Error handling'],
        defaultConfig: { method: 'POST', retries: 3 },
        inputSchema: 'OutputWebhookInput',
        outputSchema: 'OutputWebhookOutput'
    },
    {
        id: 'nd-output-store',
        nodeType: 'output-store',
        category: 'output',
        name: 'Database Store',
        description: 'Store results in database',
        icon: HardDrive,
        color: '#EF4444',
        features: ['Supabase', 'Custom Tables', 'Upsert Support'],
        capabilities: ['Stores in DB', 'Upsert logic', 'Relationship handling'],
        defaultConfig: { table: 'generated_content' },
        inputSchema: 'OutputStoreInput',
        outputSchema: 'OutputStoreOutput'
    },
    {
        id: 'nd-output-email',
        nodeType: 'output-email',
        category: 'output',
        name: 'Send Email',
        description: 'Send email via configured provider',
        icon: MailOut,
        color: '#EF4444',
        features: ['SMTP/API', 'Templates', 'Tracking'],
        capabilities: ['Sends email', 'Tracks opens', 'Handles bounces'],
        defaultConfig: { provider: 'resend' },
        inputSchema: 'OutputEmailInput',
        outputSchema: 'OutputEmailOutput'
    },
    {
        id: 'nd-output-analytics',
        nodeType: 'output-analytics',
        category: 'output',
        name: 'Analytics Event',
        description: 'Log analytics event',
        icon: BarChart,
        color: '#EF4444',
        features: ['Custom Events', 'Properties', 'User Tracking'],
        capabilities: ['Logs events', 'Adds properties', 'User attribution'],
        defaultConfig: { eventName: 'workflow_completed' },
        inputSchema: 'OutputAnalyticsInput',
        outputSchema: 'OutputAnalyticsOutput'
    }
];

// ============================================================================
// UTILITY NODES
// ============================================================================

const utilityNodes: V2NodeDefinition[] = [
    {
        id: 'nd-condition-if-else',
        nodeType: 'condition-if-else',
        category: 'utility',
        name: 'If/Else Condition',
        description: 'Branch workflow based on condition',
        icon: GitBranch,
        color: '#6366F1',
        features: ['Boolean Logic', 'Expression Eval', 'Multi-Branch'],
        capabilities: ['Evaluates conditions', 'Supports AND/OR/NOT', 'Multiple outputs'],
        defaultConfig: { condition: { field: '', operator: 'equals', value: '' } },
        inputSchema: 'IfElseConditionInput',
        outputSchema: 'IfElseConditionOutput'
    },
    {
        id: 'nd-condition-switch',
        nodeType: 'condition-switch',
        category: 'utility',
        name: 'Switch Router',
        description: 'Route to different paths based on value',
        icon: Workflow,
        color: '#6366F1',
        features: ['Multi-Route', 'Pattern Match', 'Default Path'],
        capabilities: ['Value-based routing', 'Regex support', 'Fallback handling'],
        defaultConfig: { field: '', cases: [], defaultPath: true },
        inputSchema: 'SwitchConditionInput',
        outputSchema: 'SwitchConditionOutput'
    },
    {
        id: 'nd-loop-foreach',
        nodeType: 'loop-foreach',
        category: 'utility',
        name: 'For Each Loop',
        description: 'Iterate over array items',
        icon: Repeat,
        color: '#6366F1',
        features: ['Array Iteration', 'Parallel Option', 'Index Access'],
        capabilities: ['Iterates arrays', 'Parallel/sequential', 'Break/continue'],
        defaultConfig: { arrayField: '', itemVariable: 'item', parallelExecution: false },
        inputSchema: 'LoopForeachInput',
        outputSchema: 'LoopForeachOutput'
    },
    {
        id: 'nd-merge-combine',
        nodeType: 'merge-combine',
        category: 'utility',
        name: 'Merge Branches',
        description: 'Combine outputs from parallel branches',
        icon: Merge,
        color: '#6366F1',
        features: ['Wait All', 'Wait Any', 'Combine Results'],
        capabilities: ['Waits for branches', 'Merges outputs', 'Conflict resolution'],
        defaultConfig: { waitMode: 'all', mergeStrategy: 'combine' }
    },
    {
        id: 'nd-delay-wait',
        nodeType: 'delay-wait',
        category: 'utility',
        name: 'Delay / Wait',
        description: 'Pause workflow execution',
        icon: ClockDelay,
        color: '#6366F1',
        features: ['Fixed Delay', 'Dynamic Delay', 'Schedule Resume'],
        capabilities: ['Pauses execution', 'Dynamic delay', 'Resume at time'],
        defaultConfig: { delayType: 'fixed', duration: 5000, unit: 'ms' },
        inputSchema: 'DelayWaitInput',
        outputSchema: 'DelayWaitOutput'
    },
    {
        id: 'nd-human-review',
        nodeType: 'human-review',
        category: 'utility',
        name: 'Human Review',
        description: 'Pause for human approval',
        icon: UserCheck,
        color: '#6366F1',
        features: ['Approval Flow', 'Edit Option', 'Timeout Action'],
        capabilities: ['Pauses for review', 'Allows edits', 'Auto-action'],
        defaultConfig: { reviewType: 'approve_reject', timeout: 86400000 }
    },
    {
        id: 'nd-error-handler',
        nodeType: 'error-handler',
        category: 'utility',
        name: 'Error Handler',
        description: 'Catch and handle errors',
        icon: AlertTriangle,
        color: '#6366F1',
        features: ['Catch Errors', 'Retry Logic', 'Fallback Path'],
        capabilities: ['Catches exceptions', 'Configurable retries', 'Fallback execution'],
        defaultConfig: { catchAll: true, retryCount: 0, retryDelay: 1000 }
    },
    {
        id: 'nd-split-parallel',
        nodeType: 'split-parallel',
        category: 'utility',
        name: 'Split Parallel',
        description: 'Split into parallel branches',
        icon: GitFork,
        color: '#6366F1',
        features: ['Parallel Execution', 'Clone Data', 'Independent Paths'],
        capabilities: ['Creates parallel paths', 'Clones input', 'Independent execution'],
        defaultConfig: { branchCount: 2, cloneInput: true }
    }
];

// ============================================================================
// EXPORTS
// ============================================================================

export const V2_ALL_NODES: V2NodeDefinition[] = [
    ...triggerNodes,
    ...resolverNodes,
    ...generatorNodes,
    ...validatorNodes,
    ...enricherNodes,
    ...transformNodes,
    ...outputNodes,
    ...utilityNodes
];

export const V2_NODES_BY_CATEGORY: Record<V2NodeCategory, V2NodeDefinition[]> = {
    trigger: triggerNodes,
    resolver: resolverNodes,
    generator: generatorNodes,
    validator: validatorNodes,
    enricher: enricherNodes,
    transform: transformNodes,
    output: outputNodes,
    utility: utilityNodes
};

export const V2_CATEGORY_ORDER: V2NodeCategory[] = [
    'trigger',
    'resolver',
    'generator',
    'validator',
    'enricher',
    'transform',
    'output',
    'utility'
];

export default V2_ALL_NODES;
