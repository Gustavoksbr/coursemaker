# Mapa de rotas do CourseMaker

Gerado a partir do codigo (`web/src/App.jsx`, os controllers do backend e `config/SecurityConfig.java`). Nao edite a mao: regenere se as rotas mudarem.

## 1. Paginas do site (frontend)

Acesso: **visitante** = qualquer pessoa; **login** = exige conta; **admin** = exige conta de administrador.

| Rota | Pagina | Acesso |
|---|---|---|
| `/` | Entrada: home para visitante, biblioteca para quem ja esta logado | visitante |
| `/inicio` | Home (sempre acessivel; canonical = /) | visitante |
| `/pesquisar` | Procurar cursos, trilhas e posts | visitante |
| `/courses/:nickname/:slug` | Curso (pagina inicial e aulas, `?lesson=`) | visitante (conteudo privado pede senha) |
| `/courses/:nickname/:slug/edit` | Editor do curso (`?lesson=` abre numa aula) | login + nickname (dono) |
| `/courses/:nickname/:slug/certificado` | Certificado do curso | login |
| `/posts/:nickname/:slug` | Post | visitante |
| `/posts/new` | Novo post | login + nickname |
| `/posts/:id/edit` | Editor do post | login + nickname (dono) |
| `/trilhas/:nickname/:slug` | Trilha | visitante |
| `/trilhas/:nickname/:slug/edit` | Editor da trilha | login + nickname (dono) |
| `/trilhas/:nickname/:slug/certificado` | Certificado da trilha | login |
| `/users/:nickname` | Perfil publico | visitante |
| `/escolas` | Lista de escolas | visitante |
| `/escolas/:slug` | Escola | visitante |
| `/biblioteca` | Biblioteca (meus cursos, salvos, pastas) | login |
| `/biblioteca/pastas/:folderId` | Pasta da biblioteca | login |
| `/mensagens` | Mensagens | login |
| `/mensagens/:nickname` | Conversa com uma pessoa | login |
| `/profile` | Editar perfil (e excluir conta) | login + nickname |
| `/setup-nickname` | Escolher o nickname (apos cadastro) | login |
| `/code-playground` | Playground de codigo (prototipo) | login |
| `/privacidade` | Politica de privacidade | visitante |
| `/redefinir-senha` | Destino do link do email: abre o modal de nova senha e vai para a home | visitante |
| `/admin/areas` | Admin: areas | admin |
| `/admin/schools` | Admin: escolas | admin |
| `/admin/home` | Admin: curadoria da home | admin |
| `/admin/moderacao` | Admin: moderacao | admin |
| `*` | Pagina nao encontrada (404) | visitante |

Login, cadastro e recuperacao de senha **nao tem pagina**: sao modais (`AuthModal`).

### Servido pela Vercel (fora do React)

| Rota | O que e |
|---|---|
| `/api/seo` | Funcao interna: para robos (por user-agent), as rotas de curso, post, trilha, perfil e escola sao reescritas para ela, que devolve o HTML com previews (Open Graph) |
| `/sitemap.xml` | Mapa do site (funcao `api/sitemap.js`) |
| `/robots.txt` | Regras para robos |

## 2. API do backend (`/api/v1`)

Acesso: **publico** = sem login; **publico\*** = leitura sem login, mas o servico ainda esconde rascunhos e conteudo privado; **login** = token de acesso obrigatorio; **admin** = login e conta de administrador (conferido no servico).

### Admin (3)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/admin/blocked-content` | admin | Lista todo o conteudo bloqueado por um admin - cursos, posts e trilhas (apenas admin) |
| GET | `/api/v1/admin/home-picks` | admin | O que esta escolhido para a home hoje: cursos, posts, trilhas e escolas (apenas admin) |
| PUT | `/api/v1/admin/home-picks/{kind}` | admin | Define exatamente quais cursos/posts/trilhas/escolas aparecem na home, e em que ordem (apenas admin). kind: courses, posts, trilhas ou schools |

### Areas (4)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/areas` | publico* | Lista todas as areas, em ordem alfabetica |
| POST | `/api/v1/areas` | login | Cria uma area (apenas admin) |
| PATCH | `/api/v1/areas/{id}` | login | Renomeia uma area (apenas admin) |
| DELETE | `/api/v1/areas/{id}` | login | Exclui uma area sem conteudo (apenas admin) |

### Assistente de IA (2)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/ai/courses/{courseId}/chat` | login | Conversa com o assistente sobre o conteudo de um curso |
| POST | `/api/v1/ai/posts/{postId}/chat` | login | Conversa com o assistente sobre o conteudo de um post |

### Autenticacao (6)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/auth/register` | publico | Cria uma conta e devolve o JWT |
| POST | `/api/v1/auth/login` | publico | Autentica com email ou nickname e senha. Limita falhas por IP + identificador (configuravel via .env) |
| POST | `/api/v1/auth/google` | publico | Autentica com um ID token do Google Identity Services |
| GET | `/api/v1/auth/me` | login | Dados do usuario autenticado |
| POST | `/api/v1/auth/password-reset/request` | publico | Envia um email de redefinicao de senha, se o email existir |
| POST | `/api/v1/auth/password-reset/confirm` | publico | Redefine a senha a partir do token recebido por email e devolve o JWT |

### Biblioteca (16)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/library/overview` | login | Todos os cursos matriculados e trilhas seguidas, com progresso - a tabela 'Meus cursos e trilhas' |
| GET | `/api/v1/library/courses/{courseId}/status` | login | Estado do curso na biblioteca: salvo ou nao, e em qual pasta |
| DELETE | `/api/v1/library/courses/{courseId}` | login | Remove o curso dos salvos |
| PUT | `/api/v1/library/courses/{courseId}/folder` | login | Salva o curso numa pasta (folderId nulo = pasta Favoritos). E tambem como se salva pela primeira vez -- nao ha uma acao de \"favoritar\" separada |
| GET | `/api/v1/library/posts/{postId}/status` | login | Estado do post na biblioteca: salvo ou nao, e em qual pasta |
| DELETE | `/api/v1/library/posts/{postId}` | login | Remove o post dos salvos |
| PUT | `/api/v1/library/posts/{postId}/folder` | login | Salva o post numa pasta (folderId nulo = pasta Favoritos) |
| GET | `/api/v1/library/trilhas/{trilhaId}/status` | login | Estado da trilha na biblioteca: salva ou nao, e em qual pasta |
| DELETE | `/api/v1/library/trilhas/{trilhaId}` | login | Remove a trilha dos salvos |
| PUT | `/api/v1/library/trilhas/{trilhaId}/folder` | login | Salva a trilha numa pasta (folderId nulo = pasta Favoritos) |
| GET | `/api/v1/library/folders` | login | Lista as pastas da biblioteca (contagens filtradas pela area quando informada) |
| POST | `/api/v1/library/folders` | login | Cria uma pasta |
| PATCH | `/api/v1/library/folders/{folderId}` | login | Renomeia uma pasta. A pasta Favoritos nao pode ser renomeada |
| DELETE | `/api/v1/library/folders/{folderId}` | login | Exclui uma pasta. Os itens dela voltam para Favoritos. A propria Favoritos nao pode ser excluida |
| GET | `/api/v1/library/folders/{folderId}` | login | Detalhes de uma pasta |
| GET | `/api/v1/library/folders/{folderId}/items` | login | Itens de uma pasta, paginado |

### Busca unificada (1)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/search` | publico* | Busca cursos e posts simultaneamente. Sem termo, devolve destaques e recentes |

### Comentarios (10)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/courses/{courseId}/comments` | publico* | Lista os comentarios do curso, ja aninhados em threads |
| POST | `/api/v1/courses/{courseId}/comments` | login | Publica um comentario ou uma resposta no curso |
| GET | `/api/v1/posts/{postId}/comments` | publico* | Lista os comentarios do post, ja aninhados em threads |
| POST | `/api/v1/posts/{postId}/comments` | login | Publica um comentario ou uma resposta no post |
| GET | `/api/v1/trilhas/{trilhaId}/comments` | publico* | Lista os comentarios da trilha, ja aninhados em threads |
| POST | `/api/v1/trilhas/{trilhaId}/comments` | login | Publica um comentario ou uma resposta na trilha |
| DELETE | `/api/v1/comments/{id}` | login | Exclui um comentario (autor, dono do conteudo ou admin) |
| POST | `/api/v1/courses/{courseId}/bans/{userId}` | login | Impede um usuario de comentar no curso (apenas o dono) |
| DELETE | `/api/v1/courses/{courseId}/bans/{userId}` | login | Remove o banimento (apenas o dono) |
| GET | `/api/v1/courses/{courseId}/bans` | publico* | Lista os usuarios banidos do curso (apenas o dono) |

### Cursos (10)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/courses` | publico* | Lista cursos com filtros, ordenacao e paginacao. Repita category=... para filtrar por varias categorias (OR) |
| GET | `/api/v1/courses/slug-check` | login | Verifica se um slug esta disponivel e sugere uma alternativa |
| GET | `/api/v1/courses/{id}` | publico* | Detalhes do curso por id |
| GET | `/api/v1/courses/by-slug/{nickname}/{slug}` | publico* | Detalhes do curso pela URL publica /:nickname/:slug |
| POST | `/api/v1/courses` | login | Cria um curso (nasce como rascunho) |
| PATCH | `/api/v1/courses/{id}` | login | Atualiza o curso (apenas o dono) |
| DELETE | `/api/v1/courses/{id}` | login | Exclui o curso e todo o seu conteudo (apenas o dono) |
| POST | `/api/v1/courses/{id}/toggle-block` | login | Bloqueia ou desbloqueia o curso (apenas admin) |
| GET | `/api/v1/courses/{id}/certificate` | login | Baixa o certificado de conclusao do curso em PDF (apenas para quem ja concluiu todas as licoes) |
| GET | `/api/v1/courses/{id}/certificate/preview` | login | Previa do certificado em PNG, para exibir antes de baixar (mesma regra de elegibilidade do download em PDF) |

### Curtidas (4)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/courses/{id}/like` | login | Curte um curso |
| DELETE | `/api/v1/courses/{id}/like` | login | Descurte um curso |
| POST | `/api/v1/posts/{id}/like` | login | Curte um post |
| DELETE | `/api/v1/posts/{id}/like` | login | Descurte um post |

### Escolas (8)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/schools` | publico* | Lista todas as escolas, em ordem alfabetica |
| GET | `/api/v1/schools/{slug}` | publico* | Detalhes de uma escola pelo slug (pagina publica /escolas/:slug) |
| GET | `/api/v1/schools/{id}/members` | login | Escola com a lista de membros autorizados a publicar por ela (apenas admin) |
| POST | `/api/v1/schools` | login | Cria uma escola (apenas admin) |
| PATCH | `/api/v1/schools/{id}` | login | Atualiza uma escola (apenas admin) |
| DELETE | `/api/v1/schools/{id}` | login | Exclui uma escola; o conteudo associado perde a atribuicao mas continua existindo (apenas admin) |
| PUT | `/api/v1/schools/{id}/members/{userId}` | login | Concede a um usuario permissao para publicar conteudo desta escola (apenas admin) |
| DELETE | `/api/v1/schools/{id}/members/{userId}` | login | Revoga a permissao de um usuario de publicar conteudo desta escola (apenas admin) |

### Execucao de codigo (prototipo) (2)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/code-execution/run` | login | Executa um trecho de codigo via Piston e devolve stdout/stderr |
| POST | `/api/v1/code-execution/exercises/square/run` | login | Atividade 'quadrado': roda a funcao square(n) do usuario com um n aleatorio e confere |

### Exercicios de codigo (7)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/code-exercises/languages` | login | Linguagens aceitas em cada modo de correcao |
| POST | `/api/v1/courses/{courseId}/code-exercise/validate` | login | Roda a solucao de referencia contra os testes, sem salvar (apenas o dono do curso) |
| GET | `/api/v1/blocks/{id}/exercise/spec` | login | Exercicio completo, com testes escondidos e solucao, para edicao (apenas o dono) |
| POST | `/api/v1/blocks/{id}/exercise/run` | login | Executar exemplos: roda so os testes visiveis, nao conta como envio |
| POST | `/api/v1/blocks/{id}/exercise/submit` | login | Enviar solucao: roda todos os testes e registra a tentativa |
| GET | `/api/v1/blocks/{id}/exercise/progress` | login | Andamento do aluno no exercicio (resolvido, tentativas, ultimo codigo) |
| GET | `/api/v1/blocks/{id}/exercise/solution` | login | Solucao de referencia, liberada depois de resolver ou de 2 envios sem sucesso |

### Landing page (8)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/site-settings` | publico* | Textos editaveis da home |
| PATCH | `/api/v1/site-settings` | login | Atualiza os textos da home (apenas admin) |
| GET | `/api/v1/stats` | publico* | Contadores reais da home: cursos, trilhas, posts e criadores publicados |
| GET | `/api/v1/testimonials` | publico* | Depoimentos publicados, na ordem definida pelo admin |
| GET | `/api/v1/testimonials/all` | login | Todos os depoimentos, incluindo os nao publicados (apenas admin) |
| POST | `/api/v1/testimonials` | login | Cria um depoimento (apenas admin) |
| PATCH | `/api/v1/testimonials/{id}` | login | Atualiza um depoimento (apenas admin) |
| DELETE | `/api/v1/testimonials/{id}` | login | Exclui um depoimento (apenas admin) |

### Licoes e blocos (11)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/modules/{moduleId}/lessons` | publico* | Lista as licoes de um modulo |
| POST | `/api/v1/modules/{moduleId}/lessons` | login | Cria uma licao no fim do modulo (apenas o dono) |
| PATCH | `/api/v1/lessons/{id}` | login | Atualiza o titulo da licao (apenas o dono) |
| DELETE | `/api/v1/lessons/{id}` | login | Exclui a licao (apenas o dono) |
| PUT | `/api/v1/modules/{moduleId}/lessons/reorder` | login | Reordena as licoes do modulo (apenas o dono) |
| GET | `/api/v1/lessons/{lessonId}/blocks` | publico* | Lista os blocos de conteudo da licao |
| POST | `/api/v1/lessons/{lessonId}/blocks` | login | Adiciona um bloco no fim da licao (apenas o dono) |
| PATCH | `/api/v1/blocks/{id}` | login | Atualiza um bloco (apenas o dono) |
| DELETE | `/api/v1/blocks/{id}` | login | Exclui um bloco (apenas o dono) |
| PUT | `/api/v1/lessons/{lessonId}/blocks/reorder` | login | Reordena os blocos da licao (apenas o dono) |
| POST | `/api/v1/blocks/{id}/answer` | login | Registra a alternativa escolhida em um bloco de questao |

### Matriculas e acesso privado (9)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/enrollments` | login | Matricula o usuario autenticado. Cursos privados aceitam a senha no corpo |
| DELETE | `/api/v1/enrollments/{courseId}` | login | Cancela a matricula |
| GET | `/api/v1/enrollments/me` | login | Cursos em que o usuario autenticado esta matriculado |
| GET | `/api/v1/enrollments/me/in-progress` | login | Cursos matriculados e ainda nao concluidos, para a biblioteca |
| GET | `/api/v1/enrollments/me/completed` | login | Cursos matriculados e concluidos, para a biblioteca |
| GET | `/api/v1/enrollments/me/last-accessed` | login | Curso matriculado aberto mais recentemente, ou null se nenhum. Para \"continuar assistindo\" |
| POST | `/api/v1/enrollments/private-access/validate` | login | Valida a senha de um curso privado e libera o conteudo |
| GET | `/api/v1/courses/{courseId}/students` | login | Lista os matriculados no curso (apenas o dono) |
| POST | `/api/v1/courses/{courseId}/revoke-access/{userId}` | login | Revoga o acesso de um aluno ao curso privado (apenas o dono) |

### Mensagens (6)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/messages/conversations` | login | Lista as conversas do usuario autenticado, mais recente primeiro |
| GET | `/api/v1/messages/unread-count` | login | Quantidade total de mensagens nao lidas |
| GET | `/api/v1/messages/with/{nickname}` | login | Historico de mensagens com um usuario, paginado. Marca a conversa como lida |
| POST | `/api/v1/messages/with/{nickname}` | login | Envia uma mensagem para um usuario, opcionalmente respondendo outra |
| PATCH | `/api/v1/messages/{id}` | login | Edita uma mensagem propria |
| DELETE | `/api/v1/messages/{id}` | login | Exclui uma mensagem propria |

### Modulos (5)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/courses/{courseId}/modules` | publico* | Lista os modulos do curso com suas licoes |
| POST | `/api/v1/courses/{courseId}/modules` | login | Cria um modulo no fim do curriculo (apenas o dono) |
| PATCH | `/api/v1/modules/{id}` | login | Atualiza titulo/descricao do modulo (apenas o dono) |
| DELETE | `/api/v1/modules/{id}` | login | Exclui o modulo e suas licoes (apenas o dono) |
| PUT | `/api/v1/courses/{courseId}/modules/reorder` | login | Reordena os modulos do curso (apenas o dono) |

### Notificacoes (4)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/notifications` | login | Lista as notificacoes do usuario autenticado, paginado, mais recentes primeiro |
| GET | `/api/v1/notifications/unread-count` | login | Quantidade de notificacoes nao lidas |
| POST | `/api/v1/notifications/{id}/read` | login | Marca uma notificacao como lida |
| POST | `/api/v1/notifications/read-all` | login | Marca todas as notificacoes do usuario como lidas |

### Ping (1)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/ping` | publico* | Verifica se a API e o banco de dados estao no ar |

### Posts (14)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/posts` | publico* | Lista posts com filtros, ordenacao e paginacao. Repita category=... para filtrar por varias categorias (OR) |
| GET | `/api/v1/posts/slug-check` | login | Verifica se um slug de post esta disponivel |
| GET | `/api/v1/posts/{id}` | publico* | Detalhes do post por id, com os blocos de conteudo |
| GET | `/api/v1/posts/by-slug/{nickname}/{slug}` | publico* | Detalhes do post pela URL publica /:nickname/:slug |
| POST | `/api/v1/posts` | login | Cria um post (nasce como rascunho) |
| PATCH | `/api/v1/posts/{id}` | login | Atualiza o post (apenas o dono) |
| DELETE | `/api/v1/posts/{id}` | login | Exclui o post e seus blocos (apenas o dono) |
| POST | `/api/v1/posts/{id}/toggle-block` | login | Bloqueia ou desbloqueia o post (apenas admin) |
| POST | `/api/v1/posts/private-access/validate` | login | Valida a senha de um post privado e libera o conteudo |
| GET | `/api/v1/posts/{postId}/blocks` | publico* | Lista os blocos do post |
| POST | `/api/v1/posts/{postId}/blocks` | login | Adiciona um bloco no fim do post (apenas o dono) |
| PATCH | `/api/v1/post-blocks/{id}` | login | Atualiza um bloco do post (apenas o dono) |
| DELETE | `/api/v1/post-blocks/{id}` | login | Exclui um bloco do post (apenas o dono) |
| PUT | `/api/v1/posts/{postId}/blocks/reorder` | login | Reordena os blocos do post (apenas o dono) |

### Progresso (3)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/api/v1/lessons/{id}/complete` | login | Marca a licao como concluida |
| DELETE | `/api/v1/lessons/{id}/complete` | login | Desmarca a conclusao da licao |
| GET | `/api/v1/courses/{id}/progress` | login | Progresso do usuario autenticado no curso |

### Relacionados (6)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/courses/{courseId}/related` | publico* | Lista os cursos/posts relacionados a este curso, paginado |
| POST | `/api/v1/courses/{courseId}/related` | login | Relaciona um curso/post a este curso (apenas o dono do curso) |
| DELETE | `/api/v1/courses/{courseId}/related/{relatedItemId}` | login | Remove um relacionado do curso (apenas o dono do curso) |
| GET | `/api/v1/posts/{postId}/related` | publico* | Lista os cursos/posts relacionados a este post, paginado |
| POST | `/api/v1/posts/{postId}/related` | login | Relaciona um curso/post a este post (apenas o dono do post) |
| DELETE | `/api/v1/posts/{postId}/related/{relatedItemId}` | login | Remove um relacionado do post (apenas o dono do post) |

### Trilhas (31)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/trilhas` | publico* | Lista trilhas com filtros, ordenacao e paginacao |
| GET | `/api/v1/trilhas/slug-check` | login | Verifica se um slug de trilha esta disponivel e sugere uma alternativa |
| GET | `/api/v1/trilhas/{id}` | publico* | Detalhes da trilha por id |
| GET | `/api/v1/trilhas/by-slug/{nickname}/{slug}` | publico* | Detalhes da trilha pela URL publica /:nickname/:slug |
| GET | `/api/v1/trilhas/me/following` | login | Trilhas que o usuario autenticado segue, para a biblioteca |
| GET | `/api/v1/trilhas/me/completed` | login | Trilhas seguidas que o usuario autenticado ja concluiu, para a biblioteca |
| POST | `/api/v1/trilhas` | login | Cria uma trilha (nasce como rascunho) |
| PATCH | `/api/v1/trilhas/{id}` | login | Atualiza a trilha (apenas o dono) |
| DELETE | `/api/v1/trilhas/{id}` | login | Exclui a trilha (apenas o dono) |
| POST | `/api/v1/trilhas/{id}/toggle-block` | login | Bloqueia ou desbloqueia a trilha (apenas admin) |
| POST | `/api/v1/trilhas/{id}/items` | login | Adiciona um curso ou post a trilha, opcionalmente dentro de uma etapa (apenas o dono da trilha) |
| PATCH | `/api/v1/trilhas/{id}/items/{itemId}` | login | Reordena um item da trilha ou atualiza a nota do dono sobre ele (apenas o dono da trilha) |
| PUT | `/api/v1/trilhas/{id}/items/{itemId}/step` | login | Move um item para outra etapa, ou tira-o de qualquer etapa (apenas o dono da trilha) |
| DELETE | `/api/v1/trilhas/{id}/items/{itemId}` | login | Remove um item da trilha (apenas o dono da trilha) |
| PUT | `/api/v1/trilhas/{id}/items/reorder` | login | Reordena os itens de uma etapa, ou os itens sem etapa quando stepId e nulo (apenas o dono da trilha) |
| POST | `/api/v1/trilhas/{id}/steps` | login | Cria uma etapa na trilha, para agrupar itens (apenas o dono da trilha) |
| PATCH | `/api/v1/trilhas/{id}/steps/{stepId}` | login | Atualiza titulo/descricao de uma etapa (apenas o dono da trilha) |
| DELETE | `/api/v1/trilhas/{id}/steps/{stepId}` | login | Exclui uma etapa e os itens que estao nela (apenas o dono da trilha) |
| PUT | `/api/v1/trilhas/{id}/steps/reorder` | login | Reordena as etapas da trilha (apenas o dono da trilha) |
| POST | `/api/v1/trilhas/{id}/enroll` | login | Segue a trilha (matricula o usuario autenticado) |
| DELETE | `/api/v1/trilhas/{id}/enroll` | login | Deixa de seguir a trilha |
| GET | `/api/v1/trilhas/{id}/progress` | login | Progresso do usuario autenticado na trilha |
| POST | `/api/v1/trilha-items/{itemId}/complete` | login | Marca um item da trilha como concluido. Independe do progresso interno do curso |
| DELETE | `/api/v1/trilha-items/{itemId}/complete` | login | Desmarca a conclusao de um item da trilha |
| GET | `/api/v1/trilhas/{id}/certificate` | login | Baixa o certificado de conclusao da trilha em PDF (apenas para quem ja concluiu todos os itens) |
| GET | `/api/v1/trilhas/{id}/certificate/preview` | login | Previa do certificado em PNG, para exibir antes de baixar (mesma regra de elegibilidade do download em PDF) |
| GET | `/api/v1/courses/{courseId}/trilhas` | publico* | Todas as trilhas que contem este curso, paginado (botao \"ver mais\") |
| GET | `/api/v1/courses/{courseId}/trilhas/highlighted` | publico* | Trilhas em destaque na pagina do curso, curadas pelo dono do curso (cai para as mais recentes ate o dono escolher) |
| PUT | `/api/v1/courses/{courseId}/trilhas/{trilhaId}/highlight` | login | Destaca uma trilha da qual o curso participa (apenas o dono do curso) |
| DELETE | `/api/v1/courses/{courseId}/trilhas/{trilhaId}/highlight` | login | Remove uma trilha do destaque da pagina do curso (apenas o dono do curso) |
| GET | `/api/v1/posts/{postId}/trilhas` | publico* | Todas as trilhas que contem este post, paginado |

### Uploads (2)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/uploads/cloudinary-status` | login | Diz se o upload de imagens via Cloudinary esta disponivel neste servidor |
| POST | `/api/v1/uploads/cloudinary-signature` | login | Assina um upload de imagem direto para o Cloudinary (apenas imagens, sem video) |

### Usuarios (6)

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/v1/users/me/schools` | login | Escolas que o usuario logado tem permissao de publicar - alimenta o seletor de escola |
| GET | `/api/v1/users/nickname-available` | publico* | Verifica se um nickname esta disponivel |
| GET | `/api/v1/users/search` | publico* | Busca usuarios por nome ou nickname, paginado |
| GET | `/api/v1/users/{nickname}` | publico* | Perfil publico com os cursos e posts do autor |
| PATCH | `/api/v1/users/{id}` | login | Atualiza o proprio perfil. O nickname so pode ser definido uma vez. Devolve um novo token, ja que nickname/nome fazem parte das claims |
| DELETE | `/api/v1/users/me` | login | Exclui (anonimiza) a propria conta. Irreversivel - exige digitar o nickname |

### Outros

- WebSocket/STOMP em `/ws` (mensagens e notificacoes em tempo real).
- Documentacao: `/swagger-ui.html` e `/v3/api-docs`.

## 3. Gateway do executor de codigo (`piston-gateway`)

Servico separado (Go), chamado so pelo backend, com `CODE_RUNNER_TOKEN`.

| Metodo | Rota | Para que |
|---|---|---|
| POST | `/execute` | Roda um trecho de codigo (playground) |
| POST | `/run-tests` | Modo funcao: roda a funcao do aluno contra os testes |
| POST | `/run-output` | Modo saida: compara o stdout |
| POST | `/exercises/square/run` | Atividade de exemplo "quadrado" |
| GET | `/languages` | Linguagens disponiveis |
| GET | `/health` | Verificacao de saude (sem token) |
