CREATE TABLE trilhas (
    id          UUID         PRIMARY KEY,
    owner_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    visibility  VARCHAR(20)  NOT NULL DEFAULT 'public',
    status      VARCHAR(20)  NOT NULL DEFAULT 'unavailable',
    categories  TEXT[]       NOT NULL DEFAULT '{}',
    is_featured BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Slugs are unique per owner, not globally.
    CONSTRAINT uq_trilhas_owner_slug UNIQUE (owner_id, slug),
    CONSTRAINT ck_trilhas_visibility CHECK (visibility IN ('public', 'private')),
    CONSTRAINT ck_trilhas_status     CHECK (status IN ('available', 'unavailable'))
);

CREATE INDEX idx_trilhas_owner      ON trilhas (owner_id);
CREATE INDEX idx_trilhas_featured   ON trilhas (is_featured) WHERE is_featured;
CREATE INDEX idx_trilhas_created_at ON trilhas (created_at DESC);
CREATE INDEX idx_trilhas_categories ON trilhas USING GIN (categories);

-- Ordered sequence of courses/posts that make up a trilha. Exactly one of course_id/post_id is
-- set. A course or post can belong to an unbounded number of trilhas owned by anyone -- the trilha
-- owner alone controls this table, which is what makes public content trilha-able by strangers.
CREATE TABLE trilha_items (
    id          UUID        PRIMARY KEY,
    trilha_id   UUID        NOT NULL REFERENCES trilhas (id) ON DELETE CASCADE,
    course_id   UUID        REFERENCES courses (id) ON DELETE CASCADE,
    post_id     UUID        REFERENCES posts (id)   ON DELETE CASCADE,
    order_index INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_trilha_items_exactly_one_target CHECK (
        (course_id IS NOT NULL AND post_id IS NULL) OR (course_id IS NULL AND post_id IS NOT NULL)
    ),
    -- Also backs the FK from course_trilha_highlights below.
    CONSTRAINT uq_trilha_items_trilha_course UNIQUE (trilha_id, course_id),
    CONSTRAINT uq_trilha_items_trilha_post   UNIQUE (trilha_id, post_id)
);

CREATE INDEX idx_trilha_items_trilha ON trilha_items (trilha_id, order_index);
CREATE INDEX idx_trilha_items_course ON trilha_items (course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_trilha_items_post   ON trilha_items (post_id)   WHERE post_id IS NOT NULL;

-- Curation by the COURSE owner (not the trilha owner) of which trilha memberships surface by
-- default on the course's own landing page. The composite FK ensures a course can only be
-- highlighted in a trilha it actually belongs to, and disappears automatically if the trilha
-- owner removes it from trilha_items.
CREATE TABLE course_trilha_highlights (
    course_id  UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    trilha_id  UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, trilha_id),
    CONSTRAINT fk_course_trilha_highlights_membership
        FOREIGN KEY (trilha_id, course_id) REFERENCES trilha_items (trilha_id, course_id) ON DELETE CASCADE
);

-- Related courses/posts, curated solely by the owner of the source course/post. One-directional:
-- linking X -> Y never implies Y shows X.
CREATE TABLE course_related_items (
    id                 UUID        PRIMARY KEY,
    course_id          UUID        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    related_course_id  UUID        REFERENCES courses (id) ON DELETE CASCADE,
    related_post_id    UUID        REFERENCES posts (id)   ON DELETE CASCADE,
    order_index        INTEGER     NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_course_related_items_exactly_one_target CHECK (
        (related_course_id IS NOT NULL AND related_post_id IS NULL)
        OR (related_course_id IS NULL AND related_post_id IS NOT NULL)
    ),
    CONSTRAINT ck_course_related_items_not_self CHECK (related_course_id IS NULL OR related_course_id <> course_id),
    CONSTRAINT uq_course_related_items_course  UNIQUE (course_id, related_course_id),
    CONSTRAINT uq_course_related_items_post    UNIQUE (course_id, related_post_id)
);

CREATE INDEX idx_course_related_items_course ON course_related_items (course_id, order_index);

CREATE TABLE post_related_items (
    id                 UUID        PRIMARY KEY,
    post_id            UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    related_course_id  UUID        REFERENCES courses (id) ON DELETE CASCADE,
    related_post_id    UUID        REFERENCES posts (id)   ON DELETE CASCADE,
    order_index        INTEGER     NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_post_related_items_exactly_one_target CHECK (
        (related_course_id IS NOT NULL AND related_post_id IS NULL)
        OR (related_course_id IS NULL AND related_post_id IS NOT NULL)
    ),
    CONSTRAINT ck_post_related_items_not_self CHECK (related_post_id IS NULL OR related_post_id <> post_id),
    CONSTRAINT uq_post_related_items_course  UNIQUE (post_id, related_course_id),
    CONSTRAINT uq_post_related_items_post    UNIQUE (post_id, related_post_id)
);

CREATE INDEX idx_post_related_items_post ON post_related_items (post_id, order_index);

-- Mirrors enrollments: "following" a trilha.
CREATE TABLE trilha_enrollments (
    user_id    UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    trilha_id  UUID        NOT NULL REFERENCES trilhas (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, trilha_id)
);

CREATE INDEX idx_trilha_enrollments_trilha ON trilha_enrollments (trilha_id);

-- Mirrors lesson_completions: a manual, independent-of-course-progress "done" flag per trilha item.
CREATE TABLE trilha_item_completions (
    user_id        UUID        NOT NULL REFERENCES users (id)         ON DELETE CASCADE,
    trilha_item_id UUID        NOT NULL REFERENCES trilha_items (id)  ON DELETE CASCADE,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, trilha_item_id)
);

CREATE INDEX idx_trilha_item_completions_item ON trilha_item_completions (trilha_item_id);
