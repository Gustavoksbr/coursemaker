-- Exercicios de codigo corrigidos automaticamente (bloco CODE_EXERCISE dentro de uma licao).
--
-- O conteudo PUBLICO do bloco (enunciado de uso, codigo inicial, exemplos visiveis) continua em
-- lesson_blocks.content, que vai inteiro para o navegador. Tudo que NAO pode chegar ao aluno - a
-- solucao de referencia e os testes escondidos - vive so nestas tabelas, que nenhum endpoint de
-- listagem de blocos le.

ALTER TABLE lesson_blocks DROP CONSTRAINT ck_lesson_blocks_type;
ALTER TABLE lesson_blocks
    ADD CONSTRAINT ck_lesson_blocks_type CHECK (type IN ('text', 'code', 'image', 'video', 'question', 'code_exercise'));

-- Areas escolhem se aceitam exercicios de codigo. Programacao ja nasce habilitada.
ALTER TABLE areas ADD COLUMN allows_code_exercises BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE areas SET allows_code_exercises = TRUE WHERE slug = 'programacao';

CREATE TABLE code_exercises (
    block_id      UUID        PRIMARY KEY REFERENCES lesson_blocks (id) ON DELETE CASCADE,
    mode          VARCHAR(10) NOT NULL,
    function_name VARCHAR(60),
    solution_code TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_code_exercises_mode CHECK (mode IN ('function', 'output'))
);

-- Um teste por linha. Modo "function": args (array JSON) -> expected (valor JSON).
-- Modo "output": input (stdin) -> expected (texto esperado no stdout).
CREATE TABLE code_exercise_tests (
    id        UUID    PRIMARY KEY,
    block_id  UUID    NOT NULL REFERENCES lesson_blocks (id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    visible   BOOLEAN NOT NULL,
    args      TEXT,
    input     TEXT,
    expected  TEXT    NOT NULL
);

CREATE INDEX idx_code_exercise_tests_block ON code_exercise_tests (block_id, position);

-- Andamento de cada aluno. "passed" e permanente: depois de resolver, um envio novo que falhe nao
-- desfaz a conclusao. failed_submissions conta os envios sem sucesso ate a primeira aprovacao e
-- libera "Ver solucao" a partir do segundo.
CREATE TABLE code_exercise_progress (
    user_id            UUID        NOT NULL REFERENCES users (id)         ON DELETE CASCADE,
    block_id           UUID        NOT NULL REFERENCES lesson_blocks (id) ON DELETE CASCADE,
    passed             BOOLEAN     NOT NULL DEFAULT FALSE,
    failed_submissions INTEGER     NOT NULL DEFAULT 0,
    last_code          TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, block_id)
);

CREATE INDEX idx_code_exercise_progress_block ON code_exercise_progress (block_id);
