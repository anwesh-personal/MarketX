-- SEED: 15 system email templates. All editable from Superadmin → System Email.
-- HTML uses {{variable}} syntax. app_name and year are auto-injected.

-- Shared HTML wrapper function: dark themed, responsive
-- Each template below uses inline HTML for email client compat.

-- 1. Password Reset
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('password_reset','Password Reset','Reset your {{app_name}} password',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Reset Your Password</h2><p style="color:#9ca3af">Click below to reset the password for <b style="color:#fff">{{email}}</b>.</p><p style="text-align:center;margin:24px 0"><a href="{{reset_link}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a></p><p style="color:#6b7280;font-size:12px">Expires in {{expiry_hours}} hours.</p></div></div></body></html>',
'Reset password: {{reset_link}} (expires {{expiry_hours}}h)','Password reset email',
'[{"name":"email","required":true},{"name":"reset_link","required":true},{"name":"expiry_hours","required":false,"default":"24"}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 2. Welcome
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('welcome','Welcome Email','Welcome to {{app_name}}!',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Welcome, {{user_name}}!</h2><p style="color:#9ca3af">Your account is ready. Email: <b style="color:#fff">{{email}}</b></p><p style="text-align:center;margin:24px 0"><a href="{{login_url}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Log In</a></p></div></div></body></html>',
'Welcome! Log in: {{login_url}}','New account welcome',
'[{"name":"user_name","required":true},{"name":"email","required":true},{"name":"login_url","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 3. User Invitation
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('invite_user','User Invitation','You have been invited to {{app_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">You Have Been Invited</h2><p style="color:#9ca3af"><b style="color:#fff">{{inviter_name}}</b> invited you to <b style="color:#fff">{{org_name}}</b>.</p><p style="text-align:center;margin:24px 0"><a href="{{invite_link}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Accept</a></p><p style="color:#6b7280;font-size:12px">Expires in {{expiry_days}} days.</p></div></div></body></html>',
'{{inviter_name}} invited you to {{org_name}}: {{invite_link}}','Org invitation',
'[{"name":"inviter_name","required":true},{"name":"org_name","required":true},{"name":"invite_link","required":true},{"name":"expiry_days","required":false,"default":"7"}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 4. Test Email
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('test_email','Test Email','{{app_name}} SMTP Test OK',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px;text-align:center"><p style="font-size:48px">✅</p><h2 style="color:#fff">SMTP Test Successful</h2><p style="color:#9ca3af">Server: {{provider_name}}<br>From: {{from_address}}<br>Sent: {{sent_at}}</p></div></div></body></html>',
'SMTP OK. Server: {{provider_name}}','SMTP test verification',
'[{"name":"provider_name","required":true},{"name":"from_address","required":true},{"name":"sent_at","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 5. Email Verification
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('email_verification','Email Verification','Verify your email for {{app_name}}',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Verify Your Email</h2><p style="color:#9ca3af">Verify <b style="color:#fff">{{email}}</b> to activate your account.</p><p style="text-align:center;margin:24px 0"><a href="{{verification_link}}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a></p></div></div></body></html>',
'Verify: {{verification_link}}','Email verification',
'[{"name":"email","required":true},{"name":"verification_link","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 6. Password Changed
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('password_changed','Password Changed','Your {{app_name}} password was changed',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Password Changed</h2><p style="color:#9ca3af">Password for <b style="color:#fff">{{email}}</b> was changed on {{changed_at}}. If not you, contact support immediately.</p></div></div></body></html>',
'Password changed on {{changed_at}}. Not you? Contact support.','Password change confirmation',
'[{"name":"email","required":true},{"name":"changed_at","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;

-- 7. Account Suspended
INSERT INTO system_email_templates (slug,name,subject,html_body,text_body,description,variables,category) VALUES
('account_suspended','Account Suspended','Your {{app_name}} account has been suspended',
'<html><body style="margin:0;background:#0a0a0f;font-family:sans-serif"><div style="max-width:540px;margin:auto;padding:40px 20px"><h1 style="color:#fff;text-align:center">{{app_name}}</h1><div style="background:#13131a;border:1px solid #1e1e2e;border-radius:12px;padding:32px"><h2 style="color:#fff">Account Suspended</h2><p style="color:#9ca3af">Account <b style="color:#fff">{{email}}</b> suspended. Reason: <b style="color:#fff">{{reason}}</b></p><p style="color:#6b7280;font-size:12px">Contact support if you believe this is an error.</p></div></div></body></html>',
'Account suspended. Reason: {{reason}}','Account suspension notice',
'[{"name":"email","required":true},{"name":"reason","required":true}]'::JSONB,'system')
ON CONFLICT(slug) DO NOTHING;
