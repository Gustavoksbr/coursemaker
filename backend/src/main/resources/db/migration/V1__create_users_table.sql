CREATE TABLE users (
    id              UUID         PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    nickname        VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),
    image           TEXT,
    bio             TEXT,
    stacks          TEXT[]       NOT NULL DEFAULT '{}',
    role            VARCHAR(20)  NOT NULL DEFAULT 'user',
    email_verified  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email    UNIQUE (email),
    CONSTRAINT uq_users_nickname UNIQUE (nickname)
);

-- Case-insensitive lookups for login and public profiles.
CREATE INDEX idx_users_email_lower    ON users (lower(email));
CREATE INDEX idx_users_nickname_lower ON users (lower(nickname));
