"""JavaScript (loja online), TypeScript (secretaria da escola) e Node.js (pedidos)."""
from .base import Pack, function_exercise, lesson_text, t, tests

# =========================================================================== JavaScript

TOTAL_STARTER = '''// carrinho.js - carrinho da Loja da Camila
// Cada item é { nome, preco, quantidade } e o preço está em centavos.

function totalDoCarrinho(carrinho) {
  let total = 0;
  for (const item of carrinho) {
    total += item.preco;
  }
  return total;
}
'''

TOTAL_SOLUCAO = '''function totalDoCarrinho(carrinho) {
  return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
}
'''

CUPOM_STARTER = '''// cupom.js - cupons de desconto da Loja da Camila
// cupom = { tipo: "percentual" | "fixo", valor: número }
//   percentual: valor é uma porcentagem (10 = 10%)   fixo: valor é um desconto em centavos

function aplicarCupom(total, cupom) {
  if (cupom.tipo === "percentual") {
    return Math.round(total - (total * cupom.valor) / 100);
  }
  return total - cupom.valor;
}
'''

CUPOM_SOLUCAO = '''function aplicarCupom(total, cupom) {
  let final = total;
  if (cupom.tipo === "percentual") {
    final = Math.round(total - (total * cupom.valor) / 100);
  } else if (cupom.tipo === "fixo") {
    final = total - cupom.valor;
  }
  return Math.max(final, 0);
}
'''

CATEGORIA_STARTER = '''// vitrine.js - página de categorias da Loja da Camila
// Cada produto é { nome, categoria }.

function agruparPorCategoria(produtos) {
  return produtos.reduce((grupos, produto) => {
    grupos[produto.categoria] = [produto.nome];
    return grupos;
  }, {});
}
'''

CATEGORIA_SOLUCAO = '''function agruparPorCategoria(produtos) {
  return produtos.reduce((grupos, produto) => {
    if (!grupos[produto.categoria]) {
      grupos[produto.categoria] = [];
    }
    grupos[produto.categoria].push(produto.nome);
    return grupos;
  }, {});
}
'''

CAROS_STARTER = '''// vitrine.js - "mais caros da loja" na página inicial
// Cada produto é { nome, preco }.

function maisCaros(produtos, quantidade) {
  return produtos
    .sort((a, b) => a.preco - b.preco)
    .slice(0, quantidade)
    .map((produto) => produto.nome);
}
'''

CAROS_SOLUCAO = '''function maisCaros(produtos, quantidade) {
  return [...produtos]
    .sort((a, b) => b.preco - a.preco || a.nome.localeCompare(b.nome))
    .slice(0, quantidade)
    .map((produto) => produto.nome);
}
'''

PRECO_STARTER = '''// formato.js - exibição de preços na loja
// O preço chega em centavos (123456 = R$ 1.234,56).

function formatarPreco(centavos) {
  return "R$ " + centavos / 100;
}
'''

PRECO_SOLUCAO = '''function formatarPreco(centavos) {
  const reais = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  const milhares = String(reais).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  return "R$ " + milhares + "," + resto;
}
'''

PACK_JS = Pack(
    match=["JavaScript e ECMAScript"],
    new_course="Oficina de JavaScript: a loja online da Camila",
    description="Arrays, objetos e funções de ordem superior consertando o carrinho de uma loja virtual.",
    categories=["javascript", "exercicios"],
    intro=(
        "<p>A Camila vende roupas pela internet e o site foi feito às pressas. Em cada aula você recebe um trecho do "
        "código real da loja, a regra do negócio e o defeito que os clientes estão relatando. Corrija a função, teste "
        "e envie.</p>"
    ),
    modules=[
        (
            "Prática: a loja online da Camila (JavaScript)",
            [
                (
                    "Total do carrinho",
                    [
                        lesson_text(
                            "O carrinho ignora a quantidade",
                            "Um cliente colocou 3 camisetas no carrinho e o total mostrou o valor de uma só.",
                            "carrinho.js",
                            ["Total = soma de <code>preco × quantidade</code> de cada item (em centavos).", "Carrinho vazio: 0."],
                            "<code>reduce</code> resolve em uma linha, mas um <code>for</code> também serve.",
                        ),
                        function_exercise(
                            "javascript", "Total do carrinho", "totalDoCarrinho", ["carrinho"], TOTAL_STARTER, TOTAL_SOLUCAO,
                            tests(
                                t([[{"nome": "camiseta", "preco": 4990, "quantidade": 3}, {"nome": "meia", "preco": 1500, "quantidade": 2}]], 17970),
                                t([[]], 0),
                                t([[{"nome": "boné", "preco": 3000, "quantidade": 1}]], 3000),
                                t([[{"nome": "brinde", "preco": 0, "quantidade": 5}, {"nome": "cinto", "preco": 8000, "quantidade": 2}]], 16000),
                            ),
                        ),
                    ],
                ),
                (
                    "Cupons de desconto",
                    [
                        lesson_text(
                            "Cupom que deixa a loja devendo",
                            "Uma cliente usou um cupom fixo de R$ 50 numa compra de R$ 30 e o sistema calculou um total <em>negativo</em>. "
                            "Além disso, um cupom de tipo desconhecido derrubava o site.",
                            "cupom.js",
                            [
                                "<code>percentual</code>: desconta a porcentagem e arredonda para o centavo mais próximo.",
                                "<code>fixo</code>: desconta o valor em centavos.",
                                "O total final <strong>nunca é menor que zero</strong>.",
                                "Tipo desconhecido: o total fica como está.",
                            ],
                        ),
                        function_exercise(
                            "javascript", "Aplicar cupom", "aplicarCupom", ["total", "cupom"], CUPOM_STARTER, CUPOM_SOLUCAO,
                            tests(
                                t([10000, {"tipo": "percentual", "valor": 10}], 9000),
                                t([3000, {"tipo": "fixo", "valor": 5000}], 0),
                                t([10000, {"tipo": "fixo", "valor": 1500}], 8500),
                                t([999, {"tipo": "percentual", "valor": 15}], 849),
                                t([5000, {"tipo": "frete-gratis", "valor": 1}], 5000),
                                t([5000, {"tipo": "percentual", "valor": 100}], 0),
                            ),
                        ),
                    ],
                ),
                (
                    "Vitrine por categoria",
                    [
                        lesson_text(
                            "Só aparece um produto em cada categoria",
                            "A página de categorias mostra apenas o último produto cadastrado de cada uma: "
                            "o código <em>substitui</em> a lista a cada produto.",
                            "vitrine.js",
                            ["Devolva um objeto <code>{ categoria: [nomes dos produtos] }</code>.", "A ordem dos nomes é a ordem de cadastro."],
                        ),
                        function_exercise(
                            "javascript", "Agrupar por categoria", "agruparPorCategoria", ["produtos"], CATEGORIA_STARTER, CATEGORIA_SOLUCAO,
                            tests(
                                t([[{"nome": "camiseta", "categoria": "roupas"}, {"nome": "tênis", "categoria": "calçados"}, {"nome": "calça", "categoria": "roupas"}]],
                                  {"roupas": ["camiseta", "calça"], "calçados": ["tênis"]}),
                                t([[]], {}),
                                t([[{"nome": "boné", "categoria": "acessórios"}]], {"acessórios": ["boné"]}),
                            ),
                        ),
                    ],
                ),
                (
                    "Os mais caros da loja",
                    [
                        lesson_text(
                            "A vitrine mostra os mais baratos",
                            "O destaque \"mais caros\" da página inicial está mostrando os <em>mais baratos</em>. E tem mais: "
                            "o <code>sort()</code> embaralha o array original, que outras partes do site ainda usam.",
                            "vitrine.js",
                            [
                                "Devolva os nomes dos <code>quantidade</code> produtos mais caros, do mais caro para o mais barato.",
                                "Em caso de preços iguais, ordem alfabética pelo nome.",
                                "Não altere o array recebido.",
                            ],
                            "<code>[...lista]</code> copia o array antes de ordenar.",
                        ),
                        function_exercise(
                            "javascript", "Mais caros", "maisCaros", ["produtos", "quantidade"], CAROS_STARTER, CAROS_SOLUCAO,
                            tests(
                                t([[{"nome": "A", "preco": 100}, {"nome": "B", "preco": 300}, {"nome": "C", "preco": 200}], 2], ["B", "C"]),
                                t([[{"nome": "A", "preco": 100}], 3], ["A"]),
                                t([[{"nome": "zebra", "preco": 500}, {"nome": "abelha", "preco": 500}, {"nome": "gato", "preco": 100}], 2], ["abelha", "zebra"]),
                                t([[], 2], []),
                            ),
                        ),
                    ],
                ),
                (
                    "Preço bonito na tela",
                    [
                        lesson_text(
                            "R$ 12.5 não é um preço",
                            "O preço aparece como <code>R$ 12.5</code>, sem a vírgula e sem os zeros que faltam. "
                            "Um brasileiro espera <code>R$ 12,50</code>, e com ponto nos milhares: <code>R$ 1.234,56</code>.",
                            "formato.js",
                            [
                                "Receba centavos (inteiro) e devolva <code>R$ reais,centavos</code>.",
                                "Os centavos têm sempre 2 dígitos.",
                                "Use ponto a cada 3 dígitos dos reais.",
                            ],
                            "<code>String(n).padStart(2, \"0\")</code> completa com zero à esquerda.",
                        ),
                        function_exercise(
                            "javascript", "Formatar preço", "formatarPreco", ["centavos"], PRECO_STARTER, PRECO_SOLUCAO,
                            tests(
                                t([1250], "R$ 12,50"), t([123456], "R$ 1.234,56"), t([0], "R$ 0,00"), t([5], "R$ 0,05"),
                                t([100000000], "R$ 1.000.000,00"), t([99999], "R$ 999,99"), t([100000], "R$ 1.000,00"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== TypeScript

MEDIA_STARTER = '''// boletim.ts - boletim do Colégio Horizonte

function calcularMedia(notas: number[]): number {
  const soma = notas.reduce((total, nota) => total + nota, 0);
  return Math.round(soma / 4);
}
'''

MEDIA_SOLUCAO = '''function calcularMedia(notas: number[]): number {
  if (notas.length === 0) {
    return 0;
  }
  const soma = notas.reduce((total, nota) => total + nota, 0);
  return Math.round((soma / notas.length) * 10) / 10;
}
'''

SITUACAO_STARTER = '''// boletim.ts - fechamento do ano

type Situacao = "aprovado" | "recuperacao" | "reprovado";

function situacaoDoAluno(media: number, faltas: number, totalAulas: number): Situacao {
  if (media >= 7) {
    return "aprovado";
  }
  if (media >= 5) {
    return "recuperacao";
  }
  return "reprovado";
}
'''

SITUACAO_SOLUCAO = '''type Situacao = "aprovado" | "recuperacao" | "reprovado";

function situacaoDoAluno(media: number, faltas: number, totalAulas: number): Situacao {
  const frequencia = ((totalAulas - faltas) / totalAulas) * 100;
  if (frequencia < 75) {
    return "reprovado";
  }
  if (media >= 7) {
    return "aprovado";
  }
  if (media >= 5) {
    return "recuperacao";
  }
  return "reprovado";
}
'''

RANKING_STARTER = '''// ranking.ts - quadro de honra da turma

interface Aluno {
  nome: string;
  media: number;
}

function quadroDeHonra(alunos: Aluno[]): string[] {
  return alunos
    .sort((a, b) => a.media - b.media)
    .map((aluno) => aluno.nome);
}
'''

RANKING_SOLUCAO = '''interface Aluno {
  nome: string;
  media: number;
}

function quadroDeHonra(alunos: Aluno[]): string[] {
  return [...alunos]
    .sort((a, b) => b.media - a.media || (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0))
    .map((aluno) => aluno.nome);
}
'''

CHAMADA_STARTER = '''// chamada.ts - lista de faltosos do dia

function faltosos(matriculados: string[], presentes: string[]): string[] {
  return matriculados.filter((aluno) => presentes.indexOf(aluno) > 0).sort();
}
'''

CHAMADA_SOLUCAO = '''function faltosos(matriculados: string[], presentes: string[]): string[] {
  const presentesSet = new Set(presentes);
  return matriculados.filter((aluno) => !presentesSet.has(aluno)).sort();
}
'''

PACK_TS = Pack(
    match=["TypeScript"],
    new_course="Oficina de TypeScript: a secretaria da escola",
    description="TypeScript no dia a dia de uma secretaria escolar: médias, situação do aluno, ranking e chamada.",
    categories=["typescript", "exercicios"],
    intro=(
        "<p>A secretaria do <strong>Colégio Horizonte</strong> migrou o sistema para TypeScript, mas ainda tem bugs "
        "herdados da versão antiga. Em cada aula você conserta uma função do código real da secretaria. O compilador do "
        "TypeScript roda junto: se houver erro de tipo, ele aparece como erro de compilação.</p>"
    ),
    modules=[
        (
            "Prática: a secretaria da escola (TypeScript)",
            [
                (
                    "Média das notas",
                    [
                        lesson_text(
                            "A média está dividindo por quatro sempre",
                            "O boletim assume que todo aluno tem 4 notas. Quem tem 3 notas sai com a média errada, e quem ainda "
                            "não tem nenhuma sai com <code>NaN</code>.",
                            "boletim.ts",
                            [
                                "Média aritmética das notas, arredondada para <strong>uma casa decimal</strong>.",
                                "Sem notas, a média é <code>0</code>.",
                            ],
                            "para arredondar com uma casa: <code>Math.round(x * 10) / 10</code>.",
                        ),
                        function_exercise(
                            "typescript", "Média do aluno", "calcularMedia", ["notas"], MEDIA_STARTER, MEDIA_SOLUCAO,
                            tests(t([[7, 8, 9]], 8), t([[5, 6.5]], 5.8), t([[]], 0), t([[10, 9.5, 10, 10]], 9.9), t([[6]], 6)),
                        ),
                    ],
                ),
                (
                    "Situação do aluno",
                    [
                        lesson_text(
                            "Aprovado mesmo faltando metade do ano",
                            "A regra do colégio exige <strong>75% de frequência</strong>, mas a função atual só olha a média: "
                            "um aluno com média 9 e 20 faltas saiu aprovado.",
                            "boletim.ts",
                            [
                                "Frequência abaixo de 75% (faltas em relação ao total de aulas): <code>\"reprovado\"</code>, qualquer que seja a média.",
                                "Com frequência suficiente: média ≥ 7 é <code>\"aprovado\"</code>; de 5 até menos de 7, <code>\"recuperacao\"</code>; abaixo de 5, <code>\"reprovado\"</code>.",
                                "Exatamente 75% de frequência ainda é suficiente.",
                            ],
                        ),
                        function_exercise(
                            "typescript", "Situação do aluno", "situacaoDoAluno", ["media", "faltas", "totalAulas"],
                            SITUACAO_STARTER, SITUACAO_SOLUCAO,
                            tests(
                                t([7, 0, 40], "aprovado"), t([6.9, 0, 40], "recuperacao"), t([4.9, 0, 40], "reprovado"),
                                t([9, 11, 40], "reprovado"), t([9, 10, 40], "aprovado"), t([5, 0, 40], "recuperacao"),
                            ),
                        ),
                    ],
                ),
                (
                    "Quadro de honra",
                    [
                        lesson_text(
                            "O quadro de honra está de cabeça para baixo",
                            "O mural da escola lista primeiro quem tem as <em>piores</em> médias. Além disso, a função embaralha "
                            "a lista original de alunos, que a secretaria usa depois em ordem alfabética.",
                            "ranking.ts",
                            [
                                "Devolva os nomes ordenados da maior para a menor média.",
                                "Médias iguais: ordem alfabética.",
                                "Não altere o array recebido.",
                            ],
                        ),
                        function_exercise(
                            "typescript", "Quadro de honra", "quadroDeHonra", ["alunos"], RANKING_STARTER, RANKING_SOLUCAO,
                            tests(
                                t([[{"nome": "Ana", "media": 7}, {"nome": "Bia", "media": 9.5}, {"nome": "Caio", "media": 8}]], ["Bia", "Caio", "Ana"]),
                                t([[{"nome": "Duda", "media": 8}, {"nome": "Beto", "media": 8}]], ["Beto", "Duda"]),
                                t([[]], []),
                                t([[{"nome": "Zé", "media": 5}]], ["Zé"]),
                            ),
                        ),
                    ],
                ),
                (
                    "A chamada do dia",
                    [
                        lesson_text(
                            "Quem faltou hoje?",
                            "A lista de faltosos vem sempre errada: ela mostra quem <em>veio</em> (e esquece quem estava na primeira posição).",
                            "chamada.ts",
                            [
                                "Devolva os matriculados que <strong>não</strong> estão na lista de presentes.",
                                "A resposta sai em ordem alfabética.",
                            ],
                        ),
                        function_exercise(
                            "typescript", "Faltosos do dia", "faltosos", ["matriculados", "presentes"], CHAMADA_STARTER, CHAMADA_SOLUCAO,
                            tests(
                                t([["Ana", "Bia", "Caio"], ["Bia"]], ["Ana", "Caio"]), t([["Ana", "Bia"], ["Ana", "Bia"]], []),
                                t([["Zeca", "Ana"], []], ["Ana", "Zeca"]), t([[], ["Ana"]], []),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Node.js

QUERY_STARTER = '''// query.js - leitura dos parâmetros de busca da API de pedidos
// Exemplo: "nome=Ana&idade=30" -> { nome: "Ana", idade: "30" }

function parseQueryString(qs) {
  const resultado = {};
  for (const par of qs.split("&")) {
    const [chave, valor] = par.split("=");
    resultado[chave] = valor;
  }
  return resultado;
}
'''

QUERY_SOLUCAO = '''function parseQueryString(qs) {
  const resultado = {};
  if (qs === "") {
    return resultado;
  }
  for (const par of qs.split("&")) {
    const indice = par.indexOf("=");
    const chave = indice === -1 ? par : par.slice(0, indice);
    const valor = indice === -1 ? "" : par.slice(indice + 1);
    resultado[decodeURIComponent(chave)] = decodeURIComponent(valor);
  }
  return resultado;
}
'''

PEDIDO_STARTER = '''// validacao.js - validação dos pedidos que chegam na API
// pedido = { cliente: string, itens: [{ produto: string, quantidade: number }] }
// Devolve a lista de mensagens de erro (vazia quando o pedido é válido).

function validarPedido(pedido) {
  const erros = [];
  if (!pedido.cliente) {
    erros.push("cliente é obrigatório");
  }
  return erros;
}
'''

PEDIDO_SOLUCAO = '''function validarPedido(pedido) {
  const erros = [];
  if (typeof pedido.cliente !== "string" || pedido.cliente.trim() === "") {
    erros.push("cliente é obrigatório");
  }
  if (!Array.isArray(pedido.itens) || pedido.itens.length === 0) {
    erros.push("o pedido precisa de pelo menos um item");
  } else {
    pedido.itens.forEach((item, indice) => {
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        erros.push(`item ${indice + 1}: quantidade inválida`);
      }
    });
  }
  return erros;
}
'''

PAGINA_STARTER = '''// paginacao.js - listagem paginada de pedidos (as páginas começam em 1)

function paginar(itens, pagina, porPagina) {
  const inicio = pagina * porPagina;
  const fim = inicio + porPagina;
  return {
    itens: itens.slice(inicio, fim),
    totalPaginas: Math.floor(itens.length / porPagina),
    temProxima: fim < itens.length,
  };
}
'''

PAGINA_SOLUCAO = '''function paginar(itens, pagina, porPagina) {
  const inicio = (pagina - 1) * porPagina;
  const fim = inicio + porPagina;
  return {
    itens: itens.slice(inicio, fim),
    totalPaginas: Math.ceil(itens.length / porPagina),
    temProxima: fim < itens.length,
  };
}
'''

PACK_NODE = Pack(
    match=["Node.js"],
    new_course="Oficina de Node.js: a API de pedidos",
    description="Funções de uma API em Node.js: parâmetros de busca, validação de pedidos e paginação.",
    categories=["nodejs", "javascript", "exercicios"],
    intro=(
        "<p>A API de pedidos de uma pizzaria está no ar, mas os clientes reclamam de buscas que não funcionam e de "
        "pedidos inválidos que passam. Em cada aula você conserta uma função do código da API.</p>"
    ),
    modules=[
        (
            "Prática: a API de pedidos (Node.js)",
            [
                (
                    "Parâmetros de busca",
                    [
                        lesson_text(
                            "A busca por \"pão quente\" não funciona",
                            "Os parâmetros de busca chegam codificados (<code>q=p%C3%A3o%20quente</code>), e o código atual não os "
                            "decodifica. Um parâmetro sem valor (<code>?flag</code>) também vira <code>undefined</code>.",
                            "query.js",
                            [
                                "Transforme <code>\"a=1&b=2\"</code> em <code>{ a: \"1\", b: \"2\" }</code> (valores sempre texto).",
                                "Decodifique chaves e valores com <code>decodeURIComponent</code>.",
                                "Parâmetro sem <code>=</code> fica com valor <code>\"\"</code>; se a chave se repete, vale a última; texto vazio devolve <code>{}</code>.",
                            ],
                        ),
                        function_exercise(
                            "javascript", "Ler a query string", "parseQueryString", ["qs"], QUERY_STARTER, QUERY_SOLUCAO,
                            tests(
                                t(["nome=Ana&idade=30"], {"nome": "Ana", "idade": "30"}),
                                t(["q=p%C3%A3o%20quente"], {"q": "pão quente"}),
                                t(["flag"], {"flag": ""}), t([""], {}), t(["a=1&a=2"], {"a": "2"}),
                                t(["expressao=1%2B1%3D2"], {"expressao": "1+1=2"}),
                            ),
                        ),
                    ],
                ),
                (
                    "Validação do pedido",
                    [
                        lesson_text(
                            "Pedidos vazios chegando na cozinha",
                            "A API só confere se o cliente foi informado, e a cozinha recebeu pedidos sem nenhum item e com "
                            "quantidade zero ou negativa.",
                            "validacao.js",
                            [
                                "<code>\"cliente é obrigatório\"</code> se o cliente for vazio, só espaços ou não for texto.",
                                "<code>\"o pedido precisa de pelo menos um item\"</code> se não houver itens.",
                                "Para cada item com quantidade que não seja inteiro positivo: <code>\"item N: quantidade inválida\"</code> (N começa em 1).",
                                "Devolva as mensagens nesta ordem; pedido válido devolve <code>[]</code>.",
                            ],
                        ),
                        function_exercise(
                            "javascript", "Validar pedido", "validarPedido", ["pedido"], PEDIDO_STARTER, PEDIDO_SOLUCAO,
                            tests(
                                t([{"cliente": "Ana", "itens": [{"produto": "pizza", "quantidade": 2}]}], []),
                                t([{"cliente": "", "itens": []}], ["cliente é obrigatório", "o pedido precisa de pelo menos um item"]),
                                t([{"cliente": "Bia", "itens": [{"produto": "pizza", "quantidade": 1}, {"produto": "suco", "quantidade": 0}]}],
                                  ["item 2: quantidade inválida"]),
                                t([{"cliente": "  ", "itens": [{"produto": "x", "quantidade": 1.5}]}],
                                  ["cliente é obrigatório", "item 1: quantidade inválida"]),
                                t([{"cliente": "Caio"}], ["o pedido precisa de pelo menos um item"]),
                            ),
                        ),
                    ],
                ),
                (
                    "Paginação",
                    [
                        lesson_text(
                            "A primeira página vem vazia",
                            "O app pede a página 1 e recebe a segunda; a página 0 devolve a primeira. Além disso o total de páginas "
                            "ignora a última página incompleta.",
                            "paginacao.js",
                            [
                                "As páginas começam em <strong>1</strong>.",
                                "<code>totalPaginas</code>: quantas páginas são necessárias (a última pode ficar incompleta).",
                                "<code>temProxima</code>: <code>true</code> se existir página depois da atual.",
                            ],
                        ),
                        function_exercise(
                            "javascript", "Paginar pedidos", "paginar", ["itens", "pagina", "porPagina"], PAGINA_STARTER, PAGINA_SOLUCAO,
                            tests(
                                t([[1, 2, 3, 4, 5], 1, 2], {"itens": [1, 2], "totalPaginas": 3, "temProxima": True}),
                                t([[1, 2, 3, 4, 5], 3, 2], {"itens": [5], "totalPaginas": 3, "temProxima": False}),
                                t([[1, 2, 3, 4], 2, 2], {"itens": [3, 4], "totalPaginas": 2, "temProxima": False}),
                                t([[], 1, 10], {"itens": [], "totalPaginas": 0, "temProxima": False}),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)
