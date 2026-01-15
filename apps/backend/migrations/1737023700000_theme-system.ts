/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 004: Theme System
 * Adds user theme preferences
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // Add theme preference to users table
    pgm.addColumn('users', {
        theme_preference: {
            type: 'varchar(50)',
            default: "'minimalist-light'",
            check: `theme_preference IN (
        'minimalist-light', 'minimalist-dark',
        'aqua-light', 'aqua-dark',
        'modern-light', 'modern-dark'
      )`,
        },
        theme_updated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    // Index for theme queries
    pgm.createIndex('users', 'theme_preference');

    // Create trigger to auto-update theme_updated_at
    pgm.sql(`
    CREATE OR REPLACE FUNCTION update_theme_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.theme_updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

    pgm.sql(`
    CREATE TRIGGER users_theme_updated
      BEFORE UPDATE OF theme_preference ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_theme_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql('DROP TRIGGER IF EXISTS users_theme_updated ON users');
    pgm.sql('DROP FUNCTION IF EXISTS update_theme_timestamp()');
    pgm.dropColumn('users', ['theme_preference', 'theme_updated_at']);
}
