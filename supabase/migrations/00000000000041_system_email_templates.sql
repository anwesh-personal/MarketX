-- SYSTEM EMAIL: tables + 15 templates (isolated from Email Providers)
CREATE TABLE IF NOT EXISTS system_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    subject TEXT NOT NULL, html_body TEXT NOT NULL, text_body TEXT, description TEXT,
    variables JSONB NOT NULL DEFAULT '[]'::JSONB, is_active BOOLEAN NOT NULL DEFAULT true,
    category TEXT NOT NULL DEFAULT 'system', created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_set_slug ON system_email_templates(slug);
CREATE TABLE IF NOT EXISTS system_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_id UUID REFERENCES system_email_templates(id),
    template_slug TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, provider_id UUID,
    provider_type TEXT, status TEXT NOT NULL DEFAULT 'sent', message_id TEXT, error TEXT,
    variables JSONB, sent_by UUID, sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sel_recip ON system_email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_sel_sent ON system_email_logs(sent_at DESC);
ALTER TABLE system_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_email_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO config_table (key, value, description) VALUES
('system_email_from_name','{"value":"Market Writer"}'::JSONB,'From name for system emails'),
('system_email_reply_to','{"value":""}'::JSONB,'Reply-to for system emails'),
('app_name','{"value":"Market Writer"}'::JSONB,'App name for templates')
ON CONFLICT (key) DO NOTHING;
