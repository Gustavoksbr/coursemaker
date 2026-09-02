-- Landing page content the admin edits without a deploy. Everything else on the home page is
-- derived from real data (counts, featured content), so this holds only what cannot be computed.

-- Singleton: the CHECK on a boolean primary key makes a second row impossible.
CREATE TABLE site_settings (
    id                BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    hero_title        VARCHAR(200),
    hero_highlight    VARCHAR(80),
    hero_subtitle     VARCHAR(400),
    hero_cta_label    VARCHAR(60),
    hero_cta_href     VARCHAR(2000),
    announcement      VARCHAR(300),
    announcement_href VARCHAR(2000),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id, hero_title, hero_highlight, hero_subtitle)
VALUES (TRUE, 'Aprenda e ensine', 'o que quiser',
        'Cursos estruturados, posts e trilhas escritos por quem entende do assunto.');

CREATE TABLE testimonials (
    id           UUID PRIMARY KEY,
    author_name  VARCHAR(120) NOT NULL,
    author_role  VARCHAR(160),
    author_image VARCHAR(2000),
    quote        TEXT NOT NULL,
    order_index  INT NOT NULL DEFAULT 0,
    published    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testimonials_order ON testimonials(published, order_index);
