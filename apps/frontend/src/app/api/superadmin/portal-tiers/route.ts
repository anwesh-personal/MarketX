import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const upsertSchema = z.object({
    partner_id: z.string().uuid(),
    tier: z.enum(['basic', 'medium', 'enterprise']),
    can_view_metrics: z.boolean().default(true),
    can_chat_brain: z.boolean().default(false),
    can_train_brain: z.boolean().default(false),
    can_write_emails: z.boolean().default(false),
    can_feed_brain: z.boolean().default(false),
    can_access_flow_builder: z.boolean().default(false),
    can_view_kb: z.boolean().default(false),
    can_export_data: z.boolean().default(false),
    can_manage_satellites: z.boolean().default(false),
    can_view_agent_decisions: z.boolean().default(false),
    max_brain_chats_per_day: z.number().int().min(0).default(10),
    max_kb_uploads: z.number().int().min(0).default(0),
    max_custom_flows: z.number().int().min(0).default(0),
})


export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data, error } = await supabase
        .from('member_portal_config')
        .select('*, partner:partner_id(id, name)')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tierCounts: Record<string, number> = {}
    for (const c of (data ?? [])) tierCounts[c.tier] = (tierCounts[c.tier] ?? 0) + 1

    return NextResponse.json({ configs: data ?? [], by_tier: tierCounts })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { data: upserted, error } = await supabase
        .from('member_portal_config')
        .upsert(parsed.data, { onConflict: 'partner_id' })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ config: upserted })
}
