# course-seeder-bot

Bot de linha de comando (Python) que popula o Coursemaker com cursos de teste. Ao rodar
`main.py`, ele primeiro pergunta como criar o conteudo:

1. **Por conta propria** - inventa curso(s) aleatorios do zero via Groq. Nesse modo ele:
   1. Busca o `/v3/api-docs` (swagger) do backend e confere que as operacoes de que depende
      (registro, criar curso, modulo, aula, bloco...) ainda existem antes de continuar.
   2. Cria uma conta nova (nunca reaproveita uma existente) seguindo o padrao
      `{BOT_EMAIL_PREFIX}{N}{BOT_EMAIL_DOMAIN}`, incrementando `N` a cada execucao.
   3. Define o nickname da conta (obrigatorio antes de criar conteudo).
   4. Gera de `COURSES_MIN` a `COURSES_MAX` cursos aleatorios via Groq, cada um com varios
      modulos e aulas, usando apenas blocos de **texto** e **codigo**.
2. **A partir de uma playlist do YouTube** - pede a URL/ID e monta o curso com os videos reais.
   Mesmo fluxo do `build_from_playlist.py` (veja a secao dedicada mais abaixo), so que com os
   valores padrao - para os flags avancados (`--max-videos`, `--exclude`, etc.), rode
   `build_from_playlist.py` diretamente em vez de `main.py`.

## Como o numero da conta e controlado

O arquivo `bot-account-counter.txt` (criado na raiz deste pacote, **nao versionado**) guarda o
proximo numero a tentar. Se aquele email ja existir (por exemplo, alguem rodou o bot em outra
maquina), ele soma 1 e tenta de novo ate encontrar um livre -- e so entao grava o numero
seguinte no arquivo.

## Setup

```bash
cp .env.example .env
# preencha GROQ_API_KEY no .env

python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

O backend do Coursemaker precisa estar rodando (por padrao em `http://localhost:8080`) - use o
terminal "🛠️ Backend Dev (DB local)" para rodar contra o banco local `coursemakerbr` em vez de
produção.

## Rodando

```bash
.venv\Scripts\python.exe main.py
```

Ele vai perguntar se quer um curso inventado do zero ou montado a partir de uma playlist real do
YouTube - veja o item correspondente acima para o que cada modo faz.

## Configuracao (`.env`)

| Variavel | Descricao | Padrao |
| --- | --- | --- |
| `GROQ_API_KEY` | Chave da API da Groq | *(obrigatoria)* |
| `GROQ_MODEL` | Modelo usado para gerar o conteudo | `openai/gpt-oss-120b` |
| `YOUTUBE_API_KEY` | Chave da YouTube Data API v3 (obrigatoria para `build_from_playlist.py`) | *(opcional)* |
| `API_BASE_URL` | URL base do backend | `http://localhost:8080` |
| `BOT_EMAIL_PREFIX` / `BOT_EMAIL_DOMAIN` | Formam o email de cada conta nova (`main.py`) | `testebot` / `@email.com` |
| `BOT_PASSWORD` | Senha usada em todas as contas criadas (`main.py`) | `SenhaForte123!` |
| `BOT_NAME` | Nome exibido no perfil da conta (`main.py`) | `Bot Coursemaker` |
| `COURSES_MIN` / `COURSES_MAX` | Cursos por execucao (`main.py`) | `2` / `3` |
| `MODULES_MIN` / `MODULES_MAX` | Modulos por curso (`main.py`) | `2` / `4` |
| `LESSONS_MIN` / `LESSONS_MAX` | Aulas por modulo (`main.py`) | `2` / `4` |
| `BLOCKS_MIN` / `BLOCKS_MAX` | Blocos de conteudo por aula (`main.py`) | `2` / `4` |
| `PUBLISH_COURSES` | Publica os cursos gerados (`available`/`public`) | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin do backend (`build_from_playlist.py`, para criar/gerenciar Schools) | *(obrigatorio para esse script)* |
| `CURATOR_EMAIL` / `CURATOR_PASSWORD` / `CURATOR_NAME` / `CURATOR_NICKNAME` | Conta neutra reaproveitada entre execucoes (`build_from_playlist.py`) que passa a ser a dona dos cursos com conteudo real | `curadoria@email.com` / ... |


O tier gratuito ("on_demand") tem um limite de **8000 tokens por minuto**, e isso vale tanto para
`openai/gpt-oss-120b` quanto para `openai/gpt-oss-20b` - trocar de modelo entre os dois nao muda
essa cota (o erro 429 mostra `Limit 8000` nos dois casos). Em cursos com muitos modulos/aulas ou
playlists com muitos videos, e facil bater nesse teto no meio de uma execucao.

Como isso e tratado:
- Quando a Groq responde 429, ela ja diz exatamente quanto esperar ("Please try again in X.Ys") -
  `groq_client.py` le esse valor e espera o tempo exato, em vez de um backoff cego que ou espera
  de menos (e falha de novo) ou de mais (e desperdica tempo).
- `main.py` faz **uma** chamada por modulo (conteudo das aulas + quiz juntos, no mesmo pedido) em
  vez de duas - metade das chamadas, sem pagar duas vezes pelo mesmo prompt de sistema.
- Ambos os scripts pausam ~1.5s entre chamadas Groq, espalhando o consumo de tokens em vez de
  concentra-lo.

Se mesmo assim o rate limit continuar sendo um problema (playlists longas, `COURSES_MAX` alto),
reduza o volume (`MODULES_MAX`/`LESSONS_MAX`/`BLOCKS_MAX` ou `--lessons-per-module`/
`--max-videos`) ou use um tier da Groq com cota maior - nao ha como uma unica conta gratuita
"contornar" um limite por minuto de verdade, so gastar o orcamento de forma mais eficiente.

## `build_from_playlist.py`: curso a partir de uma playlist real

Diferente do `main.py` (que inventa cursos do zero via Groq), este script constroi um curso a
partir do conteudo real de uma playlist do YouTube:

```bash
.venv\Scripts\python.exe build_from_playlist.py "https://www.youtube.com/playlist?list=..."
# ou sem argumento - ele pede a URL
.venv\Scripts\python.exe build_from_playlist.py
```

Para cada video da playlist, ele:
1. Cria uma aula com um bloco de **video** (embed do YouTube).
2. Busca a **transcricao/legenda** do video (via `youtube-transcript-api`, sem login). Se o video
   nao tiver legenda, baixa so o audio (`yt-dlp`) e transcreve com o Whisper hospedado na Groq -
   mais lento, so acontece quando a legenda nao existe.
3. Manda a transcricao pro Groq pedindo blocos de **texto/codigo** que resumam o que foi
   realmente dito na aula - nunca inventa conteudo generico a partir so do titulo.

A cada `--lessons-per-module` videos (padrao 5), fecha o modulo com uma aula de **revisao**
(pergunta de multipla escolha gerada a partir das transcricoes reais daquele modulo).

Opcoes uteis:
- `--max-videos N`: processa so os N primeiros videos - bom para testar antes de rodar a
  playlist inteira e gastar cota da Groq a toa.
- `--course-name "..."`: sobrescreve o nome do curso (padrao: o titulo da propria playlist).
- `--exclude id1,id2`: pula videos especificos pelo ID do YouTube. Playlists reais costumam
  misturar promocionais/especiais junto com as aulas de verdade (ex.: "Seja apoiador", vinhetas de
  aniversario do canal) - use isso pra tira-los do curso.

**Atribuicao, nao apropriacao:** o curso nunca fica em nome do criador real do video - ele nunca
criou uma conta aqui e nao autorizou isso. Em vez disso, o script usa a conta neutra `CURATOR_*`
como dona do curso, cria uma `School` com o nome do canal (registrando so a origem do conteudo,
nunca uma parceria - o mesmo principio que o backend ja usa pra esse recurso) e a primeira aula
do curso e sempre um aviso explicito de atribuicao com link para a playlist original.

## Pipeline alternativo: conteudo escrito a mao (por um LLM) a partir da transcricao real

O `build_from_playlist.py` manda a transcricao pra Groq gerar os blocos de aula em tempo real -
o que esbarra rapido na cota diaria (TPD) do tier gratuito da Groq, muito mais restritiva que o
limite por minuto (ver secao acima). Pra contornar isso sem depender da Groq pra gerar o texto,
o pipeline foi dividido em duas etapas independentes, cada uma com seu proprio script:

1. **`dump_transcripts.py`** - busca a playlist e a transcricao real de cada video (legenda
   primeiro, fallback pra Whisper/Groq so quando nao ha legenda - isso nao usa a cota de
   chat-completion, entao nao esbarra no TPD) e salva tudo num JSON, sem chamar nenhum LLM pra
   gerar conteudo:

   ```bash
   .venv\Scripts\python.exe dump_transcripts.py <playlist_id_ou_url> saida.json [--max-videos N] [--exclude id1,id2]
   ```

2. Um LLM (ou voce mesmo) le esse JSON e escreve um segundo arquivo, `content.json`, com os
   blocos de texto/codigo de cada aula e os quizzes de cada modulo - seguindo o mesmo formato que
   `real_content_generator.py` usava, mas grounded apenas no que a transcricao realmente diz (2-4
   blocos por video, 1 quiz de multipla escolha por `--lessons-per-module` videos, exatamente uma
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

3. **`apply_playlist_course.py`** - le o dump e o `content.json` e faz o trabalho de fato: cria
   curador, escola de origem, curso, modulos, aulas (com bloco de video + os blocos escritos na
   etapa 2), quizzes e publica - o mesmo fluxo que `build_from_playlist.run_playlist_flow` faz,
   so que com o conteudo ja pronto em vez de gerado on-the-fly:

   ```bash
   .venv\Scripts\python.exe apply_playlist_course.py dump.json content.json \
       --course-name "Nome do Curso" [--lessons-per-module 5] [--categories "python,backend"]
   ```

Util pra cursos gerados fora do fluxo Groq (por exemplo, com o Claude Code lendo a transcricao
e escrevendo o `content.json` a mao) ou pra reaproveitar um dump ja baixado sem gastar cota de
novo. `--categories` aceita uma lista separada por virgula com as stacks/linguagens do curso
(usada nos filtros/badges do frontend).

## Outros scripts auxiliares

- **`publish_posts.py posts.json`** - publica posts (nao-curso) escritos a mao, como conta
  curadora. Espera uma lista de objetos `{"title", "description", "categories"?, "blocks": [...]}`
  no mesmo formato de bloco usado nas aulas; pula posts cujo titulo ja existe (idempotente).
- **`seeder/trilha_builder.py`** (modulo, nao script standalone) - `build_trilha(http, title=,
  description=, area_id=, course_ids=, categories=, publish=True)` agrupa cursos ja publicados
  numa Trilha ordenada. Nao gera conteudo novo, so cura e ordena cursos existentes.
- **`seed_production.py`** - script de uso unico que documenta o plano de conteudo usado para
  popular a instancia de producao (curso a curso, playlist a playlist, ja verificadas contra a
  YouTube Data API) e agrupa tudo em Trilhas ao final. Nao e uma ferramenta generica reutilizavel
  - e o "plano" de uma populacao especifica, mantido como script por ser resumivel se falhar no
  meio (pula curso/trilha cujo nome ja existe sob a conta curadora).
