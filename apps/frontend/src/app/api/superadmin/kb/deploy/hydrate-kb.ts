/**
 * Hydrate kb_sections + kb_documents from locked master sections.
 * Shared sections get namespace "shared/".
 * ICP-specific sections get namespace "{icp_slug}/".
 * Uses config.kb_deployment for section classification.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

interface DeployResult {
    sections_created: number
    documents_created: number
    documents_updated: number
    agent_id: string | null
}

export async function hydrateKBDocuments(
    supabase: SupabaseClient,
    orgId: string,
    questionnaireId: string,
    segments: any[],
    masterSections: any[],
    config: any
): Promise<DeployResult> {
    const kbConfig = config.kb_deployment || {}
    const sharedNums = new Set(kbConfig.shared_sections || [])
    const sharedNs = kbConfig.shared_section_namespace || 'shared'

    const result: DeployResult = {
        sections_created: 0,
        documents_created: 0,
        documents_updated: 0,
        agent_id: null,
    }

    // Resolve brain agent for this org (writer first, any agent as fallback)
    const agentId = await resolveAgentId(supabase, orgId)
    if (!agentId) {
        throw new Error(
            `No brain_agent exists for org ${orgId}. ` +
            `Deploy a brain agent first (via Brain Manager) before hydrating KB documents.`
        )
    }
    result.agent_id = agentId

    // Build ICP slug list
    const icpSlugs = segments.map(s => ({
        slug: slugify(s.segment_name || `segment_${s.sort_order}`),
        name: s.segment_name,
    }))

    // If no ICP segments, treat everything as shared
    const hasICPs = icpSlugs.length > 0

    // Process each master section
    for (const ms of masterSections) {
        if (!ms.content) continue

        const isShared = sharedNums.has(ms.section_number) || !hasICPs
        const sectionSlug = slugify(ms.section_title)
        const contentHash = crypto.createHash('md5').update(ms.content).digest('hex')

        if (isShared) {
            await deployToNamespace(
                supabase, agentId, orgId,
                `${sharedNs}/${sectionSlug}`, ms, contentHash, result
            )
        } else {
            for (const icp of icpSlugs) {
                await deployToNamespace(
                    supabase, agentId, orgId,
                    `${icp.slug}/${sectionSlug}`, ms, contentHash, result
                )
            }
        }
    }

    return result
}

/**
 * Resolve the brain_agent ID for this org.
 * Prefers writer type, falls back to any agent.
 */
async function resolveAgentId(supabase: SupabaseClient, orgId: string): Promise<string | null> {
    // Try writer first
    const { data: writer } = await supabase
        .from('brain_agents')
        .select('id')
        .eq('org_id', orgId)
        .eq('agent_type', 'writer')
        .limit(1)
        .maybeSingle()

    if (writer) return writer.id

    // Fallback to any agent
    const { data: any_agent } = await supabase
        .from('brain_agents')
        .select('id')
        .eq('org_id', orgId)
        .limit(1)
        .maybeSingle()

    return any_agent?.id || null
}

/**
 * Deploy a single master section into a namespaced kb_section + kb_document.
 * Mutates the result object directly (reference type — no value-copy bug).
 */
async function deployToNamespace(
    supabase: SupabaseClient,
    agentId: string,
    orgId: string,
    namespace: string,
    masterSection: any,
    contentHash: string,
    result: DeployResult
) {
    // Upsert kb_section
    const { data: existingSection } = await supabase
        .from('kb_sections')
        .select('id')
        .eq('agent_id', agentId)
        .eq('org_id', orgId)
        .eq('name', namespace)
        .maybeSingle()

    let sectionId: string

    if (existingSection) {
        sectionId = existingSection.id
    } else {
        const { data: newSection, error: insertErr } = await supabase
            .from('kb_sections')
            .insert({
                agent_id: agentId,
                org_id: orgId,
                name: namespace,
                display_name: masterSection.section_title,
                description: `KB Section ${masterSection.section_number}: ${masterSection.section_title}`,
                is_active: true,
            })
            .select('id')
            .single()

        if (insertErr || !newSection) {
            console.error(`[KB Deploy] Failed to create section "${namespace}":`, insertErr?.message)
            return
        }
        sectionId = newSection.id
        result.sections_created++
    }

    // Upsert kb_document
    const { data: existingDoc } = await supabase
        .from('kb_documents')
        .select('id, content_hash')
        .eq('section_id', sectionId)
        .eq('agent_id', agentId)
        .eq('org_id', orgId)
        .eq('title', masterSection.section_title)
        .maybeSingle()

    if (existingDoc) {
        // Only update if content actually changed
        if (existingDoc.content_hash !== contentHash) {
            const { error } = await supabase
                .from('kb_documents')
                .update({
                    content: masterSection.content,
                    content_hash: contentHash,
                    status: 'active',
                })
                .eq('id', existingDoc.id)

            if (!error) result.documents_updated++
        }
        // Content unchanged — skip silently
    } else {
        const { error } = await supabase
            .from('kb_documents')
            .insert({
                section_id: sectionId,
                agent_id: agentId,
                org_id: orgId,
                title: masterSection.section_title,
                content: masterSection.content,
                content_hash: contentHash,
                file_name: `section_${masterSection.section_number}.md`,
                file_type: 'text/markdown',
                status: 'active',
            })

        if (!error) result.documents_created++
    }
}

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
