CREATE TABLE modules (
    id          UUID         PRIMARY KEY,
    course_id   UUID         NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX idx_modules_course ON modules (course_id, order_index);

CREATE TABLE lessons (
    id          UUID         PRIMARY KEY,
    module_id   UUID         NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    order_index INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX idx_lessons_module ON lessons (module_id, order_index);

CREATE TABLE lesson_blocks (
    id          UUID        PRIMARY KEY,
    lesson_id   UUID        NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,
    content     TEXT,
    language    VARCHAR(50),
    order_index INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT ck_lesson_blocks_type CHECK (type IN ('text', 'code', 'image', 'video'))
);

CREATE INDEX idx_lesson_blocks_lesson ON lesson_blocks (lesson_id, order_index);
