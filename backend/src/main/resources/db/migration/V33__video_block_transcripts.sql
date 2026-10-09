-- Optional transcript of a VIDEO block, pasted by the author. It is never shown to students: it only feeds the
-- AI assistant, which cannot watch videos. Only the owner's editor ever receives it back from the API.
ALTER TABLE lesson_blocks ADD COLUMN transcript TEXT;
ALTER TABLE post_blocks ADD COLUMN transcript TEXT;
