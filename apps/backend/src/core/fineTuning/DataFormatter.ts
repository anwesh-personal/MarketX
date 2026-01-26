/**
 * DATA FORMATTER
 * ================
 * Formats training data for fine-tuning providers (OpenAI, Anthropic, etc.)
 * 
 * Features:
 * - OpenAI JSONL format
 * - Anthropic format support
 * - Train/validation split
 * - Token counting
 * - File generation
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import {
    TrainingExample,
    TrainingDataset,
    ChatMessage,
    FineTuningProvider
} from './types';

// ============================================================================
// OPENAI FORMAT
// ============================================================================

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAITrainingExample {
    messages: OpenAIMessage[];
}

// ============================================================================
// DATA FORMATTER CLASS
// ============================================================================

export class DataFormatter {

    // ========================================================================
    // FORMAT FOR PROVIDERS
    // ========================================================================

    /**
     * Format dataset for a specific provider
     */
    formatForProvider(
        examples: TrainingExample[],
        provider: FineTuningProvider
    ): string {
        switch (provider) {
            case 'openai':
                return this.formatForOpenAI(examples);
            case 'anthropic':
                return this.formatForAnthropic(examples);
            case 'google':
                return this.formatForGoogle(examples);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Format for OpenAI fine-tuning (JSONL format)
     */
    formatForOpenAI(examples: TrainingExample[]): string {
        const lines: string[] = [];

        for (const example of examples) {
            const formatted: OpenAITrainingExample = {
                messages: example.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            };
            lines.push(JSON.stringify(formatted));
        }

        return lines.join('\n');
    }

    /**
     * Format for Anthropic fine-tuning
     */
    formatForAnthropic(examples: TrainingExample[]): string {
        // Anthropic uses a similar JSONL format with "Human:" and "Assistant:" structure
        const lines: string[] = [];

        for (const example of examples) {
            // Convert to Anthropic format
            let prompt = '';
            let completion = '';

            for (const msg of example.messages) {
                if (msg.role === 'system') {
                    prompt += msg.content + '\n\n';
                } else if (msg.role === 'user') {
                    prompt += `Human: ${msg.content}\n\n`;
                } else if (msg.role === 'assistant') {
                    completion = msg.content;
                }
            }

            prompt += 'Assistant:';

            lines.push(JSON.stringify({ prompt, completion }));
        }

        return lines.join('\n');
    }

    /**
     * Format for Google fine-tuning
     */
    formatForGoogle(examples: TrainingExample[]): string {
        // Google uses input_text/output_text format
        const lines: string[] = [];

        for (const example of examples) {
            let inputText = '';
            let outputText = '';

            for (const msg of example.messages) {
                if (msg.role === 'system' || msg.role === 'user') {
                    inputText += msg.content + '\n';
                } else if (msg.role === 'assistant') {
                    outputText = msg.content;
                }
            }

            lines.push(JSON.stringify({
                input_text: inputText.trim(),
                output_text: outputText
            }));
        }

        return lines.join('\n');
    }

    // ========================================================================
    // SPLIT & VALIDATION
    // ========================================================================

    /**
     * Split dataset into training and validation sets
     */
    splitDataset(
        examples: TrainingExample[],
        validationRatio: number = 0.1
    ): { training: TrainingExample[]; validation: TrainingExample[] } {
        // Shuffle examples
        const shuffled = [...examples].sort(() => Math.random() - 0.5);

        const validationCount = Math.floor(shuffled.length * validationRatio);

        return {
            validation: shuffled.slice(0, validationCount),
            training: shuffled.slice(validationCount)
        };
    }

    /**
     * Generate both training and validation files
     */
    generateFiles(
        dataset: TrainingDataset,
        provider: FineTuningProvider
    ): { trainingFile: string; validationFile: string } {
        const { training, validation } = this.splitDataset(
            dataset.examples,
            dataset.validationSplit
        );

        return {
            trainingFile: this.formatForProvider(training, provider),
            validationFile: this.formatForProvider(validation, provider)
        };
    }

    // ========================================================================
    // TOKEN COUNTING
    // ========================================================================

    /**
     * Estimate token count for examples
     * Uses approximate heuristic: ~4 chars per token
     */
    estimateTokens(examples: TrainingExample[]): number {
        let totalChars = 0;

        for (const example of examples) {
            for (const msg of example.messages) {
                totalChars += msg.content.length;
            }
        }

        return Math.ceil(totalChars / 4);
    }

    /**
     * Estimate training cost
     */
    estimateCost(
        examples: TrainingExample[],
        provider: FineTuningProvider,
        baseModel: string
    ): { tokens: number; estimatedCost: number } {
        const tokens = this.estimateTokens(examples);

        // Pricing per 1k tokens (approximate, varies by model)
        const pricing: Record<FineTuningProvider, Record<string, number>> = {
            openai: {
                'gpt-4o-mini': 0.003,
                'gpt-4o': 0.025,
                'gpt-3.5-turbo': 0.008,
                'default': 0.008
            },
            anthropic: {
                'claude-3-haiku': 0.0008,
                'claude-3-sonnet': 0.003,
                'default': 0.003
            },
            google: {
                'gemini-1.5-flash': 0.0001,
                'gemini-1.5-pro': 0.0005,
                'default': 0.0003
            }
        };

        const providerPricing = pricing[provider];
        const pricePerKToken = providerPricing[baseModel] || providerPricing['default'];

        // Training typically involves 3-4 epochs
        const epochMultiplier = 3;
        const estimatedCost = (tokens / 1000) * pricePerKToken * epochMultiplier;

        return {
            tokens,
            estimatedCost: Math.round(estimatedCost * 100) / 100
        };
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    /**
     * Validate dataset format
     */
    validateDataset(examples: TrainingExample[]): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (examples.length < 10) {
            errors.push('Dataset must have at least 10 examples');
        }

        for (let i = 0; i < examples.length; i++) {
            const example = examples[i];

            // Check for required fields
            if (!example.messages || example.messages.length === 0) {
                errors.push(`Example ${i + 1}: No messages`);
                continue;
            }

            // Check for system message
            const hasSystem = example.messages.some(m => m.role === 'system');
            if (!hasSystem) {
                warnings.push(`Example ${i + 1}: No system message (recommended)`);
            }

            // Check for user and assistant messages
            const hasUser = example.messages.some(m => m.role === 'user');
            const hasAssistant = example.messages.some(m => m.role === 'assistant');

            if (!hasUser) {
                errors.push(`Example ${i + 1}: No user message`);
            }
            if (!hasAssistant) {
                errors.push(`Example ${i + 1}: No assistant message`);
            }

            // Check message content
            for (let j = 0; j < example.messages.length; j++) {
                const msg = example.messages[j];
                if (!msg.content || msg.content.trim().length === 0) {
                    errors.push(`Example ${i + 1}, Message ${j + 1}: Empty content`);
                }
            }

            // Check message ordering (should end with assistant for training)
            const lastMessage = example.messages[example.messages.length - 1];
            if (lastMessage.role !== 'assistant') {
                warnings.push(`Example ${i + 1}: Last message should be assistant role`);
            }
        }

        // Check for duplicate examples
        const fingerprints = new Set<string>();
        for (let i = 0; i < examples.length; i++) {
            const userMsg = examples[i].messages.find(m => m.role === 'user');
            if (userMsg) {
                const fp = userMsg.content.toLowerCase().trim().substring(0, 100);
                if (fingerprints.has(fp)) {
                    warnings.push(`Example ${i + 1}: Possible duplicate`);
                }
                fingerprints.add(fp);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate individual message
     */
    validateMessage(message: ChatMessage): { valid: boolean; error?: string } {
        if (!message.role) {
            return { valid: false, error: 'Missing role' };
        }

        if (!['system', 'user', 'assistant'].includes(message.role)) {
            return { valid: false, error: `Invalid role: ${message.role}` };
        }

        if (!message.content || typeof message.content !== 'string') {
            return { valid: false, error: 'Invalid or missing content' };
        }

        if (message.content.length > 100000) {
            return { valid: false, error: 'Content too long (max 100k chars)' };
        }

        return { valid: true };
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const dataFormatter = new DataFormatter();
