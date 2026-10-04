# piston-gateway

Proxy fino e autenticado na frente do [Piston](https://github.com/engineer-man/piston). Existe
porque o Piston não tem nenhuma autenticação própria — qualquer requisição bem formada que chegue
nele é executada. A estratégia: o Piston nunca expõe porta pra fora do Docker (só alcançável pela
rede interna do Compose); este gateway é a única coisa que fala com a internet, protegida por um
bearer token fixo.

Pensado pra rodar na mesma VM (ex. Oracle Cloud Free Tier), ao lado do Piston — o CourseMaker
(backend no Render) chama este gateway pela internet, não o Piston diretamente.

## Rodando na sua máquina pra testar

**Pré-requisito**: Docker Desktop instalado e aberto.

**1. Clone/entre na pasta e gere um token de autenticação:**

```bash
cd piston-gateway
```

No Windows (Git Bash) ou Linux/Mac:
```bash
echo "AUTH_TOKEN=$(openssl rand -hex 32)" > .env
```

Se não tiver `openssl`, qualquer string aleatória longa serve — edite `.env.example`, copie pra
`.env` e cole um valor você mesmo.

**2. Suba tudo:**

```bash
docker compose up -d --build
```

O `.env` do passo 1 precisa existir antes.

Isso sobe 3 containers:
- `piston_api` — o motor de execução (sem porta exposta).
- `piston_init` — roda uma vez, instala Node/Python/Java/GCC (C e C++) no Piston, e termina (normal
  ver ele como "Exited (0)" depois).
- `piston_gateway` — o proxy autenticado, escutando em `localhost:8081`.

A primeira vez demora um pouco mais (baixa a imagem do Piston e os pacotes das linguagens).
Acompanhe com:

```bash
docker logs -f piston_init
```

Quando aparecer `Pacotes prontos.`, está tudo pronto.

## Testando

Pegue o token que você gerou no `.env` e use nos exemplos abaixo (troque `SEU_TOKEN`).

### Rodar um programa livre (`/execute`)

```bash
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"language":"javascript","code":"console.log(\"Hello, CourseMaker!\")"}'
```

Linguagens suportadas agora: `javascript`, `python`, `java`, `c`, `cpp`.

Se a linguagem for compilada em etapa própria (`c`, `cpp`) e o código não compilar, a resposta vem
com `compileFailed: true` e a mensagem do compilador em `compileOutput`. Em Java o erro de
compilação aparece em `stderr`, porque o Piston compila e roda na mesma etapa.

### Testes de uma função (`/run-tests`) — base das atividades de código

O usuário escreve só uma função; o gateway roda **todos os testes numa única execução** do Piston
e devolve o resultado de cada um. Linguagens: `javascript`, `python` e `java` (veja a seção abaixo).

```bash
curl -X POST http://localhost:8081/run-tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "language": "javascript",
    "functionName": "square",
    "code": "function square(n) { return n * n }",
    "tests": [
      {"args": [3],  "expected": 9},
      {"args": [-4], "expected": 16}
    ]
  }'
```

Resposta (`actual` é o que a função retornou; o `expected` nunca volta):
```json
{"results":[{"index":0,"passed":true,"actual":9},{"index":1,"passed":true,"actual":16}],
 "passedCount":2,"total":2,"output":"","stderr":"","exitCode":0,"timedOut":false}
```

Como funciona e o que esperar:
- `args` e `expected` são valores JSON quaisquer (números, strings, listas, objetos, `null`). A
  comparação é por valor JSON: `1` e `1.0` são iguais, mas `0.1 + 0.2` **não** é igual a `0.3`
  (sem tolerância de float por enquanto).
- O que o usuário imprime (`console.log`/`print`) volta separado em `output`.
- Exceção em um teste: aquele teste falha com `error` (ex. `ZeroDivisionError: ...`) e os outros
  seguem. Erro de sintaxe: todos falham com "o programa terminou antes..." e o detalhe vai em
  `stderr` (os números de linha batem com o código do usuário).
- Loop infinito: o Piston mata o processo por tempo (`timedOut: true`); o teste que travou vem como
  "tempo limite excedido" e os seguintes como "não executado". Os que já tinham rodado são mantidos.
- Os valores esperados **não entram no sandbox**: o programa do usuário só recebe os argumentos (e
  um marcador aleatório por execução, para a saída dele não se confundir com a dos testes).
- Limites: até 100 testes e 50 KB de código por requisição.
- O Piston aborta o sandbox se a saída passar de 1 KB; por isso o `docker-compose.yml` define
  `PISTON_OUTPUT_MAX_SIZE=65536` (o harness imprime uma linha por teste).

#### Java no modo função

Java é tipado, então o pedido leva `paramTypes` (um tipo por parâmetro) e o gateway **gera** um `Main.java`
com cada argumento escrito como literal Java, em vez de ler JSON (o Java 15 do Piston não tem parser).
Tipos aceitos: `int`, `long`, `double`, `boolean`, `String`, arrays desses (`int[]`, `String[]`...) e listas
(`List<Integer>`, `List<Long>`, `List<Double>`, `List<Boolean>`, `List<String>`). O tipo de retorno não
precisa ser informado: o que o método devolver é serializado em JSON e comparado em Go.

```bash
curl -X POST http://localhost:8081/run-tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "language": "java",
    "functionName": "pares",
    "paramTypes": ["List<Integer>"],
    "code": "static List<Integer> pares(List<Integer> v) {\n  return v.stream().filter(x -> x % 2 == 0).collect(Collectors.toList());\n}",
    "tests": [{"args": [[1, 2, 3, 4]], "expected": [2, 4]}]
  }'
```

- O aluno escreve **só o(s) método(s) `static`, sem `class`**: o código dele vai para dentro de `public class Main {`,
  e esse prefixo fica na mesma linha da primeira linha do aluno, então `Main.java:2:` nas mensagens do `javac` e
  nas exceções é a linha 2 do editor. `java.util.*`, `java.util.function.*` e `java.util.stream.*` já estão
  importados; `import` escritos pelo aluno sobem para o topo automaticamente.
- Valor que não cabe no tipo declarado (ex. `"abc"` num `int`, `3000000000` num `int`) volta como **400** com a
  mensagem apontando o teste e o argumento. `null` só vale para `String`, arrays e listas.
- Erro de compilação vem em `compileError` (sem rodar teste nenhum). Se o `javac` apontar para a chamada gerada
  (`__cmRun(...)`), isso quase sempre é método sem `static`, nome diferente ou tipos diferentes, e uma dica é
  acrescentada à mensagem.
- Os valores esperados continuam fora do sandbox, e todos os testes rodam numa única execução (uma JVM).
- Limite do Piston: 3 s por execução, **compilação incluída**. Por isso o `/run-output` roda no máximo 2 execuções
  de Java ou C++ ao mesmo tempo (várias JVMs em paralelo estouram esse teto).

### Saída do programa (`/run-output`) — programas que leem do teclado

Aqui o aluno escreve um **programa completo** (lê `stdin`, imprime no `stdout`), como em beecrowd
ou URI. Não há harness: o gateway roda o programa **uma vez por teste**, com o `input` daquele
teste no stdin, e compara a saída com `expected`. Funciona em todas as linguagens:
`javascript`, `python`, `java`, `c`, `cpp`.

```bash
curl -X POST http://localhost:8081/run-output \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "language": "python",
    "code": "a, b = map(int, input().split())\nprint(a + b)",
    "tests": [
      {"input": "2 3\n",   "expected": "5"},
      {"input": "-5 -7\n", "expected": "-12"}
    ]
  }'
```

Resposta (`actual` é o que o programa imprimiu; o `expected` nunca volta):
```json
{"results":[{"index":0,"passed":true,"actual":"5\n","exitCode":0},
            {"index":1,"passed":true,"actual":"-12\n","exitCode":0}],
 "passedCount":2,"total":2}
```

O que esperar:
- **Comparação**: ignora fim de linha do Windows, espaços no fim de cada linha e linhas em branco
  no final. Espaços no começo da linha e linhas em branco no meio **contam**.
- Um teste só passa se o programa terminou com código `0`, dentro do tempo, e a saída bateu. Saída
  certa seguida de exceção reprova.
- Exceção ou tempo estourado: aquele teste reprova com `stderr` / `timedOut: true` e os outros
  seguem. O limite de tempo de cada execução é o do Piston (3 s).
- Erro de compilação (`c`, `cpp`, `java`): o primeiro teste roda sozinho; se nem compilou, o
  gateway para aí e devolve `compileError` com a mensagem, sem rodar os demais.
- O valor esperado **nem chega ao Piston**: cada execução recebe só o `input` do teste.
- Limites: até 20 testes, 10 KB de `input` e de `expected` por teste, 50 KB de código. Roda até 4
  testes em paralelo. Java e C++ compilam a cada execução (cerca de 1 s cada), então 20 testes em
  Java levam uns 5 s.
- Java: a classe do programa precisa ser `public class Main`.

### Exemplo antigo (`/exercises/square/run`)

Atividade fixa de exemplo, só JavaScript. Será removida quando as atividades passarem a usar
`/run-tests` com testes vindos do backend.

Você não manda um programa inteiro, só a função — o gateway gera um número aleatório, chama sua
função com ele, e confere o resultado:

```bash
curl -X POST http://localhost:8081/exercises/square/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"language":"javascript","code":"function square(n) { return n * n; }"}'
```

Resposta:
```json
{"input":42,"expected":1764,"actual":"1764","passed":true,"stderr":"","exitCode":0}
```

Tente também uma solução errada de propósito (ex. `return n + n;`) pra ver `"passed":false`.

Por enquanto só `javascript` tem harness pronto pra esse exercício — é o primeiro exemplo do
padrão, não o modelo final. Dá pra ver como estender em `handleSquareExercise` no
[`main.go`](./main.go): a ideia pra um exercício novo é sempre a mesma — gerar input, montar o
programa que chama a função do usuário com esse input, rodar no Piston, comparar o `stdout` com o
valor esperado calculado aqui no gateway (nunca confiar em nada que vem do lado do usuário).

### Sem token (deve dar 401)

```bash
curl -i -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"console.log(1)"}'
```

## Parando tudo

```bash
docker compose down        # para os containers, mantém os pacotes instalados (volume piston_data)
docker compose down -v     # para e apaga tudo, inclusive os pacotes - proxima subida reinstala
```

## Arquitetura (resumo)

```
Internet ──HTTPS + Bearer token──> piston_gateway (Go, porta 8081)
                                          │
                                   rede interna do Docker (sem porta publicada)
                                          │
                                          ▼
                                      piston_api
```

Em produção (Oracle Cloud), o `docker-compose.yml` é o mesmo — só muda quem está do outro lado do
`AUTH_TOKEN`: em vez do seu curl de teste, é o backend Spring Boot do CourseMaker (rodando no
Render) chamando `https://<ip-da-vm>:8081/execute`.
