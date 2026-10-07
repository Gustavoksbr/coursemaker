# CourseMaker

Plataforma de aprendizado aberta a qualquer pessoa: você pode ser aluno, professor, ou os dois ao
mesmo tempo. Crie e publique cursos estruturados, trilhas e posts com blocos de conteúdo rico
(texto, código, imagem e vídeo), ou simplesmente entre para aprender com o que a comunidade
publicou.

🔗 **[coursemakerbr.vercel.app](https://coursemakerbr.vercel.app/)**

## 📁 Estrutura

```
coursemaker/
├── backend/            # API REST (Java + Spring Boot)
├── web/                # SPA (React + Tailwind)
├── course-seeder-bot/  # bot Python de povoamento de conteúdo
├── piston-gateway/     # gateway (Go) na frente do Piston, p/ execução de código
└── docs/screenshots/   # imagens deste README
```

## ⚙️ Rode na sua máquina

Cada etapa tem duas versões: **com Docker** (só o Docker instalado) ou **sem Docker** (com as ferramentas na máquina:
Java 21 + Maven, Node 22, PostgreSQL 16, Go 1.22 e Python 3.12). Pode misturar: por exemplo, banco em Docker e backend na máquina.

> Nos comandos com Docker, `$(pwd)` é do bash/zsh. No PowerShell use `${PWD}`; no Git Bash do Windows, prefixe o comando
> com `MSYS_NO_PATHCONV=1` e use `$(pwd -W)`.

### 1. Banco de dados

**Com Docker**

```bash
docker network create coursemaker
docker run -d --name coursemaker-postgres --network coursemaker -p 5432:5432 \
  -e POSTGRES_DB=coursemaker -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:16
```

**Sem Docker** (PostgreSQL instalado)

```bash
createdb coursemaker
```

As tabelas são criadas pelas migrations do Flyway na primeira execução do backend.

### 2. Backend

```bash
cd backend && cp .env.example .env
```

**Com Docker**

```bash
docker run --rm -it --name coursemaker-backend --network coursemaker -p 8080:8080 \
  -v "$(pwd):/app" -v coursemaker-m2:/root/.m2 -w /app \
  -e DATABASE_URL="jdbc:postgresql://coursemaker-postgres:5432/coursemaker?user=postgres&password=postgres" \
  maven:3.9-eclipse-temurin-21 mvn spring-boot:run
```

**Sem Docker**

```bash
mvn spring-boot:run
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

A primeira subida baixa as dependências (cerca de 1 minuto com Docker). Com o banco em outro lugar, defina `DATABASE_URL` no `.env`.

### 3. Web

**Com Docker**

```bash
cd web
docker run --rm -it --name coursemaker-web -p 5173:5173 \
  -v "$(pwd):/app" -v /app/node_modules -w /app node:22 sh -c "npm install && npm run dev -- --host"
```

**Sem Docker**

```bash
cd web && npm install && npm run dev
```

- App: `http://localhost:5173`

O app web usa `VITE_API_URL` (padrão `http://localhost:8080`) para achar a API. O backend libera
CORS para a origem definida em `FRONTEND_URL`; os dois precisam combinar.

### 4. Executor de código (opcional, para os exercícios de código)

Sem esta etapa tudo funciona, menos rodar e corrigir exercícios de código. Detalhes em
**[piston-gateway/README.md](./piston-gateway/README.md)**.

**Com Docker** (todas as 12 linguagens)

```bash
cd piston-gateway && cp .env.example .env     # defina AUTH_TOKEN (ex.: openssl rand -hex 32)
docker compose up -d --build                   # sobe o Piston, instala as linguagens e abre o gateway em :8081
```

A primeira subida baixa os pacotes de cada linguagem (alguns minutos).

**Sem Docker** (executor `local`: JavaScript, Python, Java, C e C++, sem isolamento de rede; só para testes)

```bash
cd piston-gateway
AUTH_TOKEN=<seu-token> RUNNER=local go run .   # precisa de Node, Python, JDK e gcc instalados
```

Nos dois casos, aponte o backend para o gateway no `.env` dele e reinicie:

```properties
CODE_RUNNER_URL=http://localhost:8081
CODE_RUNNER_TOKEN=<o mesmo AUTH_TOKEN>
```

Com o backend em Docker, use `CODE_RUNNER_URL=http://host.docker.internal:8081` (passe com `-e`, como o `DATABASE_URL`).
Para os exercícios aparecerem, ligue "Exercícios de código" na área (Admin → Áreas).

### 5. Conteúdo (opcional)

Com backend e web rodando, popule a plataforma. O curso de demonstração com exercícios de código (precisa da etapa 4) usa só a
biblioteca padrão do Python:

**Com Docker** (na raiz do repositório)

```bash
docker run --rm --network coursemaker -v "$(pwd)/course-seeder-bot:/app" -w /app python:3.12-slim \
  python seed_piston_demo.py --base-url http://coursemaker-backend:8080
```

**Sem Docker**

```bash
cd course-seeder-bot && python seed_piston_demo.py
```

Para cursos, posts e trilhas de exemplo (e os 72 exercícios em 12 linguagens, com código inicial de verdade e um bug típico para o
aluno consertar), veja o [course-seeder-bot](./course-seeder-bot/README.md#exercícios-de-código-nos-cursos-da-curadoria).

## 🖼️ Conheça a plataforma


### Descobrir e aprender

![Página inicial: busca, números da plataforma, áreas, escolas e cursos](./docs/screenshots/01-inicio.png)

| Explorar cursos, posts, trilhas e pessoas | Página de um curso |
|---|---|
| ![Explorar](./docs/screenshots/02-explorar.png) | ![Curso](./docs/screenshots/03-curso.png) |

![Uma aula de leitura, com texto, código com realce de sintaxe e o menu das aulas](./docs/screenshots/04-aula.png)

| Trilha: uma sequência de cursos em etapas | Post |
|---|---|
| ![Trilha](./docs/screenshots/05-trilha.png) | ![Post](./docs/screenshots/06-post.png) |

### Sua conta

| Biblioteca: o que continuar, status e pastas | Perfil público |
|---|---|
| ![Biblioteca](./docs/screenshots/07-biblioteca.png) | ![Perfil](./docs/screenshots/08-perfil.png) |

| Mensagens diretas (em uma janela, sem sair da página) | Notificações |
|---|---|
| ![Mensagens](./docs/screenshots/09-mensagens.png) | ![Notificações](./docs/screenshots/10-notificacoes.png) |

### Para quem ensina e administra

| Editor do curso: módulos, aulas e blocos | Administração: áreas (liga os exercícios de código) |
|---|---|
| ![Editor do curso](./docs/screenshots/12-editor-do-curso.png) | ![Áreas](./docs/screenshots/11-admin-areas.png) |

### No celular

<img src="./docs/screenshots/13-celular-inicio.png" alt="Início no celular" width="260"> &nbsp; <img src="./docs/screenshots/13-celular-aula.png" alt="Aula no celular" width="260">

## 💻 Exercícios de código (Piston)

Aulas podem ter **exercícios de código corrigidos automaticamente**, no estilo LeetCode/beecrowd: o aluno escreve a
solução num editor com realce de sintaxe, testa com os exemplos e envia; o resultado de cada teste volta na hora.

| O aluno vê o exercício e executa os exemplos | Acertou: a aula é concluída |
|---|---|
| ![Exercício de código na aula](./docs/screenshots/codigo-01-aluno-exercicio.png) | ![Exercício concluído](./docs/screenshots/codigo-03-aluno-acertou.png) |

![Exemplos executados: um teste falhou, com o esperado e o recebido](./docs/screenshots/codigo-02-aluno-exemplos-falhando.png)

**Duas formas de correção**
- **Função com testes** (`function`): o aluno escreve só a função e cada teste a chama com argumentos e confere o retorno.
- **Saída do programa** (`output`): o aluno escreve o programa inteiro; cada teste dá uma entrada (stdin) e confere o que foi impresso.

**Como funciona**
- Os testes **escondidos** e a solução de referência ficam só no servidor: o aluno recebe apenas os exemplos e a
  contagem dos escondidos. A solução só é liberada depois de 2 envios sem sucesso.
- Ao salvar, o backend **roda a solução de referência contra todos os testes** (*validate on save*): um exercício que
  ninguém consegue passar é recusado com o detalhe do teste que falhou.
- Quando o exercício tem de ser resolvido, a aula só é concluída depois que ele é.
- Erros de compilação, exceções, tempo esgotado e saída excessiva aparecem para o aluno; o tempo é limitado por execução.
- Comparação de decimais com tolerância de 1e-9; números inteiros e textos comparados exatamente.

![Erro de compilação em Rust, com a dica sobre a chamada de teste](./docs/screenshots/codigo-04-aluno-erro-de-compilacao.png)

**12 linguagens**

| Modo função | Linguagens |
|---|---|
| Argumentos em JSON (dinâmicas) | JavaScript, TypeScript, Python, PHP, Ruby |
| Gateway gera o código com os tipos (tipadas) | Java, C#, C++, Go, Rust, Kotlin; C (só números e texto) |
| Modo saída | todas as 12 |

As linguagens tipadas usam um vocabulário único de tipos (`int`, `long`, `double`, `boolean`, `String`, arrays e listas), e
cada uma mostra os seus (`[]int` em Go, `Vec<i32>` em Rust, `std::vector<int>` em C++). O aluno escreve **só a função**:
o gateway acrescenta o `main`, e os números de linha dos erros batem com os do editor.

![Aba Atividades do curso, com o progresso e o exercício aberto](./docs/screenshots/codigo-05-aluno-atividades.png)

### Para quem cria o curso

O bloco **Exercício de código** tem um editor próprio: modo de correção, linguagem, nome da função, parâmetros (com tipo, nas
linguagens tipadas), código inicial, solução de referência e a tabela de testes, cada um **visível** (exemplo) ou **escondido**
(caso de borda). O botão **Testar solução** roda a solução de referência sem salvar.

![Editor do exercício, para o dono do curso](./docs/screenshots/codigo-06-dono-editor-do-exercicio.png)

![Testar solução: o teste 4 falha, com a opção de usar o valor obtido como esperado](./docs/screenshots/codigo-07-dono-testar-solucao.png)

![Exercício tipado em Go: um tipo por parâmetro e para o retorno](./docs/screenshots/codigo-08-dono-exercicio-tipado-go.png)

### Arquitetura

```
navegador ──► backend (Spring Boot) ──► piston-gateway (Go) ──► executor
               guarda testes e solução      token Bearer             Piston (todas as linguagens)
               valida ao salvar             gera o código de teste   ou contêiner Docker / processo local
               libera só o que o aluno vê   compara os resultados    (JavaScript, Python, Java, C e C++)
```

- O **Piston não tem autenticação** e nunca fica exposto: só o gateway fala com a internet, protegido por um token compartilhado
  com o backend (`CODE_RUNNER_URL` e `CODE_RUNNER_TOKEN` no `.env` do backend; `AUTH_TOKEN` no do gateway).
- O gateway tem **três executores** (`RUNNER`): `piston` (padrão, todas as linguagens), `docker` (contêiner efêmero por execução)
  e `local` (processos no próprio contêiner, para hospedagens sem Docker, como o plano gratuito da Render, só com 5 linguagens).
  O endpoint `GET /languages` diz ao backend o que o executor em uso roda, e o seletor do criador mostra só isso.
- Detalhes, endpoints, limites e como subir em produção: **[piston-gateway/README.md](./piston-gateway/README.md)**.

## 🧪 Testes

```bash
cd backend && mvn test
```

Os testes de integração sobem um PostgreSQL 16 real e efêmero (`io.zonky.test:embedded-postgres`),
sem precisar de Docker nem do banco de desenvolvimento.



## 🔑 Funcionalidades

- Autenticação JWT (email/senha + Google Identity Services) e recuperação de senha por e-mail
- Cursos, posts e trilhas com módulos/etapas, lições e blocos de conteúdo (texto, código, imagem,
  vídeo, quiz)
- Editor WYSIWYG para blocos de texto e syntax highlighting para código
- Conteúdo público ou privado (protegido por senha)
- Matrículas, curtidas, progresso de lições e certificado de conclusão
- Biblioteca pessoal com pastas para salvar cursos, posts e trilhas
- Mensagens diretas e notificações em tempo real (WebSocket)
- Chat com IA sobre o conteúdo de um curso ou post
- Comentários com threads e banimento por curso
- Escolas/canais de origem, com atribuição de conteúdo curado
- Exercícios de código corrigidos automaticamente, em 12 linguagens (função com testes ou saída do programa)
- Busca unificada de cursos, posts e trilhas
- Painel de administração (áreas, escolas, home, moderação de conteúdo)
- Perfis públicos de usuários
- Proteção contra força bruta no login e na senha de conteúdo privado

## 📄 Licença

[Unlicense](./LICENSE) — domínio público. Use, copie, modifique e redistribua como quiser, sem
necessidade de atribuição.
