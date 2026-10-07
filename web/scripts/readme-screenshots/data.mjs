/**
 * O "mundo" inventado das imagens do README: pessoas, áreas, escolas, cursos, trilhas, posts, mensagens e o curso
 * de exercícios de código (a padaria do Seu Zé). Nada aqui vem de dados reais.
 */

export const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const iso = (daysAgo, hour = 12) => new Date(Date.UTC(2026, 9, 6 - daysAgo, hour, 0, 0)).toISOString()

/** Capa desenhada em SVG (gradiente + sigla), para os cards não ficarem com o ícone de "sem imagem". */
const cover = (c1, c2, glyph) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>` +
      `<circle cx="560" cy="40" r="120" fill="rgba(255,255,255,.07)"/><circle cx="80" cy="340" r="150" fill="rgba(255,255,255,.06)"/>` +
      `<text x="320" y="212" font-family="Inter,Arial,sans-serif" font-size="108" font-weight="700" fill="rgba(255,255,255,.93)" text-anchor="middle">${glyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></svg>`,
  )

// ------------------------------------------------------------------------------------------------------ pessoas

export const PEOPLE = {
  prof: { id: id(2), nickname: 'professor-demo', name: 'Professor Demo', image: null, bio: 'Ensino lógica de programação e Python com exercícios de código de verdade.' },
  marina: { id: id(5), nickname: 'marina-costa', name: 'Marina Costa', image: null, bio: 'Front-end e design de interfaces.' },
  rafael: { id: id(6), nickname: 'rafael-lima', name: 'Rafael Lima', image: null, bio: 'Back-end, bancos de dados e DevOps.' },
  beatriz: { id: id(7), nickname: 'beatriz-souza', name: 'Beatriz Souza', image: null, bio: 'Designer de produto e fotógrafa.' },
  bruno: { id: id(8), nickname: 'bruno-alves', name: 'Bruno Alves', image: null, bio: 'Marketing e negócios digitais.' },
}
export const STUDENT = { id: id(3), nickname: 'aluna-demo', name: 'Aluna Demo', image: null, bio: null }
const user = (p) => ({ id: p.id, nickname: p.nickname, name: p.name, image: p.image })

export const ME = {
  student: { ...STUDENT, email: 'aluna@exemplo.com', stacks: ['Python'], role: 'user', needsNickname: false, createdAt: iso(60) },
  owner: { ...user(PEOPLE.prof), email: 'professor@exemplo.com', bio: PEOPLE.prof.bio, stacks: ['Python', 'Java'], role: 'user', needsNickname: false, createdAt: iso(120) },
  admin: { id: id(9), nickname: 'admin', name: 'Admin', image: null, email: 'admin@exemplo.com', bio: null, stacks: [], role: 'admin', needsNickname: false, createdAt: iso(200) },
}

// -------------------------------------------------------------------------------------------- áreas e escolas

export const AREAS = [
  { id: id(4), name: 'Tecnologia', slug: 'tecnologia', allowsCodeExercises: true },
  { id: id(41), name: 'Design', slug: 'design', allowsCodeExercises: false },
  { id: id(42), name: 'Negócios', slug: 'negocios', allowsCodeExercises: false },
  { id: id(43), name: 'Idiomas', slug: 'idiomas', allowsCodeExercises: false },
]
const area = (slug) => AREAS.find((a) => a.slug === slug)

export const SCHOOLS = [
  { id: id(51), name: 'Escola Horizonte', slug: 'escola-horizonte', description: 'Selo de origem: conteúdo preparado por professores da Escola Horizonte.', logoUrl: null, websiteUrl: 'https://exemplo.com/horizonte', featuredOnHome: true, homeOrder: 1 },
  { id: id(52), name: 'Academia Código Aberto', slug: 'academia-codigo-aberto', description: 'Comunidade de desenvolvedores que ensinam de graça.', logoUrl: null, websiteUrl: 'https://exemplo.com/aca', featuredOnHome: true, homeOrder: 2 },
  { id: id(53), name: 'Instituto Pixel', slug: 'instituto-pixel', description: 'Design e fotografia para quem está começando.', logoUrl: null, websiteUrl: 'https://exemplo.com/pixel', featuredOnHome: true, homeOrder: 3 },
]

// --------------------------------------------------------------------------------------------------- cursos

const COURSE_DEFS = [
  { n: 1, name: 'Oficina de Lógica: a padaria do Seu Zé', slug: 'oficina-de-logica-a-padaria-do-seu-ze', owner: 'prof', area: 'tecnologia', cats: ['logica', 'python', 'exercicios'], lessons: 6, students: 48, likes: 31, c: ['#0ea5e9', '#6366f1'], g: '{ }', school: 0,
    desc: 'Pratique lógica de programação consertando o sistema de uma padaria: descontos, troco, etiquetas e fechamento de caixa.' },
  { n: 2, name: 'HTML e CSS do zero', slug: 'html-e-css-do-zero', owner: 'marina', area: 'tecnologia', cats: ['html', 'css', 'web'], lessons: 18, students: 212, likes: 97, c: ['#f97316', '#ef4444'], g: '</>', school: 0,
    desc: 'Monte páginas responsivas passo a passo: estrutura, estilos, flexbox, grid e boas práticas de acessibilidade.' },
  { n: 3, name: 'Python para Análise de Dados', slug: 'python-para-analise-de-dados', owner: 'prof', area: 'tecnologia', cats: ['python', 'dados'], lessons: 24, students: 156, likes: 74, c: ['#2563eb', '#22c55e'], g: 'Py', school: 1,
    desc: 'Do primeiro script a gráficos e relatórios: pandas, limpeza de dados e visualização.' },
  { n: 4, name: 'Git e GitHub na Prática', slug: 'git-e-github-na-pratica', owner: 'rafael', area: 'tecnologia', cats: ['git', 'github'], lessons: 12, students: 301, likes: 140, c: ['#111827', '#f97316'], g: 'Git', school: 1,
    desc: 'Versionamento do jeito que se trabalha em equipe: commits, branches, pull requests e resolução de conflitos.' },
  { n: 5, name: 'Design de Interfaces: do wireframe ao protótipo', slug: 'design-de-interfaces', owner: 'beatriz', area: 'design', cats: ['ui', 'ux', 'figma'], lessons: 20, students: 89, likes: 52, c: ['#a855f7', '#ec4899'], g: 'UI', school: 2,
    desc: 'Pesquisa, wireframes, design system e protótipos clicáveis, com um projeto do começo ao fim.' },
  { n: 6, name: 'Java Básico: a cantina do colégio', slug: 'java-basico-a-cantina-do-colegio', owner: 'prof', area: 'tecnologia', cats: ['java', 'exercicios'], lessons: 15, students: 120, likes: 66, c: ['#dc2626', '#f59e0b'], g: 'Java', school: 0,
    desc: 'Métodos, vetores e condições em Java, consertando o sistema da cantina de uma escola.' },
  { n: 7, name: 'SQL na Prática', slug: 'sql-na-pratica', owner: 'rafael', area: 'tecnologia', cats: ['sql', 'banco-de-dados'], lessons: 16, students: 178, likes: 88, c: ['#0f766e', '#38bdf8'], g: 'SQL', school: 1,
    desc: 'Consultas, junções, agregações e modelagem de dados com exercícios sobre uma loja de verdade.' },
  { n: 8, name: 'Marketing Digital para Iniciantes', slug: 'marketing-digital-para-iniciantes', owner: 'bruno', area: 'negocios', cats: ['marketing', 'redes-sociais'], lessons: 14, students: 64, likes: 29, c: ['#eab308', '#f43f5e'], g: 'Mkt', school: 2,
    desc: 'Funil de vendas, conteúdo, anúncios e métricas para pequenos negócios.' },
  { n: 9, name: 'Inglês para Desenvolvedores', slug: 'ingles-para-desenvolvedores', owner: 'beatriz', area: 'idiomas', cats: ['ingles', 'carreira'], lessons: 10, students: 133, likes: 71, c: ['#14b8a6', '#6366f1'], g: 'EN', school: 2,
    desc: 'Leia documentação, participe de reuniões e escreva commits e e-mails em inglês com segurança.' },
  { n: 10, name: 'React: componentes e estado', slug: 'react-componentes-e-estado', owner: 'marina', area: 'tecnologia', cats: ['react', 'javascript'], lessons: 22, students: 244, likes: 119, c: ['#0891b2', '#1e293b'], g: 'Re', school: 1,
    desc: 'Componentes, props, estado, efeitos e um app completo consumindo uma API.' },
  { n: 11, name: 'Fotografia com o Celular', slug: 'fotografia-com-o-celular', owner: 'beatriz', area: 'design', cats: ['fotografia'], lessons: 9, students: 58, likes: 33, c: ['#334155', '#fb7185'], g: 'Foto', school: 2,
    desc: 'Luz, composição e edição para fotos incríveis sem equipamento caro.' },
  { n: 12, name: 'Oficina de Rust: o Estacionamento Central', slug: 'oficina-de-rust-o-estacionamento', owner: 'prof', area: 'tecnologia', cats: ['rust', 'exercicios'], lessons: 7, students: 21, likes: 14, c: ['#7c2d12', '#f97316'], g: 'Rs', school: 0,
    desc: 'Tarifas, validação de placas, busca de vagas e somas sem estouro de inteiro.' },
]

export const courseSummary = (def, extra = {}) => ({
  id: id(1000 + def.n), name: def.name, slug: def.slug, description: def.desc, thumbnailUrl: cover(def.c[0], def.c[1], def.g),
  visibility: 'public', status: 'available', categories: def.cats, featured: def.n <= 4, blockedByAdmin: false, area: area(def.area),
  school: SCHOOLS[def.school] ?? null, owner: user(PEOPLE[def.owner]), likeCount: def.likes, enrollmentCount: def.students, lessonCount: def.lessons,
  likedByMe: false, enrolledByMe: false, savedByMe: false, createdAt: iso(40 - def.n), updatedAt: iso(5), ...extra,
})

export const COURSES = COURSE_DEFS.map((def) => courseSummary(def, { enrolledByMe: [1, 2, 4].includes(def.n) }))
export const COURSE_BY_N = (n) => COURSES[n - 1]
export const COURSE_FEATURED = COURSES.filter((c) => c.featured)

// --------------------------------------------------------------------------------------------------- trilhas

const trilhaSummary = (n, title, slug, desc, owner, areaSlug, courseNs, c, g, extra = {}) => ({
  id: id(2000 + n), title, slug, description: desc, thumbnailUrl: cover(c[0], c[1], g), visibility: 'public', status: 'available', categories: [],
  featured: n === 1, blockedByAdmin: false, area: area(areaSlug), school: SCHOOLS[0], owner: user(PEOPLE[owner]), itemCount: courseNs.length,
  enrollmentCount: 120 - n * 17, enrolledByMe: n === 1, savedByMe: false, createdAt: iso(30 - n), updatedAt: iso(3), ...extra,
})
export const TRILHAS = [
  trilhaSummary(1, 'Fundamentos de Programação', 'fundamentos-de-programacao', 'O ponto de partida para quem nunca programou: lógica, controle de versão e a primeira linguagem de verdade.', 'prof', 'tecnologia', [1, 4, 3, 6], ['#0ea5e9', '#22c55e'], 'Start'),
  trilhaSummary(2, 'Frontend Web', 'frontend-web', 'Do HTML ao React: tudo para construir interfaces modernas e acessíveis.', 'marina', 'tecnologia', [2, 10], ['#f97316', '#a855f7'], 'Web'),
  trilhaSummary(3, 'Dados e Banco de Dados', 'dados-e-banco-de-dados', 'SQL, Python e análise de dados, com projetos práticos.', 'rafael', 'tecnologia', [7, 3], ['#0f766e', '#2563eb'], 'Data'),
]
const TRILHA_STEPS = [
  { title: 'Primeiros passos', description: 'Lógica e ferramentas básicas.', courses: [1, 4] },
  { title: 'Sua primeira linguagem', description: 'Aprenda a programar de verdade, com exercícios.', courses: [3, 6] },
]

export function trilhaDetail(slug, completedCourseNs = [1]) {
  const base = TRILHAS.find((t) => t.slug === slug) ?? TRILHAS[0]
  const steps = TRILHA_STEPS.map((step, si) => ({
    id: id(2100 + si), title: step.title, description: step.description, orderIndex: si,
    items: step.courses.map((n, ii) => {
      const done = completedCourseNs.includes(n)
      return {
        id: id(2200 + si * 10 + ii), stepId: id(2100 + si), orderIndex: ii, course: COURSE_BY_N(n), post: null, note: null, manuallyCompleted: done,
        courseProgress: { completedLessons: done ? COURSE_BY_N(n).lessonCount : ii === 0 && si === 0 ? 0 : si === 1 && ii === 0 ? 8 : 0, totalLessons: COURSE_BY_N(n).lessonCount, percentage: done ? 100 : si === 1 && ii === 0 ? 33 : 0, completedLessonIds: [] },
        createdAt: iso(20),
      }
    }),
  }))
  const all = steps.flatMap((s) => s.items)
  const completed = all.filter((i) => i.manuallyCompleted).length
  return {
    summary: { ...base, enrolledByMe: true }, isOwner: false, enrolledByMe: true,
    progress: { completedItems: completed, totalItems: all.length, percentage: Math.round((completed / all.length) * 100) },
    structure: { steps, ungroupedItems: [] },
  }
}

// ----------------------------------------------------------------------------------------------------- posts

export const POSTS = [
  { n: 1, title: 'Como pensar em algoritmos antes de escrever código', slug: 'pensar-em-algoritmos', owner: 'prof', c: ['#0ea5e9', '#6366f1'], g: 'Alg', desc: 'Um roteiro de 5 passos para sair do "não sei por onde começar" e chegar a uma solução que funciona.', likes: 58 },
  { n: 2, title: 'Git: 7 comandos que resolvem 90% do dia a dia', slug: 'git-7-comandos', owner: 'rafael', c: ['#111827', '#f97316'], g: 'Git', desc: 'Pare de decorar e entenda o que cada comando faz com exemplos curtos.', likes: 91 },
  { n: 3, title: 'Acessibilidade na web não é opcional', slug: 'acessibilidade-na-web', owner: 'marina', c: ['#a855f7', '#ec4899'], g: 'A11y', desc: 'Contraste, foco, rótulos e navegação por teclado: o básico que muda a vida de muita gente.', likes: 44 },
].map((p) => ({
  id: id(3000 + p.n), title: p.title, slug: p.slug, description: p.desc, thumbnailUrl: cover(p.c[0], p.c[1], p.g), visibility: 'public', status: 'available',
  categories: ['artigo'], featured: false, blockedByAdmin: false, area: area('tecnologia'), school: null, owner: user(PEOPLE[p.owner]), likeCount: p.likes,
  likedByMe: false, savedByMe: false, createdAt: iso(10 + p.n), updatedAt: iso(4),
}))

export const postDetail = (slug) => {
  const summary = POSTS.find((p) => p.slug === slug) ?? POSTS[0]
  const blocks = [
    ['text', '<p>Quando alguém pede para você “fazer um programa”, a vontade é abrir o editor e começar a digitar. É quase sempre um erro: <strong>o código é a última parte da solução</strong>, não a primeira.</p><h3>1. Entenda o problema com exemplos</h3><p>Escreva três entradas e as saídas que você espera. Se não consegue, ainda não entendeu o problema.</p>'],
    ['code', 'def preco_com_desconto(preco_unitario, quantidade):\n    total = preco_unitario * quantidade\n    if quantidade >= 10:\n        total = total * 90 // 100\n    return total\n\nprint(preco_com_desconto(50, 10))  # 450', 'python'],
    ['text', '<h3>2. Quebre em passos pequenos</h3><p>Cada passo deve caber em uma frase. Depois de escrever o passo, <em>teste com os exemplos do item 1</em> antes de seguir para o próximo.</p><ul><li>Calcule o total sem desconto</li><li>Descubra se o desconto vale</li><li>Aplique o desconto e arredonde</li></ul>'],
  ].map(([type, content, language], order) => ({ id: id(3100 + order), parentId: summary.id, type, content, language: language ?? null, order }))
  return { summary, blocks, isOwner: false, requiresPassword: false, hasPassword: false }
}

// ------------------------------------------------------------------------------ aula de leitura (Git, com código)

export const GIT_LESSON = {
  course: COURSE_BY_N(4),
  modules: [
    { id: id(4010), title: 'Antes de começar', lessons: [{ id: id(4011), title: 'O que é versionamento?', blocks: [] }] },
    {
      id: id(4020), title: 'Seu primeiro repositório',
      lessons: [
        {
          id: id(4021), title: 'Criando seu primeiro commit',
          blocks: [
            ['text', '<p>Um <strong>commit</strong> é uma foto do seu projeto num momento. Vamos criar um repositório novo, adicionar um arquivo e registrar essa primeira foto.</p><h3>Passo a passo</h3><ol><li>Crie uma pasta e entre nela;</li><li>Inicie o repositório com <code>git init</code>;</li><li>Escolha o que vai na foto com <code>git add</code> e registre com <code>git commit</code>.</li></ol>'],
            ['code', 'mkdir meu-projeto && cd meu-projeto\ngit init\necho "# Meu projeto" > README.md\ngit add README.md\ngit commit -m "Primeiro commit: adiciona o README"\ngit log --oneline', 'bash'],
            ['text', '<blockquote><p><strong>Boa prática:</strong> escreva a mensagem do commit no imperativo e diga <em>o que</em> mudou e <em>por quê</em>, não só “ajustes”.</p></blockquote><p>Rode <code>git status</code> sempre que ficar em dúvida: ele mostra o que está pronto para entrar no próximo commit.</p>'],
          ].map(([type, content, language], order) => ({ id: id(4100 + order), parentId: id(4021), type, content, language: language ?? null, order })),
        },
        { id: id(4022), title: 'Branches e merges', blocks: [] },
        { id: id(4023), title: 'Pull requests', blocks: [] },
      ],
    },
  ],
}

// --------------------------------------------------------------------------------------- mensagens, notificações

export const CONVERSATIONS = [
  { partner: user(PEOPLE.prof), lastMessageId: id(5001), lastMessagePreview: 'Parabéns! Seu código passou em todos os testes 🎉', lastMessageDeleted: false, lastMessageMine: false, lastMessageAt: iso(0, 14), lastMessageEdited: false, unreadCount: 1 },
  { partner: user(PEOPLE.marina), lastMessageId: id(5002), lastMessagePreview: 'Você: Obrigada pela dica de flexbox!', lastMessageDeleted: false, lastMessageMine: true, lastMessageAt: iso(2, 18), lastMessageEdited: false, unreadCount: 0 },
  { partner: user(PEOPLE.rafael), lastMessageId: id(5003), lastMessagePreview: 'Posso te mandar o material de SQL amanhã?', lastMessageDeleted: false, lastMessageMine: false, lastMessageAt: iso(5, 10), lastMessageEdited: false, unreadCount: 0 },
]

export const THREAD_WITH_PROF = [
  { id: id(5101), sender: user(PEOPLE.prof), mine: false, content: 'Oi! Vi que você chegou na aula de desconto por quantidade. Ficou alguma dúvida?', at: iso(1, 15) },
  { id: id(5102), sender: STUDENT, mine: true, content: 'Oi, professor! Não entendi por que o teste com 10 pães falhava.', at: iso(1, 16) },
  { id: id(5103), sender: user(PEOPLE.prof), mine: false, content: 'Olhe a condição do if: a regra diz “10 ou mais”, mas o código usa “mais que 10”. É um clássico erro de fronteira.', at: iso(1, 16) },
  { id: id(5104), sender: STUDENT, mine: true, content: 'Achei! Troquei por >= e agora passa em todos os testes.', at: iso(0, 13) },
  { id: id(5105), sender: user(PEOPLE.prof), mine: false, content: 'Parabéns! Seu código passou em todos os testes 🎉', at: iso(0, 14) },
].map((m) => ({
  id: m.id, sender: m.sender, recipientId: m.mine ? PEOPLE.prof.id : STUDENT.id, content: m.content, deleted: false, edited: false, editedAt: null, createdAt: m.at,
  read: true, canEdit: m.mine, canDelete: m.mine, parent: null,
}))

export const NOTIFICATIONS = [
  { id: id(6001), type: 'enrollment', entityKind: 'course', entityId: COURSE_BY_N(1).id, entityTitle: COURSE_BY_N(1).name, entityLink: `/courses/professor-demo/${COURSE_BY_N(1).slug}`, actor: user(PEOPLE.marina), read: false, createdAt: iso(0, 15) },
  { id: id(6002), type: 'comment', entityKind: 'course', entityId: COURSE_BY_N(1).id, entityTitle: COURSE_BY_N(1).name, entityLink: `/courses/professor-demo/${COURSE_BY_N(1).slug}`, actor: user(PEOPLE.rafael), read: false, createdAt: iso(1, 9) },
  { id: id(6003), type: 'trilha_follow', entityKind: 'trilha', entityId: TRILHAS[0].id, entityTitle: TRILHAS[0].title, entityLink: `/trilhas/professor-demo/${TRILHAS[0].slug}`, actor: user(PEOPLE.bruno), read: true, createdAt: iso(3, 11) },
]

export const COMMENTS = [
  { id: id(7001), parentId: null, author: user(PEOPLE.marina), content: 'Adorei a ideia de aprender consertando código de verdade. Os exemplos da padaria são ótimos!', canDelete: false, createdAt: iso(2, 12), updatedAt: iso(2, 12),
    replies: [{ id: id(7002), parentId: id(7001), author: user(PEOPLE.prof), content: 'Obrigado, Marina! Em breve saem novos módulos em outras linguagens.', canDelete: false, createdAt: iso(2, 14), updatedAt: iso(2, 14), replies: [] }] },
  { id: id(7003), parentId: null, author: user(PEOPLE.rafael), content: 'Sugestão: um exercício sobre juros compostos no fechamento do caixa.', canDelete: false, createdAt: iso(1, 9), updatedAt: iso(1, 9), replies: [] },
]

// ------------------------------------------------------------------------ curso de exercícios (padaria do Seu Zé)

export const COURSE_ID = COURSE_BY_N(1).id
export const SLUG = COURSE_BY_N(1).slug
export const OWNER = user(PEOPLE.prof)

const pyStarter = `# caixa.py - Padaria Pão Quente
# Preços sempre em centavos (um pão francês custa 50).

def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade > 10:
        total = total * 90 // 100
    return total
`
export const PY_SOLUTION = `def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade >= 10:
        total = total * 90 // 100
    return total
`
const rustStarter = `// tarifa.rs - cobrança do Estacionamento Central
// Valores em centavos.

fn valor_do_estacionamento(minutos: i32) -> i32 {
    if minutos <= 15 {
        return 0;
    }
    let horas = (minutos - 15) / 60;
    let valor = horas * 500;
    if valor > 4000 { 4000 } else { valor }
}
`
const goStarter = `// frete.go - cálculo de frete da Casa do Pedreiro
// Todos os valores em centavos.

func frete(pesoGramas int, expresso bool) int {
    valor := 0
    if pesoGramas < 500 {
        valor = 1500
    } else if pesoGramas < 2000 {
        valor = 2500
    } else {
        valor = 2500 + (pesoGramas-2000)/1000*500
    }
    if expresso {
        valor = valor * 2
    }
    return valor
}
`
export const GO_SOLUTION = goStarter.replace('pesoGramas < 500', 'pesoGramas <= 500').replace('pesoGramas < 2000', 'pesoGramas <= 2000')

const text = (n, parent, html) => ({ id: id(n), parentId: parent, type: 'text', content: html, language: null, order: 0 })
const scene = (title, story, file, rules) =>
  `<h3>${title}</h3><p>${story}</p><p>Arquivo: <code>${file}</code></p><ul>${rules.map((r) => `<li>${r}</li>`).join('')}</ul>` +
  '<p>Use <em>Executar exemplos</em> para testar com os casos visiveis e <em>Enviar solucao</em> para valer: alguns testes ficam escondidos e cobrem os casos de borda.</p>'

export const EX = {
  py: { block: id(110), lesson: id(100) },
  rust: { block: id(120), lesson: id(101) },
  go: { block: id(130), lesson: id(102) },
}

const publicContent = {
  py: { mode: 'function', title: 'Desconto por quantidade', functionName: 'preco_com_desconto', params: ['preco_unitario', 'quantidade'], starterCode: pyStarter,
    examples: [{ args: [50, 10], expected: 450 }, { args: [50, 9], expected: 450 }], hiddenCount: 5 },
  rust: { mode: 'function', title: 'Valor do estacionamento', functionName: 'valor_do_estacionamento', params: ['minutos'], paramTypes: ['int'], returnType: 'int', starterCode: rustStarter,
    examples: [{ args: [16], expected: 500 }, { args: [75], expected: 500 }], hiddenCount: 5 },
  go: { mode: 'function', title: 'Cálculo do frete', functionName: 'frete', params: ['pesoGramas', 'expresso'], paramTypes: ['int', 'boolean'], returnType: 'int', starterCode: goStarter,
    examples: [{ args: [500, false], expected: 1500 }, { args: [501, false], expected: 2500 }], hiddenCount: 6 },
}

export const LESSONS = [
  { id: id(90), title: 'Sobre este curso', blocks: [text(91, id(90), '<p>Bem-vindo! Cada aula tem um <strong>exercício de código</strong> corrigido automaticamente, com um trecho de sistema de verdade para você consertar.</p>')] },
  { id: EX.py.lesson, title: 'Desconto por quantidade', blocks: [
    text(111, EX.py.lesson, scene('O desconto não está pegando', 'O Seu Zé prometeu: <strong>quem leva 10 pães ou mais ganha 10% de desconto no total</strong>. Só que ontem um cliente levou exatamente 10 pães e pagou sem desconto.', 'caixa.py',
      ['A partir de 10 unidades (inclusive), o total ganha 10% de desconto.', 'O desconto é arredondado para baixo: o total final é um número inteiro de centavos.', 'Com menos de 10 unidades o preço é só preço × quantidade.'])),
    { id: EX.py.block, parentId: EX.py.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.py), language: 'python', order: 1 },
  ] },
  { id: EX.rust.lesson, title: 'Tarifa do estacionamento', blocks: [
    text(121, EX.rust.lesson, scene('Uma hora e um minuto cobra só uma hora', 'Os clientes que passam alguns minutos da hora cheia não pagam a hora seguinte: a divisão de inteiros no Rust arredonda para baixo.', 'tarifa.rs',
      ['Os primeiros 15 minutos são grátis.', 'Depois disso, R$ 5,00 (500 centavos) por hora <strong>começada</strong>.', 'O valor máximo do dia é R$ 40,00 (4000 centavos).'])),
    { id: EX.rust.block, parentId: EX.rust.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.rust), language: 'rust', order: 1 },
  ] },
  { id: EX.go.lesson, title: 'Cálculo de frete', blocks: [
    text(131, EX.go.lesson, scene('O frete cobra mais do que deveria', 'Clientes com pedidos de exatamente 500 g estão pagando a faixa de cima.', 'frete.go',
      ['Até 500 g (inclusive): R$ 15,00 (1500).', 'Acima de 2 kg: R$ 25,00 mais R$ 5,00 por <strong>quilo extra começado</strong>.'])),
    { id: EX.go.block, parentId: EX.go.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.go), language: 'go', order: 1 },
  ] },
  { id: id(103), title: 'A etiqueta da vitrine', blocks: [] },
  { id: id(104), title: 'Fechamento do caixa', blocks: [] },
]

export const TESTS = {
  py: [
    { visible: true, args: [50, 10], expected: 450 }, { visible: true, args: [50, 9], expected: 450 }, { visible: false, args: [200, 20], expected: 3600 },
    { visible: false, args: [333, 10], expected: 2997 }, { visible: false, args: [333, 11], expected: 3296 }, { visible: false, args: [100, 1], expected: 100 }, { visible: false, args: [70, 0], expected: 0 },
  ],
  go: [
    { visible: true, args: [500, false], expected: 1500 }, { visible: true, args: [501, false], expected: 2500 }, { visible: false, args: [2000, false], expected: 2500 },
    { visible: false, args: [2001, false], expected: 3000 }, { visible: false, args: [3001, true], expected: 7000 }, { visible: false, args: [100, true], expected: 3000 }, { visible: false, args: [0, false], expected: 1500 },
  ],
}

export const ownerSpec = (key) =>
  key === 'go'
    ? { language: 'go', exercise: { mode: 'function', title: 'Cálculo do frete', functionName: 'frete', params: ['pesoGramas', 'expresso'], paramTypes: ['int', 'boolean'], returnType: 'int', starterCode: goStarter, solutionCode: GO_SOLUTION, tests: TESTS.go } }
    : { language: 'python', exercise: { mode: 'function', title: 'Desconto por quantidade', functionName: 'preco_com_desconto', params: ['preco_unitario', 'quantidade'], paramTypes: null, returnType: null, starterCode: pyStarter, solutionCode: PY_SOLUTION, tests: TESTS.py } }
