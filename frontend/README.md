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

O upload de imagem não precisa de nenhuma variável própria no frontend: o backend assina cada
upload (ver `CLOUDINARY_*` em `backend/.env`) e o frontend só pede a assinatura na hora de enviar.
O botão "enviar imagem" aparece sozinho quando o backend tem o Cloudinary configurado; sem ele, o
campo de imagem continua funcionando — só aceita URL colada.

## Scripts

```bash
npm run dev          # servidor de desenvolvimento
npm run build         # build de produção
npm run preview       # serve o build localmente
npm run lint          # ESLint
npm run test          # testes unitários (Vitest)
npm run test:watch    # idem, em modo watch
npm run test:e2e      # end-to-end (Playwright) — precisa do backend + frontend rodando
```

## Estrutura

```
src/
├── api/          Uma função por endpoint + query keys do React Query
├── components/
│   ├── ai/       Widget de chat com IA (arrastável), flutuante em curso/post
│   ├── auth/     Shell das telas de login/registro e botão do Google
│   ├── blocks/   Renderização e edição de blocos (Tiptap, Shiki, imagem, vídeo)
│   ├── comments/ Thread de comentários (curso, post e trilha)
│   ├── course/   Cards, currículo, configurações, modal de senha
│   ├── home/     Animação de scroll-reveal usada nas seções da home
│   ├── layout/   Navbar, shells de página, rota protegida
│   ├── library/  Cards e pastas da biblioteca pessoal (favoritos)
│   ├── post/     Card de post
│   ├── related/  Editor e seção de itens relacionados (curso/post)
│   ├── search/   Barra de busca e filtros do catálogo
│   ├── shared/   Modais e botões reaproveitados entre curso/post/trilha (criar, destacar,
│   │             certificado, senha de conteúdo privado, preview)
│   ├── trilha/   Currículo, progresso, destaques e certificado de trilha
│   ├── ui/       Botões, campos, modal, badges, paginação, feedback
│   └── user/     Card de pessoa/escola reaproveitado nas listagens
├── context/      AuthContext (sessão) e ToastContext (avisos)
├── hooks/        useDebounce, useDragReorder, useCatalogFilters, useUnsavedChangesGuard
├── lib/          Cliente axios, formatação, slug, constantes, highlighter
└── pages/        Uma por rota, com `pages/admin/` à parte para o painel administrativo
```

## Decisões que valem registro

- **JWT no `localStorage`**, como pede a especificação do MVP. O interceptor do axios injeta o
  header `Authorization` e derruba a sessão quando a API responde 401 — exceto nas rotas que
  respondem 401 sobre *outra* credencial (a senha de um curso privado), que passam
  `skipAuthRedirect`. Sem isso, errar a senha de um curso deslogaria a pessoa.
- **Enums em minúsculas.** O backend serializa `public`, `available`, `text`, `admin`… Os valores
  ficam centralizados em [`lib/constants.js`](src/lib/constants.js) — nada de string solta.
- **Filtros no URL.** `/pesquisar` guarda busca, autor, categorias, ordenação e página nos query
  params, então uma listagem filtrada pode ser compartilhada e sobrevive ao botão "voltar". As
  abas Cursos/Posts/Trilhas compartilham o mesmo estado de filtro (`useCatalogFilters`), com reset
  ao trocar de aba para uma categoria de um tipo não ser reinterpretada como categoria de outro.
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
- **Mensagens e notificações em tempo real**, não polling. `@stomp/stompjs` + `sockjs-client`
  conectam num broker restrito a destinos por usuário (`/queue`) no backend, autenticado com o
  mesmo JWT da API REST.

## Rotas

| Rota | Página |
|------|--------|
| `/` | Home com destaques e busca unificada |
| `/login`, `/register`, `/setup-nickname` | Autenticação |
| `/esqueci-senha`, `/redefinir-senha` | Recuperação de senha por e-mail |
| `/pesquisar` | Busca unificada com filtros |
| `/courses/:nickname/:slug` | Landing + leitura das lições (`?lesson=` seleciona a aula) |
| `/courses/:nickname/:slug/edit` | Editor de 3 colunas (dono) |
| `/courses/:nickname/:slug/certificado` | Certificado de conclusão do curso |
| `/posts/:nickname/:slug` | Leitura do post |
| `/posts/new`, `/posts/:id/edit` | Editor de post (dono) |
| `/trilhas/:nickname/:slug` | Currículo e progresso da trilha |
| `/trilhas/:nickname/:slug/edit` | Editor de trilha (dono) |
| `/trilhas/:nickname/:slug/certificado` | Certificado de conclusão da trilha |
| `/escolas`, `/escolas/:slug` | Lista e página pública de uma escola/canal de origem |
| `/biblioteca`, `/biblioteca/pastas/:folderId` | Cursos/posts/trilhas salvos, organizados em pastas |
| `/mensagens`, `/mensagens/:nickname` | Conversas diretas (tempo real via WebSocket) |
| `/users/:nickname` | Perfil público |
| `/profile` | Edição do próprio perfil |
| `/admin/areas`, `/admin/schools`, `/admin/home`, `/admin/moderacao` | Painel de administração (só `role=admin`) |
| `/privacidade` | Política de privacidade |

Catálogos de curso e post ficam embutidos na busca unificada (`/pesquisar` e a home), sem rota
própria separada.
