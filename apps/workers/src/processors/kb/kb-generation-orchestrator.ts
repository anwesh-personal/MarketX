/**
 * KB Generation Orchestrator — Worker Processor
 *
 * Receives a BullMQ job with questionnaire_id, org_id, user_id.
 * Generates all 23 sections of the Master Knowledge Base SEQUENTIALLY
 * across 8 passes, where each pass uses prior sections as context.
 *
 * Flow:
 *   1. Load questionnaire + ICP segments + artifact texts
 *   2. Build PromptContext
 *   3. For each pass (1→8), for each section in that pass:
 *      a. Mark section as 'generating'
 *      b. Call AI with section-specific prompt + prior context
 *      c. Write content + mark as 'draft'
 *   4. Mark questionnaire status as 'review'
 */

import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { SECTION_CONFIGS, getSectionsByPass, PromptContext } from './kb-section-prompts'
import aiService from '../../utils/ai-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// ─── Types ──────────────────────────────────────────────────────

export interface KBGenerationJob {
    questionnaire_id: string
    org_id: string
    user_id: string
}

// Artifact text cap — per-artifact and total
const MAX_ARTIFACT_CHARS_EACH = 8000
const MAX_ARTIFACT_CHARS_TOTAL = 40000

// ─── Failure Tracking ───────────────────────────────────────────

interface SectionFailure {
    sectionNumber: number
    sectionTitle: string
    error: string
    timestamp: string
    /** Sections that were SKIPPED because this section failed */
    cascadeSkipped: number[]
}

/**
 * Given a set of failed section numbers, return all downstream sections
 * that depend on ANY failed section (directly or transitively).
 */
function computeCascadeSkips(failedSections: Set<number>): Set<number> {
    const skipped = new Set<number>()

    // Keep iterating until no new skips are found (handles transitive deps)
    let changed = true
    while (changed) {
        changed = false
        for (const config of SECTION_CONFIGS) {
            if (skipped.has(config.sectionNumber)) continue
            if (failedSections.has(config.sectionNumber)) continue

            // Check if ANY dependency is failed or skipped
            const hasBrokenDep = config.dependsOn.some(
                dep => failedSections.has(dep) || skipped.has(dep)
            )
            if (hasBrokenDep) {
                skipped.add(config.sectionNumber)
                changed = true
            }
        }
    }

    return skipped
}

// ─── Main Processor ─────────────────────────────────────────────

export async function processKBGeneration(job: Job<KBGenerationJob>): Promise<void> {
    const { questionnaire_id, org_id } = job.data
    console.log(`📚 [KBGen] Starting generation for questionnaire=${questionnaire_id} org=${org_id}`)

    if (!supabase) throw new Error('No DB connection')

    try {
        // 1. Load questionnaire
        const { data: qr, error: qrErr } = await supabase
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('id', questionnaire_id)
            .single()

        if (qrErr || !qr) throw new Error(`Questionnaire not found: ${qrErr?.message}`)

        // 2. Load ICP segments
        const { data: segments } = await supabase
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaire_id)
            .order('sort_order', { ascending: true })

        // 3. Load artifact texts (from completed extractions)
        const { data: artifacts } = await supabase
            .from('kb_artifact_uploads')
            .select('file_name, category, extracted_text, extraction_result')
            .eq('questionnaire_id', questionnaire_id)
            .eq('extraction_status', 'completed')

        // Build artifact text with per-artifact cap and total cap
        let totalArtifactChars = 0
        let truncatedCount = 0
        const artifactParts: string[] = []

        for (const a of (artifacts || [])) {
            if (!a.extracted_text || a.extracted_text.length === 0) continue
            if (totalArtifactChars >= MAX_ARTIFACT_CHARS_TOTAL) break

            let text = a.extracted_text
            if (text.length > MAX_ARTIFACT_CHARS_EACH) {
                text = text.slice(0, MAX_ARTIFACT_CHARS_EACH) + `\n\n[... truncated from ${a.extracted_text.length} to ${MAX_ARTIFACT_CHARS_EACH} chars — file: ${a.file_name}]`
                truncatedCount++
            }

            const remaining = MAX_ARTIFACT_CHARS_TOTAL - totalArtifactChars
            if (text.length > remaining) {
                text = text.slice(0, remaining)
                truncatedCount++
            }

            artifactParts.push(`--- ARTIFACT: ${a.file_name} (${a.category}) ---\n${text}`)
            totalArtifactChars += text.length
        }

        const artifactText = artifactParts.join('\n\n')

        if (truncatedCount > 0) {
            console.warn(`⚠️ [KBGen] ${truncatedCount} artifact(s) were truncated. Total artifact text: ${totalArtifactChars} chars (cap: ${MAX_ARTIFACT_CHARS_TOTAL})`)
        }

        // 4. Initialize shared AI service
        await aiService.initialize()
        console.log(`🤖 [KBGen] AI service initialized, resolving provider for org=${org_id}`)

        job.updateProgress(5)

        // 5. Build prompt context
        const priorSections: Record<number, string> = {}

        const promptCtx: PromptContext = {
            q: qr,
            segments: segments || [],
            artifactText,
            priorSections,
            companyName: qr.company_name || 'Partner',
        }

        // 6. Process sections pass-by-pass — with honest failure tracking
        const passSections = getSectionsByPass()
        const totalSections = SECTION_CONFIGS.length
        let completedSections = 0

        const failedSectionNumbers = new Set<number>()
        const failures: SectionFailure[] = []

        for (let pass = 1; pass <= 8; pass++) {
            const sections = passSections.get(pass)
            if (!sections) continue

            console.log(`📝 [KBGen] Pass ${pass}/8 — ${sections.length} section(s)`)

            // Before processing this pass, compute which sections must be skipped
            // because their upstream dependency failed
            const cascadeSkipped = computeCascadeSkips(failedSectionNumbers)

            for (const sectionConfig of sections) {
                const sectionNum = sectionConfig.sectionNumber
                const sectionTitle = sectionConfig.sectionTitle

                // ── SKIP CHECK: If this section depends on a failed section, skip it ──
                if (cascadeSkipped.has(sectionNum)) {
                    const brokenDeps = sectionConfig.dependsOn.filter(
                        d => failedSectionNumbers.has(d) || cascadeSkipped.has(d)
                    )

                    const skipReason = `SKIPPED: Upstream dependency failed (Section(s) ${brokenDeps.join(', ')}). ` +
                        `Cannot generate "${sectionTitle}" without: ${brokenDeps.map(d => {
                            const cfg = SECTION_CONFIGS.find(c => c.sectionNumber === d)
                            return `Section ${d} (${cfg?.sectionTitle || 'unknown'})`
                        }).join(', ')}. Fix the upstream failure and regenerate.`

                    console.warn(`  ⏭️  Section ${sectionNum}: ${sectionTitle} — SKIPPED (broken dependency)`)

                    await supabase
                        .from('kb_master_sections')
                        .update({
                            status: 'failed',
                            content: null,
                            reviewer_notes: skipReason,
                        })
                        .eq('questionnaire_id', questionnaire_id)
                        .eq('section_number', sectionNum)
                        .eq('org_id', org_id)

                    continue
                }

                console.log(`  → Section ${sectionNum}: ${sectionTitle}`)

                // Mark as generating
                await supabase
                    .from('kb_master_sections')
                    .update({ status: 'generating', reviewer_notes: null })
                    .eq('questionnaire_id', questionnaire_id)
                    .eq('section_number', sectionNum)
                    .eq('org_id', org_id)

                try {
                    // Build the user message with current context
                    const userMessage = sectionConfig.buildUserMessage(promptCtx)

                    // Call AI via shared service (org BYOK → platform keys, with failover)
                    const aiResult = await aiService.callWithOrgContext(org_id, userMessage, {
                        systemPrompt: sectionConfig.systemPrompt,
                        maxTokens: 8192,
                        temperature: 0.4,
                    })

                    const content = aiResult.content

                    if (!content || content.trim().length < 50) {
                        throw new Error(`Insufficient content generated (${content?.length || 0} chars). The AI returned an empty or trivial response.`)
                    }


                    // Store the generated content in prior sections for downstream use
                    priorSections[sectionNum] = content

                    // Save to DB
                    await supabase
                        .from('kb_master_sections')
                        .update({
                            content,
                            status: 'draft',
                            provider_used: aiResult.provider,
                            model_used: aiResult.model,
                            generation_duration_ms: aiResult.durationMs,
                            reviewer_notes: null,
                        })
                        .eq('questionnaire_id', questionnaire_id)
                        .eq('section_number', sectionNum)
                        .eq('org_id', org_id)

                    completedSections++
                    const progress = Math.round(5 + (completedSections / totalSections) * 90)
                    job.updateProgress(progress)

                    console.log(`  ✅ Section ${sectionNum} done (${content.length} chars, ${aiResult.durationMs}ms)`)

                } catch (sectionErr: any) {
                    const errMsg = sectionErr.message || 'Unknown error'
                    console.error(`  ❌ Section ${sectionNum} FAILED: ${errMsg}`)

                    // Track this failure
                    failedSectionNumbers.add(sectionNum)

                    // Compute what downstream sections will now be skipped
                    const newCascade = computeCascadeSkips(failedSectionNumbers)
                    const cascadedFromThis = [...newCascade].filter(
                        s => !cascadeSkipped.has(s) && !failedSectionNumbers.has(s)
                    )

                    const failure: SectionFailure = {
                        sectionNumber: sectionNum,
                        sectionTitle,
                        error: errMsg,
                        timestamp: new Date().toISOString(),
                        cascadeSkipped: cascadedFromThis,
                    }
                    failures.push(failure)

                    if (cascadedFromThis.length > 0) {
                        console.error(`  ⚠️  CASCADE: Sections ${cascadedFromThis.join(', ')} will be SKIPPED because Section ${sectionNum} failed`)
                    }

                    // Mark section with explicit 'failed' status — not hidden as 'pending'
                    await supabase
                        .from('kb_master_sections')
                        .update({
                            status: 'failed',
                            content: null,
                            reviewer_notes: `GENERATION FAILED: ${errMsg}\n\nTimestamp: ${failure.timestamp}${
                                cascadedFromThis.length > 0
                                    ? `\n\nThis failure also blocked generation of: ${cascadedFromThis.map(s => {
                                        const cfg = SECTION_CONFIGS.find(c => c.sectionNumber === s)
                                        return `Section ${s} (${cfg?.sectionTitle || 'unknown'})`
                                    }).join(', ')}`
                                    : ''
                            }`,
                        })
                        .eq('questionnaire_id', questionnaire_id)
                        .eq('section_number', sectionNum)
                        .eq('org_id', org_id)
                }

                // Small delay between sections to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        // 7. Set HONEST questionnaire status
        const failedCount = failures.length
        const skippedCount = [...computeCascadeSkips(failedSectionNumbers)].length
        const totalBroken = failedCount + skippedCount

        if (totalBroken === 0) {
            // Clean run — all sections generated successfully
            await supabase
                .from('kb_questionnaire_responses')
                .update({ status: 'review' })
                .eq('id', questionnaire_id)

            job.updateProgress(100)
            console.log(`🎉 [KBGen] Complete! ${completedSections}/${totalSections} sections generated successfully.`)

        } else {
            // Partial failure — tell the truth
            const failureReport = {
                generated_at: new Date().toISOString(),
                total_sections: totalSections,
                succeeded: completedSections,
                failed: failedCount,
                skipped_by_cascade: skippedCount,
                failures: failures.map(f => ({
                    section: `Section ${f.sectionNumber}: ${f.sectionTitle}`,
                    error: f.error,
                    cascaded_to: f.cascadeSkipped.map(s => {
                        const cfg = SECTION_CONFIGS.find(c => c.sectionNumber === s)
                        return `Section ${s} (${cfg?.sectionTitle || 'unknown'})`
                    }),
                })),
            }

            await supabase
                .from('kb_questionnaire_responses')
                .update({
                    status: 'generation_partial_failure',
                    constraint_results: failureReport, // Store failure report where it's visible
                })
                .eq('id', questionnaire_id)

            job.updateProgress(100)
            console.error(`⚠️  [KBGen] PARTIAL FAILURE: ${completedSections}/${totalSections} succeeded, ${failedCount} failed, ${skippedCount} skipped`)
            console.error(`   Failure report:`, JSON.stringify(failureReport, null, 2))
        }

    } catch (error: any) {
        console.error(`❌ [KBGen] Fatal error:`, error.message)

        // Revert to ready_for_generation so user can retry
        await supabase
            ?.from('kb_questionnaire_responses')
            .update({
                status: 'generation_failed',
                constraint_results: {
                    fatal_error: error.message,
                    timestamp: new Date().toISOString(),
                    note: 'The entire generation process failed before any sections could complete. Check provider configuration and try again.',
                },
            })
            .eq('id', questionnaire_id)

        throw error
    }
}
