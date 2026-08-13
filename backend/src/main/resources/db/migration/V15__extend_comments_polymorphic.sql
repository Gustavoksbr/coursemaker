-- Comments used to be course-only; they now also attach to posts and trilhas. Exactly one of
-- course_id/post_id/trilha_id must be set per row.
ALTER TABLE comments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE comments ADD COLUMN post_id   UUID REFERENCES posts (id)   ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN trilha_id UUID REFERENCES trilhas (id) ON DELETE CASCADE;

ALTER TABLE comments ADD CONSTRAINT ck_comments_exactly_one_target CHECK (
    (course_id IS NOT NULL)::int + (post_id IS NOT NULL)::int + (trilha_id IS NOT NULL)::int = 1
);

CREATE INDEX idx_comments_post   ON comments (post_id, created_at)   WHERE post_id IS NOT NULL;
CREATE INDEX idx_comments_trilha ON comments (trilha_id, created_at) WHERE trilha_id IS NOT NULL;
