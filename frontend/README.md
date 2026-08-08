# CourseMaker — Frontend

SPA em React 18 + Vite + Tailwind CSS, consumindo a API REST do backend com JWT no `localStorage`.

## Executando

```bash
cp .env.example .env && npm install && npm run dev
```

App em `http://localhost:5173`. O backend precisa estar rodando e com `FRONTEND_URL` apontando para
essa mesma origem, senão o CORS bloqueia as requisições.

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|----------|-------------|----------|
| `VITE_API_URL` | não (padrão `http://localhost:8080`) | Base da API |
| `VITE_GOOGLE_CLIENT_ID` | não | Mostra o botão "Entrar com Google". Deve ser igual ao `GOOGLE_CLIENT_ID` do backend |
| `VITE_CLOUDINARY_CLOUD_NAME` | não | Habilita upload de imagem (junto com o preset) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | não | Preset *unsigned* do Cloudinary |

Sem as variáveis do Cloudinary, os campos de imagem continuam funcionando — só aceitam URL colada.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
```

## Estrutura

```
src/
├── api/          Uma função por endpoint + query keys do React Query
├── components/
│   ├── auth/     Shell das telas de login/registro e botão do Google
│   ├── blocks/   Renderização e edição de blocos (Tiptap, Shiki, imagem, vídeo)
│   ├── comments/ Thread de comentários
│   ├── course/   Cards, currículo, configurações, modal de senha
│   ├── layout/   Navbar, shells de página, rota protegida
│   ├── post/     Card de post
│   ├── search/   Barra de busca e filtros do catálogo
│   └── ui/       Botões, campos, modal, badges, paginação, feedback
├── context/      AuthContext (sessão) e ToastContext (avisos)
├── hooks/        useDebounce, useDragReorder, useCatalogFilters
├── lib/          Cliente axios, formatação, slug, constantes, highlighter
└── pages/        Uma por rota
```

## Decisões que valem registro

- **JWT no `localStorage`**, como pede a especificação do MVP. O interceptor do axios injeta o
  header `Authorization` e derruba a sessão quando a API responde 401 — exceto nas rotas que
  respondem 401 sobre *outra* credencial (a senha de um curso privado), que passam
  `skipAuthRedirect`. Sem isso, errar a senha de um curso deslogaria a pessoa.
- **Enums em minúsculas.** O backend serializa `public`, `available`, `text`, `admin`… Os valores
  ficam centralizados em [`lib/constants.js`](src/lib/constants.js) — nada de string solta.
- **Filtros no URL.** `/cursos` e `/posts` guardam busca, autor, categorias, ordenação e página nos
  query params, então uma listagem filtrada pode ser compartilhada e sobrevive ao botão "voltar".
  Categorias vão como `category` repetido, que a API combina com OR.
- **Preview de verdade.** O editor de blocos renderiza o preview com o mesmo `BlockRenderer` da
  visualização pública, e o bloco em edição aparece a partir do rascunho não salvo — o toggle mostra
  o que ainda não foi persistido, que é o objetivo dele.
- **Drag-and-drop sem dependência.** [`useDragReorder`](src/hooks/useDragReorder.js) usa os eventos
  nativos de arrastar do HTML5; para uma lista vertical isso basta, e evita mais um pacote.
- **Sanitização em duas camadas.** O backend limpa o HTML na escrita (jsoup) e o front passa o
  DOMPurify na leitura.
- **Peso do bundle.** As páginas de editor entram por `React.lazy`, então o ProseMirror (~340 kB)
  não é baixado por quem só lê. O Shiki usa o *fine-grained bundle*: só as gramáticas oferecidas
  pelo editor, com o motor de regex em JavaScript — o que dispensa o wasm de ~600 kB.

## Rotas

| Rota | Página |
|------|--------|
| `/` | Home com busca unificada (cursos + posts) |
| `/login`, `/register`, `/setup-nickname` | Autenticação |
| `/cursos` | Catálogo de cursos com filtros e paginação |
| `/courses/:nickname/:slug` | Landing + leitura das lições (`?lesson=` seleciona a aula) |
| `/courses/:nickname/:slug/edit` | Editor de 3 colunas (dono) |
| `/posts` | Catálogo de posts |
| `/posts/:nickname/:slug` | Leitura do post |
| `/posts/new`, `/posts/:id/edit` | Editor de post (dono) |
| `/users/:nickname` | Perfil público |
| `/profile` | Edição do próprio perfil |
