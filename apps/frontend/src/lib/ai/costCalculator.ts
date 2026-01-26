/**
 * Cost Calculator - AI Usage Cost Tracking
 * Calculates costs based on token usage and model pricing
 */

export interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
}

export interface ModelPricing {
    input_cost_per_million: number;
    output_cost_per_million: number;
}

export interface CostCalculation {
    input_cost: number;
    output_cost: number;
    total_cost: number;
    tokens_used: number;
}

export interface UsageLog {
    provider: string;
    model_id: string;
    organization_id: string;
    user_id?: string;
    brain_id?: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    response_time_ms?: number;
    was_fallback: boolean;
    metadata?: Record<string, any>;
}

/**
 * Calculate cost from token usage and pricing
 */
export function calculateCost(
    usage: TokenUsage,
    pricing: ModelPricing
): CostCalculation {
    const input_cost = (usage.input_tokens / 1_000_000) * pricing.input_cost_per_million;
    const output_cost = (usage.output_tokens / 1_000_000) * pricing.output_cost_per_million;

    return {
        input_cost: parseFloat(input_cost.toFixed(6)),
        output_cost: parseFloat(output_cost.toFixed(6)),
        total_cost: parseFloat((input_cost + output_cost).toFixed(6)),
        tokens_used: usage.input_tokens + usage.output_tokens,
    };
}

/**
 * Count tokens (simple approximation)
 * For production, use tiktoken or provider-specific counters
 */
export function estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    // For accurate counting, use:
    // - OpenAI: tiktoken library
    // - Anthropic: count-tokens package
    // - Google: sentencepiece tokenizer
    return Math.ceil(text.length / 4);
}

/**
 * Count tokens for messages array
 */
export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;

    for (const message of messages) {
        // Add tokens for role
        total += 4; // Approximate overhead per message

        // Add tokens for content
        total += estimateTokens(message.content);
    }

    return total;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(2)}`;
}

/**
 * Get cost breakdown by time period
 */
export interface CostPeriod {
    period: string;
    total_cost: number;
    total_tokens: number;
    request_count: number;
}

/**
 * Aggregate costs by period
 */
export function aggregateCostsByPeriod(
    logs: Array<{ cost_usd: number; tokens_used: number; timestamp: string }>,
    period: 'hour' | 'day' | 'week' | 'month'
): CostPeriod[] {
    const grouped = new Map<string, CostPeriod>();

    for (const log of logs) {
        const date = new Date(log.timestamp);
        let key: string;

        switch (period) {
            case 'hour':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
                break;
            case 'day':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                break;
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = `Week of ${weekStart.toISOString().split('T')[0]}`;
                break;
            case 'month':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
        }

        const existing = grouped.get(key);
        if (existing) {
            existing.total_cost += log.cost_usd;
            existing.total_tokens += log.tokens_used;
            existing.request_count += 1;
        } else {
            grouped.set(key, {
                period: key,
                total_cost: log.cost_usd,
                total_tokens: log.tokens_used,
                request_count: 1,
            });
        }
    }

    return Array.from(grouped.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
    );
}

/**
 * Cost alert thresholds
 */
export interface CostAlert {
    level: 'info' | 'warning' | 'critical';
    message: string;
    current_cost: number;
    threshold: number;
}

/**
 * Check if cost exceeds thresholds
 */
export function checkCostAlerts(
    currentCost: number,
    thresholds: { warning: number; critical: number }
): CostAlert | null {
    if (currentCost >= thresholds.critical) {
        return {
            level: 'critical',
            message: 'Critical: Cost limit exceeded',
            current_cost: currentCost,
            threshold: thresholds.critical,
        };
    }

    if (currentCost >= thresholds.warning) {
        return {
            level: 'warning',
            message: 'Warning: Approaching cost limit',
            current_cost: currentCost,
            threshold: thresholds.warning,
        };
    }

    return null;
}
