CREATE TABLE areas (
    id         UUID PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    slug       VARCHAR(60) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO areas (id, name, slug) VALUES (gen_random_uuid(), 'Programação', 'programacao');

ALTER TABLE courses ADD COLUMN area_id UUID REFERENCES areas(id);
ALTER TABLE posts   ADD COLUMN area_id UUID REFERENCES areas(id);
ALTER TABLE trilhas ADD COLUMN area_id UUID REFERENCES areas(id);

UPDATE courses SET area_id = (SELECT id FROM areas WHERE slug = 'programacao');
UPDATE posts   SET area_id = (SELECT id FROM areas WHERE slug = 'programacao');
UPDATE trilhas SET area_id = (SELECT id FROM areas WHERE slug = 'programacao');

ALTER TABLE courses ALTER COLUMN area_id SET NOT NULL;
ALTER TABLE posts   ALTER COLUMN area_id SET NOT NULL;
ALTER TABLE trilhas ALTER COLUMN area_id SET NOT NULL;

CREATE INDEX idx_courses_area ON courses(area_id);
CREATE INDEX idx_posts_area   ON posts(area_id);
CREATE INDEX idx_trilhas_area ON trilhas(area_id);
