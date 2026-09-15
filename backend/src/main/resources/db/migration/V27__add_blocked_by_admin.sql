-- Add blocked_by_admin flag to courses, trilhas, and posts
-- When true, admin has blocked the content and it behaves as if unavailable regardless of owner's status setting

ALTER TABLE courses
ADD COLUMN blocked_by_admin boolean NOT NULL DEFAULT false;

ALTER TABLE trilhas
ADD COLUMN blocked_by_admin boolean NOT NULL DEFAULT false;

ALTER TABLE posts
ADD COLUMN blocked_by_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.blocked_by_admin IS 'Admin-level block. When true, the course is hidden from public view regardless of status.';
COMMENT ON COLUMN trilhas.blocked_by_admin IS 'Admin-level block. When true, the trilha is hidden from public view regardless of status.';
COMMENT ON COLUMN posts.blocked_by_admin IS 'Admin-level block. When true, the post is hidden from public view regardless of status.';
