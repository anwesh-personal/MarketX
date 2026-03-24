-- ============================================================================
-- SYSTEM EMAIL TEMPLATES
-- ============================================================================
-- Stores configurable templates for all transactional/system emails.
-- No hardcoded templates in code — everything lives here.
-- Variables use {{variable_name}} syntax, resolved at send time.
--
-- System email settings (which provider, from name/email) live in config_table
-- under keys: system_email_provider_id, system_email_from_name, system_email_from_address
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_email_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,                    -- e.g. 'password_reset', 'welcome', 'invite_user'
    name          TEXT NOT NULL,                           -- Human-readable: "Password Reset"
    subject       TEXT NOT NULL,                           -- Subject line (supports {{variables}})
    html_body     TEXT NOT NULL,                           -- HTML body (supports {{variables}})
    text_body     TEXT,                                    -- Plain text fallback (supports {{variables}})
    description   TEXT,                                    -- Admin-facing description
    variables     JSONB NOT NULL DEFAULT '[]'::JSONB,      -- Declared variables: [{"name":"reset_link","required":true,"description":"Password reset URL"}]
    is_active     BOOLEAN NOT NULL DEFAULT true,
    category      TEXT NOT NULL DEFAULT 'system',          -- 'system', 'notification', 'marketing'
    created_by    UUID REFERENCES superadmins(id),
    updated_by    UUID REFERENCES superadmins(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast slug lookup (used on every send)
CREATE INDEX IF NOT EXISTS idx_system_email_templates_slug ON system_email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_category ON system_email_templates(category);

-- Audit log for sent system emails
CREATE TABLE IF NOT EXISTS system_email_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id   UUID REFERENCES system_email_templates(id),
    template_slug TEXT NOT NULL,
    recipient     TEXT NOT NULL,
    subject       TEXT NOT NULL,
    provider_id   UUID,                                    -- Which email_provider_configs was used
    provider_type TEXT,                                    -- e.g. 'smtp', 'ses', 'sendgrid'
    status        TEXT NOT NULL DEFAULT 'sent',            -- 'sent', 'failed', 'bounced'
    message_id    TEXT,                                    -- Provider's message ID
    error         TEXT,
    variables     JSONB,                                   -- Variables used for this send (for debugging)
    sent_by       UUID,                                    -- Superadmin ID who triggered it (if manual)
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_email_logs_recipient ON system_email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_system_email_logs_template ON system_email_logs(template_slug);
CREATE INDEX IF NOT EXISTS idx_system_email_logs_sent_at ON system_email_logs(sent_at DESC);

-- RLS: Only service role can access these
ALTER TABLE system_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEED DEFAULT TEMPLATES
-- ============================================================================
-- These are starting points — admin can edit everything from the UI.
-- No hardcoded HTML in application code.
-- ============================================================================

INSERT INTO system_email_templates (slug, name, subject, html_body, text_body, description, variables, category) VALUES

-- Password Reset
('password_reset', 'Password Reset', '🔑 Reset your {{app_name}} password', 
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="text-align:center;margin-bottom:32px"><h1 style="color:#fff;font-size:24px;margin:0">{{app_name}}</h1></div><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff;font-size:20px;margin:0 0 16px">Reset Your Password</h2><p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px">We received a request to reset the password for <strong style="color:#fff">{{email}}</strong>. Click the button below to set a new password.</p><div style="text-align:center;margin:32px 0"><a href="{{reset_link}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">Reset Password</a></div><p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0">If you didn''t request this, you can safely ignore this email. This link expires in {{expiry_hours}} hours.</p></div><div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e1e2e"><p style="color:#4b5563;font-size:12px;margin:0">© {{year}} {{app_name}}. All rights reserved.</p></div></div></body></html>',
'Reset your {{app_name}} password\n\nWe received a request to reset the password for {{email}}.\n\nReset your password: {{reset_link}}\n\nThis link expires in {{expiry_hours}} hours.\n\nIf you didn''t request this, ignore this email.',
'Sent when superadmin triggers a password reset for a user',
'[{"name":"app_name","required":true,"description":"Application name"},{"name":"email","required":true,"description":"User email"},{"name":"reset_link","required":true,"description":"Password reset URL"},{"name":"expiry_hours","required":false,"description":"Link expiry in hours","default":"24"},{"name":"year","required":false,"description":"Current year"}]'::JSONB,
'system'),

-- Welcome / Account Created
('welcome', 'Welcome Email', '👋 Welcome to {{app_name}}!',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="text-align:center;margin-bottom:32px"><h1 style="color:#fff;font-size:24px;margin:0">{{app_name}}</h1></div><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff;font-size:20px;margin:0 0 16px">Welcome, {{user_name}}! 🎉</h2><p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px">Your account has been created. You can now log in and start using {{app_name}}.</p><div style="background:#1e1e2e;border-radius:8px;padding:16px;margin:0 0 24px"><p style="color:#9ca3af;font-size:12px;margin:0 0 8px">Your login email:</p><p style="color:#fff;font-size:14px;font-weight:600;margin:0">{{email}}</p></div><div style="text-align:center;margin:32px 0"><a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">Log In Now</a></div></div><div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e1e2e"><p style="color:#4b5563;font-size:12px;margin:0">© {{year}} {{app_name}}. All rights reserved.</p></div></div></body></html>',
'Welcome to {{app_name}}!\n\nYour account has been created.\nEmail: {{email}}\n\nLog in: {{login_url}}',
'Sent when a new user account is created',
'[{"name":"app_name","required":true,"description":"Application name"},{"name":"user_name","required":true,"description":"User display name"},{"name":"email","required":true,"description":"User email"},{"name":"login_url","required":true,"description":"Login page URL"},{"name":"year","required":false,"description":"Current year"}]'::JSONB,
'system'),

-- User Invitation
('invite_user', 'User Invitation', '📩 You''ve been invited to {{app_name}}',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="text-align:center;margin-bottom:32px"><h1 style="color:#fff;font-size:24px;margin:0">{{app_name}}</h1></div><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff;font-size:20px;margin:0 0 16px">You''ve Been Invited!</h2><p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px"><strong style="color:#fff">{{inviter_name}}</strong> has invited you to join <strong style="color:#fff">{{org_name}}</strong> on {{app_name}}.</p><div style="text-align:center;margin:32px 0"><a href="{{invite_link}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">Accept Invitation</a></div><p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0">This invitation expires in {{expiry_days}} days.</p></div><div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e1e2e"><p style="color:#4b5563;font-size:12px;margin:0">© {{year}} {{app_name}}. All rights reserved.</p></div></div></body></html>',
'You''ve been invited to {{app_name}}!\n\n{{inviter_name}} invited you to join {{org_name}}.\n\nAccept: {{invite_link}}\n\nExpires in {{expiry_days}} days.',
'Sent when a user is invited to an organization',
'[{"name":"app_name","required":true,"description":"Application name"},{"name":"inviter_name","required":true,"description":"Who sent the invite"},{"name":"org_name","required":true,"description":"Organization name"},{"name":"invite_link","required":true,"description":"Invitation acceptance URL"},{"name":"expiry_days","required":false,"description":"Invite expiry in days","default":"7"},{"name":"year","required":false,"description":"Current year"}]'::JSONB,
'system'),

-- Test Email (for connection verification)
('test_email', 'Test Email', '✅ {{app_name}} — SMTP Test Successful',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="text-align:center;margin-bottom:32px"><h1 style="color:#fff;font-size:24px;margin:0">{{app_name}}</h1></div><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px;text-align:center"><div style="font-size:48px;margin-bottom:16px">✅</div><h2 style="color:#fff;font-size:20px;margin:0 0 16px">SMTP Test Successful</h2><p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 16px">Your system email configuration is working correctly.</p><div style="background:#1e1e2e;border-radius:8px;padding:16px;text-align:left"><p style="color:#6b7280;font-size:12px;margin:0 0 4px">Provider: <strong style="color:#9ca3af">{{provider_name}}</strong></p><p style="color:#6b7280;font-size:12px;margin:0 0 4px">From: <strong style="color:#9ca3af">{{from_address}}</strong></p><p style="color:#6b7280;font-size:12px;margin:0">Sent at: <strong style="color:#9ca3af">{{sent_at}}</strong></p></div></div></div></body></html>',
'SMTP Test Successful\n\nProvider: {{provider_name}}\nFrom: {{from_address}}\nSent at: {{sent_at}}',
'Test email to verify system email configuration is working',
'[{"name":"app_name","required":true,"description":"Application name"},{"name":"provider_name","required":true,"description":"Email provider name"},{"name":"from_address","required":true,"description":"From email address"},{"name":"sent_at","required":true,"description":"Timestamp"}]'::JSONB,
'system')

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED SYSTEM EMAIL CONFIG KEYS (if not exists)
-- ============================================================================

INSERT INTO config_table (key, value, description) VALUES
('system_email_provider_id', '{"value": null}'::JSONB, 'UUID of the email_provider_configs row to use for system/transactional emails'),
('system_email_from_name', '{"value": "Market Writer"}'::JSONB, 'From name for system emails'),
('system_email_from_address', '{"value": "noreply@marketwriter.io"}'::JSONB, 'From email address for system emails'),
('system_email_reply_to', '{"value": null}'::JSONB, 'Reply-to address for system emails (optional)'),
('app_name', '{"value": "Market Writer"}'::JSONB, 'Application name used in email templates and UI')
ON CONFLICT (key) DO NOTHING;
