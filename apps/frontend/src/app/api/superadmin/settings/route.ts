import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { encryptSecret, shouldPersistSecret, isEncryptedSecret } from '@/lib/secrets'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENSITIVE_CONFIG_KEYS = new Set(['smtp_password'])

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const { data, error } = await supabase
            .from('config_table')
            .select('key, value, description')
            .order('key', { ascending: true })

        if (error) throw error

        const secretStatus = Object.fromEntries(
            (data || [])
                .filter((row) => SENSITIVE_CONFIG_KEYS.has(row.key))
                .map((row) => [row.key, Boolean(row.value?.value)])
        )

        const sanitizedConfigs = (data || []).map((row) => (
            SENSITIVE_CONFIG_KEYS.has(row.key)
                ? {
                    ...row,
                    value: { value: '' },
                }
                : row
        ))

        return NextResponse.json({
            configs: sanitizedConfigs,
            secret_status: secretStatus,
        })
    } catch (error: any) {
        console.error('Superadmin settings GET error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch settings' },
            { status: error?.status || 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const body = await request.json()
        const rawConfigs = body?.configs

        if (!rawConfigs || typeof rawConfigs !== 'object') {
            return NextResponse.json(
                { error: 'configs object is required' },
                { status: 400 }
            )
        }

        const incomingEntries = Object.entries(rawConfigs)
        const sensitiveKeys = incomingEntries
            .map(([key]) => key)
            .filter((key) => SENSITIVE_CONFIG_KEYS.has(key))

        const existingSensitiveValues = new Map<string, string>()

        if (sensitiveKeys.length > 0) {
            const { data: existingRows, error: existingError } = await supabase
                .from('config_table')
                .select('key, value')
                .in('key', sensitiveKeys)

            if (existingError) throw existingError

            for (const row of existingRows || []) {
                const currentValue = row.value?.value
                if (typeof currentValue === 'string' && currentValue.length > 0) {
                    existingSensitiveValues.set(row.key, currentValue)
                }
            }
        }

        const rows = incomingEntries.map(([key, value]) => {
            if (SENSITIVE_CONFIG_KEYS.has(key)) {
                if (!shouldPersistSecret(value)) {
                    return {
                        key,
                        value: { value: existingSensitiveValues.get(key) || '' },
                        description: key.replaceAll('_', ' '),
                    }
                }

                return {
                    key,
                    value: { value: isEncryptedSecret(value) ? value : encryptSecret(String(value)) },
                    description: key.replaceAll('_', ' '),
                }
            }

            return {
                key,
                value: { value },
                description: key.replaceAll('_', ' '),
            }
        })

        const { data, error } = await supabase
            .from('config_table')
            .upsert(rows, { onConflict: 'key' })
            .select('key, value, description')

        if (error) throw error

        return NextResponse.json({
            success: true,
            configs: (data || []).map((row) => (
                SENSITIVE_CONFIG_KEYS.has(row.key)
                    ? { ...row, value: { value: '' } }
                    : row
            )),
            updated_count: rows.length,
        })
    } catch (error: any) {
        console.error('Superadmin settings POST error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to save settings' },
            { status: error?.status || 500 }
        )
    }
}
