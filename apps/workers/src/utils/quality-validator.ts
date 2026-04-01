/**
 * QUALITY VALIDATOR
 * =================
 * Rule-based output quality scoring for engine execution results.
 * NOT an LLM call — pattern matching and structure checks only.
 *
 * Runs as part of the post-execution validation pipeline.
 * If quality is below threshold, triggers self-healing retry.
 *
 * Phase 7 of Engine Unification Plan.
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface QualityIssue {
    category: 'content' | 'structure' | 'compliance' | 'tone' | 'engagement'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
}

export interface QualityResult {
    score: number           // 0.0 – 1.0
    issues: QualityIssue[]
    passed: boolean
    details: {
        contentRelevance: number
        structureCompliance: number
        complianceCheck: number
        engagementPotential: number
    }
}

// ============================================================================
// SUPABASE
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Validate output quality using rule-based checks.
 * Returns a score 0-1 and list of issues.
 */
export function validateOutputQuality(
    output: any,
    input: Record<string, any>,
    config?: {
        minQualityScore?: number
        forbiddenPatterns?: string[]
        requiredStructure?: {
            minEmails?: number
            requireSubjectLines?: boolean
        }
    }
): QualityResult {
    const issues: QualityIssue[] = []
    const minScore = config?.minQualityScore ?? 0.6

    // Extract text content from output
    const text = extractText(output)

    if (!text || text.trim().length < 50) {
        issues.push({
            category: 'content',
            severity: 'critical',
            message: 'Output is empty or too short (< 50 characters)',
        })
        return { score: 0, issues, passed: false, details: { contentRelevance: 0, structureCompliance: 0, complianceCheck: 1, engagementPotential: 0 } }
    }

    // ─── 1. Content Relevance (30% weight) ──────────────────────
    let contentScore = 1.0

    // Check if output mentions key terms from ICP/offer
    const icpTerms = extractIcpTerms(input)
    if (icpTerms.length > 0) {
        const textLower = text.toLowerCase()
        const matchedTerms = icpTerms.filter(t => textLower.includes(t.toLowerCase()))
        const termMatchRatio = matchedTerms.length / icpTerms.length
        if (termMatchRatio < 0.2) {
            contentScore -= 0.3
            issues.push({
                category: 'content',
                severity: 'medium',
                message: `Low ICP relevance: only ${matchedTerms.length}/${icpTerms.length} key terms matched`,
            })
        }
    }

    // Check for generic/filler content
    const fillerPatterns = [
        /lorem ipsum/i,
        /\[insert.*?\]/i,
        /\[your.*?\]/i,
        /TODO/,
        /PLACEHOLDER/i,
        /example\.com/i,
    ]
    for (const pattern of fillerPatterns) {
        if (pattern.test(text)) {
            contentScore -= 0.2
            issues.push({
                category: 'content',
                severity: 'high',
                message: `Filler content detected: ${pattern.source}`,
            })
        }
    }

    // ─── 2. Structure Compliance (15% weight) ───────────────────
    let structureScore = 1.0
    const emailCount = input.writer_input?.email_count || input.settings?.email_count

    if (emailCount) {
        // Count email separators / subjects in output
        const emailSections = text.split(/(?:email\s*\d|subject\s*(?:line)?:)/gi).length - 1
        if (emailSections > 0 && emailSections < emailCount * 0.5) {
            structureScore -= 0.3
            issues.push({
                category: 'structure',
                severity: 'medium',
                message: `Requested ${emailCount} emails but output structure suggests ~${emailSections}`,
            })
        }
    }

    // Check for excessively long single blocks (likely not structured)
    const lines = text.split('\n')
    const longLines = lines.filter(l => l.length > 500)
    if (longLines.length > 3) {
        structureScore -= 0.15
        issues.push({
            category: 'structure',
            severity: 'low',
            message: 'Multiple very long paragraphs — may need better formatting',
        })
    }

    // ─── 3. Compliance Check (20% weight) ───────────────────────
    let complianceScore = 1.0

    // Forbidden patterns (from config or defaults)
    const forbidden = config?.forbiddenPatterns || [
        '100% guaranteed',
        'get rich',
        'act now',
        'limited time only',
        'you have been selected',
        'congratulations you won',
        'click here immediately',
    ]
    for (const pattern of forbidden) {
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
            complianceScore -= 0.3
            issues.push({
                category: 'compliance',
                severity: 'high',
                message: `Forbidden pattern detected: "${pattern}"`,
            })
        }
    }

    // Check for potential false claims
    const claimPatterns = [
        /\b\d{2,}%\s*(?:increase|growth|improvement|roi|return)\b/i,  // "500% increase"
        /\bguaranteed\b.*\b(?:results|success|roi|return)\b/i,
    ]
    for (const pattern of claimPatterns) {
        if (pattern.test(text)) {
            complianceScore -= 0.15
            issues.push({
                category: 'compliance',
                severity: 'medium',
                message: `Potential unsubstantiated claim: ${pattern.source}`,
            })
        }
    }

    // ─── 4. Engagement Potential (15% weight) ───────────────────
    let engagementScore = 1.0

    // Check for CTA presence
    const ctaPatterns = [
        /\b(?:reply|respond|book|schedule|call|click|sign up|register|download|try|start)\b/i,
        /\?/,  // Questions drive engagement
    ]
    const hasCta = ctaPatterns.some(p => p.test(text))
    if (!hasCta) {
        engagementScore -= 0.3
        issues.push({
            category: 'engagement',
            severity: 'medium',
            message: 'No clear CTA or engagement hook detected',
        })
    }

    // Check text isn't just a wall of text
    const avgLineLength = text.length / Math.max(lines.length, 1)
    if (avgLineLength > 300) {
        engagementScore -= 0.15
        issues.push({
            category: 'engagement',
            severity: 'low',
            message: 'Dense text blocks may reduce readability',
        })
    }

    // ─── Calculate weighted score ───────────────────────────────
    const clampedContent = Math.max(0, Math.min(1, contentScore))
    const clampedStructure = Math.max(0, Math.min(1, structureScore))
    const clampedCompliance = Math.max(0, Math.min(1, complianceScore))
    const clampedEngagement = Math.max(0, Math.min(1, engagementScore))

    const finalScore =
        clampedContent * 0.30 +
        clampedStructure * 0.15 +
        clampedCompliance * 0.40 +  // Compliance weighted highest
        clampedEngagement * 0.15

    const roundedScore = Math.round(finalScore * 100) / 100

    return {
        score: roundedScore,
        issues,
        passed: roundedScore >= minScore,
        details: {
            contentRelevance: clampedContent,
            structureCompliance: clampedStructure,
            complianceCheck: clampedCompliance,
            engagementPotential: clampedEngagement,
        },
    }
}

/**
 * Log a knowledge gap when quality is low.
 * These get processed by the learning-loop worker.
 */
export async function logKnowledgeGap(
    orgId: string,
    brainAgentId: string | null,
    qualityResult: QualityResult,
    inputSummary: string
): Promise<void> {
    if (!supabase) return

    await supabase.from('knowledge_gaps').insert({
        org_id: orgId,
        agent_id: brainAgentId,
        gap_type: 'low_quality_output',
        context: {
            qualityScore: qualityResult.score,
            issues: qualityResult.issues,
            inputSummary: inputSummary.slice(0, 500),
            details: qualityResult.details,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
    }).then(({ error }) => {
        if (error) console.warn(`[QualityValidator] knowledge_gaps insert failed: ${error.message}`)
    })
}

/**
 * Build an enhanced retry prompt when quality is below threshold.
 */
export function buildRetryPrompt(
    originalInput: Record<string, any>,
    previousOutput: any,
    issues: QualityIssue[]
): string {
    const issueText = issues
        .filter(i => i.severity !== 'low')
        .map(i => `- ${i.category}: ${i.message}`)
        .join('\n')

    return `Your previous output had quality issues. Please regenerate with these corrections:

${issueText}

Original instructions: ${originalInput.prompt || '(see system context)'}

Previous output (DO NOT repeat these mistakes):
${extractText(previousOutput)?.slice(0, 1000) || '(no output)'}`
}

// ============================================================================
// HELPERS
// ============================================================================

function extractText(output: any): string {
    if (!output) return ''
    if (typeof output === 'string') return output
    if (output.text) return String(output.text)
    if (output.content) return typeof output.content === 'string' ? output.content : JSON.stringify(output.content)
    if (output.summary && Array.isArray(output.summary)) {
        return output.summary.map((s: any) => {
            if (typeof s.content === 'string') return s.content
            if (s.content?.text) return s.content.text
            return JSON.stringify(s.content)
        }).join('\n\n')
    }
    return JSON.stringify(output)
}

function extractIcpTerms(input: Record<string, any>): string[] {
    const terms: string[] = []
    const icp = input.brain_context?.icp
    if (!icp) return terms

    // Extract key terms from ICP pain points, description, criteria
    const fields = [
        icp.pain_points,
        icp.description,
        icp.buying_criteria,
        icp.demographics,
    ].filter(Boolean)

    for (const field of fields) {
        const text = typeof field === 'string' ? field : JSON.stringify(field)
        // Extract significant words (> 4 chars, not common words)
        const words = text.match(/\b[a-zA-Z]{5,}\b/g) || []
        const stopWords = new Set(['about', 'above', 'after', 'again', 'below', 'between', 'could', 'every', 'these', 'their', 'there', 'those', 'would', 'should', 'which', 'while', 'other'])
        terms.push(...words.filter(w => !stopWords.has(w.toLowerCase())).slice(0, 10))
    }

    return [...new Set(terms)].slice(0, 20)
}
