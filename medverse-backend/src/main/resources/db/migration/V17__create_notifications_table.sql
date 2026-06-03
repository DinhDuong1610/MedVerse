CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id),

    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,

    entity_type VARCHAR(100),
    entity_id VARCHAR(100),

    read_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_at TIMESTAMP NOT NULL,
    updated_by UUID,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_notifications_recipient_created_at
    ON notifications(recipient_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_unread
    ON notifications(recipient_id, read_at)
    WHERE read_at IS NULL;