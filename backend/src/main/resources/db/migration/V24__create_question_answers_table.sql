-- Tracks, per user, whether a QUESTION block has been answered correctly. Used to gate lesson
-- completion (see ProgressService.markComplete) - a lesson with question blocks cannot be marked
-- complete until every one of them has a correct answer on record here.
CREATE TABLE question_answers (
    user_id     UUID        NOT NULL REFERENCES users (id)         ON DELETE CASCADE,
    block_id    UUID        NOT NULL REFERENCES lesson_blocks (id) ON DELETE CASCADE,
    correct     BOOLEAN     NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, block_id)
);

CREATE INDEX idx_question_answers_block ON question_answers (block_id);
