# course-seeder-bot

Bot de linha de comando que popula o Coursemaker com cursos de teste. A cada `npm start` ele:

1. Busca o `/v3/api-docs` (swagger) do backend e confere que as operacoes de que depende
   (registro, criar curso, modulo, aula, bloco...) ainda existem antes de continuar.
2. Cria uma conta nova (nunca reaproveita uma existente) seguindo o padrao
   `{BOT_EMAIL_PREFIX}{N}{BOT_EMAIL_DOMAIN}`, incrementando `N` a cada execucao.
3. Define o nickname da conta (obrigatorio antes de criar conteudo).
4. Gera de `COURSES_MIN` a `COURSES_MAX` cursos aleatorios via Groq, cada um com varios
   modulos e aulas, usando apenas blocos de **texto** e **codigo**.

## Como o numero da conta e controlado

O arquivo `bot-account-counter.txt` (criado na raiz deste pacote, **nao versionado**) guarda o
proximo numero a tentar. Se aquele email ja existir (por exemplo, alguem rodou o bot em outra
maquina), ele soma 1 e tenta de novo ate encontrar um livre -- e so entao grava o numero
seguinte no arquivo.

## Setup

```bash
cp .env.example .env
# preencha GROQ_API_KEY no .env
npm install
```

O backend do Coursemaker precisa estar rodando (por padrao em `http://localhost:8080`).

## Rodando

```bash
npm start
```

## Configuracao (`.env`)

| Variavel | Descricao | Padrao |
| --- | --- | --- |
| `GROQ_API_KEY` | Chave da API da Groq | *(obrigatoria)* |
| `GROQ_MODEL` | Modelo usado para gerar o conteudo | `llama-3.3-70b-versatile` |
| `API_BASE_URL` | URL base do backend | `http://localhost:8080` |
| `BOT_EMAIL_PREFIX` / `BOT_EMAIL_DOMAIN` | Formam o email de cada conta nova | `testebot` / `@email.com` |
| `BOT_PASSWORD` | Senha usada em todas as contas criadas | `SenhaForte123!` |
| `BOT_NAME` | Nome exibido no perfil da conta | `Bot Coursemaker` |
| `COURSES_MIN` / `COURSES_MAX` | Cursos por execucao | `2` / `3` |
| `MODULES_MIN` / `MODULES_MAX` | Modulos por curso | `2` / `4` |
| `LESSONS_MIN` / `LESSONS_MAX` | Aulas por modulo | `2` / `4` |
| `BLOCKS_MIN` / `BLOCKS_MAX` | Blocos de conteudo por aula | `2` / `4` |
| `PUBLISH_COURSES` | Publica os cursos gerados (`available`/`public`) | `true` |
