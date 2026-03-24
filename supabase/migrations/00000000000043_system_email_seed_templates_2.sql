-- SEED: templates 8-15

-- 8. Account Reactivated
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('account_reactivated','Account Reactivated','Your {{app_name}} account is active again',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Account Reactivated</h2><p style="color:#9ca3af">Account <b style="color:#fff">{{email}}</b> is active. You can log in again.</p><p style="text-align:center;margin:24px 0"><a href="{{login_url}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Log In</a></p></div></div></body></html>',
'Account reactivated. Log in: {{login_url}}','Account reactivation',
'[{"name":"email","required":true},{"name":"login_url","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 9. Login Alert
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('login_alert','New Login Alert','New login to {{app_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">New Login Detected</h2><p style="color:#9ca3af">Login to <b style="color:#fff">{{email}}</b></p><p style="color:#9ca3af;font-size:13px">IP: {{ip_address}} | Location: {{location}} | Time: {{login_time}}</p><p style="color:#6b7280;font-size:12px">Not you? Change your password immediately.</p></div></div></body></html>',
'New login from {{ip_address}} at {{login_time}}','Security login alert',
'[{"name":"email","required":true},{"name":"ip_address","required":true},{"name":"location","required":false,"default":"Unknown"},{"name":"login_time","required":true}]'::JSONB,'notification')
ON CONFLICT(slug) DO NOTHING;

-- 10. Org Created
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('org_created','Organization Created','{{org_name}} is set up on {{app_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Organization Created</h2><p style="color:#9ca3af"><b style="color:#fff">{{org_name}}</b> is ready.</p><p style="text-align:center;margin:24px 0"><a href="{{dashboard_url}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Dashboard</a></p></div></div></body></html>',
'{{org_name}} created. Dashboard: {{dashboard_url}}','Org creation confirmation',
'[{"name":"org_name","required":true},{"name":"dashboard_url","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 11. Role Changed
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('role_changed','Role Changed','Your role in {{org_name}} was updated',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Role Updated</h2><p style="color:#9ca3af">Your role in <b style="color:#fff">{{org_name}}</b> changed from <b style="color:#fff">{{old_role}}</b> to <b style="color:#fff">{{new_role}}</b>.</p></div></div></body></html>',
'Role changed from {{old_role}} to {{new_role}} in {{org_name}}','Role change notification',
'[{"name":"org_name","required":true},{"name":"old_role","required":true},{"name":"new_role","required":true}]'::JSONB,'notification')
ON CONFLICT(slug) DO NOTHING;

-- 12. Admin Broadcast
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('admin_broadcast','Admin Broadcast','{{subject_line}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">{{headline}}</h2><p style="color:#9ca3af;line-height:1.6">{{message_body}}</p></div></div></body></html>',
'{{message_body}}','Generic admin broadcast to users/members',
'[{"name":"subject_line","required":true},{"name":"headline","required":true},{"name":"message_body","required":true}]'::JSONB,'notification')
ON CONFLICT(slug) DO NOTHING;

-- 13. Workflow Failed
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('workflow_failed','Workflow Failed','Workflow failed: {{workflow_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#ef4444">Workflow Failed</h2><p style="color:#9ca3af"><b style="color:#fff">{{workflow_name}}</b> failed.</p><p style="color:#9ca3af;font-size:13px">Error: {{error_message}}<br>Time: {{failed_at}}</p></div></div></body></html>',
'Workflow {{workflow_name}} failed: {{error_message}}','Workflow failure alert',
'[{"name":"workflow_name","required":true},{"name":"error_message","required":true},{"name":"failed_at","required":true}]'::JSONB,'notification')
ON CONFLICT(slug) DO NOTHING;

-- 14. Usage Limit Warning
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('usage_limit_warning','Usage Limit Warning','{{app_name}} usage limit approaching',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#f59e0b">Usage Limit Warning</h2><p style="color:#9ca3af"><b style="color:#fff">{{org_name}}</b> is approaching the <b style="color:#fff">{{limit_type}}</b> limit.</p><p style="color:#9ca3af;font-size:13px">Usage: {{current_usage}} / {{max_limit}} ({{usage_percent}}%)</p></div></div></body></html>',
'{{org_name}} at {{usage_percent}}% of {{limit_type}} limit','Usage limit warning',
'[{"name":"org_name","required":true},{"name":"limit_type","required":true},{"name":"current_usage","required":true},{"name":"max_limit","required":true},{"name":"usage_percent","required":true}]'::JSONB,'notification')
ON CONFLICT(slug) DO NOTHING;

-- 15. Member Removed
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('member_removed','Member Removed','You have been removed from {{org_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Membership Removed</h2><p style="color:#9ca3af">You have been removed from <b style="color:#fff">{{org_name}}</b> by <b style="color:#fff">{{removed_by}}</b>.</p><p style="color:#6b7280;font-size:12px">Contact the org admin if this is an error.</p></div></div></body></html>',
'Removed from {{org_name}} by {{removed_by}}','Member removal notice',
'[{"name":"org_name","required":true},{"name":"removed_by","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;
