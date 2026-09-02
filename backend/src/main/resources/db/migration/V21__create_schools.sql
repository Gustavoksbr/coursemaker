CREATE TABLE schools (
    id          UUID PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url    VARCHAR(2000),
    website_url VARCHAR(2000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Who is ALLOWED to publish under each school. Granted only by an admin.
CREATE TABLE school_members (
    school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (school_id, user_id)
);

-- The actual, optional attribution. ON DELETE SET NULL (not blocked, unlike areas): a school is
-- optional provenance, so removing it should un-attribute the content, not prevent the deletion.
ALTER TABLE courses ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE posts   ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE trilhas ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_school      ON courses(school_id);
CREATE INDEX idx_posts_school        ON posts(school_id);
CREATE INDEX idx_trilhas_school      ON trilhas(school_id);
CREATE INDEX idx_school_members_user ON school_members(user_id);
