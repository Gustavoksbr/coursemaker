CREATE TABLE comments (
    id         UUID        PRIMARY KEY,
    course_id  UUID        NOT NULL REFERENCES courses (id)  ON DELETE CASCADE,
    author_id  UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    parent_id  UUID        REFERENCES comments (id)          ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_course ON comments (course_id, created_at);
CREATE INDEX idx_comments_parent ON comments (parent_id);

CREATE TABLE comment_bans (
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, user_id)
);
