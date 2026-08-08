-- Active access to a private course, granted after a successful password check.
-- The owner may revoke it, which forces the student to type the password again.
CREATE TABLE private_course_access (
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX idx_private_course_access_course ON private_course_access (course_id);

-- Remembers that this user has already proven they know the password, so access
-- can be restored without prompting again.
CREATE TABLE private_course_verified (
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);
