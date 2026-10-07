-- New default subtitle for the landing page. Only touches the row while it still holds the original
-- text from V20, so a subtitle the admin already edited is never overwritten.
UPDATE site_settings
SET hero_subtitle = 'Aprenda ou ensine o que quiser. Matricule-se ou crie seu próprio curso.',
    updated_at = now()
WHERE hero_subtitle = 'Cursos estruturados, posts e trilhas escritos por quem entende do assunto.';
