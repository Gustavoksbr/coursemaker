-- Add new notification types for admin block/unblock actions
ALTER TABLE notifications DROP CONSTRAINT ck_notifications_type;

ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type 
    CHECK (type IN ('enrollment', 'trilha_follow', 'comment', 'admin_blocked', 'admin_unblocked'));
