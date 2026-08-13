CREATE TABLE notifications (
    id             UUID        PRIMARY KEY,
    recipient_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    actor_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type           VARCHAR(20) NOT NULL,
    entity_kind    VARCHAR(10) NOT NULL,
    entity_id      UUID        NOT NULL,
    entity_title   VARCHAR(255) NOT NULL,
    entity_link    TEXT        NOT NULL,
    read_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_notifications_type        CHECK (type IN ('enrollment', 'trilha_follow', 'comment')),
    CONSTRAINT ck_notifications_entity_kind CHECK (entity_kind IN ('course', 'post', 'trilha'))
);

-- Backs the anti-spam dedup lookup: has this actor already notified this recipient about this
-- entity, for this notification type, within the configurable window?
CREATE INDEX idx_notifications_dedup ON notifications (recipient_id, actor_id, type, entity_id, created_at DESC);

-- Backs the paginated feed (newest first) and the unread-count/list queries.
CREATE INDEX idx_notifications_recipient_feed ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_id) WHERE read_at IS NULL;
