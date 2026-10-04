"""
Cria, no backend local, um curso de demonstracao cheio de exercicios de codigo (Piston) e duas
contas de teste: uma professora (dona do curso) e um aluno.

    python seed_piston_demo.py [--base-url http://localhost:8080]

Pre-requisitos: backend rodando (terminal "Backend Dev (DB local)") e o piston-gateway de pe
(`docker compose up -d` em piston-gateway/), com CODE_RUNNER_URL / CODE_RUNNER_TOKEN no .env do
backend. Cada exercicio e validado pelo proprio backend ao salvar (a solucao de referencia roda de
verdade no Piston), entao este script tambem serve de teste de ponta a ponta.

So usa a biblioteca padrao. Contas de demonstracao (apenas para o banco local):
    professora: prof.piston@example.com   aluno: aluno.piston@example.com   senha: Piston@demo2026
"""
import argparse
import json
import sys
import urllib.error
import urllib.request

PASSWORD = "Piston@demo2026"
OWNER = {"email": "prof.piston@example.com", "name": "Profa. Piston", "nickname": "prof-piston"}
STUDENT = {"email": "aluno.piston@example.com", "name": "Aluno Piston", "nickname": "aluno-piston"}

COURSE_NAME = "Logica de Programacao com Exercicios de Codigo"


class Api:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/") + "/api/v1"

    def call(self, method, path, body=None, token=None, allow=()):
        request = urllib.request.Request(
            self.base + path,
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers={
                "Content-Type": "application/json",
                **({"Authorization": "Bearer " + token} if token else {}),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            payload = error.read().decode("utf-8", "replace")
            if error.code in allow:
                return None
            raise SystemExit(f"{method} {path} -> {error.code}\n{payload[:1500]}")


def sign_in(api, account):
    """Logs in, registering the account (and claiming its nickname) the first time."""
    login = api.call("POST", "/auth/login", {"identifier": account["email"], "password": PASSWORD}, allow=(401, 400))
    if login:
        return login["token"], login["user"]["id"]
    auth = api.call("POST", "/auth/register", {"email": account["email"], "password": PASSWORD, "name": account["name"]})
    # The nickname is a JWT claim: claiming it reissues the token.
    reissued = api.call("PATCH", f"/users/{auth['user']['id']}", {"nickname": account["nickname"]}, auth["token"])
    return reissued["token"], auth["user"]["id"]


# --------------------------------------------------------------------------- helpers


def text(html):
    return {"type": "text", "content": html}


def video(url):
    return {"type": "video", "content": url}


def question(prompt_alternatives):
    alternatives = [
        {"id": f"alt{i}", "text": t, "correct": correct, "explanation": why}
        for i, (t, correct, why) in enumerate(prompt_alternatives)
    ]
    return {"type": "question", "content": json.dumps({"alternatives": alternatives})}


def function_test(visible, args, expected):
    return {"visible": visible, "args": args, "expected": expected}


def output_test(visible, stdin, expected):
    return {"visible": visible, "input": stdin, "expected": expected}


def function_exercise(language, title, function_name, params, starter, solution, tests):
    return {
        "type": "code_exercise",
        "language": language,
        "exercise": {
            "mode": "function",
            "title": title,
            "functionName": function_name,
            "params": params,
            "starterCode": starter,
            "solutionCode": solution,
            "tests": tests,
        },
    }


def java_function_exercise(title, function_name, params, param_types, return_type, starter, solution, tests):
    """Function mode in Java: typed, and the student writes only the static method(s), no class."""
    block = function_exercise("java", title, function_name, params, starter, solution, tests)
    block["exercise"]["paramTypes"] = param_types
    block["exercise"]["returnType"] = return_type
    return block


def output_exercise(language, title, starter, solution, tests):
    return {
        "type": "code_exercise",
        "language": language,
        "exercise": {
            "mode": "output",
            "title": title,
            "starterCode": starter,
            "solutionCode": solution,
            "tests": tests,
        },
    }


# -------------------------------------------------------------------------- curriculum

CURRICULUM = [
    ("Primeiros passos", [
        ("Sobre este curso", [
            text("<p>Bem-vindo! Este curso e um laboratorio: cada aula tem um <strong>exercicio de codigo</strong> "
                 "corrigido automaticamente.</p>"
                 "<p>Voce escreve a solucao no editor, usa <em>Executar exemplos</em> para testar e "
                 "<em>Enviar solucao</em> para valer. Alguns testes ficam escondidos: eles cobrem os casos de borda.</p>"),
        ]),
        ("Assistindo uma aula", [
            text("<p>Uma aula em video (so para ver o icone de video na barra lateral).</p>"),
            video("https://www.youtube.com/watch?v=rfscVS0vtbw"),
        ]),
        ("Exercicio: soma de dois numeros", [
            text("<p>Agora que voce ja sabe criar funcoes com parametros e retorno, e hora de praticar.</p>"
                 "<p>Escreva a funcao <code>soma(a, b)</code> que recebe dois numeros e <strong>retorna</strong> a soma "
                 "deles. Nao use <code>print</code> para responder: o valor precisa sair no <code>return</code>.</p>"
                 "<p>Lembre de pensar nos numeros negativos.</p>"),
            function_exercise(
                "python", "Soma de dois numeros", "soma", ["a", "b"],
                "def soma(a, b):\n    # seu codigo aqui\n    pass\n",
                "def soma(a, b):\n    return a + b\n",
                [function_test(True, [2, 3], 5), function_test(True, [-1, 1], 0),
                 function_test(False, [0, 0], 0), function_test(False, [-5, -7], -12),
                 function_test(False, [1000000, 1], 1000001)]),
        ]),
        ("Exercicio: maior elemento", [
            text("<p>Escreva <code>maior(lista)</code>, que recebe uma lista de numeros (nunca vazia) e retorna o "
                 "maior elemento. Nao vale usar <code>max</code>.</p>"),
            function_exercise(
                "python", "Maior elemento da lista", "maior", ["lista"],
                "def maior(lista):\n    # seu codigo aqui\n    pass\n",
                "def maior(lista):\n    resultado = lista[0]\n    for numero in lista:\n        if numero > resultado:\n"
                "            resultado = numero\n    return resultado\n",
                [function_test(True, [[3, 9, 2]], 9), function_test(True, [[-4, -1, -7]], -1),
                 function_test(False, [[5]], 5), function_test(False, [[1, 1, 1]], 1),
                 function_test(False, [[0, -1]], 0)]),
        ]),
    ]),
    ("Textos", [
        ("Exercicio: inverter texto (JavaScript)", [
            text("<p>Desta vez em <strong>JavaScript</strong>. Escreva <code>inverter(texto)</code> que devolve o "
                 "texto de tras para frente.</p>"),
            function_exercise(
                "javascript", "Inverter um texto", "inverter", ["texto"],
                "function inverter(texto) {\n  // seu codigo aqui\n}\n",
                "function inverter(texto) {\n  return texto.split('').reverse().join('');\n}\n",
                [function_test(True, ["abc"], "cba"), function_test(True, [""], ""),
                 function_test(False, ["a b"], "b a"), function_test(False, ["Ola"], "alO")]),
        ]),
        ("Exercicio: palindromo", [
            text("<p>Uma palavra e um <em>palindromo</em> se se le igual nos dois sentidos. Escreva "
                 "<code>eh_palindromo(texto)</code>, que retorna <code>True</code> ou <code>False</code>, ignorando "
                 "espacos e diferenca entre maiusculas e minusculas.</p>"),
            function_exercise(
                "python", "Palindromo", "eh_palindromo", ["texto"],
                "def eh_palindromo(texto):\n    # seu codigo aqui\n    pass\n",
                "def eh_palindromo(texto):\n    limpo = texto.lower().replace(' ', '')\n    return limpo == limpo[::-1]\n",
                [function_test(True, ["arara"], True), function_test(True, ["casa"], False),
                 function_test(False, ["Socorram me subi no onibus em Marrocos"], True),
                 function_test(False, [""], True), function_test(False, ["ab"], False)]),
        ]),
        ("Revisao do modulo", [
            text("<p>Duas perguntas rapidas antes de seguir. A aula so conclui depois das duas.</p>"),
            question([
                ("Uma funcao que so imprime o resultado devolve o valor.", False,
                 "print mostra na tela; quem devolve o valor para quem chamou e o return."),
                ("O return encerra a funcao e devolve um valor a quem a chamou.", True, "Exatamente isso."),
            ]),
            question([
                ("Testes escondidos servem para cobrir casos de borda.", True, "Sao os casos que voce nao pensou."),
                ("Testes escondidos so existem para dificultar.", False, "O objetivo e verificar casos de borda."),
            ]),
        ]),
    ]),
    ("Funcoes em Java (com tipos)", [
        ("Exercicio: soma em Java", [
            text("<p>Em Java a funcao tem <strong>tipos</strong>. Escreva so o metodo <code>static int soma(int a, int b)</code> "
                 "(sem <code>class</code>): o sistema coloca ele dentro de uma classe e chama com cada teste.</p>"),
            java_function_exercise(
                "Soma de dois inteiros", "soma", ["a", "b"], ["int", "int"], "int",
                "static int soma(int a, int b) {\n    // seu codigo aqui\n    return 0;\n}\n",
                "static int soma(int a, int b) {\n    return a + b;\n}\n",
                [function_test(True, [2, 3], 5), function_test(True, [-1, 1], 0),
                 function_test(False, [-5, -7], -12), function_test(False, [2147483647, 0], 2147483647)]),
        ]),
        ("Exercicio: numeros pares (Java)", [
            text("<p>Receba uma <code>List&lt;Integer&gt;</code> e devolva so os numeros pares, na mesma ordem. "
                 "Listas, arrays, <code>String</code>, <code>double</code> e <code>boolean</code> tambem funcionam como tipos.</p>"),
            java_function_exercise(
                "Numeros pares", "pares", ["numeros"], ["List<Integer>"], "List<Integer>",
                "static List<Integer> pares(List<Integer> numeros) {\n    // seu codigo aqui\n    return null;\n}\n",
                "static List<Integer> pares(List<Integer> numeros) {\n    List<Integer> resultado = new ArrayList<>();\n"
                "    for (int n : numeros) {\n        if (n % 2 == 0) resultado.add(n);\n    }\n    return resultado;\n}\n",
                [function_test(True, [[1, 2, 3, 4]], [2, 4]), function_test(True, [[]], []),
                 function_test(False, [[-2, -1, 0]], [-2, 0]), function_test(False, [[7, 9]], [])]),
        ]),
        ("Exercicio: maior de um array (Java)", [
            text("<p>Receba um <code>int[]</code> (nunca vazio) e devolva o maior valor.</p>"),
            java_function_exercise(
                "Maior valor do array", "maior", ["v"], ["int[]"], "int",
                "static int maior(int[] v) {\n    // seu codigo aqui\n    return 0;\n}\n",
                "static int maior(int[] v) {\n    int m = v[0];\n    for (int x : v) {\n        if (x > m) m = x;\n    }\n    return m;\n}\n",
                [function_test(True, [[3, 9, 2]], 9), function_test(True, [[-4, -1, -7]], -1),
                 function_test(False, [[5]], 5)]),
        ]),
        ("Exercicio: saudacao (Java)", [
            text("<p>Devolva <code>Ola, NOME!</code>. Cuidado com nomes com acento.</p>"),
            java_function_exercise(
                "Saudacao", "saudacao", ["nome"], ["String"], "String",
                "static String saudacao(String nome) {\n    // seu codigo aqui\n    return \"\";\n}\n",
                "static String saudacao(String nome) {\n    return \"Ola, \" + nome + \"!\";\n}\n",
                [function_test(True, ["Ana"], "Ola, Ana!"), function_test(True, ["Bruno"], "Ola, Bruno!"),
                 function_test(False, ["Jos\u00e9"], "Ola, Jos\u00e9!"), function_test(False, [""], "Ola, !")]),
        ]),
    ]),
    ("Programas completos (entrada e saida)", [
        ("Ola, nome (Python)", [
            text("<p>Neste modo voce escreve o <strong>programa inteiro</strong>: leia o nome do teclado e imprima "
                 "<code>Ola, NOME!</code>.</p>"),
            output_exercise(
                "python", "Ola, nome",
                "# leia o nome com input() e imprima a saudacao com print()\n",
                "nome = input()\nprint(f'Ola, {nome}!')\n",
                [output_test(True, "Ana\n", "Ola, Ana!"), output_test(True, "Bruno\n", "Ola, Bruno!"),
                 output_test(False, "Maria Clara\n", "Ola, Maria Clara!")]),
        ]),
        ("Soma de dois numeros (Java)", [
            text("<p>Leia dois inteiros na mesma linha e imprima a soma. Em Java a classe precisa se chamar "
                 "<code>Main</code>.</p>"),
            output_exercise(
                "java", "Soma em Java",
                "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n        // seu codigo aqui\n    }\n}\n",
                "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n"
                "        System.out.println(a + b);\n    }\n}\n",
                [output_test(True, "2 3\n", "5"), output_test(True, "10 20\n", "30"),
                 output_test(False, "-5 -7\n", "-12"), output_test(False, "0 0\n", "0")]),
        ]),
        ("Tabuada (C++)", [
            text("<p>Leia um inteiro <code>n</code> e imprima a tabuada de 1 a 10, uma linha por multiplicacao, no "
                 "formato <code>n x i = resultado</code>.</p>"),
            output_exercise(
                "cpp", "Tabuada em C++",
                "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n"
                "    // seu codigo aqui\n    return 0;\n}\n",
                "#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n"
                "    for (int i = 1; i <= 10; i++) {\n        cout << n << \" x \" << i << \" = \" << n * i << endl;\n    }\n"
                "    return 0;\n}\n",
                [output_test(True, "2\n", "\n".join(f"2 x {i} = {2 * i}" for i in range(1, 11))),
                 output_test(False, "7\n", "\n".join(f"7 x {i} = {7 * i}" for i in range(1, 11))),
                 output_test(False, "0\n", "\n".join(f"0 x {i} = 0" for i in range(1, 11)))]),
        ]),
        ("Par ou impar (C)", [
            text("<p>Leia um inteiro e imprima <code>par</code> ou <code>impar</code>. Cuidado com os negativos.</p>"),
            output_exercise(
                "c", "Par ou impar em C",
                "#include <stdio.h>\n\nint main() {\n    int n;\n    scanf(\"%d\", &n);\n    // seu codigo aqui\n    return 0;\n}\n",
                "#include <stdio.h>\n\nint main() {\n    int n;\n    scanf(\"%d\", &n);\n"
                "    printf(\"%s\\n\", n % 2 == 0 ? \"par\" : \"impar\");\n    return 0;\n}\n",
                [output_test(True, "4\n", "par"), output_test(True, "7\n", "impar"),
                 output_test(False, "-3\n", "impar"), output_test(False, "0\n", "par")]),
        ]),
    ]),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    args = parser.parse_args()
    api = Api(args.base_url)

    areas = api.call("GET", "/areas")
    area = next((a for a in areas if a.get("allowsCodeExercises")), None)
    if not area:
        sys.exit("Nenhuma area com exercicios de codigo ligado. Ligue em Admin > Areas.")

    token, _ = sign_in(api, OWNER)
    _, _ = sign_in(api, STUDENT)  # only makes sure the student account exists

    # Running it again replaces the previous demo course instead of piling up copies.
    existing = api.call("GET", f"/courses?author={OWNER['nickname']}&size=50", None, token)
    for previous in existing["items"]:
        if previous["name"] == COURSE_NAME:
            api.call("DELETE", f"/courses/{previous['id']}", None, token)
            print(f"curso anterior removido: {previous['slug']}")

    course = api.call("POST", "/courses", {
        "name": COURSE_NAME,
        "description": "Curso de demonstracao dos exercicios de codigo corrigidos automaticamente (Piston).",
        "areaId": area["id"],
        "categories": ["python", "exercicios"],
    }, token)
    course_id = course["id"]

    # A new course comes with one module/lesson already in place: start from a clean slate.
    detail = api.call("GET", f"/courses/{course_id}", None, token)
    for module in detail["modules"]:
        api.call("DELETE", f"/modules/{module['id']}", None, token)

    for module_title, lessons in CURRICULUM:
        module = api.call("POST", f"/courses/{course_id}/modules", {"title": module_title}, token)
        print(f"modulo: {module_title}")
        for lesson_title, blocks in lessons:
            lesson = api.call("POST", f"/modules/{module['id']}/lessons", {"title": lesson_title}, token)
            for block in blocks:
                api.call("POST", f"/lessons/{lesson['id']}/blocks", block, token)
            kinds = ", ".join(b["type"] for b in blocks)
            print(f"   aula: {lesson_title}  [{kinds}]")

    api.call("PATCH", f"/courses/{course_id}", {"status": "available"}, token)
    final = api.call("GET", f"/courses/{course_id}", None, token)
    nickname = OWNER["nickname"]
    print()
    print(f"Curso publicado: http://localhost:5173/courses/{nickname}/{final['summary']['slug']}")
    print(f"Login do aluno: {STUDENT['email']}  (senha no cabecalho deste arquivo)")


if __name__ == "__main__":
    main()
