"""
Generates lesson blocks and module quizzes grounded in a real video's transcript, instead of
content_generator.py's free-form invention from just a title. Same Groq call shape, different
prompt: "summarize/explain THIS transcript" rather than "make something up about this topic".
"""
from __future__ import annotations

import json

from .block_utils import CODE_LANGUAGES, HTML_RULES, as_list, sanitize_block, sanitize_quiz
from .config import Config
from .groq_client import groq_chat_json

# Transcripts can run to tens of thousands of characters for a long lecture; a fixed excerpt keeps
# each prompt's input tokens predictable, which matters a lot under openai/gpt-oss-120b's tight
# 8000 TPM free-tier rate limit (see course_builder.py's retry/backoff).
MAX_TRANSCRIPT_CHARS_FOR_LESSON = 6000
MAX_TRANSCRIPT_CHARS_FOR_QUIZ = 1500


def generate_lesson_blocks_from_transcript(config: Config, video_title: str, transcript: str) -> list[dict]:
    """One Groq call per video: turn its transcript into 2-4 real text/code blocks."""
    system = (
        "Voce e um assistente que transforma a transcricao de uma aula em video em material de "
        "estudo escrito, em portugues do Brasil. Baseie-se SOMENTE no que a transcricao realmente "
        "diz - nao invente exemplos ou fatos que nao estejam nela. Responda SOMENTE com um objeto "
        "JSON valido, sem markdown, no formato exato pedido."
    )

    excerpt = transcript[:MAX_TRANSCRIPT_CHARS_FOR_LESSON]

    user = f"""Titulo da aula: "{video_title}".

Transcricao (pode estar incompleta ou cortada no final):
\"\"\"{excerpt}\"\"\"

Escreva de 2 a 4 blocos que resumam e expliquem o que foi ensinado nesta aula:
- Sempre inclua ao menos um bloco de texto explicando os conceitos principais.
- Se a transcricao menciona ou dita um trecho de codigo real, inclua um bloco de codigo com esse
  trecho reconstruido o mais fielmente possivel; senao, nao invente codigo.
Cada bloco de texto: {HTML_RULES}
Cada bloco de codigo: escolha "language" entre {json.dumps(CODE_LANGUAGES)}.

Responda com este JSON exato:
{{
  "blocks": [
    {{ "type": "text", "content": "<p>...</p>" }},
    {{ "type": "code", "content": "codigo aqui", "language": "python" }}
  ]
}}"""

    raw = groq_chat_json(config, system, user, max_tokens=2000, temperature=0.5)
    blocks = [b for b in (sanitize_block(block) for block in as_list(raw.get("blocks"))) if b]

    if not blocks:
        blocks = [{
            "type": "text",
            "content": f"<p>Assista à aula em vídeo acima: <strong>{video_title}</strong>.</p>",
            "language": None,
        }]

    return blocks


def generate_real_module_quiz(config: Config, module_title: str, lessons: list[dict]) -> dict | None:
    """
    Same quiz shape as content_generator.generate_module_content_and_quiz, but grounded in short excerpts of each
    lesson's real transcript rather than just titles - lessons is a list of {"title", "transcript"}.
    """
    system = (
        "Voce cria uma pergunta de multipla escolha para revisar o que foi ensinado em um modulo de "
        "curso, baseada nas transcricoes reais das aulas, em portugues do Brasil. Responda SOMENTE "
        "com um objeto JSON valido, sem markdown, no formato exato pedido."
    )

    lessons_text = "\n\n".join(
        f'Aula "{lesson["title"]}": """{lesson["transcript"][:MAX_TRANSCRIPT_CHARS_FOR_QUIZ]}"""'
        for lesson in lessons
    )

    user = f"""Modulo: "{module_title}". Transcricoes das aulas deste modulo:

{lessons_text}

Crie UMA pergunta de multipla escolha que revise um conceito importante realmente ensinado nestas
aulas. Gere entre 3 e 4 alternativas, exatamente uma correta. Cada alternativa deve ter uma
explicacao curta (1 frase) de por que ela esta certa ou errada.

Responda com este JSON exato:
{{
  "prompt": "enunciado da pergunta, texto puro, ate 255 caracteres",
  "alternatives": [
    {{ "text": "texto da alternativa", "correct": true, "explanation": "por que esta certa/errada" }}
  ]
}}"""

    raw = groq_chat_json(config, system, user, max_tokens=1500, temperature=0.7)
    return sanitize_quiz(raw)
