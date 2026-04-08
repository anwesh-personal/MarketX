/**
 * REFINERY NEXUS — EMAIL VERIFICATION INTEGRATION
 * ================================================
 * Calls the Refinery Nexus verification API to pre-screen emails
 * before they are dispatched via MailWizz.
 *
 * FULLY MODULAR: all config lives in system_config table.
 * If Refinery URL/key changes (e.g., after server migration), update DB — no redeploy.
 * If Refinery is disabled, this is a no-op. Never blocks execution.
 *
 * system_config keys consumed:
 *   ecosystem.refinery_verify_enabled  — 'true'/'false'
 *   ecosystem.refinery_api_url         — e.g. 'https://iiiemail.email'
 *   ecosystem.refinery_api_key         — Bearer token
 *   ecosystem.refinery_verify_timeout  — ms, default 8000
 *   ecosystem.refinery_reject_threshold — score 0-100, default 50
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface VerifyEmailsInput {
  emails: string[];
  orgId: string;
}

export interface VerifiedEmailResult {
  email: string;
  safe: boolean;
  score: number;
  classification: 'safe' | 'risky' | 'invalid' | 'disposable' | 'role';
  reason?: string;
}

export interface VerifyEmailsOutput {
  enabled: boolean;
  ran: boolean;
  safe: string[];
  rejected: string[];
  results: VerifiedEmailResult[];
  durationMs: number;
  error?: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ============================================================================
// CONFIG LOADER
// ============================================================================

interface RefineryConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  rejectThreshold: number;
}

async function loadRefineryConfig(): Promise<RefineryConfig> {
  const supabase = getSupabase();
  const defaults: RefineryConfig = {
    enabled: false,
    apiUrl: '',
    apiKey: '',
    timeoutMs: 8000,
    rejectThreshold: 50,
  };

  if (!supabase) return defaults;

  const keys = [
    'ecosystem.refinery_verify_enabled',
    'ecosystem.refinery_api_url',
    'ecosystem.refinery_api_key',
    'ecosystem.refinery_verify_timeout',
    'ecosystem.refinery_reject_threshold',
  ];

  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', keys);

  if (!(data as Array<{key: string; value: string}>)?.length) return defaults;

  const cfg: Record<string, string> = {};
  for (const row of (data as Array<{key: string; value: string}>) || []) cfg[row.key] = row.value;

  return {
    enabled: cfg['ecosystem.refinery_verify_enabled'] === 'true',
    apiUrl: cfg['ecosystem.refinery_api_url'] || '',
    apiKey: cfg['ecosystem.refinery_api_key'] || '',
    timeoutMs: parseInt(cfg['ecosystem.refinery_verify_timeout'] || '8000', 10),
    rejectThreshold: parseInt(cfg['ecosystem.refinery_reject_threshold'] || '50', 10),
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Verifies a list of emails against Refinery Nexus.
 * NON-BLOCKING: always returns. On error, returns all emails as 'safe'
 * (so execution continues) and logs the error.
 */
export async function verifyEmailsWithRefinery(
  input: VerifyEmailsInput
): Promise<VerifyEmailsOutput> {
  const start = Date.now();
  const noop = (reason: string, error?: string): VerifyEmailsOutput => ({
    enabled: false,
    ran: false,
    safe: input.emails,
    rejected: [],
    results: input.emails.map(e => ({ email: e, safe: true, score: 100, classification: 'safe' })),
    durationMs: Date.now() - start,
    ...(error ? { error } : {}),
  });

  if (!input.emails.length) return noop('no emails');

  let config: RefineryConfig;
  try {
    config = await loadRefineryConfig();
  } catch (err: any) {
    console.warn(`⚠ Refinery config load failed: ${err.message}`);
    return noop('config error', err.message);
  }

  if (!config.enabled) return noop('disabled');
  if (!config.apiUrl || !config.apiKey) {
    console.warn('⚠ Refinery verify enabled but apiUrl/apiKey not set in system_config');
    return noop('missing config');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    const res = await fetch(`${config.apiUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        emails: input.emails,
        checks: { smtpVerify: true, disposable: true, role: true },
        thresholds: { reject: config.rejectThreshold },
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Refinery API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as { results?: Array<{ email: string; classification?: string; score?: number; reason?: string }> };
    const results: VerifiedEmailResult[] = (data.results || []).map((r) => ({
      email: r.email,
      safe: r.classification === 'safe',
      score: r.score ?? 0,
      classification: (r.classification ?? 'risky') as VerifiedEmailResult['classification'],
      reason: r.reason,
    }));

    const safe = results.filter(r => r.safe).map(r => r.email);
    const rejected = results.filter(r => !r.safe).map(r => r.email);

    console.log(`✅ Refinery verify: ${safe.length} safe, ${rejected.length} rejected (${Date.now() - start}ms)`);

    return {
      enabled: true,
      ran: true,
      safe,
      rejected,
      results,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`⚠ Refinery verify timed out after ${config.timeoutMs}ms — proceeding`);
      return noop('timeout', 'Refinery verification timed out');
    }
    console.warn(`⚠ Refinery verify failed (non-blocking): ${err.message}`);
    return noop('error', err.message);
  }
}
