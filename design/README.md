# Design — direção "técnica"

Proposta visual da home do CourseMaker, voltada para cursos de programação sem fechar a porta para outras áreas.

Abra `home.html` direto no navegador. É uma página estática, sem build. A busca, as abas de área e o botão "executar" da aula de exemplo funcionam.

## A ideia em uma frase

Mostrar o produto em vez de decorar: a ilustração do hero é uma aula de verdade (módulos, editor, saída do código), e as seções usam metáforas de programador: prompt de terminal, `git log` para trilhas, árvore de pastas para montar curso, changelog para posts.

## O que mudou em relação ao visual atual

| Antes (padrão de IA) | Agora |
|---|---|
| `slate-900` + azul `sky` do Tailwind | Preto quente `#0e0f0c` + âmbar `#f5a524` |
| Inter em tudo | IBM Plex Sans (texto/títulos) + IBM Plex Mono (rótulos, metadados, botões) |
| Título com o final em azul | Título com uma piada riscada: ~~playlist de 87 vídeos~~ |
| Hero centralizado com brilho radial | Hero alinhado à esquerda + aula real ao lado, sobre uma grade quadriculada sutil |
| Faixa grande de números | Uma linha discreta em mono abaixo dos botões |
| Cards com gradiente + "Py" gigante | Miniatura com trecho de código da linguagem e uma listra fina na cor dela |
| 5 tags por card | Escola, título, nº de aulas. Só isso |
| Trilhas como cards | Lista no estilo `git log`, com os cursos em sequência (`lógica → git → terminal`) |
| "Como funciona" em 4 cards com ícone | Duas colunas: quem aprende × quem ensina, com a estrutura do curso como árvore de pastas |
| `rounded-xl` em tudo, hover = borda azul | Raio pequeno (4–6px), bordas finas, hover sutil |
| Seções com ícone + título | Numeração `01 — cursos`, `02 — trilhas`… em âmbar |

**Versatilidade:** as abas de área (`tecnologia`, `jogos`, `ciências humanas`) continuam lá. Para áreas sem código, a miniatura mostra o sumário do curso em texto mono, o que segue combinando com o estilo.

> Os cursos de "jogos" e "ciências humanas" na maquete são inventados, só para mostrar o comportamento. Os de tecnologia, as trilhas e os posts vêm do site atual.

## Tokens

```css
--bg:      #0e0f0c;  /* fundo */
--bg-2:    #141612;  /* superfícies (cards, painéis) */
--bg-3:    #1b1d18;  /* superfícies elevadas, editor */
--line:    #2a2d26;  /* bordas */
--line-2:  #3a3e35;  /* bordas de destaque / inputs */
--ink:     #ecebe4;  /* texto principal */
--ink-2:   #a4a69c;  /* texto secundário */
--ink-3:   #6c6f65;  /* rótulos, comentários */
--accent:  #f5a524;  /* marca (âmbar) */
--ok:      #8fd16a;  /* sucesso, aula concluída */
```

Cores de linguagem: só em pontinhos e listras de 3px, nunca em blocos grandes.
`python #e8c547 · c++ #7aa2d6 · html #e8734a · lógica #8fd16a · c# #b48ee0 · go #6cc4d4`

**Tipografia**
- Títulos: Plex Sans 600–700, `letter-spacing: -0.025em` a `-0.035em`
- Texto: Plex Sans 400, 16–18px
- Mono (Plex Mono): logo, botões, rótulos de seção, metadados (`16 aulas`), tags, código

**Regras**
- Âmbar só no que é ação ou marca: botão primário, cursor, numeração de seção, aba ativa. Se tudo for âmbar, nada é.
- Raio de 4px em botões/inputs e 6px em cards/painéis. Nada de `rounded-xl`.
- Hover: borda um tom mais clara ou título em âmbar. Nada de glow.
- Textos sempre com acento (área, conteúdo, você).

## Como levar para o React

1. Em `web/tailwind.config.js`, trocar `brand` pelo âmbar e criar as cores `bg`, `line` e `ink` com os tokens acima. Trocar `fontFamily.sans` para `IBM Plex Sans` e `mono` para `IBM Plex Mono`.
2. Em `web/index.html`, trocar a fonte do Google Fonts (Inter/Fira Code → IBM Plex Sans/Mono).
3. Atualizar `.btn`, `.card` e `.input` em `web/src/index.css`. Como o resto do app usa essas classes, a mudança já se espalha.
4. Reescrever `web/src/pages/HomePage.jsx` seguindo a maquete.
5. Depois, passar pelas outras páginas trocando `slate-*` pelos tokens novos.
