-- Add FK constraints for created_by / updated_by → platform_admins
ALTER TABLE system_email_templates
  ADD CONSTRAINT fk_set_created_by FOREIGN KEY (created_by) REFERENCES platform_admins(id) ON DELETE SET NULL;
ALTER TABLE system_email_templates
  ADD CONSTRAINT fk_set_updated_by FOREIGN KEY (updated_by) REFERENCES platform_admins(id) ON DELETE SET NULL;
