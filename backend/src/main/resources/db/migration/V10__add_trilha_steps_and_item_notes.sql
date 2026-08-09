-- Groups a trilha's items into named steps (e.g. "1 - Explore as bases do Angular"), the way
-- Alura structures a track. A step belongs to exactly one trilha; deleting the step drops its
-- items too, same as a course module dropping its lessons.
CREATE TABLE trilha_steps (
    id          UUID         PRIMARY KEY,
    trilha_id   UUID         NOT NULL REFERENCES trilhas (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX idx_trilha_steps_trilha ON trilha_steps (trilha_id, order_index);

-- step_id is nullable: an item may sit directly under the trilha, ungrouped, either because the
-- owner never bothered with steps or because it predates this column.
ALTER TABLE trilha_items
    ADD COLUMN step_id UUID REFERENCES trilha_steps (id) ON DELETE CASCADE,
    ADD COLUMN note TEXT;

CREATE INDEX idx_trilha_items_step ON trilha_items (step_id, order_index);
