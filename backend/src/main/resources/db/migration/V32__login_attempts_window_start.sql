-- Start of the current counting window, so failures only count while they are "recent"
-- (login rate limit: N failures within W seconds). NULL = legacy rows / no window.
ALTER TABLE login_attempts ADD COLUMN window_start TIMESTAMPTZ;
