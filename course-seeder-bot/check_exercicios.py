"""
Confere os exercicios da curadoria direto no piston-gateway, sem backend nem banco:

  - a solucao de referencia precisa passar em TODOS os testes;
  - o codigo inicial precisa FALHAR em pelo menos um (senao o exercicio ja nasce resolvido).

    python check_exercicios.py [--gateway http://localhost:8081] [--token SEU_TOKEN] [--so java,go]

O token vem de --token, da variavel AUTH_TOKEN ou de ../piston-gateway/.env.
So usa a biblioteca padrao.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from exercicios_curadoria import PACKS


def find_token(arg):
    if arg:
        return arg
    if os.environ.get("AUTH_TOKEN"):
        return os.environ["AUTH_TOKEN"]
    env = Path(__file__).resolve().parent.parent / "piston-gateway" / ".env"
    if env.exists():
        match = re.search(r"^AUTH_TOKEN=(\S+)", env.read_text(encoding="utf-8"), re.M)
        if match:
            return match.group(1)
    sys.exit("Informe o token do gateway (--token, AUTH_TOKEN ou piston-gateway/.env).")


def call(gateway, token, path, body):
    request = urllib.request.Request(
        gateway + path, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return {"httpError": error.code, "body": error.read().decode("utf-8", "replace")[:500]}
    except Exception as error:  # noqa: BLE001 - a script de conferencia so precisa relatar
        return {"httpError": 0, "body": str(error)}


def run(gateway, token, block, code):
    exercise = block["exercise"]
    if exercise["mode"] == "function":
        return call(gateway, token, "/run-tests", {
            "language": block["language"], "code": code, "functionName": exercise["functionName"],
            "paramTypes": exercise.get("paramTypes") or [],
            "tests": [{"args": test["args"], "expected": test["expected"]} for test in exercise["tests"]],
        })
    return call(gateway, token, "/run-output", {
        "language": block["language"], "code": code,
        "tests": [{"input": test["input"], "expected": test["expected"]} for test in exercise["tests"]],
    })


def describe_failures(result):
    if "httpError" in result:
        return f"HTTP {result['httpError']}: {result['body']}"
    if result.get("compileError"):
        return "nao compilou:\n      " + result["compileError"][:600].replace("\n", "\n      ")
    bad = [r for r in result["results"] if not r["passed"]]
    first = bad[0] if bad else {}
    return f"{result['passedCount']}/{result['total']} - 1o que falhou: {json.dumps(first, ensure_ascii=False)[:300]}"


def check(gateway, token, label, block):
    exercise = block["exercise"]
    solution = run(gateway, token, block, exercise["solutionCode"])
    solution_ok = "results" in solution and solution["passedCount"] == solution["total"] and not solution.get("compileError")
    starter = run(gateway, token, block, exercise["starterCode"])
    starter_fails = "results" in starter and (starter["passedCount"] < starter["total"] or starter.get("compileError"))
    problems = []
    if not solution_ok:
        problems.append("SOLUCAO nao passa em tudo: " + describe_failures(solution))
    if not starter_fails:
        problems.append("o CODIGO INICIAL ja passa em tudo (ou nao rodou): " + (
            describe_failures(starter) if "results" not in starter else "exercicio resolvido de nascença"))
    return label, problems


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gateway", default="http://localhost:8081")
    parser.add_argument("--token")
    parser.add_argument("--so", help="linguagens separadas por virgula (ex.: java,go)")
    parser.add_argument("--jobs", type=int, default=2)
    args = parser.parse_args()
    token = find_token(args.token)
    only = set(args.so.split(",")) if args.so else None

    jobs = []
    for pack in PACKS:
        for module_title, lessons in pack.modules:
            for lesson_title, blocks in lessons:
                for block in blocks:
                    if block["type"] != "code_exercise":
                        continue
                    if only and block["language"] not in only:
                        continue
                    label = f"{pack.new_course} / {lesson_title} [{block['language']}, {block['exercise']['mode']}]"
                    jobs.append((label, block))

    print(f"{len(jobs)} exercicio(s) para conferir...\n")
    failed = 0
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for label, problems in pool.map(lambda job: check(args.gateway, token, *job), jobs):
            if problems:
                failed += 1
                print(f"[X] {label}")
                for problem in problems:
                    print(f"    - {problem}")
            else:
                print(f"[ok] {label}")
    print(f"\n{len(jobs) - failed}/{len(jobs)} certos.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
