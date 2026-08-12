-- Mirrors courses: a private post is gated by a password, tracked the same way as
-- private_course_access/private_course_verified (see V7).
ALTER TABLE posts ADD COLUMN password_hash VARCHAR(255);

CREATE TABLE private_post_access (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_private_post_access_post ON private_post_access (post_id);

CREATE TABLE private_post_verified (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);
