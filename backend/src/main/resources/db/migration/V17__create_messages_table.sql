CREATE TABLE messages (
    id            UUID        PRIMARY KEY,
    sender_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_id     UUID        REFERENCES messages (id) ON DELETE SET NULL,
    content       TEXT        NOT NULL,
    edited_at     TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_messages_not_self CHECK (sender_id <> recipient_id)
);

-- Backs "conversation between two people" lookups in both directions, newest first.
CREATE INDEX idx_messages_sender_recipient ON messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient_sender ON messages (recipient_id, sender_id, created_at DESC);

-- Backs the unread-count badge.
CREATE INDEX idx_messages_recipient_unread ON messages (recipient_id) WHERE read_at IS NULL AND deleted_at IS NULL;

-- Backs reply-quote lookups.
CREATE INDEX idx_messages_parent ON messages (parent_id);
