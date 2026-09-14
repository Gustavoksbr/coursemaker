"""Generates course skeletons and lesson content via Groq."""
from __future__ import annotations

import json

from .block_utils import CODE_LANGUAGES, HTML_RULES, as_list, non_empty_string, sanitize_block, sanitize_quiz
from .config import Config
from .groq_client import groq_chat_json


def generate_course_skeleton(config: Config, modules_count: int, lessons_per_module: int) -> dict:
    """
    One Groq call per course: picks a topic and lays out the curriculum (module titles + lesson
    titles). No block content yet -- that comes from generate_module_content_and_quiz, one call per module,
    so a single malformed response never costs the whole course.
    """
    system = (
        "Voce cria curriculos de cursos tecnicos (programacao, dados, infraestrutura, design de produto "
        "digital, etc) para uma plataforma de ensino em portugues do Brasil. Responda SOMENTE com um "
        "objeto JSON valido, sem markdown, sem comentarios, no formato exato pedido pelo usuario."
    )

    user = f"""Escolha um tema tecnico especifico e interessante (evite temas genericos como
"Introducao a Programacao"; prefira algo como "Construindo APIs REST com Node.js e Postgres" ou
"Testes automatizados em React com Testing Library"). Gere um curriculo com exatamente
{modules_count} modulos, cada um com exatamente {lessons_per_module} titulos de aula.

Responda com este JSON exato:
{{
  "name": "titulo do curso, ate 80 caracteres",
  "description": "1-2 frases resumindo o curso, texto puro, ate 280 caracteres",
  "landingDescription": "2-3 paragrafos apresentando o curso, texto puro (sem HTML, sem markdown), separados por uma linha em branco entre paragrafos",
  "categories": ["1 a 3 tags curtas, ex: Node.js, Backend, APIs"],
  "modules": [
    {{ "title": "titulo do modulo", "lessonTitles": ["titulo da aula 1", "..."] }}
  ]
}}"""

    raw = groq_chat_json(config, system, user, max_tokens=2000, temperature=1.0)
    return _sanitize_skeleton(raw, modules_count, lessons_per_module)


def _sanitize_skeleton(raw: dict, modules_count: int, lessons_per_module: int) -> dict:
    name = non_empty_string(raw.get("name"), "Curso gerado automaticamente")

    modules = []
    for index, module in enumerate(as_list(raw.get("modules"))[: max(modules_count, 1) + 2]):
        lesson_titles = [
            title.strip()
            for title in as_list((module or {}).get("lessonTitles"))
            if isinstance(title, str) and title.strip()
        ][: max(lessons_per_module, 1) + 2]
        if lesson_titles:
            modules.append({
                "title": non_empty_string((module or {}).get("title"), f"Modulo {index + 1}"),
                "lessonTitles": lesson_titles,
            })

    if not modules:
        raise RuntimeError("Groq nao retornou nenhum modulo valido para o curso")

    return {
        "name": name,
        "description": non_empty_string(raw.get("description"), f"Curso sobre {name}."),
        "landingDescription": non_empty_string(raw.get("landingDescription"), name),
        "categories": [
            tag.strip() for tag in as_list(raw.get("categories")) if isinstance(tag, str) and tag.strip()
        ][:3],
        "modules": modules,
    }


def generate_module_content_and_quiz(config: Config, course_name: str, module_title: str, lesson_titles: list[str],
                                      blocks_min: int, blocks_max: int) -> tuple[list[dict], dict | None]:
    """
    One Groq call per module (merged from what used to be two - lesson content, then a separate
    quiz call): given the lesson titles already decided by the skeleton, generates the text/code
    blocks for each one AND a wrap-up multiple-choice question in the same response. Under Groq's
    free-tier rate limit, halving the call count per module (and not paying for the system
    prompt/instructions twice) matters more than keeping the two concerns in separate requests.

    The titles we send are the titles we keep -- the model only fills in content, so a reordered
    or renamed reply can never desync a lesson from its blocks. The quiz has no prompt field of
    its own on the QUESTION block type, so it is rendered as its own wrap-up lesson (a text block
    with the prompt, then a question block with the alternatives) - see course_builder.py.
    """
    system = (
        "Voce escreve o conteudo didatico de aulas de um curso tecnico, em portugues do Brasil. "
        "Responda SOMENTE com um objeto JSON valido, sem markdown, no formato exato pedido."
    )

    user = f"""Curso: "{course_name}". Modulo: "{module_title}".
Escreva o conteudo de cada uma destas aulas, na mesma ordem: {json.dumps(lesson_titles, ensure_ascii=False)}.

Cada aula deve ter entre {blocks_min} e {blocks_max} blocos, alternando texto explicativo e
exemplos de codigo reais e relevantes ao tema (nao use codigo generico tipo "foo/bar" sem sentido).
Cada bloco de texto: {HTML_RULES}
Cada bloco de codigo: escolha "language" entre {json.dumps(CODE_LANGUAGES)}.

Depois, crie UMA pergunta de multipla escolha que revise um conceito importante ensinado neste
modulo (visto em qualquer uma das aulas acima). Gere entre 3 e 4 alternativas, exatamente uma
correta, cada uma com uma explicacao curta (1 frase) de por que esta certa ou errada.

Responda com este JSON exato, um item de "lessons" para cada titulo (na mesma ordem) e um objeto
"quiz":
{{
  "lessons": [
    {{
      "blocks": [
        {{ "type": "text", "content": "<p>...</p>" }},
        {{ "type": "code", "content": "codigo aqui", "language": "javascript" }}
      ]
    }}
  ],
  "quiz": {{
    "prompt": "enunciado da pergunta, texto puro, ate 255 caracteres",
    "alternatives": [
      {{ "text": "texto da alternativa", "correct": true, "explanation": "por que esta certa/errada" }}
    ]
  }}
}}"""

    raw = groq_chat_json(config, system, user, max_tokens=5000, temperature=0.8)
    lessons = _sanitize_module_content(raw, lesson_titles, blocks_min, blocks_max)
    quiz = sanitize_quiz(raw.get("quiz") or {})
    return lessons, quiz


def _sanitize_module_content(raw: dict, lesson_titles: list[str], blocks_min: int, blocks_max: int) -> list[dict]:
    lessons_content = as_list(raw.get("lessons"))

    result = []
    for index, title in enumerate(lesson_titles):
        raw_blocks = as_list((lessons_content[index] if index < len(lessons_content) else {}).get("blocks"))
        blocks = [b for b in (sanitize_block(block) for block in raw_blocks) if b][: max(blocks_max, 1)]

        if len(blocks) < blocks_min:
            blocks.append({
                "type": "text",
                "content": f"<p>Conteúdo desta aula: <strong>{title}</strong>.</p>",
                "language": None,
            })

        result.append({"title": title, "blocks": blocks})

    return result
