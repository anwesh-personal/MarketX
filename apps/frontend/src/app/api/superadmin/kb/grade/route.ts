/**
 * Superadmin KB Grade API
 *
 * POST /api/superadmin/kb/grade
 *
 * Loads the 'kb-grader' agent template from DB, builds a grading prompt
 * from its 4-layer prompt stack, calls AI using the template's
 * preferred_provider/model, and stores structured grades.
 *
 * Modes:
 *   - "input"  → grades questionnaire responses (pre-generation)
 *   - "output" → grades generated KB sections (post-generation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@supabase/supabase-js'
import { decryptSecret } from '@/lib/secrets'
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Types ──────────────────────────────────────────────────────

interface GradeRequest {
    org_id: string
    questionnaire_id: string
    mode: 'input' | 'output'
    section_numbers?: number[]  // optional: grade specific sections only
}

// ─── POST ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const admin = await getSuperadmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: GradeRequest = await request.json()
    const { org_id, questionnaire_id, mode, section_numbers } = body

    if (!org_id || !questionnaire_id || !mode) {
        return NextResponse.json({ error: 'org_id, questionnaire_id, and mode are required' }, { status: 400 })
    }

    if (!['input', 'output'].includes(mode)) {
        return NextResponse.json({ error: 'mode must be "input" or "output"' }, { status: 400 })
    }

    try {
        // 1. Load the kb-grader agent template
        const { data: template, error: tplErr } = await supabase
            .from('agent_templates')
            .select('*')
            .eq('slug', 'kb-grader')
            .eq('is_active', true)
            .single()

        if (tplErr || !template) {
            return NextResponse.json({
                error: 'KB Grader agent template not found. Run migration 00000000000063.',
            }, { status: 404 })
        }

        // 2. Load questionnaire
        const { data: qr } = await supabase
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('id', questionnaire_id)
            .eq('org_id', org_id)
            .single()

        if (!qr) return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 })

        // 3. Load ICP segments
        const { data: segments } = await supabase
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaire_id)
            .order('sort_order', { ascending: true })

        // 4. Load sections (for output mode)
        let sections: any[] = []
        if (mode === 'output') {
            let q = supabase
                .from('kb_master_sections')
                .select('section_number, section_title, content, status, provider_used, model_used')
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)
                .in('status', ['draft', 'approved', 'locked'])
                .order('section_number', { ascending: true })

            if (section_numbers && section_numbers.length > 0) {
                q = q.in('section_number', section_numbers)
            }

            const { data } = await q
            sections = data || []
        }

        // 5. Build the prompt from the agent template's 4-layer stack
        const systemPrompt = [
            template.system_prompt,
            template.persona_prompt ? `\n\n## Persona\n${template.persona_prompt}` : '',
            template.instruction_prompt ? `\n\n## Instructions\n${template.instruction_prompt}` : '',
            template.guardrails_prompt ? `\n\n## Guardrails\n${template.guardrails_prompt}` : '',
        ].filter(Boolean).join('')

        const userMessage = buildUserMessage(mode, qr, segments || [], sections)

        // 6. Call AI using template's provider/model (or platform default)
        const aiResult = await callAI(
            template.preferred_provider,
            template.preferred_model,
            systemPrompt,
            userMessage,
            template.temperature ?? 0.3,
            template.max_tokens ?? 8192
        )

        // 7. Parse the structured JSON response
        const gradeReport = parseGradeResponse(aiResult.content)

        // 8. Store grades on sections (output mode)
        if (mode === 'output' && gradeReport.grades) {
            for (const grade of gradeReport.grades) {
                const sectionNum = typeof grade.field === 'number'
                    ? grade.field
                    : parseInt(grade.field, 10)

                if (isNaN(sectionNum)) continue

                await supabase
                    .from('kb_master_sections')
                    .update({
                        ai_grade: {
                            score: grade.score,
                            verdict: grade.verdict,
                            strengths: grade.strengths || [],
                            weaknesses: grade.weaknesses || [],
                            suggestion: grade.suggestion || null,
                            graded_at: new Date().toISOString(),
                            graded_by_model: aiResult.model,
                            graded_by_provider: aiResult.provider,
                        },
                    })
                    .eq('questionnaire_id', questionnaire_id)
                    .eq('org_id', org_id)
                    .eq('section_number', sectionNum)
            }
        }

        return NextResponse.json({
            success: true,
            mode,
            report: gradeReport,
            model: aiResult.model,
            provider: aiResult.provider,
            usage: aiResult.usage,
        })

    } catch (error: any) {
        console.error('[KB Grade] Error:', error.message)
        return NextResponse.json({ error: error.message || 'Grading failed' }, { status: 500 })
    }
}

// ─── Build user message based on grading mode ───────────────────

function buildUserMessage(
    mode: string,
    qr: any,
    segments: any[],
    sections: any[]
): string {
    if (mode === 'input') {
        // Grade questionnaire responses
        const fieldData: Record<string, any> = {}
        const skipFields = ['id', 'org_id', 'created_by', 'current_step', 'total_steps',
            'status', 'constraint_results', 'created_at', 'updated_at', 'submitted_at', 'locked_at']

        for (const [key, value] of Object.entries(qr)) {
            if (skipFields.includes(key)) continue
            if (value === null || value === undefined) continue
            fieldData[key] = value
        }

        return [
            `## Grading Mode: INPUT (Questionnaire Responses)`,
            ``,
            `Grade each questionnaire field for quality. The company is "${qr.company_name || 'Unknown'}".`,
            ``,
            `### Questionnaire Fields`,
            '```json',
            JSON.stringify(fieldData, null, 2),
            '```',
            ``,
            `### ICP Segments (${segments.length})`,
            '```json',
            JSON.stringify(segments.map(s => ({
                segment_name: s.segment_name,
                target_industries: s.target_industries,
                company_size: s.company_size,
                pain_points: s.pain_points,
                buying_triggers: s.buying_triggers,
                economic_buyer_title: s.economic_buyer_title,
                champion_title: s.champion_title,
            })), null, 2),
            '```',
            ``,
            `Grade each field. Return the JSON grading report as specified in your instructions.`,
        ].join('\n')
    }

    // mode === 'output' — grade generated sections
    return [
        `## Grading Mode: OUTPUT (Generated KB Sections)`,
        ``,
        `Grade each generated KB section. The company is "${qr.company_name || 'Unknown'}".`,
        ``,
        `### Source Questionnaire (abbreviated)`,
        '```json',
        JSON.stringify({
            company_name: qr.company_name,
            one_sentence_description: qr.one_sentence_description,
            core_product_description: qr.core_product_description,
            problem_solved: qr.problem_solved,
            real_buy_reason: qr.real_buy_reason,
            top_differentiator: qr.top_differentiator,
            top_objections: qr.top_objections,
            primary_cta_type: qr.primary_cta_type,
        }, null, 2),
        '```',
        ``,
        `### Generated Sections to Grade`,
        ...sections.map(s => [
            ``,
            `---`,
            `#### Section ${s.section_number}: ${s.section_title}`,
            `Status: ${s.status} | Provider: ${s.provider_used || 'unknown'} | Model: ${s.model_used || 'unknown'}`,
            ``,
            s.content || '*[No content]*',
        ].join('\n')),
        ``,
        `Grade each section by its section_number. Return the JSON grading report.`,
    ].join('\n')
}

// ─── AI Call — follows ai-chat pattern ──────────────────────────

async function callAI(
    preferredProvider: string | null,
    preferredModel: string | null,
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    maxTokens: number
): Promise<{ content: string; model: string; provider: string; usage: any }> {
    // Resolve provider: template preference → first active provider
    const providerType = preferredProvider || 'openai'

    const { data: providerData, error: providerError } = await supabase
        .from('ai_providers')
        .select('id, api_key, provider')
        .eq('provider', providerType)
        .eq('is_active', true)
        .limit(1)
        .single()

    if (providerError || !providerData) {
        throw new Error(`No active ${providerType} provider configured`)
    }

    const apiKey = decryptSecret(providerData.api_key)

    // Resolve model: template preference → DB default → static fallback
    let model = preferredModel
    if (!model) {
        const { data: modelData } = await supabase
            .from('ai_model_metadata')
            .select('model_id')
            .eq('provider', providerType)
            .eq('is_active', true)
            .order('model_id', { ascending: true })
            .limit(1)
            .single()
        model = modelData?.model_id || null
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ]

    // Call provider-specific endpoint
    switch (providerType) {
        case 'openai': {
            const selectedModel = model || 'gpt-4o'
            const res = await fetch(`${PROVIDER_BASE_URLS.openai}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: selectedModel, messages, max_tokens: maxTokens, temperature }),
            })
            if (!res.ok) throw new Error(`OpenAI error: ${res.status} - ${await res.text()}`)
            const data = await res.json()
            return {
                content: data.choices[0]?.message?.content || '',
                model: data.model,
                provider: 'openai',
                usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
            }
        }
        case 'anthropic': {
            const selectedModel = model || 'claude-sonnet-4-20250514'
            const sysContent = messages.find(m => m.role === 'system')?.content || ''
            const chatMsgs = messages.filter(m => m.role !== 'system')
            const res = await fetch(`${PROVIDER_BASE_URLS.anthropic}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: selectedModel, max_tokens: maxTokens, temperature, system: sysContent, messages: chatMsgs }),
            })
            if (!res.ok) throw new Error(`Anthropic error: ${res.status} - ${await res.text()}`)
            const data = await res.json()
            return {
                content: data.content?.[0]?.text || '',
                model: data.model,
                provider: 'anthropic',
                usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
            }
        }
        case 'google': {
            const selectedModel = model || 'gemini-2.0-flash'
            const sysInstruction = messages.find(m => m.role === 'system')?.content
            const contents = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }))
            const res = await fetch(`${PROVIDER_BASE_URLS.google}/models/${selectedModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: sysInstruction ? { parts: [{ text: sysInstruction }] } : undefined,
                    generationConfig: { maxOutputTokens: maxTokens, temperature },
                }),
            })
            if (!res.ok) throw new Error(`Gemini error: ${res.status} - ${await res.text()}`)
            const data = await res.json()
            return {
                content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                model: selectedModel,
                provider: 'google',
                usage: { input: data.usageMetadata?.promptTokenCount || 0, output: data.usageMetadata?.candidatesTokenCount || 0 },
            }
        }
        default:
            throw new Error(`Provider ${providerType} not supported for grading`)
    }
}

// ─── Parse AI response — extract JSON from markdown fences ──────

function parseGradeResponse(content: string): any {
    // Try direct parse
    try { return JSON.parse(content) } catch {}

    // Try extracting from ```json ... ``` fences
    const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
        try { return JSON.parse(fenceMatch[1]) } catch {}
    }

    // Try finding first { ... }
    const braceStart = content.indexOf('{')
    const braceEnd = content.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd > braceStart) {
        try { return JSON.parse(content.slice(braceStart, braceEnd + 1)) } catch {}
    }

    return {
        mode: 'unknown',
        overall_score: 0,
        overall_verdict: 'PARSE_ERROR',
        summary: 'Failed to parse grading response as JSON',
        grades: [],
        critical_gaps: ['AI response was not valid JSON'],
        top_improvements: [],
        raw_response: content.slice(0, 2000),
    }
}
