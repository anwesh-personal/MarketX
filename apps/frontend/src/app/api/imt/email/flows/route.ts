/**
 * IMT Email Flows API
 * Phase 3 - Returns email flows for a client/ICP combination
 *
 * GET /api/imt/email/flows?client_id=<uuid>&icp_id=<uuid>
 * IMT fetches flows to import into MailWizz
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildHtmlFromFlow(contentData: Record<string, unknown>): string {
    // EmailFlowBundle style: flows[].sequence with bodyMarkdown
    const flows = contentData.flows as Array<{ sequence?: Array<{ subject?: string; bodyMarkdown?: string; firstLine?: string }> }> | undefined;
    if (flows && Array.isArray(flows)) {
        const parts: string[] = [];
        for (const flow of flows) {
            const seq = flow.sequence;
            if (seq && Array.isArray(seq)) {
                for (const email of seq) {
                    const subject = email.subject || '';
                    const body = email.bodyMarkdown || email.firstLine || '';
                    parts.push(`<div class="email"><h3>${escapeHtml(subject)}</h3><div>${markdownToHtml(body)}</div></div>`);
                }
            }
        }
        if (parts.length > 0) return parts.join('<hr/>');
    }
    // Fallback: stringify
    return `<pre>${escapeHtml(JSON.stringify(contentData, null, 2))}</pre>`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
    if (!md) return '';
    return md
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('client_id');
        const icpId = searchParams.get('icp_id');

        if (!clientId || !icpId) {
            return NextResponse.json(
                { error: 'Missing required query parameters: client_id and icp_id' },
                { status: 400 }
            );
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(clientId) || !uuidRegex.test(icpId)) {
            return NextResponse.json(
                { error: 'Invalid UUID format for client_id or icp_id' },
                { status: 400 }
            );
        }

        // Resolve client_id to org
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle();

        if (orgError) {
            console.error('IMT flows: org lookup error', orgError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        if (!org) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        // Verify ICP exists and belongs to this client
        const { data: icp, error: icpError } = await supabase
            .from('imt_icps')
            .select('id')
            .eq('imt_icp_id', icpId)
            .eq('client_id', clientId)
            .maybeSingle();

        if (icpError) {
            console.error('IMT flows: ICP lookup error', icpError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        if (!icp) {
            return NextResponse.json(
                { error: 'ICP not found for this client' },
                { status: 404 }
            );
        }

        // Fetch email flows from generated_content
        const { data: contents, error: contentError } = await supabase
            .from('generated_content')
            .select('id, content_data')
            .eq('org_id', org.id)
            .eq('icp_id', icpId)
            .eq('content_type', 'EMAIL_FLOW')
            .eq('is_active', true)
            .order('generated_at', { ascending: false });

        if (contentError) {
            console.error('IMT flows: content fetch error', contentError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        const contentDataList = (contents || []).map((c) => c.content_data as Record<string, unknown>);
        const emailFlows = contentDataList.map((contentData) => {
            const html = (contentData?.html as string) || buildHtmlFromFlow(contentData || {});
            return { html };
        });

        return NextResponse.json({
            client_id: clientId,
            organization_id: org.id,
            icp_id: icpId,
            email_flows: emailFlows,
        });
    } catch (err) {
        console.error('IMT flows: unexpected error', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
