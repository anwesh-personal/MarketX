import crypto from 'crypto'

const ENCRYPTED_SECRET_PREFIX = 'enc:v1:'

function getEncryptionSource() {
    const source = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET

    if (!source) {
        throw new Error('Missing secret encryption key. Set SECRETS_ENCRYPTION_KEY or JWT_SECRET.')
    }

    return source
}

function getEncryptionKey() {
    return crypto.createHash('sha256').update(getEncryptionSource()).digest()
}

export function isEncryptedSecret(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(ENCRYPTED_SECRET_PREFIX)
}

export function encryptSecret(plainText: string) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return `${ENCRYPTED_SECRET_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptSecret(secret: string | null | undefined) {
    if (!secret) return ''
    if (!isEncryptedSecret(secret)) return secret

    const payload = secret.slice(ENCRYPTED_SECRET_PREFIX.length)
    const [ivPart, tagPart, encryptedPart] = payload.split(':')

    if (!ivPart || !tagPart || !encryptedPart) {
        throw new Error('Encrypted secret payload is malformed')
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getEncryptionKey(),
        Buffer.from(ivPart, 'base64url')
    )
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, 'base64url')),
        decipher.final(),
    ])

    return decrypted.toString('utf8')
}

export function maskSecret(secret: string | null | undefined) {
    const resolved = decryptSecret(secret)

    if (!resolved) return ''
    if (resolved.length <= 8) return '••••••••'

    return `${resolved.slice(0, 4)}••••${resolved.slice(-4)}`
}

export function shouldPersistSecret(input: unknown) {
    return typeof input === 'string' && input.trim().length > 0
}
