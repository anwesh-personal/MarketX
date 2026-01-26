/**
 * AXIOM VARIABLES SYSTEM
 * 
 * Architecture:
 * - INPUT VARIABLES: Everything the sales team fills out (the ONLY user touchpoint)
 * - SYSTEM VARIABLES: Internal workflow configuration (never shown to end users)
 * - CONDITION VARIABLES: Logic gate configurations
 * - OUTPUT VARIABLES: Delivery settings
 */

export interface VariableDefinition {
    name: string;
    type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox' | 'file';
    required: boolean;
    description: string;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
    instructions: string;
    testInput: any;
    category?: 'basic' | 'content' | 'style' | 'advanced';
}

export type VariableCategory = 'input' | 'system' | 'condition' | 'output';

// ============================================================================
// INPUT VARIABLES (Sales Team Form - The ONLY User Touchpoint)
// ============================================================================

export const inputVariables: Record<string, VariableDefinition> = {
    // ===== BASIC CAMPAIGN INFO =====
    campaign_name: {
        name: 'Campaign Name',
        type: 'text',
        required: true,
        description: 'Internal name for this campaign',
        placeholder: 'e.g., "Q1 SaaS Launch Email Sequence"',
        validation: { minLength: 3, maxLength: 100 },
        instructions: 'Give this campaign a memorable name for tracking.',
        testInput: 'Q1 SaaS Product Launch',
        category: 'basic',
    },

    campaign_goal: {
        name: 'Campaign Goal',
        type: 'select',
        required: true,
        description: 'Primary objective of this campaign',
        options: [
            'Lead Generation',
            'Product Launch',
            'Sales Conversion',
            'Nurture Sequence',
            'Re-engagement',
            'Brand Awareness',
            'Event Promotion',
            'Customer Onboarding',
            'Upsell/Cross-sell',
            'Testimonial Collection',
        ],
        instructions: 'What is the main outcome you want from this campaign?',
        testInput: 'Lead Generation',
        category: 'basic',
    },

    // ===== CUSTOMER / AUDIENCE INFO =====
    customer_name: {
        name: 'Customer/Company Name',
        type: 'text',
        required: false,
        description: 'Name of the customer or company (for personalization)',
        placeholder: 'e.g., "Acme Corp" or "{{first_name}}"',
        instructions: 'Leave blank for generic content, or use merge tags.',
        testInput: 'Acme Corp',
        category: 'basic',
    },

    target_audience: {
        name: 'Target Audience',
        type: 'select',
        required: true,
        description: 'Who will receive this content?',
        options: [
            'Small Business Owners',
            'Startup Founders',
            'Marketing Managers',
            'C-Suite Executives',
            'Sales Professionals',
            'Freelancers/Solopreneurs',
            'Agency Owners',
            'E-commerce Store Owners',
            'SaaS Product Managers',
            'Coaches & Consultants',
            'Real Estate Agents',
            'Financial Advisors',
            'Healthcare Professionals',
            'General Consumer',
        ],
        instructions: 'Select the primary audience segment.',
        testInput: 'Small Business Owners',
        category: 'basic',
    },

    industry_niche: {
        name: 'Industry/Niche',
        type: 'text',
        required: true,
        description: 'The industry or niche of the target audience',
        placeholder: 'e.g., "Digital Marketing", "Real Estate", "SaaS"',
        instructions: 'Be specific - this affects tone and examples used.',
        testInput: 'Digital Marketing',
        category: 'basic',
    },

    customer_pain_points: {
        name: 'Customer Pain Points',
        type: 'textarea',
        required: true,
        description: 'The top 3-5 problems your customer faces',
        placeholder: 'e.g., "Not enough leads", "Low email open rates", "Wasting money on ads"',
        validation: { minLength: 20, maxLength: 1000 },
        instructions: 'List the specific pains we will agitate in the copy.',
        testInput: 'Struggling to get consistent leads. Wasting money on Facebook ads. Email sequences that nobody opens.',
        category: 'content',
    },

    customer_desires: {
        name: 'Customer Desires',
        type: 'textarea',
        required: true,
        description: 'What does the customer deeply want?',
        placeholder: 'e.g., "Financial freedom", "More time with family", "Industry recognition"',
        validation: { minLength: 20, maxLength: 1000 },
        instructions: 'List the emotional outcomes the customer craves.',
        testInput: 'Predictable revenue growth. Being seen as an industry authority. More time for family.',
        category: 'content',
    },

    // ===== PRODUCT / OFFER INFO =====
    product_service_name: {
        name: 'Product/Service Name',
        type: 'text',
        required: true,
        description: 'The name of what you are selling',
        placeholder: 'e.g., "The Lead Magnet Masterclass"',
        instructions: 'The exact name of the product, course, service, or offer.',
        testInput: 'The Lead Magnet Masterclass',
        category: 'content',
    },

    product_description: {
        name: 'Product/Service Description',
        type: 'textarea',
        required: true,
        description: 'A 2-3 sentence description of the product',
        placeholder: 'Describe what it is and the transformation it provides...',
        validation: { minLength: 50, maxLength: 500 },
        instructions: 'Focus on the TRANSFORMATION, not just features.',
        testInput: 'A 6-week intensive program that teaches small business owners how to create irresistible lead magnets that convert cold traffic into red-hot buyers.',
        category: 'content',
    },

    unique_mechanism: {
        name: 'Unique Mechanism',
        type: 'textarea',
        required: false,
        description: 'The "secret sauce" - WHY does your product work?',
        placeholder: 'e.g., "Our proprietary 3-step funnel framework..."',
        instructions: 'This is the breakthrough idea that makes you different (Eugene Schwartz concept).',
        testInput: 'The "Magnet Stack" method - a proprietary system that combines value-first content with psychological triggers.',
        category: 'content',
    },

    offer_price: {
        name: 'Offer Price',
        type: 'text',
        required: false,
        description: 'The price or price range',
        placeholder: 'e.g., "$997", "Starting at $47/mo"',
        instructions: 'Leave blank if not mentioning price in this campaign.',
        testInput: '$497 (normally $997)',
        category: 'content',
    },

    offer_deadline: {
        name: 'Offer Deadline/Scarcity',
        type: 'text',
        required: false,
        description: 'Urgency element (deadline, limited spots, etc.)',
        placeholder: 'e.g., "Expires Friday at Midnight", "Only 10 spots left"',
        instructions: 'Creates urgency. Leave blank if evergreen.',
        testInput: 'Doors close this Friday at 11:59 PM',
        category: 'content',
    },

    guarantee: {
        name: 'Guarantee',
        type: 'text',
        required: false,
        description: 'Risk reversal / money-back guarantee',
        placeholder: 'e.g., "30-day money-back guarantee, no questions asked"',
        instructions: 'Removes buyer risk. Very important for conversions.',
        testInput: '60-day "Try It Or It\'s Free" guarantee',
        category: 'content',
    },

    call_to_action: {
        name: 'Call to Action',
        type: 'text',
        required: true,
        description: 'What should the reader DO?',
        placeholder: 'e.g., "Click here to enroll", "Reply YES to this email"',
        instructions: 'Be specific and directive.',
        testInput: 'Click here to claim your spot',
        category: 'content',
    },

    // ===== WRITING STYLE =====
    writer_style: {
        name: 'Writer Style / Persona',
        type: 'select',
        required: true,
        description: 'Which legendary copywriter style should we emulate?',
        options: [
            'Dan Kennedy (No B.S. Direct Response)',
            'Frank Kern (Conversational NLP)',
            'Gary Halbert (Raw Emotional Storytelling)',
            'Eugene Schwartz (Mechanism-Focused)',
            'David Ogilvy (Fact-Based Elegance)',
            'Joseph Sugarman (Slippery Slope)',
            'Claude Hopkins (Scientific Advertising)',
            'Russell Brunson (Story Selling)',
            'Alex Hormozi (Value Stacking)',
            'Modern Expert (Balanced Best Practices)',
        ],
        instructions: 'This determines the voice, tone, and persuasion style of all generated content.',
        testInput: 'Dan Kennedy (No B.S. Direct Response)',
        category: 'style',
    },

    content_tone: {
        name: 'Content Tone',
        type: 'select',
        required: true,
        description: 'The emotional temperature of the content',
        options: [
            'Aggressive & Urgent',
            'Professional & Authoritative',
            'Friendly & Conversational',
            'Educational & Helpful',
            'Inspirational & Motivational',
            'Provocative & Contrarian',
            'Empathetic & Understanding',
            'Luxurious & Premium',
        ],
        instructions: 'Sets the emotional undercurrent of the writing.',
        testInput: 'Aggressive & Urgent',
        category: 'style',
    },

    content_format: {
        name: 'Content Format',
        type: 'select',
        required: true,
        description: 'What type of content are we generating?',
        options: [
            'Email Sequence (3-5 emails)',
            'Single Sales Email',
            'Social Media Posts (LinkedIn)',
            'Social Media Posts (Twitter/X)',
            'Social Media Posts (Facebook)',
            'Blog Post / Article',
            'Sales Page Copy',
            'Landing Page Copy',
            'Video Script',
            'Ad Copy (Facebook/Google)',
            'SMS Sequence',
        ],
        instructions: 'Determines format, length, and structure.',
        testInput: 'Email Sequence (3-5 emails)',
        category: 'style',
    },

    word_count_target: {
        name: 'Word Count Target',
        type: 'select',
        required: true,
        description: 'Approximate length of each piece',
        options: [
            'Short (100-300 words)',
            'Medium (300-600 words)',
            'Long (600-1000 words)',
            'Very Long (1000-2000 words)',
            'Epic (2000+ words)',
        ],
        instructions: 'Longer is not always better. Match to format.',
        testInput: 'Medium (300-600 words)',
        category: 'style',
    },

    // ===== KNOWLEDGE BASE / CONTEXT =====
    customer_profile_kb: {
        name: 'Customer Profile (from KB)',
        type: 'textarea',
        required: false,
        description: 'Paste or link customer profile data from Knowledge Base',
        placeholder: 'Paste CRM data, purchase history, or link to KB entry...',
        instructions: 'Used to personalize content based on customer history.',
        testInput: 'Customer: Acme Corp. Industry: SaaS. Previous purchases: Email Marketing Course. LTV: $2,400.',
        category: 'advanced',
    },

    brand_voice_guidelines: {
        name: 'Brand Voice Guidelines',
        type: 'textarea',
        required: false,
        description: 'Specific brand voice rules to follow',
        placeholder: 'e.g., "Always use contracted forms (we\'re, you\'ll). Never say \'synergy\'. Use short paragraphs."',
        instructions: 'Override default styles with brand-specific rules.',
        testInput: 'Use first person plural (we, our). Be direct, no fluff. Avoid jargon.',
        category: 'advanced',
    },

    competitors_to_avoid: {
        name: 'Competitors / Things to Avoid',
        type: 'textarea',
        required: false,
        description: 'Competitors not to mention, or topics to avoid',
        placeholder: 'e.g., "Never mention Competitor X. Avoid discussing pricing."',
        instructions: 'Content guidelines for what NOT to include.',
        testInput: 'Do not mention HubSpot or Mailchimp by name.',
        category: 'advanced',
    },

    existing_assets: {
        name: 'Existing Assets / Swipe File',
        type: 'textarea',
        required: false,
        description: 'Existing copy, testimonials, or data to reference',
        placeholder: 'Paste testimonials, previous successful emails, statistics...',
        instructions: 'Gives the AI real proof points to work with.',
        testInput: 'Testimonial: "This program doubled our email open rates in 2 weeks!" - John D., Founder of GrowthHQ',
        category: 'advanced',
    },
};

// ============================================================================
// SYSTEM VARIABLES (Internal Workflow Config - NOT User Facing)
// ============================================================================

export const systemVariables: Record<string, VariableDefinition> = {
    ai_model: {
        name: 'AI Model',
        type: 'select',
        required: false,
        description: 'Which AI model to use',
        options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-opus', 'gemini-1.5-pro'],
        instructions: 'Default: gpt-4o',
        testInput: 'gpt-4o',
    },

    temperature: {
        name: 'Temperature',
        type: 'number',
        required: false,
        description: 'AI creativity level (0-1)',
        min: 0,
        max: 1,
        step: 0.1,
        instructions: 'Higher = more creative, Lower = more consistent',
        testInput: 0.8,
    },

    max_tokens: {
        name: 'Max Tokens',
        type: 'number',
        required: false,
        description: 'Maximum output length',
        min: 500,
        max: 16000,
        step: 500,
        instructions: 'Default: 4000',
        testInput: 4000,
    },

    quality_threshold: {
        name: 'Quality Threshold',
        type: 'number',
        required: false,
        description: 'Minimum quality score to pass (0-100)',
        min: 0,
        max: 100,
        step: 5,
        instructions: 'Content below this score triggers revision.',
        testInput: 75,
    },
};

// ============================================================================
// CONDITION VARIABLES (Logic Gates - Workflow Builder Config)
// ============================================================================

export const conditionVariables: Record<string, VariableDefinition> = {
    condition_type: {
        name: 'Condition Type',
        type: 'select',
        required: true,
        description: 'Type of condition to evaluate',
        options: [
            'Quality Score Check',
            'Word Count Check',
            'Sentiment Check',
            'Contains Keyword',
            'Readability Score',
            'Brand Voice Compliance',
            'Custom Expression',
        ],
        instructions: 'Select what to check.',
        testInput: 'Quality Score Check',
    },

    threshold: {
        name: 'Threshold Value',
        type: 'number',
        required: true,
        description: 'Value to compare against',
        min: 0,
        max: 100,
        instructions: 'The comparison value.',
        testInput: 75,
    },

    operator: {
        name: 'Operator',
        type: 'select',
        required: true,
        description: 'Comparison operator',
        options: ['>=', '<=', '==', '!=', '>', '<', 'contains', 'not contains'],
        instructions: 'How to compare.',
        testInput: '>=',
    },

    on_pass: {
        name: 'On Pass',
        type: 'select',
        required: true,
        description: 'Action when condition passes',
        options: ['Continue', 'Skip to Output', 'Send for Review'],
        instructions: 'What happens if true.',
        testInput: 'Continue',
    },

    on_fail: {
        name: 'On Fail',
        type: 'select',
        required: true,
        description: 'Action when condition fails',
        options: ['Regenerate', 'Send for Review', 'Use Fallback', 'Stop'],
        instructions: 'What happens if false.',
        testInput: 'Regenerate',
    },
};

// ============================================================================
// OUTPUT VARIABLES (Delivery Config)
// ============================================================================

export const outputVariables: Record<string, VariableDefinition> = {
    delivery_method: {
        name: 'Delivery Method',
        type: 'select',
        required: true,
        description: 'How to deliver the output',
        options: [
            'MailWiz (Email)',
            'Buffer (Social)',
            'Webhook (Custom)',
            'Database Storage',
            'API Response',
            'Download',
        ],
        instructions: 'Where should the content go?',
        testInput: 'MailWiz (Email)',
    },

    webhook_url: {
        name: 'Webhook URL',
        type: 'text',
        required: false,
        description: 'Webhook endpoint for delivery',
        placeholder: 'https://...',
        instructions: 'Required if using Webhook delivery.',
        testInput: 'https://n8n.example.com/webhook/axiom',
    },

    mailwiz_list_id: {
        name: 'MailWiz List ID',
        type: 'text',
        required: false,
        description: 'Target list in MailWiz',
        placeholder: 'e.g., "list_abc123"',
        instructions: 'Which list to send to.',
        testInput: 'list_main_subscribers',
    },

    schedule_send: {
        name: 'Schedule Send',
        type: 'select',
        required: false,
        description: 'When to send the content',
        options: ['Immediately', 'Next Morning 9 AM', 'Next Morning 11 AM', 'Custom Schedule'],
        instructions: 'Timing of delivery.',
        testInput: 'Immediately',
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getInputVariables(): Record<string, VariableDefinition> {
    return inputVariables;
}

export function getInputVariablesByCategory(category: 'basic' | 'content' | 'style' | 'advanced'): Record<string, VariableDefinition> {
    return Object.fromEntries(
        Object.entries(inputVariables).filter(([_, def]) => def.category === category)
    );
}

export function getVariablesByCategory(category: VariableCategory): Record<string, VariableDefinition> {
    switch (category) {
        case 'input':
            return inputVariables;
        case 'system':
            return systemVariables;
        case 'condition':
            return conditionVariables;
        case 'output':
            return outputVariables;
        default:
            return {};
    }
}

export function getAllVariables(): Record<string, VariableDefinition> {
    return {
        ...inputVariables,
        ...systemVariables,
        ...conditionVariables,
        ...outputVariables,
    };
}

export function getTestInputs(): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(inputVariables).forEach(([key, def]) => {
        result[key] = def.testInput;
    });
    return result;
}

/**
 * Get variables by node type for backwards compatibility
 * In the new architecture, Input nodes get all inputVariables
 * Other nodes get their appropriate system/condition/output variables
 */
export function getVariablesByNodeType(nodeType: string): Record<string, VariableDefinition> {
    // Map node types to variable categories
    const inputNodeTypes = [
        'input-config', 'text-input', 'file-upload',
        'email-trigger', 'manual-trigger', 'schedule-trigger'
    ];

    const conditionNodeTypes = [
        'logic-gate', 'validation-check', 'validate-constitution'
    ];

    const outputNodeTypes = [
        'output-n8n', 'output-store', 'output-export', 'output-schedule'
    ];

    if (inputNodeTypes.includes(nodeType)) {
        return inputVariables;
    } else if (conditionNodeTypes.includes(nodeType)) {
        return conditionVariables;
    } else if (outputNodeTypes.includes(nodeType)) {
        return outputVariables;
    } else {
        // Process nodes and unknown types - return system variables (AI config)
        return systemVariables;
    }
}

// Legacy compatibility - maps to inputVariables for old code
export const processVariables = {}; // DEPRECATED - inputs are now in inputVariables
export const previewVariables = {}; // DEPRECATED

export default {
    inputVariables,
    systemVariables,
    conditionVariables,
    outputVariables,
    getInputVariables,
    getInputVariablesByCategory,
    getVariablesByCategory,
    getVariablesByNodeType,
    getAllVariables,
    getTestInputs,
};
