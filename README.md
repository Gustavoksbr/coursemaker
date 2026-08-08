# CourseMaker

Plataforma de aprendizado onde desenvolvedores criam e consomem cursos estruturados e posts
técnicos, com blocos de conteúdo rico (texto, código, imagem e vídeo).

## 🚀 Tecnologias

### Backend
- Java 21
- Spring Boot 3.4
- Spring Data JPA + Flyway
- Spring Security + JWT (`io.jsonwebtoken:jjwt`)
- PostgreSQL 16

### Frontend
- React 18 + Vite
- Tailwind CSS
- React Router v6
- TanStack Query
- Tiptap (editor WYSIWYG) e Shiki (syntax highlighting)

## 📁 Estrutura

```
coursemaker/
├── backend/   # API REST (Java + Spring Boot)
└── frontend/  # SPA (React + Tailwind)
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

## 🧪 Testes

```bash
cd backend && mvn test
```

Os testes de integração sobem um PostgreSQL 16 real e efêmero (`io.zonky.test:embedded-postgres`),
sem precisar de Docker nem do banco de desenvolvimento.

## 📖 Documentação

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## 🔑 Funcionalidades

- Autenticação JWT (email/senha + Google Identity Services)
- CRUD de cursos com módulos, lições e blocos de conteúdo
- Editor WYSIWYG para blocos de texto e syntax highlighting para código
- Cursos públicos e privados (protegidos por senha)
- Matrículas, curtidas e progresso de lições
- Comentários com threads e banimento por curso
- Busca unificada de cursos e posts na home
- Perfis públicos de usuários
- Proteção contra força bruta no login e na senha de curso privado

## 📄 Licença

MIT
