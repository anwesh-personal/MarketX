/**
 * @deprecated LEGACY API CLIENT - DO NOT USE
 * This file was used by the old "Market Writer" functionality.
 * All new code should use Next.js API routes at /api/*
 * 
 * Keeping this file for reference but marking as deprecated.
 * TODO: Delete after confirming all legacy code is removed.
 */

// REMOVED: Hardcoded backend URL
// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

console.warn('⚠️ DEPRECATED: lib/api.ts should not be used. Use Next.js API routes instead.');

// Empty exports to prevent import errors
export async function fetchStats() {
    throw new Error('DEPRECATED: Use /api/* routes instead');
}

export async function fetchActiveKB() {
    throw new Error('DEPRECATED: Use /api/kb/* routes instead');
}

export async function uploadKB(_data: any, _version: string) {
    throw new Error('DEPRECATED: Use /api/kb/* routes instead');
}

export async function triggerManualRun(_input?: any) {
    throw new Error('DEPRECATED: Use /api/engines/* routes instead');
}

export async function fetchRuns() {
    throw new Error('DEPRECATED: Use /api/engines/executions/* routes instead');
}

export async function fetchVariantAnalytics() {
    throw new Error('DEPRECATED: Analytics moved to different system');
}

export async function trackEvent(_event: any) {
    throw new Error('DEPRECATED: Analytics moved to different system');
}
