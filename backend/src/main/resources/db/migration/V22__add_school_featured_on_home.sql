-- Admin-curated subset of schools shown on the landing page. Same "featured" idea already used
-- for courses/posts/trilhas: FALSE for everyone means "no curation yet", in which case the home
-- page falls back to showing every school instead of an empty section.
ALTER TABLE schools ADD COLUMN featured_on_home BOOLEAN NOT NULL DEFAULT FALSE;
