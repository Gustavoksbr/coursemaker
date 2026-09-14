-- Soft delete + anonymization for accounts. NULL means "active account". Set once, on deletion,
-- alongside scrubbing email/bio/image/stacks/password (see UserService.deleteAccount) - the
-- nickname is kept on purpose so existing content URLs (/courses/:nickname/:slug, ...) never rot.
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
