/**
 * API Client for Market Writer Backend
 * Centralized typed layer for all API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * Fetch dashboard statistics
 */
export async function fetchStats() {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

/**
 * Fetch active Knowledge Base
 */
export async function fetchActiveKB() {
    const res = await fetch(`${API_URL}/kb/active`);
    if (!res.ok) throw new Error("Failed to fetch KB");
    return res.json();
}

/**
 * Upload new Knowledge Base
 */
export async function uploadKB(data: any, version: string) {
    const res = await fetch(`${API_URL}/kb/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, version }),
    });
    if (!res.ok) throw new Error("Failed to upload KB");
    return res.json();
}

/**
 * Trigger manual run
 */
export async function triggerManualRun(input?: any) {
    const res = await fetch(`${API_URL}/run/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error("Failed to trigger run");
    return res.json();
}

/**
 * Fetch recent runs
 */
export async function fetchRuns() {
    const res = await fetch(`${API_URL}/runs`);
    if (!res.ok) throw new Error("Failed to fetch runs");
    return res.json();
}

/**
 * Fetch variant analytics
 */
export async function fetchVariantAnalytics() {
    const res = await fetch(`${API_URL}/analytics/variants`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
}

/**
 * Track analytics event
 */
export async function trackEvent(event: {
    run_id?: string;
    variant_id: string;
    event_type: string;
    payload?: any;
}) {
    const res = await fetch(`${API_URL}/analytics/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error("Failed to track event");
    return res.json();
}
