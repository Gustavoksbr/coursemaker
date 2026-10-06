"""
Acrescenta exercicios de codigo (corrigidos automaticamente pelo Piston) aos cursos da curadoria.

Cada pacote de `exercicios_curadoria/` traz modulos de pratica ("a padaria do Seu Ze", "a cantina do colegio",
"o posto de combustivel"...) com codigo inicial de verdade, com um bug ou um TODO, e a solucao de referencia.
O pacote vai para o primeiro curso da curadoria cujo nome estiver na lista `match`; se nenhum existir, um curso
novo (`new_course`) e criado e publicado.

    python seed_curadoria_exercicios.py --base-url http://localhost:8080 [--dry-run] [--so go,rust]

ATENCAO: este script NAO le o .env do bot (o `API_BASE_URL` de la costuma apontar para a producao). O endereco do
backend e sempre o do `--base-url` (padrao: o backend local). Para rodar na producao, passe `--base-url`, a conta
da curadoria (`--curator-email` / `--curator-password`) e confira antes com `--dry-run`.

Seguro para rodar de novo: um modulo que ja existe no curso (mesmo titulo) e pulado. Cada exercicio e validado pelo
proprio backend ao salvar (a solucao roda de verdade no Piston), entao uma falha de exercicio aparece aqui como erro.
Antes de gastar tempo no backend, `python check_exercicios.py` confere os exercicios direto no gateway.

So usa a biblioteca padrao.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from exercicios_curadoria import PACKS
from exercicios_curadoria.base import text


RATE_LIMIT_WAIT = 20


class ApiError(Exception):
    def __init__(self, status, body, method, path):
        super().__init__(f"{method} {path} -> {status}: {body[:600]}")
        self.status = status


class Api:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/") + "/api/v1"
        self.token = None

    def call(self, method, path, body=None):
        # O backend limita as execucoes de codigo por minuto (salvar um exercicio conta): em vez de falhar,
        # espera a janela passar e tenta de novo.
        for attempt in range(1, 9):
            try:
                return self._call_once(method, path, body)
            except ApiError as error:
                if error.status != 429 or attempt == 8:
                    raise
                print(f"       (limite de execucoes por minuto; aguardando {RATE_LIMIT_WAIT}s...)")
                time.sleep(RATE_LIMIT_WAIT)

    def _call_once(self, method, path, body=None):
        request = urllib.request.Request(
            self.base + path,
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers={
                "Content-Type": "application/json",
                **({"Authorization": "Bearer " + self.token} if self.token else {}),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            raise ApiError(error.code, error.read().decode("utf-8", "replace"), method, path) from None
        except urllib.error.URLError as error:
            sys.exit(f"Nao foi possivel conectar em {self.base}: {error.reason}. O backend esta rodando?")


def curator_courses(api, nickname):
    """Os cursos da curadoria (todas as paginas), ja que nomes iguais podem existir em estados diferentes."""
    found, page = [], 0
    while True:
        data = api.call("GET", f"/courses?author={nickname}&size=50&page={page}")
        items = data["items"] if isinstance(data, dict) else data
        found.extend(items)
        if not isinstance(data, dict) or page + 1 >= data.get("totalPages", 1) or not items:
            return found
        page += 1


def pick_course(courses, names):
    """O primeiro nome da lista que existe; entre homonimos, o que esta publicado."""
    for name in names:
        same = [c for c in courses if c["name"] == name]
        if same:
            same.sort(key=lambda c: c.get("status") != "available")
            return same[0]
    return None


def add_lesson(api, module_id, lesson_title, blocks):
    """Cria a aula e os blocos; se algum bloco falhar, remove a aula incompleta. Devolve True se deu certo."""
    lesson = api.call("POST", f"/modules/{module_id}/lessons", {"title": lesson_title})
    try:
        for block in blocks:
            api.call("POST", f"/lessons/{lesson['id']}/blocks", block)
    except ApiError as error:
        print(f"       ERRO em \"{lesson_title}\": {error}")
        try:
            api.call("DELETE", f"/lessons/{lesson['id']}")
        except ApiError:
            pass
        return False
    print(f"       aula: {lesson_title}  [{', '.join(b['type'] for b in blocks)}]")
    return True


def ensure_module(api, course_id, existing_modules, title, lessons, dry_run):
    """Cria o modulo (ou completa um que ja existe) e as aulas que faltam. Devolve (aulas criadas, falhas)."""
    module = existing_modules.get(title)
    have = {lesson["title"] for lesson in (module or {}).get("lessons", [])}
    missing = [(lesson_title, blocks) for lesson_title, blocks in lessons if lesson_title not in have]
    if module is not None and not missing:
        print(f"    modulo \"{title}\" ja esta completo; pulado")
        return 0, 0
    print(f"    modulo: {title}" + (" (completando)" if module is not None else ""))
    if dry_run:
        for lesson_title, blocks in missing:
            print(f"       aula: {lesson_title}  [{', '.join(b['type'] for b in blocks)}]")
        return 0, 0
    if module is None:
        module = api.call("POST", f"/courses/{course_id}/modules", {"title": title})
    created = failed = 0
    for lesson_title, blocks in missing:
        if add_lesson(api, module["id"], lesson_title, blocks):
            created += 1
        else:
            failed += 1
    return created, failed


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--curator-email", default=os.environ.get("CURATOR_EMAIL") or "curadoria@email.com")
    parser.add_argument("--curator-password", default=os.environ.get("CURATOR_PASSWORD") or "SenhaForte123!")
    parser.add_argument("--dry-run", action="store_true", help="so mostra o que seria feito")
    parser.add_argument("--so", help="so os pacotes com exercicios nestas linguagens (ex.: go,rust)")
    parser.add_argument("--sem-novos", action="store_true", help="nao cria cursos novos, so acrescenta nos existentes")
    args = parser.parse_args()
    only = set(args.so.split(",")) if args.so else None

    api = Api(args.base_url)
    print(f"Backend: {args.base_url}" + ("   (simulacao: nada sera gravado)" if args.dry_run else ""))
    try:
        login = api.call("POST", "/auth/login", {"identifier": args.curator_email, "password": args.curator_password})
    except ApiError as error:
        sys.exit(f"Login da curadoria falhou ({args.curator_email}): {error}")
    api.token = login["token"]
    nickname = login["user"].get("nickname")
    print(f"Curadoria: {nickname}")

    areas = api.call("GET", "/areas")
    code_areas = [a for a in areas if a.get("allowsCodeExercises")]
    if not code_areas:
        sys.exit("Nenhuma area com exercicios de codigo ligado. Ligue em Admin > Areas.")
    area = next((a for a in code_areas if a["name"].lower().startswith("program")), code_areas[0])

    courses = curator_courses(api, nickname)
    print(f"{len(courses)} curso(s) da curadoria encontrados.\n")

    totals = {"modulos": 0, "aulas": 0, "falhas": 0, "cursos_novos": 0, "pulados": 0}
    for pack in PACKS:
        languages = {b["language"] for _, lessons in pack.modules for _, blocks in lessons for b in blocks if b["type"] == "code_exercise"}
        if only and not (languages & only):
            continue

        # Os cursos novos de uma rodada anterior tambem contam como "ja existe": rodar de novo completa o que faltou.
        existing = pick_course(courses, pack.match + [pack.new_course])
        ours = existing is None or existing["name"] == pack.new_course
        if existing is None and args.sem_novos:
            print(f"- {pack.new_course}: nenhum curso existente ({', '.join(pack.match) or 'sem correspondencia'}); pulado (--sem-novos)")
            totals["pulados"] += 1
            continue

        if existing is not None:
            print(f"- \"{existing['name']}\" ({existing.get('status')}): " + ("completando o curso" if ours else "acrescentando modulos de pratica"))
            detail = api.call("GET", f"/courses/{existing['id']}")
            if not detail["summary"]["area"].get("allowsCodeExercises"):
                print(f"    PULADO: a area \"{detail['summary']['area']['name']}\" nao permite exercicios de codigo (Admin > Areas)")
                totals["pulados"] += 1
                continue
            course_id = existing["id"]
            have = {m["title"]: m for m in detail["modules"]}
        else:
            print(f"- curso novo: \"{pack.new_course}\"")
            have = {}
            if args.dry_run:
                course_id = "(novo)"
            else:
                created = api.call("POST", "/courses", {
                    "name": pack.new_course, "description": pack.description, "areaId": area["id"], "categories": pack.categories,
                })
                course_id = created["id"]
                # Um curso novo ja vem com um modulo e uma aula: comeca do zero.
                for module in api.call("GET", f"/courses/{course_id}")["modules"]:
                    api.call("DELETE", f"/modules/{module['id']}")
            totals["cursos_novos"] += 1

        modules = list(pack.modules)
        if ours and pack.intro:
            modules.insert(0, ("Antes de começar", [("Sobre este curso", [text(pack.intro)])]))

        failed_here = 0
        for module_title, lessons in modules:
            created, failed = ensure_module(api, course_id, have, module_title, lessons, args.dry_run)
            totals["modulos"] += 1 if created or failed else 0
            totals["aulas"] += created
            totals["falhas"] += failed
            failed_here += failed

        if ours and not args.dry_run:
            status = "available" if failed_here == 0 else "unavailable"
            api.call("PATCH", f"/courses/{course_id}", {"status": status})
            final = api.call("GET", f"/courses/{course_id}")
            print(f"    publicado: /courses/{nickname}/{final['summary']['slug']}" if failed_here == 0
                  else "    NAO publicado: houve falhas")
        print()

    print("Resumo:", ", ".join(f"{k}={v}" for k, v in totals.items()))
    sys.exit(1 if totals["falhas"] else 0)


if __name__ == "__main__":
    main()
