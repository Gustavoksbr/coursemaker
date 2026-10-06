"""
Pecas comuns dos pacotes de exercicios da curadoria: os blocos da API (texto e exercicio de codigo) e o
formato de um "pacote" (modulos novos para um curso).

Cada exercicio segue o mesmo molde: uma historia curta (a padaria, o mercado, a escola...), o arquivo e a
funcao em que o aluno vai mexer e as regras. O codigo inicial e um trecho "de verdade", com um bug ou um
TODO que alguem acharia no dia a dia; a solucao de referencia roda no Piston quando o exercicio e salvo.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Pack:
    """Modulos de pratica para um curso."""

    # Nomes de cursos da curadoria que recebem os modulos (o primeiro que existir). Se nenhum existir,
    # um curso novo chamado `new_course` e criado.
    match: list[str]
    new_course: str
    description: str
    categories: list[str]
    # [(titulo do modulo, [(titulo da aula, [blocos])])]
    modules: list[tuple[str, list[tuple[str, list[dict]]]]]
    intro: str = ""


def text(html: str) -> dict:
    return {"type": "text", "content": html}


def lesson_text(title: str, story: str, file: str, rules: list[str], hint: str | None = None) -> dict:
    """O enunciado de um exercicio: a situacao, onde mexer e o que o codigo precisa passar a fazer."""
    items = "".join(f"<li>{rule}</li>" for rule in rules)
    html = f"<h3>{title}</h3><p>{story}</p><p>Arquivo: <code>{file}</code></p><ul>{items}</ul>"
    if hint:
        html += f"<p><strong>Dica:</strong> {hint}</p>"
    html += (
        "<p>Use <em>Executar exemplos</em> para testar com os casos visiveis e <em>Enviar solucao</em> para valer: "
        "alguns testes ficam escondidos e cobrem os casos de borda.</p>"
    )
    return text(html)


def t(args: list, expected, visible: bool = False) -> dict:
    return {"visible": visible, "args": args, "expected": expected}


def out(stdin: str, expected: str, visible: bool = False) -> dict:
    return {"visible": visible, "input": stdin, "expected": expected}


def tests(*cases: dict) -> list[dict]:
    """Os dois primeiros testes ficam visiveis (os exemplos que o aluno enxerga)."""
    marked = []
    for index, case in enumerate(cases):
        marked.append({**case, "visible": index < 2})
    return marked


def function_exercise(
    language: str,
    title: str,
    name: str,
    params: list[str],
    starter: str,
    solution: str,
    cases: list[dict],
    types: list[str] | None = None,
    returns: str | None = None,
) -> dict:
    exercise = {
        "mode": "function",
        "title": title,
        "functionName": name,
        "params": params,
        "starterCode": starter,
        "solutionCode": solution,
        "tests": cases,
    }
    if types is not None:
        exercise["paramTypes"] = types
        exercise["returnType"] = returns
    return {"type": "code_exercise", "language": language, "exercise": exercise}


def output_exercise(language: str, title: str, starter: str, solution: str, cases: list[dict]) -> dict:
    return {
        "type": "code_exercise",
        "language": language,
        "exercise": {
            "mode": "output",
            "title": title,
            "starterCode": starter,
            "solutionCode": solution,
            "tests": cases,
        },
    }
