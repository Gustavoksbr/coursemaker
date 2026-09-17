-- Explicit admin curation of the home page: which courses/posts/trilhas/schools appear, and in
-- what order. The existing "featured"/"featured_on_home" flags keep their meaning (chosen for the
-- home page); home_order sequences the chosen ones. NULL means "not currently chosen".
ALTER TABLE courses ADD COLUMN home_order INT;
ALTER TABLE posts ADD COLUMN home_order INT;
ALTER TABLE trilhas ADD COLUMN home_order INT;
ALTER TABLE schools ADD COLUMN home_order INT;

-- Whatever was already flagged featured keeps appearing, now with a concrete order (oldest first)
-- instead of being lost when the admin screen switches from a boolean toggle to an ordered list.
WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn FROM courses WHERE is_featured
)
UPDATE courses SET home_order = ranked.rn FROM ranked WHERE courses.id = ranked.id;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn FROM posts WHERE is_featured
)
UPDATE posts SET home_order = ranked.rn FROM ranked WHERE posts.id = ranked.id;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn FROM trilhas WHERE is_featured
)
UPDATE trilhas SET home_order = ranked.rn FROM ranked WHERE trilhas.id = ranked.id;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn FROM schools WHERE featured_on_home
)
UPDATE schools SET home_order = ranked.rn FROM ranked WHERE schools.id = ranked.id;
