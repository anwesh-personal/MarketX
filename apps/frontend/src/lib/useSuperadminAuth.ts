/**
 * React Hook for Superadmin Authentication
 * 
 * Provides:
 * - Current admin info
 * - Authenticated fetch function
 * - Session state management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getSession,
    clearSession,
    validateSession,
    isAuthenticated,
    SuperadminSession,
} from './superadmin-auth';

interface UseSupeadminAuth {
    admin: SuperadminSession | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => void;
    getAuthHeaders: () => Record<string, string>;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useSuperadminAuth(): UseSupeadminAuth {
    const router = useRouter();
    const [admin, setAdmin] = useState<SuperadminSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Quick client-side check
            if (!isAuthenticated()) {
                setIsLoading(false);
                return;
            }

            const session = getSession();
            if (!session) {
                setIsLoading(false);
                return;
            }

            // Validate with server (only on mount)
            const isValid = await validateSession();

            if (!isValid) {
                clearSession();
                setAdmin(null);
            } else {
                setAdmin(session);
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setAdmin(null);
        router.push('/superadmin/login');
    }, [router]);

    const getAuthHeaders = useCallback((): Record<string, string> => {
        const session = getSession();
        if (!session?.token) {
            return {};
        }
        return {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
        };
    }, []);

    const fetchWithAuth = useCallback(async (
        url: string,
        options: RequestInit = {}
    ): Promise<Response> => {
        const headers = new Headers(options.headers);
        const session = getSession();

        if (session?.token) {
            headers.set('Authorization', `Bearer ${session.token}`);
        }

        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle unauthorized - redirect to login
        if (response.status === 401) {
            clearSession();
            setAdmin(null);
            router.push('/superadmin/login');
        }

        return response;
    }, [router]);

    return {
        admin,
        isLoading,
        isAuthenticated: admin !== null,
        logout,
        getAuthHeaders,
        fetchWithAuth,
    };
}

/**
 * Get auth token for API calls (non-hook version)
 * Use this in places where you can't use hooks
 */
export function getAuthToken(): string | null {
    const session = getSession();
    return session?.token || null;
}

/**
 * Get authorization headers for API calls
 */
export function getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    if (!token) return {};

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}
