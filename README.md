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
├── frontend/           # SPA (React + Tailwind)
└── course-seeder-bot/  # bot Python de povoamento de conteúdo
```

## ⚙️ Configuração

### 1. Banco de dados

```bash
docker run -d --name coursemaker-postgres -e POSTGRES_DB=coursemaker -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

Ou, com o PostgreSQL já instalado localmente:

```bash
createdb coursemaker
```

As tabelas são criadas pelas migrations do Flyway na primeira execução do backend.

### 2. Backend

```bash
cd backend && cp .env.example .env && mvn spring-boot:run
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Frontend

```bash
cd frontend && npm install && npm run dev
```

- App: `http://localhost:5173`

O frontend usa `VITE_API_URL` (padrão `http://localhost:8080`) para achar a API. O backend libera
CORS para a origem definida em `FRONTEND_URL`; os dois precisam combinar.

### 4. Conteúdo (opcional)

Com backend e frontend rodando, mas o banco vazio, use o [course-seeder-bot](./course-seeder-bot/README.md)
para popular a plataforma com cursos, posts e trilhas de exemplo.

## 🧪 Testes

```bash
cd backend && mvn test
```

Os testes de integração sobem um PostgreSQL 16 real e efêmero (`io.zonky.test:embedded-postgres`),
sem precisar de Docker nem do banco de desenvolvimento.

## 📖 Documentação

Cada parte do projeto tem seu próprio README, com stack, arquitetura, variáveis de ambiente e
decisões técnicas detalhadas:

- 📗 **[Backend](./backend/README.md)** — API REST em Java/Spring Boot: autenticação, endpoints,
  banco de dados, WebSocket, migrations.
- 📘 **[Frontend](./frontend/README.md)** — SPA em React/Vite: rotas, estrutura de componentes,
  variáveis de ambiente, decisões de UI.
- 🤖 **[course-seeder-bot](./course-seeder-bot/README.md)** — bot em Python usado para popular a
  plataforma com cursos, posts e trilhas reais, tanto gerados do zero (via LLM) quanto extraídos de
  playlists reais do YouTube com atribuição de origem.

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
- Busca unificada de cursos, posts e trilhas
- Painel de administração (áreas, escolas, home, moderação de conteúdo)
- Perfis públicos de usuários
- Proteção contra força bruta no login e na senha de conteúdo privado

## 📄 Licença

[Unlicense](./LICENSE) — domínio público. Use, copie, modifique e redistribua como quiser, sem
necessidade de atribuição.
