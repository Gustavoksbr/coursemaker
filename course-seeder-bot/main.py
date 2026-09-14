"""CLI entry point: asks whether to invent a course from scratch or build one from a real YouTube
playlist, then delegates to the matching flow."""
from __future__ import annotations

import sys

# Windows' console defaults stdout/stderr to the system codepage (cp1252), which mangles the
# accented Portuguese text this bot prints. The data sent over HTTP is unaffected either way
# (requests always encodes JSON as UTF-8) - this only fixes what you see in the terminal.
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from build_from_playlist import run_playlist_flow
from seeder.auth import register_bot_account, setup_nickname
from seeder.config import load_config
from seeder.course_builder import build_random_courses
from seeder.http_client import ApiError, HttpClient
from seeder.swagger import verify_swagger


def ask_mode() -> str:
    print("Como o bot deve criar o conteudo?")
    print("  1) Por conta propria - inventa curso(s) aleatorios do zero via Groq")
    print("  2) A partir de uma playlist do YouTube - cria o curso com os videos reais")
    while True:
        choice = input("Escolha [1/2]: ").strip()
        if choice in ("1", "2"):
            return choice
        print("Opcao invalida, digite 1 ou 2.")


def run_random_flow() -> None:
    """Registers a throwaway account and generates random courses via Groq - the original,
    still-default behavior of this bot."""
    config = load_config()
    verify_swagger(config.api_base_url)

    http = HttpClient(f"{config.api_base_url}/api/v1")

    token, user, email = register_bot_account(http, config)
    http.set_token(token)
    print(f"[auth] conta criada: {email}")

    nickname = setup_nickname(http, user, email)
    print(f"[auth] nickname definido: {nickname}")

    courses = build_random_courses(http, config)

    print(f"\nConcluido: {len(courses)} curso(s) criado(s) na conta {email}.")


def main() -> None:
    print("== Coursemaker course seeder bot ==")

    if ask_mode() == "1":
        run_random_flow()
        return

    # Modo playlist: so pergunta a URL aqui e usa os padroes de `run_playlist_flow` (5 aulas por
    # modulo, sem limite de videos, sem overrides) - quem precisar dos flags avancados
    # (--max-videos, --exclude, etc.) roda `build_from_playlist.py` diretamente.
    playlist_arg = input("URL ou ID da playlist do YouTube: ").strip()
    if not playlist_arg:
        raise SystemExit("Nenhuma playlist informada.")
    run_playlist_flow(playlist_arg)


if __name__ == "__main__":
    try:
        main()
    except ApiError as error:
        print("\nFalha na execucao do bot:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        if error.body:
            import json
            print(json.dumps(error.body, indent=2, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
    except Exception as error:  # noqa: BLE001 - top-level CLI guard, mirrors index.js's catch
        print("\nFalha na execucao do bot:", file=sys.stderr)
        print(str(error), file=sys.stderr)
        sys.exit(1)
