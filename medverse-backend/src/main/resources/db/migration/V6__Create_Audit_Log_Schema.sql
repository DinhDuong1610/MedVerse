CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    result VARCHAR(50) NOT NULL,
    details JSONB
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_email, occurred_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, occurred_at);
