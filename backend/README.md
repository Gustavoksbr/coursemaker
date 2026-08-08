# CourseMaker — Backend

API REST em Java 21 + Spring Boot 3.4, com autenticação JWT gerenciada pelo próprio Spring
Security e PostgreSQL 16 como banco.

## Executando

```bash
cp .env.example .env
```

Ajuste `DATABASE_*` e gere um `JWT_SECRET` forte (`openssl rand -hex 64`). Depois:

```bash
mvn spring-boot:run
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

O `application.properties` importa o `.env` nativamente (`spring.config.import`), então nenhuma
dependência extra de dotenv é necessária. Todo placeholder tem um fallback, então a aplicação sobe
mesmo sem `.env` — desde que exista um PostgreSQL em `localhost:5432`.

> O `.env` é parseado como um arquivo `.properties`: valores **não** podem estar entre aspas.

## Testes

```bash
mvn test
```

Os testes de integração (`*IT`) sobem um PostgreSQL 16 real e efêmero via
`io.zonky.test:embedded-postgres` — não precisa de Docker nem do banco de desenvolvimento. O schema
é criado pelas mesmas migrations do Flyway usadas em produção, então uma migration quebrada derruba
a suíte.

## Arquitetura

```
com.coursemaker
├── config/       SecurityConfig, JwtService, JwtAuthenticationFilter, OpenApiConfig
├── controller/   Endpoints REST (somente orquestração e HTTP)
├── domain/       Entidades JPA e enums
├── dto/          Records de request/response (nunca expõem entidades)
├── exception/    GlobalExceptionHandler + exceções de domínio
├── repository/   Spring Data JPA
└── service/      Regras de negócio, autorização e mapeamento
```

Decisões que valem registro:

- **Flyway é dono do schema.** O Hibernate roda com `ddl-auto=validate`, então uma entidade fora de
  sincronia com as migrations falha no start (e no `SchemaMigrationIT`).
- **`open-in-view=false`.** Toda entidade sai do service já mapeada para DTO; nada de lazy loading
  na camada de serialização.
- **Autorização vive no service, não no `SecurityConfig`.** Os `GET` de curso/post são públicos no
  filtro porque o service é quem decide o que cada visitante enxerga (rascunho só para o dono,
  conteúdo privado só para quem destravou). O `@AuthenticationPrincipal` chega `null` para
  visitantes anônimos — daí o helper `AuthenticatedUser.userOrNull`.
- **Sanitização de HTML no servidor.** Blocos `text` passam pelo `HtmlSanitizer` (jsoup) antes de
  serem persistidos, em vez de confiar apenas no DOMPurify do frontend.

## Autenticação

`POST /api/v1/auth/login` e `/register` devolvem `{ token, expiresIn, user }`. O SPA guarda o token
no `localStorage` e o envia em `Authorization: Bearer {token}`.

- Algoritmo HS256, claims `sub` (userId), `email`, `role`, `iss`, `iat`, `exp`.
- Expiração configurável por `JWT_EXPIRY_HOURS` (padrão 24h).
- `POST /api/v1/auth/google` recebe o **ID token** do Google Identity Services e o valida no
  endpoint `tokeninfo` do Google, conferindo o `aud` contra o `GOOGLE_CLIENT_ID`. Sem
  `GOOGLE_CLIENT_ID` configurado, o endpoint responde 400 ("Login com Google nao esta configurado")
  — o frontend só mostra o botão quando `VITE_GOOGLE_CLIENT_ID` está definido.

### Proteção contra força bruta

`LoginAttempts` conta falhas consecutivas por identificador. 5 falhas bloqueiam por 15 minutos
(`app.rate-limit.*`), e a resposta 429 traz o header `Retry-After`. Vale para o login e para a
senha de curso privado (chave por `curso:usuário`). Qualquer sucesso zera o contador.

## Endpoints

| Área | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `GET /auth/me` |
| Usuários | `GET /users/nickname-available`, `GET /users/{nickname}`, `PATCH /users/{id}` |
| Cursos | `GET /courses`, `GET /courses/slug-check`, `GET /courses/{id}`, `GET /courses/by-slug/{nickname}/{slug}`, `POST /courses`, `PATCH /courses/{id}`, `DELETE /courses/{id}`, `POST /courses/{id}/featured` |
| Módulos | `GET|POST /courses/{courseId}/modules`, `PATCH|DELETE /modules/{id}`, `PUT /courses/{courseId}/modules/reorder` |
| Lições | `GET|POST /modules/{moduleId}/lessons`, `PATCH|DELETE /lessons/{id}`, `PUT /modules/{moduleId}/lessons/reorder` |
| Blocos de lição | `GET|POST /lessons/{lessonId}/blocks`, `PATCH|DELETE /blocks/{id}`, `PUT /lessons/{lessonId}/blocks/reorder` |
| Matrículas | `POST /enrollments`, `DELETE /enrollments/{courseId}`, `GET /enrollments/me`, `GET /courses/{courseId}/students` |
| Acesso privado | `POST /enrollments/private-access/validate`, `POST /courses/{courseId}/revoke-access/{userId}` |
| Curtidas | `POST|DELETE /courses/{id}/like`, `POST|DELETE /posts/{id}/like` |
| Progresso | `POST|DELETE /lessons/{id}/complete`, `GET /courses/{id}/progress` |
| Comentários | `GET|POST /courses/{courseId}/comments`, `DELETE /comments/{id}`, `GET /courses/{courseId}/bans`, `POST|DELETE /courses/{courseId}/bans/{userId}` |
| Posts | `GET /posts`, `GET /posts/slug-check`, `GET /posts/{id}`, `GET /posts/by-slug/{nickname}/{slug}`, `POST /posts`, `PATCH|DELETE /posts/{id}`, `POST /posts/{id}/featured` |
| Blocos de post | `GET|POST /posts/{postId}/blocks`, `PATCH|DELETE /post-blocks/{id}`, `PUT /posts/{postId}/blocks/reorder` |
| Busca | `GET /search?q=` |

Todos com o prefixo `/api/v1`.

## Formato de erro

Toda falha sai no mesmo envelope:

```json
{
  "timestamp": "2026-01-01T00:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Dados invalidos",
  "path": "/api/v1/courses",
  "fieldErrors": { "name": "must not be blank" }
}
```

`fieldErrors` só aparece em falhas de bean validation.

## Migrations

`src/main/resources/db/migration`, versionadas sequencialmente (`V1__`, `V2__`, ...). Migration já
aplicada nunca é editada — crie a próxima versão.
