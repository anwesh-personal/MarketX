/**
 * KB Detail API Routes - Individual KB operations
 * 
 * GET - Get KB by ID
 * PUT - Update KB (save changes)
 * DELETE - Delete KB
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KnowledgeBaseSchema } from '@/lib/kb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { id } = params;

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

        return NextResponse.json({
            success: true,
            kb: data
        });
    } catch (error: any) {
        console.error('KB get error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { id } = params;
        const body = await request.json();
        const { name, description, data: kbData, incrementVersion } = body;

        // Validate KB data if provided
        if (kbData) {
            const result = KnowledgeBaseSchema.safeParse(kbData);
            if (!result.success) {
                return NextResponse.json(
                    { success: false, error: 'Invalid KB data', details: result.error.issues },
                    { status: 400 }
                );
            }
        }

        // Get current KB for version increment
        const { data: current, error: fetchError } = await supabase
            .from('knowledge_bases')
            .select('version, data')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Prepare update
        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (name !== undefined) updates.name = name;
        if (kbData !== undefined) {
            updates.data = kbData;

            // Increment version
            if (incrementVersion) {
                updates.version = (current.version || 0) + 1;
            }
        }

        const { data, error } = await supabase
            .from('knowledge_bases')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Store version in history if data changed
        if (kbData) {
            try {
                await supabase
                    .from('kb_versions')
                    .insert({
                        kb_id: id,
                        version: data.version,
                        data: current.data,
                        created_at: new Date().toISOString(),
                    });
            } catch (err: any) {
                console.warn('Version history not saved:', err.message);
            }
        }

        return NextResponse.json({
            success: true,
            kb: data
        });
    } catch (error: any) {
        console.error('KB update error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { id } = params;

        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('knowledge_bases')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'KB deleted (soft delete)'
        });
    } catch (error: any) {
        console.error('KB delete error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
