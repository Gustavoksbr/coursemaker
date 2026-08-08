-- Brute-force protection. `identifier` is an email, an IP, or a composite key
-- such as "private-course:<courseId>:<userId>".
CREATE TABLE login_attempts (
    identifier     VARCHAR(255) PRIMARY KEY,
    attempts_count INTEGER      NOT NULL DEFAULT 0,
    last_attempt   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    blocked_until  TIMESTAMPTZ
);
