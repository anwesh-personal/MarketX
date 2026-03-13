/**
 * PostgreSQL pool helper for direct DB access in API routes.
 * Used when Supabase client overhead isn't needed or when raw SQL is cleaner.
 *
 * Usage:
 *   import { query, queryOne } from '@/lib/db'
 *   const rows = await query('SELECT * FROM users WHERE org_id = $1', [orgId])
 *   const row  = await queryOne('SELECT * FROM users WHERE id = $1', [id])
 */

import { Pool, QueryResultRow } from 'pg'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
    console.error('[db] Unexpected pool error:', err.message)
})

/**
 * Run a query and return all rows.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
): Promise<T[]> {
    const result = await pool.query<T>(sql, params)
    return result.rows
}

/**
 * Run a query and return the first row, or null if no results.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
): Promise<T | null> {
    const result = await pool.query<T>(sql, params)
    return result.rows[0] ?? null
}

export default pool
