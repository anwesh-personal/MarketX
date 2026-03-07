/**
 * HALLUCINATION INTERCEPTOR
 *
 * Validates every tool call the LLM emits before execution.
 * LLMs occasionally hallucinate tool names that don't exist.
 * This interceptor catches them BEFORE they reach the executor.
 *
 * Three outcomes:
 *   pass      — all tool calls are valid, proceed
 *   filter    — some are fake, strip them and continue with valid ones
 *   retry     — ALL are fake, inject a feedback message and loop again
 *
 * Used exclusively by BrainOrchestrator.handleTurn().
 */

import type { BrainToolCall, BrainToolDefinition } from '@/services/ai/types'

export type InterceptorAction = 'pass' | 'filter' | 'retry'

export interface InterceptorResult {
    action:     InterceptorAction
    validCalls: BrainToolCall[]
    fakeCalls:  string[]            // names of hallucinated tools
    feedback?:  string              // message to inject when action = 'retry'
}

export class HallucinationInterceptor {
    /**
     * Validate tool calls against the known tool registry.
     *
     * @param toolCalls  — tool calls emitted by the LLM
     * @param available  — tool definitions passed to the LLM in this turn
     * @returns InterceptorResult
     */
    static validate(
        toolCalls: BrainToolCall[],
        available: BrainToolDefinition[]
    ): InterceptorResult {
        if (toolCalls.length === 0) {
            return { action: 'pass', validCalls: [], fakeCalls: [] }
        }

        const knownNames = new Set(available.map(t => t.function.name))
        const validCalls: BrainToolCall[] = []
        const fakeCalls:  string[]        = []

        for (const call of toolCalls) {
            if (knownNames.has(call.function.name)) {
                validCalls.push(call)
            } else {
                fakeCalls.push(call.function.name)
                console.warn(
                    `[HallucinationInterceptor] Fake tool detected: "${call.function.name}". ` +
                    `Available: [${Array.from(knownNames).join(', ')}]`
                )
            }
        }

        // All calls fake → request retry
        if (validCalls.length === 0 && fakeCalls.length > 0) {
            return {
                action:     'retry',
                validCalls: [],
                fakeCalls,
                feedback:   HallucinationInterceptor.buildRetryMessage(fakeCalls, available),
            }
        }

        // Some fake → filter them out, proceed with valid
        if (fakeCalls.length > 0) {
            console.warn(
                `[HallucinationInterceptor] Filtered ${fakeCalls.length} hallucinated tool(s): ` +
                `[${fakeCalls.join(', ')}]. Proceeding with ${validCalls.length} valid call(s).`
            )
            return { action: 'filter', validCalls, fakeCalls }
        }

        return { action: 'pass', validCalls, fakeCalls: [] }
    }

    private static buildRetryMessage(
        fakeCalls: string[],
        available: BrainToolDefinition[]
    ): string {
        const fakeList      = fakeCalls.join('", "')
        const availableList = available.map(t => t.function.name).join('", "')
        return (
            `SYSTEM ERROR: You attempted to call tools that do not exist: ["${fakeList}"]. ` +
            `These tools are NOT in your tool list. ` +
            `The only tools available to you are: ["${availableList}"]. ` +
            `If you cannot complete the task with the available tools, say so in plain text instead of calling tools.`
        )
    }
}
