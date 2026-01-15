/**
 * Shared utility functions
 */

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
    return date.toISOString();
}

/**
 * Get date range for yesterday
 */
export function getYesterdayRange(): { start: Date; end: Date } {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const start = new Date(yesterday.setHours(0, 0, 0, 0));
    const end = new Date(yesterday.setHours(23, 59, 59, 999));

    return { start, end };
}

/**
 * Sleep utility for testing
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
