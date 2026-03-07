/**
 * IMT EMAIL REPLY WORKER
 * Phase 4 - Option B: Webhook/Callback
 *
 * Flow:
 * 1. IMT POSTs to /api/imt/email/reply-request with client_id, icp_id, email_body, universal_person, callback_url
 * 2. MW queues job, returns job_id
 * 3. Worker generates reply via AI + KB
 * 4. When done, worker POSTs reply to callback_url (Option B)
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { QueueName, getRedisConnectionOptions } from '../config/queues';
import { aiService } from '../utils/ai-service';

// ============================================================================
// TYPES
// ============================================================================

export interface ImtEmailReplyJob {
    job_id: string;
    client_id: string;
    icp_id: string;
    org_id: string;
    email_body: string;
    email_subject?: string;
    sender?: string;
    universal_person?: Record<string, unknown>;
    callback_url?: string;
}

// ============================================================================
// SUPABASE
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ============================================================================
// JOB PROCESSOR
// ============================================================================

async function processImtEmailReply(job: Job<ImtEmailReplyJob>): Promise<{ success: boolean; reply?: string; error?: string }> {
    const { job_id, org_id, email_body, email_subject, sender, callback_url } = job.data;

    console.log(`📧 IMT Email Reply: processing job ${job_id}`);

    try {
        // Load KB for org (first active KB)
        let kbData: Record<string, unknown> | null = null;
        if (supabase) {
            const { data: kb } = await supabase
                .from('knowledge_bases')
                .select('data')
                .eq('org_id', org_id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            kbData = (kb as { data?: Record<string, unknown> } | null)?.data || null;
        }

        const brand = (kbData as Record<string, unknown>)?.brand as Record<string, unknown> | undefined;
        const voiceRules = (brand?.voice_rules as string[]) || [];
        const brandName = (brand?.brand_name_exact as string) || 'the company';

        const contextBlock = voiceRules.length > 0
            ? `\n\nBrand voice rules:\n${voiceRules.map((r) => `- ${r}`).join('\n')}`
            : '';

        const prompt = `You are writing a professional email reply on behalf of ${brandName}.

INCOMING EMAIL:
Subject: ${email_subject || '(no subject)'}
From: ${sender || '(unknown)'}

Body:
${email_body}

Generate a helpful, professional reply. Be concise and valuable. Match the tone of the incoming email. Do NOT make promises or guarantees. Do NOT use urgency or pressure tactics.${contextBlock}

Reply (plain text, no greetings/signatures unless natural):`;

        const aiResult = await aiService.call(prompt, {
            provider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 1024,
            tier: 'pro',
        });

        const reply = (aiResult.content || '').trim();

        // Option B: POST to callback_url when done
        if (callback_url && reply) {
            try {
                const res = await fetch(callback_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job_id,
                        status: 'ready',
                        reply,
                        generated_at: new Date().toISOString(),
                    }),
                });
                if (!res.ok) {
                    console.warn(`⚠️ Callback POST failed: ${res.status} ${res.statusText}`);
                } else {
                    console.log(`✅ Callback delivered to ${callback_url}`);
                }
            } catch (cbErr: unknown) {
                console.error('Callback POST error:', cbErr);
            }
        }

        return { success: true, reply };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ IMT Email Reply failed: ${msg}`);

        // Option B: Still try to notify callback of failure
        if (callback_url) {
            try {
                await fetch(callback_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job_id,
                        status: 'failed',
                        error: msg,
                        generated_at: new Date().toISOString(),
                    }),
                });
            } catch {
                // ignore
            }
        }

        return { success: false, error: msg };
    }
}

// ============================================================================
// WORKER
// ============================================================================

const worker = new Worker<ImtEmailReplyJob, { success: boolean; reply?: string; error?: string }>(
    QueueName.IMT_EMAIL_REPLY,
    processImtEmailReply,
    {
        connection: getRedisConnectionOptions(),
        concurrency: 3,
    }
);

worker.on('completed', (job, result) => {
    console.log(`✅ IMT reply job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ IMT reply job ${job?.id} failed:`, err.message);
});

export { worker as imtEmailReplyWorker };
export default worker;
