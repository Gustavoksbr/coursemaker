CREATE TABLE posts (
    id            UUID         PRIMARY KEY,
    owner_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL,
    description   TEXT,
    thumbnail_url TEXT,
    visibility    VARCHAR(20)  NOT NULL DEFAULT 'public',
    status        VARCHAR(20)  NOT NULL DEFAULT 'unavailable',
    categories    TEXT[]       NOT NULL DEFAULT '{}',
    is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_posts_owner_slug UNIQUE (owner_id, slug),
    CONSTRAINT ck_posts_visibility CHECK (visibility IN ('public', 'private')),
    CONSTRAINT ck_posts_status     CHECK (status IN ('available', 'unavailable'))
);

CREATE INDEX idx_posts_owner      ON posts (owner_id);
CREATE INDEX idx_posts_featured   ON posts (is_featured) WHERE is_featured;
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_categories ON posts USING GIN (categories);

CREATE TABLE post_blocks (
    id          UUID        PRIMARY KEY,
    post_id     UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,
    content     TEXT,
    language    VARCHAR(50),
    order_index INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT ck_post_blocks_type CHECK (type IN ('text', 'code', 'image', 'video'))
);

CREATE INDEX idx_post_blocks_post ON post_blocks (post_id, order_index);
