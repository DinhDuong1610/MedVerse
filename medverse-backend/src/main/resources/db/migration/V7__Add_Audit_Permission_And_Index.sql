INSERT INTO permissions (id, code, description) VALUES
(gen_random_uuid(), 'AUDIT:READ', 'Allows viewing of system audit logs.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN' AND p.code = 'AUDIT:READ';

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
