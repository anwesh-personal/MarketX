/**
 * KB Duplicate API Route
 * 
 * POST - Duplicate an existing KB
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface RouteParams {
    params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { id } = params;
        const body = await request.json();
        const { newName } = body;

        // Get the KB to duplicate
        const { data: original, error: fetchError } = await supabase
            .from('knowledge_bases')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'KB not found' },
                    { status: 404 }
                );
            }
            throw fetchError;
        }

        // Update the kb_version in the duplicated data
        const duplicatedData = { ...original.data };
        duplicatedData.kb_version = '1.0.0'; // Reset version for duplicate

        // Create the duplicate
        const { data, error } = await supabase
            .from('knowledge_bases')
            .insert({
                id: uuidv4(),
                name: newName || `${original.name} (Copy)`,
                description: original.description,
                org_id: original.org_id,
                data: duplicatedData,
                version: '1.0.0',
                stage: original.stage,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            kb: data,
            originalId: id,
        });
    } catch (error: any) {
        console.error('KB duplicate error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
