export interface PromptBlock {
    id: string
    slug: string
    name: string
    description: string | null
    category: string
    content: string
    variables: any[]
    tags: string[]
    version: number
    is_active: boolean
    is_system: boolean
    usage_count: number
    created_at: string
    updated_at: string
}

export interface PromptAssignment {
    id: string
    prompt_block_id: string
    target_type: string
    target_id: string
    priority: number
    is_active: boolean
    prompt_blocks?: PromptBlock
}

export const CATEGORIES = [
    { value: 'foundation', label: 'Foundation', emoji: '🏗️', color: 'info' },
    { value: 'persona', label: 'Persona', emoji: '🎭', color: 'accent' },
    { value: 'instruction', label: 'Instruction', emoji: '📋', color: 'success' },
    { value: 'guardrails', label: 'Guardrails', emoji: '🛡️', color: 'warning' },
    { value: 'domain', label: 'Domain', emoji: '🧠', color: 'info' },
    { value: 'task', label: 'Task', emoji: '⚡', color: 'accent' },
    { value: 'custom', label: 'Custom', emoji: '✨', color: 'success' },
] as const

export const TARGET_TYPES = [
    { value: 'brain_agent', label: 'Brain Agent' },
    { value: 'org_agent', label: 'Org Agent' },
    { value: 'agent_template', label: 'Agent Template' },
] as const
