-- "Favoritos" stops being a special folder-less state and becomes a real folder row, flagged
-- is_default: it is always the first folder a user sees and the only one that cannot be renamed
-- or deleted. After this, every library_item lives in some folder -- folder_id is NOT NULL.

ALTER TABLE library_folders ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- A user who already hand-made a folder called "Favoritos" keeps it and it simply becomes the
-- default one, rather than ending up with two folders of the same name (which the unique
-- constraint below would reject anyway). DISTINCT ON guards against 'Favoritos'/'favoritos'
-- both existing, since the existing unique constraint is case-sensitive.
UPDATE library_folders SET is_default = TRUE
WHERE id IN (
    SELECT DISTINCT ON (user_id) id
    FROM library_folders
    WHERE lower(name) = 'favoritos'
    ORDER BY user_id, created_at
);

INSERT INTO library_folders (id, user_id, name, is_default, created_at)
SELECT gen_random_uuid(), u.id, 'Favoritos', TRUE, now()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM library_folders f WHERE f.user_id = u.id AND f.is_default
);

CREATE UNIQUE INDEX uq_library_folders_one_default
    ON library_folders (user_id) WHERE is_default;

-- Everything that was a loose favorite moves into that user's Favoritos folder.
UPDATE library_items i
SET folder_id = (SELECT f.id FROM library_folders f WHERE f.user_id = i.user_id AND f.is_default)
WHERE i.folder_id IS NULL;

ALTER TABLE library_items ALTER COLUMN folder_id SET NOT NULL;

-- Was ON DELETE SET NULL, which no longer has a meaning: deleting a folder now re-files its
-- items into Favoritos (done explicitly in LibraryService, since SQL cannot express it). The
-- cascade is only the backstop for a whole user being deleted.
ALTER TABLE library_items DROP CONSTRAINT library_items_folder_id_fkey;
ALTER TABLE library_items
    ADD CONSTRAINT library_items_folder_id_fkey
    FOREIGN KEY (folder_id) REFERENCES library_folders (id) ON DELETE CASCADE;
