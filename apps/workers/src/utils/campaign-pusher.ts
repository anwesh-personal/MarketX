/**
 * CAMPAIGN PUSHER — MTA DISPATCH SERVICE
 * =======================================
 * Pushes a generated email sequence to the configured MTA as a campaign.
 *
 * FULLY MODULAR: reads MTA provider config from email_provider_configs table.
 * Currently implements MailWizz. Adding a new MTA = add a new MtaDriver class.
 * Swap MTAs from Superadmin UI — zero code changes.
 *
 * MIGRATION-SAFE: URL/key in DB. Change server → update DB. Nothing breaks.
 *
 * system_config keys consumed:
 *   ecosystem.mta_push_enabled   — 'true'/'false'
 *   ecosystem.mta_provider_type  — 'mailwizz' (default) | future providers
 *
 * email_provider_configs columns consumed:
 *   provider_type, api_key, api_secret, api_base_url, is_active, partner_id
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailInSequence {
  subject: string;
  body: string;
  delayDays: number;           // 0 = send immediately, 1+ = wait N days
}

export interface CampaignPushInput {
  orgId: string;
  partnerId?: string;          // If orgs map to MailWizz partner IDs
  campaignName: string;
  fromName: string;
  fromEmail: string;
  listUid: string;             // MailWizz list UID to send to
  emails: EmailInSequence[];
  metadata?: Record<string, any>;
}

export interface CampaignPushOutput {
  enabled: boolean;
  ran: boolean;
  success: boolean;
  campaignUid?: string;        // MailWizz campaign UID if created
  provider?: string;
  durationMs: number;
  error?: string;
}

// ============================================================================
// MTA DRIVER INTERFACE — Swapping MTA = implement this interface
// ============================================================================

interface MtaDriver {
  readonly providerType: string;
  configure(cfg: MtaProviderConfig): void;
  createCampaign(input: CampaignPushInput): Promise<{ campaignUid: string }>;
}

interface MtaProviderConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
}

// ============================================================================
// MAILWIZZ DRIVER IMPLEMENTATION
// ============================================================================

class MailWizzDriver implements MtaDriver {
  readonly providerType = 'mailwizz';
  private cfg: MtaProviderConfig | null = null;

  configure(cfg: MtaProviderConfig): void {
    this.cfg = cfg;
  }

  async createCampaign(input: CampaignPushInput): Promise<{ campaignUid: string }> {
    if (!this.cfg) throw new Error('MailWizz driver not configured');

    const baseUrl = this.cfg.baseUrl.replace(/\/$/, '');
    const headers = {
      'X-MW-PUBLIC-KEY': this.cfg.apiKey,
      'Content-Type': 'application/json',
    };

    if (!input.emails.length) throw new Error('No emails in sequence');

    // Push each email in the sequence as a separate MailWizz campaign.
    // Delay between emails is encoded in the campaign name for operator reference.
    // TODO: When MailWizz Autoresponder API is available, migrate to native sequence.
    const firstEmail = input.emails[0];

    // Create the primary campaign (email #1, send immediately)
    const primaryPayload = {
      name: input.emails.length > 1
        ? `${input.campaignName} [1/${input.emails.length}]`
        : input.campaignName,
      type: 'regular',
      from_name: input.fromName,
      from_email: input.fromEmail,
      reply_to: input.fromEmail,
      subject: firstEmail.subject,
      list_uid: input.listUid,
      template: { content: firstEmail.body },
      send_at: 'now',
    };

    const primaryRes = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(primaryPayload),
    });

    if (!primaryRes.ok) {
      const err = await primaryRes.text().catch(() => '');
      throw new Error(`MailWizz campaign create failed (${primaryRes.status}): ${err.slice(0, 300)}`);
    }

    const primaryData = await primaryRes.json() as { campaign?: { campaign_uid?: string }; data?: { campaign_uid?: string } };
    const campaignUid = primaryData.campaign?.campaign_uid || primaryData.data?.campaign_uid;
    if (!campaignUid) throw new Error('MailWizz returned no campaign_uid');

    // Create follow-up campaigns for remaining emails (scheduled by delay)
    // These are created as draft campaigns — operator reviews and schedules them
    for (let i = 1; i < input.emails.length; i++) {
      const email = input.emails[i];
      const followUpPayload = {
        name: `${input.campaignName} [${i + 1}/${input.emails.length}] (+${email.delayDays}d)`,
        type: 'regular',
        from_name: input.fromName,
        from_email: input.fromEmail,
        reply_to: input.fromEmail,
        subject: email.subject,
        list_uid: input.listUid,
        template: { content: email.body },
        status: 'draft', // Operator schedules follow-ups manually
      };

      const followRes = await fetch(`${baseUrl}/api/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(followUpPayload),
      });

      if (!followRes.ok) {
        const errText = await followRes.text().catch(() => '');
        // Log but don't throw — primary campaign already created successfully
        console.warn(`⚠ MailWizz: follow-up email ${i + 1} failed (${followRes.status}): ${errText.slice(0, 200)}`);
      } else {
        console.log(`📧 MailWizz follow-up ${i + 1}/${input.emails.length} created as draft`);
      }
    }

    console.log(`📧 MailWizz sequence created: ${campaignUid} (${input.emails.length} emails)`);
    return { campaignUid };
  }
}

// ============================================================================
// DRIVER REGISTRY — Add future MTA drivers here
// ============================================================================

const MTA_DRIVERS: Record<string, MtaDriver> = {
  mailwizz: new MailWizzDriver(),
};

function getDriver(providerType: string): MtaDriver | null {
  return MTA_DRIVERS[providerType] || null;
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

async function loadMtaConfig(orgId: string): Promise<{
  enabled: boolean;
  providerType: string;
  providerCfg: MtaProviderConfig | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { enabled: false, providerType: 'mailwizz', providerCfg: null };

  // Load feature flag + provider preference from system_config
  const { data: configs } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['ecosystem.mta_push_enabled', 'ecosystem.mta_provider_type']);

  const typedConfigs = (configs || []) as Array<{ key: string; value: string }>;
  const cfgMap: Record<string, string> = {};
  for (const c of typedConfigs) cfgMap[c.key] = c.value;

  const enabled = cfgMap['ecosystem.mta_push_enabled'] === 'true';
  const providerType = cfgMap['ecosystem.mta_provider_type'] || 'mailwizz';

  if (!enabled) return { enabled: false, providerType, providerCfg: null };

  // Load MTA provider config — org-specific first, then global
  const { data: provider } = await supabase
    .from('email_provider_configs')
    .select('api_key, api_secret, api_base_url, base_url')
    .eq('provider_type', providerType)
    .eq('is_active', true)
    .or(`partner_id.eq.${orgId},scope.eq.global`)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!provider) return { enabled, providerType, providerCfg: null };

  return {
    enabled,
    providerType,
    providerCfg: {
      apiKey: provider.api_key,
      apiSecret: provider.api_secret,
      baseUrl: provider.api_base_url || provider.base_url,
    },
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Pushes a generated email sequence to the configured MTA.
 * NON-BLOCKING: on error returns failure without throwing.
 * Engine execution continues regardless.
 */
export async function pushCampaignToMta(
  input: CampaignPushInput
): Promise<CampaignPushOutput> {
  const start = Date.now();

  try {
    const { enabled, providerType, providerCfg } = await loadMtaConfig(input.orgId);

    if (!enabled) {
      return { enabled: false, ran: false, success: false, durationMs: Date.now() - start };
    }

    if (!providerCfg) {
      console.warn(`⚠ MTA push enabled but no ${providerType} provider configured for org ${input.orgId}`);
      return { enabled: true, ran: false, success: false, provider: providerType, durationMs: Date.now() - start, error: 'No MTA provider configured' };
    }

    const driver = getDriver(providerType);
    if (!driver) {
      console.warn(`⚠ No MTA driver for provider type: ${providerType}`);
      return { enabled: true, ran: false, success: false, provider: providerType, durationMs: Date.now() - start, error: `Unsupported MTA: ${providerType}` };
    }

    driver.configure(providerCfg);
    const { campaignUid } = await driver.createCampaign(input);

    return {
      enabled: true,
      ran: true,
      success: true,
      campaignUid,
      provider: providerType,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    console.warn(`⚠ Campaign push failed (non-blocking): ${err.message}`);
    return {
      enabled: true,
      ran: true,
      success: false,
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}
