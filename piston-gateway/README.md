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
- `piston_init` — roda uma vez, instala Node/Python/Java no Piston, e termina (normal ver ele como
  "Exited (0)" depois).
- `piston_gateway` — o proxy autenticado, escutando em `localhost:8081`.

A primeira vez demora um pouco mais (baixa a imagem do Piston e os pacotes das 3 linguagens).
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

Linguagens suportadas agora: `javascript`, `python`, `java`.

### Atividade estilo LeetCode (`/exercises/square/run`)

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
