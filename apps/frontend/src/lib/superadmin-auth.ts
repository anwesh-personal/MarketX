/**
 * Superadmin Authentication Utility
 * 
 * Provides:
 * - JWT token validation (client-side decode, server-side verify)
 * - Secure session management
 * - Authenticated fetch wrapper
 * - Token refresh handling
 */

import jwt from 'jsonwebtoken';

const STORAGE_KEY = 'superadmin_session';
const JWT_SECRET = process.env.JWT_SECRET || 'axiom-jwt-secret-change-in-production';

export interface SuperadminSession {
    adminId: string;
    email: string;
    token: string;
    expiresAt?: number;
}

export interface JWTPayload {
    adminId: string;
    email: string;
    type: 'superadmin';
    iat: number;
    exp: number;
}

/**
 * Decode JWT without verification (client-side)
 * Used to check expiry before making requests
 */
export function decodeToken(token: string): JWTPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1]));
        return payload as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Verify JWT with secret (server-side only)
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return payload;
    } catch {
        return null;
    }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
    const payload = decodeToken(token);
    if (!payload) return true;

    // exp is in seconds, Date.now() is in milliseconds
    const expiryTime = payload.exp * 1000;
    const now = Date.now();

    // Consider expired if less than 5 minutes remaining
    const bufferMs = 5 * 60 * 1000;
    return now >= (expiryTime - bufferMs);
}

/**
 * Get current session from storage
 */
export function getSession(): SuperadminSession | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const session = JSON.parse(stored) as SuperadminSession;

        // Validate token is present
        if (!session.token) return null;

        // Check if token is expired
        if (isTokenExpired(session.token)) {
            clearSession();
            return null;
        }

        return session;
    } catch {
        clearSession();
        return null;
    }
}

/**
 * Save session to storage
 */
export function saveSession(session: SuperadminSession): void {
    if (typeof window === 'undefined') return;

    const payload = decodeToken(session.token);
    if (payload) {
        session.expiresAt = payload.exp * 1000;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear session from storage
 */
export function clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get auth token for API requests
 */
export function getAuthToken(): string | null {
    const session = getSession();
    return session?.token || null;
}

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header and handles 401 responses
 */
export async function superadminFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = getAuthToken();

    if (!token) {
        // Redirect to login if no token
        if (typeof window !== 'undefined') {
            window.location.href = '/superadmin/login';
        }
        throw new Error('No authentication token');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle unauthorized responses
    if (response.status === 401) {
        clearSession();
        if (typeof window !== 'undefined') {
            window.location.href = '/superadmin/login';
        }
        throw new Error('Session expired');
    }

    return response;
}

/**
 * Validate session by calling verify endpoint
 * Returns true if valid, false otherwise
 */
export async function validateSession(): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const response = await fetch('/api/superadmin/auth/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            clearSession();
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Check if user is authenticated (quick client-side check)
 */
export function isAuthenticated(): boolean {
    const session = getSession();
    return session !== null && !isTokenExpired(session.token);
}
