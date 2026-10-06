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
e devolve o resultado de cada um. Linguagens: veja a tabela abaixo.

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
  comparação é por valor JSON: `1` e `1.0` são iguais, e números diferem só se a diferença passar de
  1e-9 (relativa), então `0.1 + 0.2` é igual a `0.3`.
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

### Linguagens

Todas rodam no Piston (`RUNNER=piston`); o executor Docker e o local (Render) cobrem só as cinco primeiras
(JavaScript, Python, Java, C, C++) e respondem 502 "só roda com RUNNER=piston" para as outras.

| Linguagem (`language`) | Pacote do Piston | Modo função | Como o harness chama a função |
|---|---|---|---|
| `javascript` | `node` 20.11.1 | sim | lê os argumentos em JSON no stdin |
| `python` | `python` 3.12.0 | sim | idem |
| `typescript` | `typescript` 5.0.3 (tsc + node) | sim | idem; erros de tipo do `tsc` aparecem como erro de compilação |
| `php` | `php` 8.2.3 | sim | idem |
| `ruby` | `ruby` 3.0.1 | sim | idem |
| `java` | `java` 15.0.2 | sim, tipado | gera `Main.java` com literais |
| `csharp` | `mono` 6.12.0 | sim, tipado | gera o programa com literais (o código do aluno vai dentro de `class Program`) |
| `cpp` | `gcc` 10.2.0 | sim, tipado | gera o `main` (`vector`, `string`, `long long`) |
| `c` | `gcc` 10.2.0 | sim, só escalares e `String` | gera o `main` (`_Generic` serializa o retorno) |
| `go` | `go` 1.16.2 | sim, tipado | gera o `main`; `import`s do aluno sobem para o topo |
| `rust` | `rust` 1.68.2 | sim, tipado | gera o `main` (`Vec<T>`, `String`) |
| `kotlin` | `kotlin` 1.8.20 | sim, tipado | gera o `main` (`IntArray`, `List<T>`) |

Linguagens tipadas usam um vocabulário único de tipos (os nomes do Java: `int`, `long`, `double`, `boolean`,
`String`, `int[]`, `List<Integer>`...) e cada uma os traduz para os seus (`[]int` em Go, `Vec<i32>` em Rust,
`std::vector<int>` em C++). C não aceita arrays: eles precisariam de um tamanho a parte na assinatura.
O aluno escreve **só a função** (sem `main`, e em Java/C# sem classe); os números de linha dos erros batem com o
editor (prefixo na mesma linha, ou `#line`/`//line` em C, C++ e Go). O tsc compila com alvo antigo (ES5); a diretiva
`/// <reference lib="es2022" />` liberta `Map`, `includes` etc., mas iterar `Map`/`Set` com `for...of` ainda pede
`downlevelIteration`.

Compilação lenta: Kotlin leva ~4 s por compilação (mais de 10 s de CPU), C# e Rust ~1-2 s. O `docker-compose.yml`
sobe o Piston com `PISTON_COMPILE_TIMEOUT=60000` e `PISTON_COMPILE_CPU_TIME=60000` (o padrão é 10 s) e o gateway
pede esse limite em cada execução (`PISTON_COMPILE_TIMEOUT` no ambiente do gateway). No `/run-output` cada teste
compila de novo, então 20 testes em Kotlin levam ~35 s (2 em paralelo).

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

## Executores (`RUNNER`)

O gateway escolhe quem executa o código pela variável `RUNNER`:

| `RUNNER` | O que é | Onde usar |
|---|---|---|
| `piston` (padrão) | Piston em contêiner privilegiado | VM x86 com Docker (`docker-compose.yml` / `docker-compose.prod.yml`) |
| `docker` | um contêiner efêmero por execução, de imagens oficiais (node, python, temurin) | VM com Docker, inclusive **ARM** (`docker-compose.docker-runner.yml`) |
| `local` | processo sem privilégios dentro do próprio contêiner do gateway | plataformas sem Docker nem privilégios, como o **Render** (`Dockerfile.render`). **Só para testes** |

- `docker`: sem rede, sem capabilities, `no-new-privileges`, usuário `nobody`, 512 MB sem swap, 1 CPU, 128
  processos, tempo máximo por linguagem. Quem controla o socket do Docker controla a máquina; em produção use um
  daemon rootless (`DOCKER_HOST`). `DOCKER_MAX_PARALLEL` (padrão 4).
- `local`: roda como `nobody` com ambiente limpo (sem `AUTH_TOKEN`), em diretório temporário próprio, com limites de
  arquivo e processos e tempo máximo. **Não isola a rede** nem limita memória (só flags do Node e da JVM). `tini` é
  o PID 1 para recolher processos órfãos. `LOCAL_MAX_PARALLEL` (padrão 2).

### Testando no Render (executor `local`)

Serviço Web novo → Language **Docker**, Root Directory `piston-gateway`, Dockerfile Path `./Dockerfile.render`
(se o build não achar o arquivo, tente `piston-gateway/Dockerfile.render`), Health Check Path `/health`, variável
`AUTH_TOKEN`. O Render define a `PORT` sozinho. No backend principal: `CODE_RUNNER_URL=https://<servico>.onrender.com`
e `CODE_RUNNER_TOKEN=<o mesmo AUTH_TOKEN>`. No plano gratuito o serviço dorme após 15 min parado (a primeira
execução depois disso demora) e tem 512 MB de RAM.

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

Em produção, o `docker-compose.prod.yml` acrescenta um Caddy na frente (HTTPS automático) e **não** publica a
porta 8081: só as 80 e 443 do Caddy ficam abertas. O backend (no Render) chama `https://<seu-dominio>`.

## Produção (VM com Docker)

Requisitos da máquina:
- **x86_64 (AMD/Intel).** A imagem oficial do Piston e os pacotes de linguagem são x86; em ARM só existem builds
  não oficiais da comunidade.
- **cgroup v2** (o README do Piston pede "cgroup v2 enabled, and cgroup v1 disabled"). Ubuntu 22.04 ou 24.04 já
  vêm assim.
- Docker com o plugin Compose, e permissão para rodar contêiner `privileged` (o Piston usa `isolate`).
- Pelo menos 2 GB de RAM livres (a JVM e o compilador do C++ são o que mais pesa) e uns 5 GB de disco.

Passo a passo (depois de criar a VM e abrir as portas 80/443, veja a conversa/guia do painel do provedor):

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # sai e entra de novo na sessão SSH

git clone https://github.com/Gustavoksbr/coursemaker.git
cd coursemaker/piston-gateway

cat > .env <<EOF
AUTH_TOKEN=$(openssl rand -hex 32)
DOMAIN=meu-runner.duckdns.org
EOF

docker compose -f docker-compose.prod.yml up -d --build
docker logs -f piston_init      # espera aparecer "Pacotes prontos."
```

Teste de fora da VM (troque o domínio e o token):

```bash
curl https://meu-runner.duckdns.org/health
curl -X POST https://meu-runner.duckdns.org/execute -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" -d '{"language":"python","code":"print(1+1)"}'
```

No Render, defina `CODE_RUNNER_URL=https://meu-runner.duckdns.org` e `CODE_RUNNER_TOKEN=<o mesmo AUTH_TOKEN>`.
Para atualizar: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.

### Testando na máquina gratuita (Oracle Always Free, AMD Micro: 1 GB, 1/8 OCPU)

Só JavaScript e Python, e é um **teste**: não foi medido ainda se os 3 s por execução do Piston bastam em uma CPU
tão fraca. Na criação da VM use o shape `VM.Standard.E2.1.Micro` (x86, **não** a A1, que é ARM e não roda o Piston
oficial) e a imagem Ubuntu 22.04. Antes de subir, crie uma área de troca (swap) e limite os pacotes:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# no .env, alem de AUTH_TOKEN e DOMAIN:
echo 'PISTON_PACKAGES=node:20.11.1 python:3.12.0' >> .env
```

Depois é o mesmo `docker compose -f docker-compose.prod.yml up -d --build`. Para medir, rode os curls de
`/run-tests` deste README e olhe `docker stats` e `free -m` durante a execução. Sem Java, C e C++ nessa máquina:
os exercícios dessas linguagens vão falhar com "runtime não encontrado".
