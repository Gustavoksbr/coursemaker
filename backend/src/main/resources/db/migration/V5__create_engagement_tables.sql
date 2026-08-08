CREATE TABLE enrollments (
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX idx_enrollments_course ON enrollments (course_id);

CREATE TABLE course_likes (
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX idx_course_likes_course ON course_likes (course_id);

CREATE TABLE post_likes (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_likes_post ON post_likes (post_id);

CREATE TABLE lesson_completions (
    user_id      UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    lesson_id    UUID        NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_lesson_completions_lesson ON lesson_completions (lesson_id);
