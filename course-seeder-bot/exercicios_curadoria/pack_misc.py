"""Go (loja de material de construcao), Kotlin (biblioteca do bairro) e Python para automacoes."""
from .base import Pack, function_exercise, lesson_text, out, output_exercise, t, tests

# =========================================================================== Go

FRETE_STARTER = '''// frete.go - cálculo de frete da Casa do Pedreiro
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
'''

FRETE_SOLUCAO = '''func frete(pesoGramas int, expresso bool) int {
	valor := 0
	if pesoGramas <= 500 {
		valor = 1500
	} else if pesoGramas <= 2000 {
		valor = 2500
	} else {
		quilosExtras := (pesoGramas - 2000 + 999) / 1000
		valor = 2500 + quilosExtras*500
	}
	if expresso {
		valor = valor * 2
	}
	return valor
}
'''

PALAVRA_STARTER = '''// busca.go - busca de produtos no catálogo da Casa do Pedreiro
import "strings"

func ocorrenciasDaPalavra(texto string, palavra string) int {
	return strings.Count(texto, palavra)
}
'''

PALAVRA_SOLUCAO = '''import "strings"

func ocorrenciasDaPalavra(texto string, palavra string) int {
	total := 0
	alvo := strings.ToLower(palavra)
	for _, atual := range strings.Fields(texto) {
		if strings.ToLower(strings.Trim(atual, ".,;:!?")) == alvo {
			total++
		}
	}
	return total
}
'''

REPOR_STARTER = '''// estoque.go - alerta de reposição do depósito
// estoque[i] é a quantidade do produto i. Devolva as POSIÇÕES dos produtos abaixo do mínimo.

func reporEstoque(estoque []int, minimo int) []int {
	var precisam []int
	for _, quantidade := range estoque {
		if quantidade < minimo {
			precisam = append(precisam, quantidade)
		}
	}
	return precisam
}
'''

REPOR_SOLUCAO = '''func reporEstoque(estoque []int, minimo int) []int {
	var precisam []int
	for posicao, quantidade := range estoque {
		if quantidade < minimo {
			precisam = append(precisam, posicao)
		}
	}
	return precisam
}
'''

LOTES_STARTER = '''// entregas.go - separação das entregas em lotes por caminhão
// Cada caminhão leva `tamanho` pedidos. Devolva a soma dos valores de cada lote.

func somarLotes(itens []int, tamanho int) []int {
	var somas []int
	for i := 0; i+tamanho < len(itens); i += tamanho {
		soma := 0
		for _, valor := range itens[i : i+tamanho] {
			soma += valor
		}
		somas = append(somas, soma)
	}
	return somas
}
'''

LOTES_SOLUCAO = '''func somarLotes(itens []int, tamanho int) []int {
	var somas []int
	for i := 0; i < len(itens); i += tamanho {
		fim := i + tamanho
		if fim > len(itens) {
			fim = len(itens)
		}
		soma := 0
		for _, valor := range itens[i:fim] {
			soma += valor
		}
		somas = append(somas, soma)
	}
	return somas
}
'''

PESO_STARTER = '''package main

import "fmt"

// pesagem.go - balança do depósito.
// Entrada: N e depois N pesos em gramas, um por linha.
// Saída: "Peso total: X.XX kg" (duas casas decimais).

func main() {
	var n int
	fmt.Scan(&n)
	total := 0
	for i := 0; i < n; i++ {
		var peso int
		fmt.Scan(&peso)
		total += peso
	}
	fmt.Printf("Peso total: %d kg\\n", total/1000)
}
'''

PESO_SOLUCAO = '''package main

import "fmt"

func main() {
	var n int
	fmt.Scan(&n)
	total := 0
	for i := 0; i < n; i++ {
		var peso int
		fmt.Scan(&peso)
		total += peso
	}
	fmt.Printf("Peso total: %.2f kg\\n", float64(total)/1000)
}
'''

PACK_GO = Pack(
    match=["Go"],
    new_course="Oficina de Go: a Casa do Pedreiro",
    description="Fatias, laços e funções em Go consertando o sistema de uma loja de material de construção.",
    categories=["go", "exercicios"],
    intro=(
        "<p>A <strong>Casa do Pedreiro</strong> tem um sistema de estoque e entregas escrito em Go. Em cada aula você recebe "
        "o trecho real com o defeito: fronteiras de faixas de frete, contagem de palavras, índices e lotes incompletos.</p>"
        "<p>Em Go você escreve <strong>só as funções</strong> (sem <code>package main</code> e sem <code>main</code>), e "
        "pode usar <code>import</code> normalmente.</p>"
    ),
    modules=[
        (
            "Prática: a Casa do Pedreiro (Go)",
            [
                (
                    "Cálculo de frete",
                    [
                        lesson_text(
                            "O frete cobra mais do que deveria",
                            "Clientes com pedidos de exatamente 500 g e 2 kg estão pagando a faixa de cima, e quem pede 2,1 kg paga o "
                            "frete de 2 kg: a divisão inteira joga fora o quilo começado.",
                            "frete.go",
                            [
                                "Até 500 g (inclusive): R$ 15,00 (1500). Até 2000 g (inclusive): R$ 25,00 (2500).",
                                "Acima de 2 kg: R$ 25,00 mais R$ 5,00 (500) por <strong>quilo extra começado</strong>.",
                                "Entrega expressa: o valor dobra.",
                            ],
                            "para arredondar uma divisão inteira para cima: <code>(a + b - 1) / b</code>.",
                        ),
                        function_exercise(
                            "go", "Cálculo do frete", "frete", ["pesoGramas", "expresso"], FRETE_STARTER, FRETE_SOLUCAO,
                            tests(
                                t([500, False], 1500), t([501, False], 2500), t([2000, False], 2500), t([2001, False], 3000),
                                t([3000, False], 3000), t([3001, True], 7000), t([100, True], 3000), t([0, False], 1500),
                            ),
                            types=["int", "boolean"], returns="int",
                        ),
                    ],
                ),
                (
                    "Busca no catálogo",
                    [
                        lesson_text(
                            "Procurar \"prego\" acha \"pregos\" e \"pregoeiro\"",
                            "O contador de menções usa <code>strings.Count</code>, que conta pedaços de palavra e diferencia maiúsculas de minúsculas.",
                            "busca.go",
                            [
                                "Conte as <strong>palavras inteiras</strong> iguais a <code>palavra</code>, sem diferenciar maiúsculas.",
                                "Ignore a pontuação colada na palavra: <code>.,;:!?</code>.",
                            ],
                            "<code>strings.Fields</code> separa o texto em palavras; <code>strings.Trim</code> tira a pontuação das pontas.",
                        ),
                        function_exercise(
                            "go", "Ocorrências da palavra", "ocorrenciasDaPalavra", ["texto", "palavra"], PALAVRA_STARTER, PALAVRA_SOLUCAO,
                            tests(
                                t(["Prego, prego e pregos. PREGO!", "prego"], 3), t(["martelo", "martelo"], 1), t(["", "x"], 0),
                                t(["serra serrada Serra", "serra"], 2), t(["tinta azul, TINTA verde", "Tinta"], 2),
                            ),
                            types=["String", "String"], returns="int",
                        ),
                    ],
                ),
                (
                    "Alerta de reposição",
                    [
                        lesson_text(
                            "O alerta mostra quantidades, não produtos",
                            "O painel precisa saber <em>quais</em> produtos repor, mas a função devolve as quantidades que estão baixas.",
                            "estoque.go",
                            ["Devolva as posições (começando em 0) dos produtos com quantidade <strong>menor</strong> que o mínimo."],
                        ),
                        function_exercise(
                            "go", "Produtos para repor", "reporEstoque", ["estoque", "minimo"], REPOR_STARTER, REPOR_SOLUCAO,
                            tests(t([[10, 2, 7, 1, 0], 3], [1, 3, 4]), t([[5, 5], 3], []), t([[], 3], []), t([[3, 3], 3], [])),
                            types=["int[]", "int"], returns="int[]",
                        ),
                    ],
                ),
                (
                    "Lotes de entrega",
                    [
                        lesson_text(
                            "O último caminhão some do relatório",
                            "Quando o número de pedidos não é múltiplo do tamanho do lote, o último lote — o menor — fica de fora do relatório.",
                            "entregas.go",
                            ["Divida os valores em lotes de <code>tamanho</code> itens e devolva a soma de cada lote.", "O último lote pode ter menos itens."],
                            "<code>itens[i:fim]</code> pega uma fatia; garanta que <code>fim</code> não passe de <code>len(itens)</code>.",
                        ),
                        function_exercise(
                            "go", "Somar lotes", "somarLotes", ["itens", "tamanho"], LOTES_STARTER, LOTES_SOLUCAO,
                            tests(
                                t([[1, 2, 3, 4, 5], 2], [3, 7, 5]), t([[1, 2, 3, 4], 2], [3, 7]), t([[], 3], []),
                                t([[5], 3], [5]), t([[1, 2, 3], 5], [6]),
                            ),
                            types=["int[]", "int"], returns="int[]",
                        ),
                    ],
                ),
                (
                    "A balança do depósito (entrada e saída)",
                    [
                        lesson_text(
                            "Peso arredondado para baixo",
                            "Programa completo: a balança lê vários pesos em gramas e imprime o total em quilos. A divisão de inteiros joga "
                            "fora os decimais, e 3450 g viram \"3 kg\".",
                            "pesagem.go",
                            [
                                "Entrada: <code>N</code> e depois <code>N</code> pesos em gramas, um por linha.",
                                "Saída: <code>Peso total: X.XX kg</code> com 2 casas decimais.",
                            ],
                            "converta para <code>float64</code> antes de dividir e use <code>%.2f</code>.",
                        ),
                        output_exercise(
                            "go", "Peso total", PESO_STARTER, PESO_SOLUCAO,
                            tests(
                                out("3\n500\n1200\n1750\n", "Peso total: 3.45 kg\n"), out("2\n1000\n2000\n", "Peso total: 3.00 kg\n"),
                                out("0\n", "Peso total: 0.00 kg\n"), out("1\n999\n", "Peso total: 1.00 kg\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Kotlin

MULTA_STARTER = '''// Multas.kt - biblioteca do bairro
// Valores em centavos.

fun multaPorAtraso(diasAtraso: Int, valorDiario: Int): Int {
    return diasAtraso * valorDiario
}
'''

MULTA_SOLUCAO = '''fun multaPorAtraso(diasAtraso: Int, valorDiario: Int): Int {
    if (diasAtraso <= 0) {
        return 0
    }
    return minOf(diasAtraso * valorDiario, 3000)
}
'''

DISPONIVEIS_STARTER = '''// Acervo.kt - lista de livros disponíveis para empréstimo

fun titulosDisponiveis(titulos: List<String>, emprestados: List<String>): List<String> {
    return titulos - emprestados
}
'''

DISPONIVEIS_SOLUCAO = '''fun titulosDisponiveis(titulos: List<String>, emprestados: List<String>): List<String> {
    val emprestadosMinusculos = emprestados.map { it.lowercase() }.toSet()
    return titulos.filter { it.lowercase() !in emprestadosMinusculos }
}
'''

RENOVAR_STARTER = '''// Emprestimos.kt - renovação de empréstimos
// prazoAtual é o número do dia em que o livro vence.

fun renovar(prazoAtual: Int, renovacoes: Int, temReserva: Boolean): Int {
    if (renovacoes > 2) {
        return -1
    }
    return prazoAtual + 7
}
'''

RENOVAR_SOLUCAO = '''fun renovar(prazoAtual: Int, renovacoes: Int, temReserva: Boolean): Int {
    if (temReserva || renovacoes >= 2) {
        return -1
    }
    return prazoAtual + 7
}
'''

ISBN_STARTER = '''// Isbn.kt - cadastro de livros
// Um ISBN-10 é válido quando a soma de cada dígito multiplicado pelo seu peso (10 para o primeiro, 9 para o segundo,
// até 1 para o último) é múltipla de 11. No último dígito, "X" vale 10. Hífens são ignorados.

fun ehIsbnValido(isbn: String): Boolean {
    return isbn.replace("-", "").length == 10
}
'''

ISBN_SOLUCAO = '''fun ehIsbnValido(isbn: String): Boolean {
    val limpo = isbn.replace("-", "")
    if (limpo.length != 10) {
        return false
    }
    var soma = 0
    for ((indice, c) in limpo.withIndex()) {
        val valor = when {
            c.isDigit() -> c - '0'
            c == 'X' && indice == 9 -> 10
            else -> return false
        }
        soma += valor * (10 - indice)
    }
    return soma % 11 == 0
}
'''

PACK_KOTLIN = Pack(
    match=["Curso de Kotlin - Básico"],
    new_course="Oficina de Kotlin: a biblioteca do bairro",
    description="Kotlin na prática: multas, acervo, renovações e validação de ISBN numa biblioteca comunitária.",
    categories=["kotlin", "exercicios"],
    intro=(
        "<p>A biblioteca comunitária do bairro está informatizando o acervo com um app em Kotlin. Em cada aula você "
        "conserta uma função do app. Em Kotlin você escreve <strong>só as funções</strong>, sem <code>main</code>.</p>"
    ),
    modules=[
        (
            "Prática: a biblioteca do bairro (Kotlin)",
            [
                (
                    "Multa por atraso",
                    [
                        lesson_text(
                            "Multa negativa e multa gigante",
                            "Um leitor que devolveu o livro adiantado recebeu uma multa <em>negativa</em> (crédito!), e outro, com meses de "
                            "atraso, recebeu uma multa maior que o preço do livro.",
                            "Multas.kt",
                            [
                                "Sem atraso (zero ou menos dias): multa 0.",
                                "A multa é <code>dias × valor diário</code>, mas nunca passa de <strong>R$ 30,00</strong> (3000 centavos).",
                            ],
                            "<code>minOf(a, b)</code> devolve o menor dos dois valores.",
                        ),
                        function_exercise(
                            "kotlin", "Multa por atraso", "multaPorAtraso", ["diasAtraso", "valorDiario"], MULTA_STARTER, MULTA_SOLUCAO,
                            tests(t([3, 200], 600), t([0, 200], 0), t([-2, 200], 0), t([20, 200], 3000), t([15, 200], 3000), t([14, 200], 2800)),
                            types=["int", "int"], returns="int",
                        ),
                    ],
                ),
                (
                    "Livros disponíveis",
                    [
                        lesson_text(
                            "Livro emprestado aparece como disponível",
                            "A lista de disponíveis tira os emprestados, mas só quando o título está escrito <em>exatamente</em> igual. Se a "
                            "bibliotecária digitou \"dom casmurro\" no empréstimo, o livro continua aparecendo no acervo.",
                            "Acervo.kt",
                            [
                                "Devolva os títulos que <strong>não</strong> estão emprestados, ignorando maiúsculas e minúsculas na comparação.",
                                "Mantenha a ordem e a grafia originais dos títulos.",
                            ],
                        ),
                        function_exercise(
                            "kotlin", "Títulos disponíveis", "titulosDisponiveis", ["titulos", "emprestados"], DISPONIVEIS_STARTER, DISPONIVEIS_SOLUCAO,
                            tests(
                                t([["Dom Casmurro", "Capitães da Areia", "O Cortiço"], ["dom casmurro"]], ["Capitães da Areia", "O Cortiço"]),
                                t([["A", "B"], []], ["A", "B"]), t([["A", "B"], ["a", "B"]], []), t([[], ["A"]], []),
                            ),
                            types=["List<String>", "List<String>"], returns="List<String>",
                        ),
                    ],
                ),
                (
                    "Renovação do empréstimo",
                    [
                        lesson_text(
                            "Renovou três vezes e ninguém reparou",
                            "A regra é de no máximo <strong>2 renovações</strong> e o app deixa renovar uma terceira vez. "
                            "Também esquece de bloquear a renovação quando outro leitor reservou o livro.",
                            "Emprestimos.kt",
                            [
                                "Cada renovação soma 7 dias ao prazo.",
                                "Se o livro já foi renovado 2 vezes ou se há reserva, devolva <code>-1</code> (renovação negada).",
                            ],
                        ),
                        function_exercise(
                            "kotlin", "Renovar empréstimo", "renovar", ["prazoAtual", "renovacoes", "temReserva"], RENOVAR_STARTER, RENOVAR_SOLUCAO,
                            tests(
                                t([10, 0, False], 17), t([10, 1, False], 17), t([10, 2, False], -1), t([10, 0, True], -1), t([0, 0, False], 7),
                            ),
                            types=["int", "int", "boolean"], returns="int",
                        ),
                    ],
                ),
                (
                    "Cadastro de livros",
                    [
                        lesson_text(
                            "ISBN inválido aceito no cadastro",
                            "O cadastro só confere se o ISBN tem 10 caracteres, e já entraram livros com ISBN digitado errado. "
                            "Implemente o dígito verificador.",
                            "Isbn.kt",
                            [
                                "Multiplique o 1º dígito por 10, o 2º por 9... o 10º por 1 e some tudo; o ISBN é válido se a soma for múltipla de 11.",
                                "No último dígito, <code>X</code> vale 10. Hífens são ignorados.",
                                "Outros caracteres ou tamanho diferente de 10: inválido.",
                            ],
                            "<code>c - '0'</code> converte o caractere de um dígito no número dele.",
                        ),
                        function_exercise(
                            "kotlin", "Validar ISBN", "ehIsbnValido", ["isbn"], ISBN_STARTER, ISBN_SOLUCAO,
                            tests(
                                t(["0306406152"], True), t(["0306406153"], False), t(["123456789X"], True), t(["0-306-40615-2"], True),
                                t(["12345"], False), t([""], False), t(["12345678X9"], False),
                            ),
                            types=["String"], returns="boolean",
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Python para automacoes

CSV_STARTER = '''# importar.py - importação da planilha de produtos do fornecedor
# O arquivo usa ";" como separador. Campos com ";" dentro vêm entre aspas.

def parse_linha_csv(linha):
    return linha.split(";")
'''

CSV_SOLUCAO = '''import csv

def parse_linha_csv(linha):
    return next(csv.reader([linha], delimiter=";"))
'''

ERROS_STARTER = '''# monitor.py - resumo dos erros do dia para o e-mail da equipe
# Cada linha do log: "2026-03-01 10:15:02 ERROR [pagamento] timeout ao chamar gateway"

def extrair_erros(linhas):
    erros = []
    for linha in linhas:
        if "ERROR" in linha:
            erros.append(linha)
    return erros
'''

ERROS_SOLUCAO = '''import re

PADRAO = re.compile(r"^\\S+ \\S+ ERROR \\[([^\\]]+)\\] (.*)$")

def extrair_erros(linhas):
    erros = []
    for linha in linhas:
        casou = PADRAO.match(linha)
        if casou:
            erros.append(casou.group(1) + ": " + casou.group(2))
    return erros
'''

ARQUIVO_STARTER = '''# organizar.py - renomeia os arquivos baixados antes de enviar para o servidor
# "Relatório Final (v2).PDF" com prefixo "2026-" deve virar "2026-relatorio-final-v2.pdf"

def nome_de_arquivo(nome, prefixo):
    return prefixo + nome.lower().replace(" ", "-")
'''

ARQUIVO_SOLUCAO = '''import re
import unicodedata

def nome_de_arquivo(nome, prefixo):
    base, ponto, extensao = nome.rpartition(".")
    if not ponto:
        base, extensao = nome, ""
    sem_acento = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")
    return prefixo + slug + (ponto + extensao.lower() if ponto else "")
'''

PACK_AUTOMACAO = Pack(
    match=["Automações com Python"],
    new_course="Oficina de Automação com Python: scripts do escritório",
    description="Scripts de automação de verdade: importar planilhas, resumir logs e organizar arquivos.",
    categories=["python", "automacao", "exercicios"],
    intro=(
        "<p>O escritório de contabilidade do Seu Roberto vive de planilhas e relatórios, e o estagiário automatizou o que pôde "
        "com scripts Python. Alguns têm falhas que só aparecem no dia a dia: aspas no CSV, logs confusos, nomes de arquivo "
        "cheios de acento. Cada aula traz um script para você arrumar.</p>"
    ),
    modules=[
        (
            "Prática: scripts do escritório (Python)",
            [
                (
                    "Importando a planilha",
                    [
                        lesson_text(
                            "O produto com ponto e vírgula no nome",
                            "A planilha do fornecedor tem produtos como <code>\"pão; francês\"</code>. O script quebra o nome no meio e a "
                            "importação sai com colunas a mais.",
                            "importar.py",
                            [
                                "Separe a linha em campos pelo <code>;</code>, respeitando campos entre aspas.",
                                "Aspas duplas dentro do campo vêm repetidas (<code>\"\"</code>) e viram uma aspa só.",
                            ],
                            "o módulo <code>csv</code> da biblioteca padrão já sabe fazer isso.",
                        ),
                        function_exercise(
                            "python", "Ler uma linha do CSV", "parse_linha_csv", ["linha"], CSV_STARTER, CSV_SOLUCAO,
                            tests(
                                t(["pão;2,50;10"], ["pão", "2,50", "10"]), t(["\"pão; francês\";2,50;10"], ["pão; francês", "2,50", "10"]),
                                t(["a;;c"], ["a", "", "c"]), t(["\"diz \"\"oi\"\"\";1"], ["diz \"oi\"", "1"]),
                            ),
                        ),
                    ],
                ),
                (
                    "Resumo dos erros do dia",
                    [
                        lesson_text(
                            "O e-mail traz erros que não são erros",
                            "O resumo manda para a equipe toda linha que contém a palavra ERROR, até as que só <em>mencionam</em> a palavra "
                            "(\"campo ERROR ignorado\"), e ainda com data e hora que ninguém lê.",
                            "monitor.py",
                            [
                                "Considere só as linhas cujo <strong>nível</strong> (terceiro campo) é <code>ERROR</code>.",
                                "Para cada uma devolva <code>\"modulo: mensagem\"</code>, usando o módulo entre colchetes.",
                                "A ordem do log é mantida.",
                            ],
                            "uma expressão regular com grupos captura o módulo e a mensagem de uma vez.",
                        ),
                        function_exercise(
                            "python", "Extrair erros do log", "extrair_erros", ["linhas"], ERROS_STARTER, ERROS_SOLUCAO,
                            tests(
                                t([["2026-03-01 10:15:02 ERROR [pagamento] timeout ao chamar gateway", "2026-03-01 10:15:03 WARNING [estoque] estoque baixo",
                                    "2026-03-01 10:15:04 INFO [api] campo ERROR ignorado", "2026-03-01 10:15:05 ERROR [email] fila cheia"]],
                                  ["pagamento: timeout ao chamar gateway", "email: fila cheia"]),
                                t([[]], []), t([["2026-03-01 10:00:00 INFO [api] tudo certo"]], []),
                                t([["2026-03-02 08:00:00 ERROR [banco] conexão perdida: tentando de novo"]], ["banco: conexão perdida: tentando de novo"]),
                            ),
                        ),
                    ],
                ),
                (
                    "Organizando os arquivos",
                    [
                        lesson_text(
                            "Nomes de arquivo que o servidor recusa",
                            "O servidor de arquivos recusa nomes com acentos, parênteses e espaços, e o script só troca os espaços por hífen.",
                            "organizar.py",
                            [
                                "Tire os acentos, deixe tudo minúsculo e troque qualquer sequência de caracteres que não seja letra ou número por <strong>um</strong> hífen.",
                                "Sem hífens nas pontas do nome. A extensão (depois do último ponto) fica em minúsculas.",
                                "O prefixo vai na frente, sem alteração.",
                            ],
                            "<code>unicodedata.normalize(\"NFKD\", texto)</code> separa as letras dos acentos.",
                        ),
                        function_exercise(
                            "python", "Nome de arquivo seguro", "nome_de_arquivo", ["nome", "prefixo"], ARQUIVO_STARTER, ARQUIVO_SOLUCAO,
                            tests(
                                t(["Relatório Final (v2).PDF", "2026-"], "2026-relatorio-final-v2.pdf"), t(["foto da viagem.jpg", ""], "foto-da-viagem.jpg"),
                                t(["  Planilha   de Vendas  .XLSX", "x-"], "x-planilha-de-vendas.xlsx"), t(["SEM extensão", "bkp-"], "bkp-sem-extensao"),
                                t(["café.com.leite.txt", ""], "cafe-com-leite.txt"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)
