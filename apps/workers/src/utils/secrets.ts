/**
 * SECRET DECRYPTION UTILITY (Worker Version)
 * 
 * Mirrors: apps/frontend/src/lib/secrets.ts
 * 
 * API keys in ai_providers are stored encrypted (AES-256-GCM).
 * This module decrypts them using SECRETS_ENCRYPTION_KEY or JWT_SECRET
 * (same env var the frontend uses).
 */

import crypto from 'crypto';

const ENCRYPTED_SECRET_PREFIX = 'enc:v1:';

function getEncryptionSource() {
    const source = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET;

    if (!source) {
        throw new Error('Missing secret encryption key. Set SECRETS_ENCRYPTION_KEY or JWT_SECRET.');
    }

    return source;
}

function getEncryptionKey() {
    return crypto.createHash('sha256').update(getEncryptionSource()).digest();
}

export function isEncryptedSecret(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(ENCRYPTED_SECRET_PREFIX);
}

export function decryptSecret(secret: string | null | undefined): string {
    if (!secret) return '';
    if (!isEncryptedSecret(secret)) return secret;

    const payload = secret.slice(ENCRYPTED_SECRET_PREFIX.length);
    const [ivPart, tagPart, encryptedPart] = payload.split(':');

    if (!ivPart || !tagPart || !encryptedPart) {
        throw new Error('Encrypted secret payload is malformed');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getEncryptionKey(),
        Buffer.from(ivPart, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, 'base64url')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}
