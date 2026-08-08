CREATE TABLE courses (
    id                  UUID         PRIMARY KEY,
    owner_id            UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    description         TEXT,
    landing_description TEXT,
    thumbnail_url       TEXT,
    visibility          VARCHAR(20)  NOT NULL DEFAULT 'public',
    status              VARCHAR(20)  NOT NULL DEFAULT 'unavailable',
    password_hash       VARCHAR(255),
    categories          TEXT[]       NOT NULL DEFAULT '{}',
    is_featured         BOOLEAN      NOT NULL DEFAULT FALSE,
    progress_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Slugs are unique per owner, not globally.
    CONSTRAINT uq_courses_owner_slug UNIQUE (owner_id, slug),
    CONSTRAINT ck_courses_visibility CHECK (visibility IN ('public', 'private')),
    CONSTRAINT ck_courses_status     CHECK (status IN ('available', 'unavailable'))
);

CREATE INDEX idx_courses_owner      ON courses (owner_id);
CREATE INDEX idx_courses_featured   ON courses (is_featured) WHERE is_featured;
CREATE INDEX idx_courses_created_at ON courses (created_at DESC);
CREATE INDEX idx_courses_categories ON courses USING GIN (categories);
