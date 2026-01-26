/**
 * KB Export API Route
 * 
 * GET - Export KB as Markdown
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { kbToMarkdown, KnowledgeBaseSchema } from '@/lib/kb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'markdown';

        // Get the KB
        const { data, error } = await supabase
            .from('knowledge_bases')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'KB not found' },
                    { status: 404 }
                );
            }
            throw error;
        }

        // Validate KB data
        const parsed = KnowledgeBaseSchema.safeParse(data.data);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'KB data is invalid', details: parsed.error.issues },
                { status: 400 }
            );
        }

        if (format === 'json') {
            // Return raw JSON
            return NextResponse.json({
                success: true,
                name: data.name,
                data: parsed.data
            });
        }

        // Convert to Markdown
        const markdown = kbToMarkdown(parsed.data);

        if (format === 'download') {
            // Return as downloadable file
            const filename = `${data.name.toLowerCase().replace(/\s+/g, '_')}_kb.md`;
            return new NextResponse(markdown, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }

        // Return markdown as JSON response
        return NextResponse.json({
            success: true,
            name: data.name,
            markdown
        });
    } catch (error: any) {
        console.error('KB export error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
