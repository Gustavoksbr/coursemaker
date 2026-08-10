-- A user's personal library: courses/posts/trilhas they saved, optionally sorted into folders
-- they name themselves (a la a chess.com game library). One row per (user, content); folder_id
-- null means "favorito solto". Deleting a folder unfiles its items rather than losing them.
CREATE TABLE library_folders (
    id         UUID         PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_library_folders_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_library_folders_user ON library_folders (user_id);

CREATE TABLE library_items (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id)           ON DELETE CASCADE,
    course_id  UUID        REFERENCES courses (id)                  ON DELETE CASCADE,
    post_id    UUID        REFERENCES posts (id)                    ON DELETE CASCADE,
    trilha_id  UUID        REFERENCES trilhas (id)                  ON DELETE CASCADE,
    folder_id  UUID        REFERENCES library_folders (id)          ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_library_items_exactly_one_target CHECK (num_nonnulls(course_id, post_id, trilha_id) = 1),
    CONSTRAINT uq_library_items_course UNIQUE (user_id, course_id),
    CONSTRAINT uq_library_items_post   UNIQUE (user_id, post_id),
    CONSTRAINT uq_library_items_trilha UNIQUE (user_id, trilha_id)
);

CREATE INDEX idx_library_items_user_folder ON library_items (user_id, folder_id, created_at DESC);
CREATE INDEX idx_library_items_folder      ON library_items (folder_id);

-- Backs "continue assistindo": when this enrolled course was last opened, so the library can
-- surface the single most recent one instead of just the most recently enrolled.
ALTER TABLE enrollments ADD COLUMN last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now();
