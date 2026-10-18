/**
 * The home page draws each course's thumbnail as a few lines of code in the course's language, with a thin stripe
 * in that language's color (see design/README.md). The API has no "language" field, so it is guessed from the
 * course name and categories. A course that matches nothing (history, philosophy...) gets a plain-text summary
 * instead, which still fits the monospace look.
 */

// Order matters: the first match wins, so specific languages come before broad topics ("Lógica com Python" is a
// Python course, "JavaScript" must not match Java).
const LANGUAGES = [
  {
    match: /typescript/,
    tag: 'typescript',
    color: '#5b9bd5',
    code: 'type Aluno = {\n  nome: string\n  nota: number\n}\n\nconst aprovado = (a: Aluno) =>\n  a.nota >= 7',
  },
  {
    match: /\breact\b|\bnext(\.?js)?\b/,
    tag: 'react',
    color: '#6cc4d4',
    code: 'export function Contador() {\n  const [n, setN] = useState(0)\n  return (\n    <button onClick={() => setN(n + 1)}>\n      {n} cliques\n    </button>\n  )\n}',
  },
  {
    match: /javascript|\bjs\b|\bnode/,
    tag: 'javascript',
    color: '#d9d55b',
    code: 'const notas = [7, 9.5, 6]\n\nconst media = notas\n  .reduce((a, b) => a + b, 0)\n  / notas.length\n\nconsole.log(media.toFixed(1))',
  },
  {
    match: /python|pandas|django|flask/,
    tag: 'python',
    color: '#e8c547',
    code: 'import pandas as pd\n\ndf = pd.read_csv("vendas.csv")\ndf.groupby("mes")["total"]\n  .sum()\n  .plot()',
  },
  {
    match: /\bjava\b|spring/,
    tag: 'java',
    color: '#e0875a',
    code: 'public class Main {\n  public static void main(String[] a) {\n    System.out.println("Olá!");\n  }\n}',
  },
  {
    match: /c#|csharp|\.net|unity/,
    tag: 'c#',
    color: '#b48ee0',
    code: 'public class Player : MonoBehaviour\n{\n  public float speed = 5f;\n\n  void Update() {\n    // mover',
  },
  {
    match: /c\+\+|\bcpp\b/,
    tag: 'c++',
    color: '#7aa2d6',
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Olá!";\n  return 0;\n}',
  },
  {
    match: /\bgolang\b|\bgo\b/,
    tag: 'go',
    color: '#6cc4d4',
    code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Olá!")\n}',
  },
  {
    match: /\brust\b/,
    tag: 'rust',
    color: '#d08b6a',
    code: 'fn main() {\n  let nomes = vec!["ana", "bia"];\n  for n in &nomes {\n    println!("oi, {n}");\n  }\n}',
  },
  {
    match: /\bphp\b|laravel/,
    tag: 'php',
    color: '#8f93c8',
    code: '<?php\n$nome = "mundo";\necho "Olá, $nome!";\n\nforeach ($itens as $i) {\n  echo $i;\n}',
  },
  {
    match: /kotlin|android/,
    tag: 'kotlin',
    color: '#b48ee0',
    code: 'fun main() {\n  val nomes = listOf("ana", "bia")\n  nomes.forEach {\n    println("oi, $it")\n  }\n}',
  },
  {
    match: /\bdart\b|flutter/,
    tag: 'dart',
    color: '#6cc4d4',
    code: 'void main() {\n  var nomes = ["ana", "bia"];\n  for (var n in nomes) {\n    print("oi, $n");\n  }\n}',
  },
  {
    match: /\bsql\b|banco de dados|postgres|mysql/,
    tag: 'sql',
    color: '#7aa2d6',
    code: 'SELECT aluno, AVG(nota)\n  FROM provas\n WHERE ano = 2026\n GROUP BY aluno\n ORDER BY 2 DESC;',
  },
  {
    match: /html|css|front.?end|web design/,
    tag: 'html/css',
    color: '#e8734a',
    code: '<!doctype html>\n<html lang="pt-BR">\n<head>\n  <title>Meu site</title>\n</head>\n<body>',
  },
  {
    match: /\bgit\b|github/,
    tag: 'git',
    color: '#e8734a',
    code: '$ git init\n$ git add .\n$ git commit -m "primeiro commit"\n$ git push origin main',
  },
  {
    match: /docker|kubernetes|devops/,
    tag: 'docker',
    color: '#5b9bd5',
    code: 'FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["npm", "start"]',
  },
  {
    match: /linux|terminal|bash|shell/,
    tag: 'shell',
    color: '#8fd16a',
    code: '$ ls -la\n$ cd projetos/\n$ grep -r "TODO" .\n$ chmod +x deploy.sh\n$ ./deploy.sh',
  },
  {
    match: /logica|algoritmo/,
    tag: 'lógica',
    color: '#8fd16a',
    code: 'algoritmo "media"\nvar\n  n1, n2: real\ninicio\n  leia(n1, n2)\n  escreva((n1+n2)/2)',
  },
  {
    match: /\bc\b/,
    tag: 'c',
    color: '#7aa2d6',
    code: '#include <stdio.h>\n\nint main(void) {\n  printf("Olá!\\n");\n  return 0;\n}',
  },
]

const NEUTRAL_COLOR = '#c9a27a'

function normalize(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Wraps plain text into short lines so it reads like a file listing, capped to what fits in the thumbnail. */
function summaryLines(course) {
  const lines = []
  const words = (course.description || course.name || '').split(/\s+/).filter(Boolean)
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 28) {
      lines.push(line)
      line = word
      if (lines.length === 4) break
    } else {
      line = (line + ' ' + word).trim()
    }
  }
  if (line && lines.length < 4) lines.push(line)
  return lines
}

/** `{ tag, color, code }` for a course summary from the API. */
export function courseThumb(course) {
  const haystack = ` ${normalize(course.name)} ${(course.categories ?? []).map(normalize).join(' ')} `
  const language = LANGUAGES.find(({ match }) => match.test(haystack))
  if (language) return { tag: language.tag, color: language.color, code: language.code }

  const tag = course.categories?.[0] ?? course.area?.name?.toLowerCase() ?? 'curso'
  const body = summaryLines(course)
    .map((line) => `  ${line}`)
    .join('\n')
  return { tag, color: NEUTRAL_COLOR, code: `sobre o curso\n${body}\n\n${course.lessonCount ?? 0} aulas ↓` }
}
