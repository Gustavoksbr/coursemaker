ALTER TABLE lesson_blocks DROP CONSTRAINT ck_lesson_blocks_type;
ALTER TABLE lesson_blocks
    ADD CONSTRAINT ck_lesson_blocks_type CHECK (type IN ('text', 'code', 'image', 'video', 'question'));

ALTER TABLE post_blocks DROP CONSTRAINT ck_post_blocks_type;
ALTER TABLE post_blocks
    ADD CONSTRAINT ck_post_blocks_type CHECK (type IN ('text', 'code', 'image', 'video', 'question'));
