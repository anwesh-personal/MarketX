/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 006: IMT Client Integration
 * 
 * Adds client_id column to organizations table to store the UUID reference
 * to external InMarket Traffic Client records. This enables linking Axiom
 * organizations to IMT's external client system for downstream integrations.
 * 
 * Prerequisites for:
 * - Client API Integration
 * - Contact API Integration
 * 
 * Requested by: Nino (IMT Infrastructure Team)
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // ============================================================
    // 1. ADD client_id COLUMN TO ORGANIZATIONS
    // ============================================================
    // 
    // Stores the external IMT Client UUID for integration purposes.
    // Nullable for now to avoid breaking existing organizations.
    // Should be made NOT NULL in a future migration once all orgs
    // have been backfilled with their IMT client IDs.
    //
    pgm.addColumn('organizations', {
        client_id: {
            type: 'uuid',
            notNull: false, // Nullable for now - existing orgs remain unaffected
            comment: 'External InMarket Traffic Client UUID for integration',
        },
    });

    // ============================================================
    // 2. CREATE INDEX FOR QUERY PERFORMANCE
    // ============================================================
    //
    // Index on client_id for efficient lookups when querying
    // organizations by their external IMT client reference.
    //
    pgm.createIndex('organizations', 'client_id', {
        name: 'idx_organizations_client_id',
        method: 'btree',
    });

    // ============================================================
    // 3. ADD COMMENT FOR DOCUMENTATION
    // ============================================================
    pgm.sql(`
        COMMENT ON COLUMN organizations.client_id IS 
        'UUID reference to external InMarket Traffic Client record. Used for Client API and Contact API integrations. Will be made NOT NULL in future migration.';
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop the index first
    pgm.dropIndex('organizations', 'client_id', {
        name: 'idx_organizations_client_id',
    });

    // Remove the column
    pgm.dropColumn('organizations', 'client_id');
}
