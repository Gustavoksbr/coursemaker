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
├── config/       SecurityConfig, JwtService, JwtAuthenticationFilter, OpenApiConfig,
│                 WebSocketConfig (STOMP/SockJS), AdminAccountSeeder, SelfPingScheduler
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
- **Notificações e mensagens em tempo real via STOMP/SockJS**, não polling. `WebSocketConfig` expõe
  um broker restrito a `/queue` (destino por usuário, sem broadcast em `/topic`); cada push usa
  `SimpMessagingTemplate.convertAndSendToUser(...)`. O handshake reaproveita o mesmo JWT do REST
  (`StompAuthChannelInterceptor`).
- **`SelfPingScheduler`** bate no próprio `/ping` periodicamente — mitiga o cold-start do plano
  gratuito do Render, que hiberna a instância após um tempo sem tráfego.

## Autenticação

`POST /api/v1/auth/login` e `/register` devolvem `{ token, expiresIn, user }`. O SPA guarda o token
no `localStorage` e o envia em `Authorization: Bearer {token}`.

- Algoritmo HS256, claims `sub` (userId), `email`, `role`, `iss`, `iat`, `exp`.
- Expiração configurável por `JWT_EXPIRY_HOURS` (padrão 24h).
- `POST /api/v1/auth/google` recebe o **ID token** do Google Identity Services e o valida no
  endpoint `tokeninfo` do Google, conferindo o `aud` contra o `GOOGLE_CLIENT_ID`. Sem
  `GOOGLE_CLIENT_ID` configurado, o endpoint responde 400 ("Login com Google não está configurado")
  — o frontend só mostra o botão quando `VITE_GOOGLE_CLIENT_ID` está definido.

### Recuperação de senha

`POST /auth/password-reset/request` gera um token de uso único (hash armazenado, nunca o valor
puro) com TTL configurável (`app.password-reset.token-ttl-minutes`) e envia o link por e-mail via
Resend (`ResendMailSender`). A resposta é sempre igual, exista ou não a conta com aquele e-mail —
mesmo princípio de não vazar informação que o login já segue. `POST /auth/password-reset/confirm`
troca a senha e reaproveita `AuthService.afterPasswordReset` para devolver um token JWT novo, como
se fosse um login. Tem rate limit próprio, com cooldown de reenvio.

### Proteção contra força bruta

`LoginAttempts` conta falhas consecutivas por identificador. 5 falhas bloqueiam por 15 minutos
(`app.rate-limit.*`), e a resposta 429 traz o header `Retry-After`. Vale para o login e para a
senha de curso privado (chave por `curso:usuário`). Qualquer sucesso zera o contador.

## Endpoints

Todos com o prefixo `/api/v1`. Especificação completa e sempre atualizada em `/v3/api-docs`
(Swagger UI em `/swagger-ui.html`).

| Área | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `GET /auth/me`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` |
| Usuários | `GET /users/nickname-available`, `GET /users/search`, `GET /users/{nickname}`, `GET /users/me/schools`, `PATCH /users/{id}`, `DELETE /users/me` |
| Áreas | `GET|POST /areas`, `PATCH|DELETE /areas/{id}` |
| Cursos | `GET /courses`, `GET /courses/slug-check`, `GET /courses/{id}`, `GET /courses/by-slug/{nickname}/{slug}`, `POST /courses`, `PATCH /courses/{id}`, `DELETE /courses/{id}`, `POST /courses/{id}/featured`, `POST /courses/{id}/toggle-block`, `GET /courses/{id}/certificate[/preview]` |
| Módulos | `GET|POST /courses/{courseId}/modules`, `PATCH|DELETE /modules/{id}`, `PUT /courses/{courseId}/modules/reorder` |
| Lições e blocos | `GET|POST /modules/{moduleId}/lessons`, `PATCH|DELETE /lessons/{id}`, `PUT /modules/{moduleId}/lessons/reorder`, `GET|POST /lessons/{lessonId}/blocks`, `PATCH|DELETE /blocks/{id}`, `PUT /lessons/{lessonId}/blocks/reorder`, `POST /blocks/{id}/answer` (quiz) |
| Matrículas | `POST /enrollments`, `DELETE /enrollments/{courseId}`, `GET /enrollments/me[/in-progress\|/completed\|/last-accessed]`, `GET /courses/{courseId}/students` |
| Acesso privado | `POST /enrollments/private-access/validate`, `POST /posts/private-access/validate`, `POST /courses/{courseId}/revoke-access/{userId}` |
| Trilhas | `GET /trilhas`, `GET /trilhas/slug-check`, `GET /trilhas/{id}`, `GET /trilhas/by-slug/{nickname}/{slug}`, `GET /trilhas/me/following\|completed`, `POST /trilhas`, `PATCH|DELETE /trilhas/{id}`, `POST /trilhas/{id}/featured\|toggle-block\|enroll`, `DELETE /trilhas/{id}/enroll`, `GET /trilhas/{id}/progress\|certificate[/preview]` |
| Itens e etapas da trilha | `POST /trilhas/{id}/items`, `PATCH /trilhas/{id}/items/{itemId}`, `PUT /trilhas/{id}/items/{itemId}/step`, `DELETE /trilhas/{id}/items/{itemId}`, `PUT /trilhas/{id}/items/reorder`, `POST|PATCH|DELETE /trilhas/{id}/steps[/{stepId}]`, `PUT /trilhas/{id}/steps/reorder`, `POST|DELETE /trilha-items/{itemId}/complete` |
| Curso ↔ trilha | `GET /courses/{courseId}/trilhas[/highlighted]`, `PUT|DELETE /courses/{courseId}/trilhas/{trilhaId}/highlight`, `GET /posts/{postId}/trilhas` |
| Escolas | `GET|POST /schools`, `GET /schools/{slug}`, `GET /schools/{id}/members`, `PATCH|DELETE /schools/{id}`, `POST /schools/{id}/featured`, `PUT|DELETE /schools/{id}/members/{userId}` |
| Curtidas | `POST|DELETE /courses/{id}/like`, `POST|DELETE /posts/{id}/like` |
| Progresso | `POST|DELETE /lessons/{id}/complete`, `GET /courses/{id}/progress` |
| Comentários | `GET|POST /courses/{courseId}/comments`, `GET|POST /posts/{postId}/comments`, `GET|POST /trilhas/{trilhaId}/comments`, `DELETE /comments/{id}`, `GET /courses/{courseId}/bans`, `POST|DELETE /courses/{courseId}/bans/{userId}` |
| Itens relacionados | `GET|POST /courses/{courseId}/related`, `DELETE /courses/{courseId}/related/{relatedItemId}`, `GET|POST /posts/{postId}/related`, `DELETE /posts/{postId}/related/{relatedItemId}` |
| Posts | `GET /posts`, `GET /posts/slug-check`, `GET /posts/{id}`, `GET /posts/by-slug/{nickname}/{slug}`, `POST /posts`, `PATCH|DELETE /posts/{id}`, `POST /posts/{id}/featured\|toggle-block` |
| Blocos de post | `GET|POST /posts/{postId}/blocks`, `PATCH|DELETE /post-blocks/{id}`, `PUT /posts/{postId}/blocks/reorder` |
| Biblioteca (favoritos/pastas) | `GET /library/overview`, `GET /library/courses/{id}/status`, `DELETE /library/courses/{id}`, `PUT /library/courses/{id}/folder` (idem para `posts` e `trilhas`), `GET|POST /library/folders`, `PATCH|DELETE /library/folders/{folderId}`, `GET /library/folders/{folderId}[/items]` |
| Mensagens diretas | `GET /messages/conversations`, `GET /messages/unread-count`, `GET|POST /messages/with/{nickname}`, `PATCH|DELETE /messages/{id}` |
| Notificações | `GET /notifications[/unread-count]`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |
| Chat com IA | `POST /ai/courses/{courseId}/chat`, `POST /ai/posts/{postId}/chat` |
| Uploads | `GET /uploads/cloudinary-status`, `POST /uploads/cloudinary-signature` |
| Busca | `GET /search?q=` |
| Home / site | `GET|PATCH /site-settings`, `GET /stats`, `GET /testimonials[/all]`, `POST|PATCH|DELETE /testimonials[/{id}]` |
| Admin | `GET /admin/blocked-content` |
| Saúde | `GET /ping` |

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
