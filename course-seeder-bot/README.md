# course-seeder-bot

Bot de linha de comando (Python) que popula o Coursemaker com cursos de teste. Ao rodar
`main.py`, ele primeiro pergunta como criar o conteúdo:

1. **Por conta própria** - inventa curso(s) aleatórios do zero via Groq. Nesse modo ele:
   1. Busca o `/v3/api-docs` (swagger) do backend e confere que as operações de que depende
      (registro, criar curso, módulo, aula, bloco...) ainda existem antes de continuar.
   2. Cria uma conta nova (nunca reaproveita uma existente) seguindo o padrão
      `{BOT_EMAIL_PREFIX}{N}{BOT_EMAIL_DOMAIN}`, incrementando `N` a cada execução.
   3. Define o nickname da conta (obrigatório antes de criar conteúdo).
   4. Gera de `COURSES_MIN` a `COURSES_MAX` cursos aleatórios via Groq, cada um com vários
      módulos e aulas, usando apenas blocos de **texto** e **código**.
2. **A partir de uma playlist do YouTube** - pede a URL/ID e monta o curso com os vídeos reais.
   Mesmo fluxo do `build_from_playlist.py` (veja a seção dedicada mais abaixo), só que com os
   valores padrão - para os flags avançados (`--max-videos`, `--exclude`, etc.), rode
   `build_from_playlist.py` diretamente em vez de `main.py`.

## Como o número da conta é controlado

O arquivo `bot-account-counter.txt` (criado na raiz deste pacote, **não versionado**) guarda o
próximo número a tentar. Se aquele email já existir (por exemplo, alguém rodou o bot em outra
máquina), ele soma 1 e tenta de novo até encontrar um livre -- e só então grava o número
seguinte no arquivo.

## Setup

```bash
cp .env.example .env
# preencha GROQ_API_KEY no .env

python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

O backend do Coursemaker precisa estar rodando (por padrão em `http://localhost:8080`) - use o
terminal "🛠️ Backend Dev (DB local)" para rodar contra o banco local `coursemakerbr` em vez de
produção.

## Rodando

```bash
.venv\Scripts\python.exe main.py
```

Ele vai perguntar se quer um curso inventado do zero ou montado a partir de uma playlist real do
YouTube - veja o item correspondente acima para o que cada modo faz.

## Configuração (`.env`)

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `GROQ_API_KEY` | Chave da API da Groq | *(obrigatória)* |
| `GROQ_MODEL` | Modelo usado para gerar o conteúdo | `openai/gpt-oss-120b` |
| `YOUTUBE_API_KEY` | Chave da YouTube Data API v3 (obrigatória para `build_from_playlist.py`) | *(opcional)* |
| `API_BASE_URL` | URL base do backend | `http://localhost:8080` |
| `BOT_EMAIL_PREFIX` / `BOT_EMAIL_DOMAIN` | Formam o email de cada conta nova (`main.py`) | `testebot` / `@email.com` |
| `BOT_PASSWORD` | Senha usada em todas as contas criadas (`main.py`) | `SenhaForte123!` |
| `BOT_NAME` | Nome exibido no perfil da conta (`main.py`) | `Bot Coursemaker` |
| `COURSES_MIN` / `COURSES_MAX` | Cursos por execução (`main.py`) | `2` / `3` |
| `MODULES_MIN` / `MODULES_MAX` | Módulos por curso (`main.py`) | `2` / `4` |
| `LESSONS_MIN` / `LESSONS_MAX` | Aulas por módulo (`main.py`) | `2` / `4` |
| `BLOCKS_MIN` / `BLOCKS_MAX` | Blocos de conteúdo por aula (`main.py`) | `2` / `4` |
| `PUBLISH_COURSES` | Publica os cursos gerados (`available`/`public`) | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin do backend (`build_from_playlist.py`, para criar/gerenciar Schools) | *(obrigatório para esse script)* |
| `CURATOR_EMAIL` / `CURATOR_PASSWORD` / `CURATOR_NAME` / `CURATOR_NICKNAME` | Conta neutra reaproveitada entre execuções (`build_from_playlist.py`) que passa a ser a dona dos cursos com conteúdo real | `curadoria@email.com` / ... |


O tier gratuito ("on_demand") tem um limite de **8000 tokens por minuto**, e isso vale tanto para
`openai/gpt-oss-120b` quanto para `openai/gpt-oss-20b` - trocar de modelo entre os dois não muda
essa cota (o erro 429 mostra `Limit 8000` nos dois casos). Em cursos com muitos módulos/aulas ou
playlists com muitos vídeos, é fácil bater nesse teto no meio de uma execução.

Como isso é tratado:
- Quando a Groq responde 429, ela já diz exatamente quanto esperar ("Please try again in X.Ys") -
  `groq_client.py` lê esse valor e espera o tempo exato, em vez de um backoff cego que ou espera
  de menos (e falha de novo) ou de mais (e desperdiça tempo).
- `main.py` faz **uma** chamada por módulo (conteúdo das aulas + quiz juntos, no mesmo pedido) em
  vez de duas - metade das chamadas, sem pagar duas vezes pelo mesmo prompt de sistema.
- Ambos os scripts pausam ~1.5s entre chamadas Groq, espalhando o consumo de tokens em vez de
  concentrá-lo.

Se mesmo assim o rate limit continuar sendo um problema (playlists longas, `COURSES_MAX` alto),
reduza o volume (`MODULES_MAX`/`LESSONS_MAX`/`BLOCKS_MAX` ou `--lessons-per-module`/
`--max-videos`) ou use um tier da Groq com cota maior - não há como uma única conta gratuita
"contornar" um limite por minuto de verdade, só gastar o orçamento de forma mais eficiente.

## `build_from_playlist.py`: curso a partir de uma playlist real

Diferente do `main.py` (que inventa cursos do zero via Groq), este script constrói um curso a
partir do conteúdo real de uma playlist do YouTube:

```bash
.venv\Scripts\python.exe build_from_playlist.py "https://www.youtube.com/playlist?list=..."
# ou sem argumento - ele pede a URL
.venv\Scripts\python.exe build_from_playlist.py
```

Para cada vídeo da playlist, ele:
1. Cria uma aula com um bloco de **vídeo** (embed do YouTube).
2. Busca a **transcrição/legenda** do vídeo (via `youtube-transcript-api`, sem login). Se o vídeo
   não tiver legenda, baixa só o áudio (`yt-dlp`) e transcreve com o Whisper hospedado na Groq -
   mais lento, só acontece quando a legenda não existe.
3. Manda a transcrição pro Groq pedindo blocos de **texto/código** que resumam o que foi
   realmente dito na aula - nunca inventa conteúdo genérico a partir só do título.

A cada `--lessons-per-module` vídeos (padrão 5), fecha o módulo com uma aula de **revisão**
(pergunta de múltipla escolha gerada a partir das transcrições reais daquele módulo).

Opções úteis:
- `--max-videos N`: processa só os N primeiros vídeos - bom para testar antes de rodar a
  playlist inteira e gastar cota da Groq à toa.
- `--course-name "..."`: sobrescreve o nome do curso (padrão: o título da própria playlist).
- `--exclude id1,id2`: pula vídeos específicos pelo ID do YouTube. Playlists reais costumam
  misturar promocionais/especiais junto com as aulas de verdade (ex.: "Seja apoiador", vinhetas de
  aniversário do canal) - use isso pra tirá-los do curso.

**Atribuição, não apropriação:** o curso nunca fica em nome do criador real do vídeo - ele nunca
criou uma conta aqui e não autorizou isso. Em vez disso, o script usa a conta neutra `CURATOR_*`
como dona do curso, cria uma `School` com o nome do canal (registrando só a origem do conteúdo,
nunca uma parceria - o mesmo princípio que o backend já usa pra esse recurso) e a primeira aula
do curso é sempre um aviso explícito de atribuição com link para a playlist original.

## Pipeline alternativo: conteúdo escrito a mão (por um LLM) a partir da transcrição real

O `build_from_playlist.py` manda a transcrição pra Groq gerar os blocos de aula em tempo real -
o que esbarra rápido na cota diária (TPD) do tier gratuito da Groq, muito mais restritiva que o
limite por minuto (ver seção acima). Pra contornar isso sem depender da Groq pra gerar o texto,
o pipeline foi dividido em duas etapas independentes, cada uma com seu próprio script:

1. **`dump_transcripts.py`** - busca a playlist e a transcrição real de cada vídeo (legenda
   primeiro, fallback pra Whisper/Groq só quando não há legenda - isso não usa a cota de
   chat-completion, então não esbarra no TPD) e salva tudo num JSON, sem chamar nenhum LLM pra
   gerar conteúdo:

   ```bash
   .venv\Scripts\python.exe dump_transcripts.py <playlist_id_ou_url> saida.json [--max-videos N] [--exclude id1,id2]
   ```

2. Um LLM (ou você mesmo) lê esse JSON e escreve um segundo arquivo, `content.json`, com os
   blocos de texto/código de cada aula e os quizzes de cada módulo - seguindo o mesmo formato que
   `real_content_generator.py` usava, mas grounded apenas no que a transcrição realmente diz (2-4
   blocos por vídeo, 1 quiz de múltipla escolha por `--lessons-per-module` vídeos, exatamente uma
   alternativa correta). Formato esperado:

   ```json
   {
     "videos": {
       "<video_id>": [{"type": "text", "content": "<p>...</p>", "language": null}, {"type": "code", "content": "...", "language": "python"}]
     },
     "quizzes": [
       {"prompt": "...", "alternatives": [{"text": "...", "correct": true, "explanation": "..."}, ...]}
     ]
   }
   ```

3. **`apply_playlist_course.py`** - lê o dump e o `content.json` e faz o trabalho de fato: cria
   curador, escola de origem, curso, módulos, aulas (com bloco de vídeo + os blocos escritos na
   etapa 2), quizzes e publica - o mesmo fluxo que `build_from_playlist.run_playlist_flow` faz,
   só que com o conteúdo já pronto em vez de gerado on-the-fly:

   ```bash
   .venv\Scripts\python.exe apply_playlist_course.py dump.json content.json \
       --course-name "Nome do Curso" [--lessons-per-module 5] [--categories "python,backend"]
   ```

Útil pra cursos gerados fora do fluxo Groq (por exemplo, com o Claude Code lendo a transcrição
e escrevendo o `content.json` a mão) ou pra reaproveitar um dump já baixado sem gastar cota de
novo. `--categories` aceita uma lista separada por vírgula com as stacks/linguagens do curso
(usada nos filtros/badges do frontend).

## Outros scripts auxiliares

- **`publish_posts.py posts.json`** - publica posts (não-curso) escritos a mão, como conta
  curadora. Espera uma lista de objetos `{"title", "description", "categories"?, "blocks": [...]}`
  no mesmo formato de bloco usado nas aulas; pula posts cujo título já existe (idempotente).
- **`seeder/trilha_builder.py`** (módulo, não script standalone) - `build_trilha(http, title=,
  description=, area_id=, course_ids=, categories=, publish=True)` agrupa cursos já publicados
  numa Trilha ordenada. Não gera conteúdo novo, só cura e ordena cursos existentes.
- **`seed_production.py`** - script de uso único que documenta o plano de conteúdo usado para
  popular a instância de produção (curso a curso, playlist a playlist, já verificadas contra a
  YouTube Data API) e agrupa tudo em Trilhas ao final. Não é uma ferramenta genérica reutilizável
  - é o "plano" de uma população específica, mantido como script por ser resumível se falhar no
  meio (pula curso/trilha cujo nome já existe sob a conta curadora).
