"""Cursos novos para linguagens sem curso na curadoria: C#, PHP, Rust, Ruby e C/C++."""
from .base import Pack, function_exercise, lesson_text, out, output_exercise, t, tests

# =========================================================================== C# - a academia

IMC_STARTER = r'''// Imc.cs - ficha de avaliação da Academia Corpo em Movimento

static string ClassificarImc(double peso, double altura)
{
    double imc = peso / altura * altura;
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Normal";
    if (imc < 30) return "Sobrepeso";
    return "Obesidade";
}
'''

IMC_SOLUCAO = r'''static string ClassificarImc(double peso, double altura)
{
    double imc = peso / (altura * altura);
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Normal";
    if (imc < 30) return "Sobrepeso";
    return "Obesidade";
}
'''

STREAK_STARTER = r'''// Frequencia.cs - gamificação da academia: "sequência de dias treinados"
// presenca[i] é true se o aluno treinou no dia i.

static int DiasSeguidos(bool[] presenca)
{
    int total = 0;
    foreach (bool veio in presenca)
    {
        if (veio) total++;
    }
    return total;
}
'''

STREAK_SOLUCAO = r'''static int DiasSeguidos(bool[] presenca)
{
    int melhor = 0;
    int atual = 0;
    foreach (bool veio in presenca)
    {
        atual = veio ? atual + 1 : 0;
        if (atual > melhor) melhor = atual;
    }
    return melhor;
}
'''

HORARIOS_STARTER = r'''// Agenda.cs - horários livres para agendar uma aula experimental
// A academia abre às 6h e a última aula começa às 22h (inclusive).

static List<int> HorariosLivres(List<int> ocupados)
{
    var livres = new List<int>();
    for (int hora = 6; hora < 22; hora++)
    {
        if (!ocupados.Contains(hora))
        {
            livres.Add(hora);
        }
    }
    return livres;
}
'''

HORARIOS_SOLUCAO = r'''static List<int> HorariosLivres(List<int> ocupados)
{
    var livres = new List<int>();
    for (int hora = 6; hora <= 22; hora++)
    {
        if (!ocupados.Contains(hora))
        {
            livres.Add(hora);
        }
    }
    return livres;
}
'''

NOME_STARTER = r'''// Cadastro.cs - ficha do aluno
// A recepção digita "sobrenome, nomes", por exemplo "silva, JOÃO pedro".

static string FormatarNome(string nome)
{
    return nome.Trim();
}
'''

NOME_SOLUCAO = r'''static string FormatarNome(string nome)
{
    string[] partes = nome.Split(',');
    string completo = partes.Length == 2 ? partes[1].Trim() + " " + partes[0].Trim() : nome.Trim();
    var palavras = completo.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
    return string.Join(" ", palavras.Select(p => char.ToUpper(p[0]) + p.Substring(1).ToLower()));
}
'''

PLANO_STARTER = r'''// Planos.cs - preço dos planos da academia
// Valores em centavos.

static long TotalDoPlano(int meses, long mensalidade)
{
    long total = meses * mensalidade;
    if (meses > 12)
    {
        total = total * 85 / 100;
    }
    else if (meses > 6)
    {
        total = total * 92 / 100;
    }
    return total;
}
'''

PLANO_SOLUCAO = r'''static long TotalDoPlano(int meses, long mensalidade)
{
    long total = meses * mensalidade;
    if (meses >= 12)
    {
        total = total * 85 / 100;
    }
    else if (meses >= 6)
    {
        total = total * 92 / 100;
    }
    return total;
}
'''

TREINO_STARTER = r'''using System;

// Treino.cs - total de treino do mês.
// Entrada: N e depois N linhas, cada uma com os minutos treinados num dia.
// Saída: "XhYYmin" (horas e minutos com 2 dígitos).

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            total += int.Parse(Console.ReadLine());
        }
        Console.WriteLine(total / 60 + "h" + total % 60 + "min");
    }
}
'''

TREINO_SOLUCAO = r'''using System;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            total += int.Parse(Console.ReadLine());
        }
        Console.WriteLine(total / 60 + "h" + (total % 60).ToString("D2") + "min");
    }
}
'''

PACK_CSHARP = Pack(
    match=[],
    new_course="Oficina de C#: a academia Corpo em Movimento",
    description="C# na prática: IMC, sequência de treinos, agenda de horários, cadastro e preços de planos de uma academia.",
    categories=["csharp", "dotnet", "exercicios"],
    intro=(
        "<p>A <strong>Academia Corpo em Movimento</strong> tem um sistema em C# que a recepção usa todo dia. Algumas funções têm "
        "defeitos que só aparecem com certos alunos: precedência de operadores, laços que perdem o último item, comparação "
        "no limite. Em cada aula você conserta uma delas.</p>"
        "<p>Em C# você escreve <strong>só o método <code>static</code></strong> (sem a classe). <code>System</code>, "
        "<code>System.Linq</code> e <code>System.Collections.Generic</code> já estão importados.</p>"
    ),
    modules=[
        (
            "Prática: a academia (C#)",
            [
                (
                    "Classificação do IMC",
                    [
                        lesson_text(
                            "Todo mundo aparece como obeso",
                            "A ficha de avaliação classifica qualquer aluno como \"Obesidade\". A fórmula do IMC está escrita sem parênteses, "
                            "e a divisão e a multiplicação acontecem na ordem errada.",
                            "Imc.cs",
                            [
                                "IMC = peso ÷ (altura × altura).",
                                "Menos de 18,5: <code>\"Abaixo do peso\"</code>; até 24,9: <code>\"Normal\"</code>; até 29,9: <code>\"Sobrepeso\"</code>; a partir de 30: <code>\"Obesidade\"</code>.",
                            ],
                            "<code>a / b * b</code> não é <code>a / (b * b)</code>: operadores de mesma precedência vão da esquerda para a direita.",
                        ),
                        function_exercise(
                            "csharp", "Classificar IMC", "ClassificarImc", ["peso", "altura"], IMC_STARTER, IMC_SOLUCAO,
                            tests(
                                t([70, 1.75], "Normal"), t([50, 1.8], "Abaixo do peso"), t([85, 1.75], "Sobrepeso"), t([100, 1.7], "Obesidade"),
                                t([60, 1.6], "Normal"), t([47, 1.6], "Abaixo do peso"),
                            ),
                            types=["double", "double"], returns="String",
                        ),
                    ],
                ),
                (
                    "Sequência de treinos",
                    [
                        lesson_text(
                            "Sequência de 7 dias para quem treinou 3 vezes",
                            "O app premia a <em>sequência de dias seguidos</em>, mas a função conta o total de dias treinados, mesmo com "
                            "furos no meio.",
                            "Frequencia.cs",
                            ["Devolva o tamanho da maior sequência de <code>true</code> consecutivos.", "Sem nenhum treino: 0."],
                        ),
                        function_exercise(
                            "csharp", "Dias seguidos", "DiasSeguidos", ["presenca"], STREAK_STARTER, STREAK_SOLUCAO,
                            tests(
                                t([[True, True, False, True, True, True, False]], 3), t([[]], 0), t([[False, False]], 0),
                                t([[True, True, True]], 3), t([[True, False, True]], 1),
                            ),
                            types=["boolean[]"], returns="int",
                        ),
                    ],
                ),
                (
                    "Agenda de aulas",
                    [
                        lesson_text(
                            "Ninguém consegue agendar às 22h",
                            "A agenda mostra horários livres das 6h às 21h, mas a última aula do dia começa às 22h e nunca aparece.",
                            "Agenda.cs",
                            ["Devolva as horas de 6 a 22 (inclusive) que não estão na lista de ocupados, em ordem crescente."],
                            "um laço <code>for (int hora = 6; hora &lt; 22; ...)</code> para antes do 22.",
                        ),
                        function_exercise(
                            "csharp", "Horários livres", "HorariosLivres", ["ocupados"], HORARIOS_STARTER, HORARIOS_SOLUCAO,
                            tests(
                                t([[6, 7, 8, 18, 19]], [9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22]),
                                t([[]], list(range(6, 23))),
                                t([list(range(6, 22))], [22]),
                                t([[22]], list(range(6, 22))),
                            ),
                            types=["List<Integer>"], returns="List<Integer>",
                        ),
                    ],
                ),
                (
                    "Ficha do aluno",
                    [
                        lesson_text(
                            "\"silva, JOÃO pedro\" no crachá",
                            "A recepção digita o nome no formato <code>sobrenome, nomes</code> e o crachá sai com o texto do jeito que foi "
                            "digitado, com as letras maiúsculas e minúsculas bagunçadas.",
                            "Cadastro.cs",
                            [
                                "Se houver vírgula, o que vem depois dela vai na frente: <code>\"silva, joão pedro\"</code> → <code>\"João Pedro Silva\"</code>.",
                                "Cada palavra começa com maiúscula e o resto fica minúsculo.",
                                "Ignore espaços sobrando. Sem vírgula, só ajuste as maiúsculas.",
                            ],
                        ),
                        function_exercise(
                            "csharp", "Formatar nome", "FormatarNome", ["nome"], NOME_STARTER, NOME_SOLUCAO,
                            tests(
                                t(["silva, JOÃO pedro"], "João Pedro Silva"), t(["maria souza"], "Maria Souza"), t(["  COSTA ,  ana  "], "Ana Costa"),
                                t(["x"], "X"), t([""], ""),
                            ),
                            types=["String"], returns="String",
                        ),
                    ],
                ),
                (
                    "Preço dos planos",
                    [
                        lesson_text(
                            "O plano anual não ganha desconto",
                            "O plano de exatamente 12 meses deveria ter o desconto de plano anual, mas só quem contrata 13 meses ou mais recebe. "
                            "O mesmo vale para o plano semestral.",
                            "Planos.cs",
                            [
                                "12 meses ou mais: 15% de desconto no total. De 6 a 11 meses: 8% de desconto.",
                                "Menos de 6 meses: sem desconto. O total é arredondado para baixo, em centavos.",
                            ],
                            "o tipo <code>long</code> evita estouro com mensalidades e prazos grandes.",
                        ),
                        function_exercise(
                            "csharp", "Total do plano", "TotalDoPlano", ["meses", "mensalidade"], PLANO_STARTER, PLANO_SOLUCAO,
                            tests(
                                t([12, 9990], 101898), t([6, 9990], 55144), t([5, 9990], 49950), t([24, 10000], 204000),
                                t([1, 0], 0), t([11, 10000], 101200),
                            ),
                            types=["int", "long"], returns="long",
                        ),
                    ],
                ),
                (
                    "Horas de treino (entrada e saída)",
                    [
                        lesson_text(
                            "\"2h5min\" no relatório",
                            "Programa completo: lê os minutos treinados em cada dia do mês e imprime o total. O relatório mostra "
                            "<code>2h5min</code>, e a academia quer <code>2h05min</code>.",
                            "Treino.cs",
                            [
                                "Entrada: <code>N</code> e depois <code>N</code> linhas com os minutos de cada dia.",
                                "Saída: <code>XhYYmin</code>, com os minutos sempre em 2 dígitos.",
                            ],
                            "<code>numero.ToString(\"D2\")</code> completa com zero à esquerda.",
                        ),
                        output_exercise(
                            "csharp", "Total de treino", TREINO_STARTER, TREINO_SOLUCAO,
                            tests(
                                out("3\n50\n45\n70\n", "2h45min\n"), out("2\n30\n35\n", "1h05min\n"), out("0\n", "0h00min\n"), out("1\n59\n", "0h59min\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== PHP - a loja de roupas

PARCELAR_STARTER = r'''<?php
// parcelamento.php - checkout da Moda Bonita
// Valores em centavos. A soma das parcelas precisa dar exatamente o total.

function parcelar($total_centavos, $parcelas) {
    $valor = intdiv($total_centavos, $parcelas);
    return array_fill(0, $parcelas, $valor);
}
'''

PARCELAR_SOLUCAO = r'''function parcelar($total_centavos, $parcelas) {
    $base = intdiv($total_centavos, $parcelas);
    $resto = $total_centavos % $parcelas;
    $resultado = [];
    for ($i = 0; $i < $parcelas; $i++) {
        $resultado[] = $base + ($i < $resto ? 1 : 0);
    }
    return $resultado;
}
'''

PROMO_STARTER = r'''<?php
// promocao.php - campanha de desconto por categoria
// Cada produto: ["nome" => ..., "categoria" => ..., "preco" => centavos]

function aplicar_promocao($produtos, $categoria, $percentual) {
    foreach ($produtos as $i => $produto) {
        $produtos[$i]['preco'] = intdiv($produto['preco'] * (100 - $percentual), 100);
    }
    return $produtos;
}
'''

PROMO_SOLUCAO = r'''function aplicar_promocao($produtos, $categoria, $percentual) {
    foreach ($produtos as $i => $produto) {
        if ($produto['categoria'] === $categoria) {
            $produtos[$i]['preco'] = intdiv($produto['preco'] * (100 - $percentual), 100);
        }
    }
    return $produtos;
}
'''

SLUG_STARTER = r'''<?php
// url.php - endereços amigáveis dos produtos
// "Calça Jeans Slim 2026!" deve virar "calca-jeans-slim-2026"

const ACENTOS = [
    'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'é' => 'e', 'ê' => 'e', 'í' => 'i', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
    'ú' => 'u', 'ü' => 'u', 'ç' => 'c', 'Á' => 'a', 'À' => 'a', 'Â' => 'a', 'Ã' => 'a', 'É' => 'e', 'Ê' => 'e', 'Í' => 'i',
    'Ó' => 'o', 'Ô' => 'o', 'Õ' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ç' => 'c',
];

function slug($titulo) {
    $texto = strtolower($titulo);
    return str_replace(" ", "-", $texto);
}
'''

SLUG_SOLUCAO = r'''const ACENTOS = [
    'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'é' => 'e', 'ê' => 'e', 'í' => 'i', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
    'ú' => 'u', 'ü' => 'u', 'ç' => 'c', 'Á' => 'a', 'À' => 'a', 'Â' => 'a', 'Ã' => 'a', 'É' => 'e', 'Ê' => 'e', 'Í' => 'i',
    'Ó' => 'o', 'Ô' => 'o', 'Õ' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ç' => 'c',
];

function slug($titulo) {
    $texto = strtolower(strtr($titulo, ACENTOS));
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto);
    return trim($texto, '-');
}
'''

CADASTRO_STARTER = r'''<?php
// cadastro.php - validação do cadastro de clientes
// $dados = ["nome" => string, "email" => string, "idade" => int]
// Devolve a lista de erros (vazia quando o cadastro é válido).

function validar_cadastro($dados) {
    $erros = [];
    if (trim($dados['nome']) === '') {
        $erros[] = 'nome é obrigatório';
    }
    return $erros;
}
'''

CADASTRO_SOLUCAO = r'''function validar_cadastro($dados) {
    $erros = [];
    if (trim($dados['nome']) === '') {
        $erros[] = 'nome é obrigatório';
    }
    if (!preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $dados['email'])) {
        $erros[] = 'e-mail inválido';
    }
    if ($dados['idade'] < 18) {
        $erros[] = 'é preciso ter 18 anos ou mais';
    }
    return $erros;
}
'''

RANKING_STARTER = r'''<?php
// vendedores.php - ranking de vendas do mês
// $vendas é uma lista de [vendedor, valor em centavos]; o mesmo vendedor aparece várias vezes.

function ranking_vendedores($vendas) {
    $totais = [];
    foreach ($vendas as [$vendedor, $valor]) {
        $totais[$vendedor] = $valor;
    }
    arsort($totais);
    return array_slice(array_keys($totais), 0, 3);
}
'''

RANKING_SOLUCAO = r'''function ranking_vendedores($vendas) {
    $totais = [];
    foreach ($vendas as [$vendedor, $valor]) {
        $totais[$vendedor] = ($totais[$vendedor] ?? 0) + $valor;
    }
    $nomes = array_keys($totais);
    usort($nomes, function ($a, $b) use ($totais) {
        return $totais[$b] <=> $totais[$a] ?: strcmp($a, $b);
    });
    return array_slice($nomes, 0, 3);
}
'''

CAIXA_PHP_STARTER = r'''<?php
// caixa.php - fechamento do caixa da Moda Bonita.
// Entrada: N e depois N vendas em centavos (uma por linha).
// Saída: "Total: R$ 1.234,56" (ponto nos milhares, vírgula nos centavos).
$n = intval(trim(fgets(STDIN)));
$total = 0;
for ($i = 0; $i < $n; $i++) {
    $total += intval(trim(fgets(STDIN)));
}
echo "Total: R$ " . $total / 100 . "\n";
'''

CAIXA_PHP_SOLUCAO = r'''<?php
$n = intval(trim(fgets(STDIN)));
$total = 0;
for ($i = 0; $i < $n; $i++) {
    $total += intval(trim(fgets(STDIN)));
}
echo "Total: R$ " . number_format($total / 100, 2, ',', '.') . "\n";
'''

PACK_PHP = Pack(
    match=[],
    new_course="Oficina de PHP: a loja de roupas Moda Bonita",
    description="PHP no dia a dia de uma loja virtual: parcelamento, promoções, endereços de produtos, cadastro e ranking de vendedores.",
    categories=["php", "exercicios"],
    intro=(
        "<p>A <strong>Moda Bonita</strong> vende roupas online com uma loja em PHP. Em cada aula você conserta um trecho "
        "do código real do site. Em PHP você escreve <strong>só as funções</strong>: o sistema abre a tag <code>&lt;?php</code> "
        "para você (se a sua resposta já tiver a tag, tudo bem).</p>"
    ),
    modules=[
        (
            "Prática: a loja de roupas (PHP)",
            [
                (
                    "Parcelamento no cartão",
                    [
                        lesson_text(
                            "Faltam centavos nas parcelas",
                            "Ao parcelar R$ 10,00 em 3 vezes, o checkout cobra 3 × R$ 3,33 = R$ 9,99. Falta 1 centavo na conta, e a loja "
                            "fica no prejuízo todo dia.",
                            "parcelamento.php",
                            [
                                "Devolva a lista com o valor de cada parcela, em centavos.",
                                "A soma das parcelas precisa ser exatamente o total: o resto da divisão vai de <strong>1 centavo</strong> para cada uma das primeiras parcelas.",
                            ],
                            "<code>$total % $parcelas</code> é o resto da divisão.",
                        ),
                        function_exercise(
                            "php", "Parcelar o total", "parcelar", ["total_centavos", "parcelas"], PARCELAR_STARTER, PARCELAR_SOLUCAO,
                            tests(
                                t([1000, 3], [334, 333, 333]), t([1001, 3], [334, 334, 333]), t([900, 3], [300, 300, 300]),
                                t([5, 1], [5]), t([7, 4], [2, 2, 2, 1]), t([0, 2], [0, 0]),
                            ),
                        ),
                    ],
                ),
                (
                    "Promoção por categoria",
                    [
                        lesson_text(
                            "A promoção de camisetas derrubou o preço de tudo",
                            "A campanha \"20% em camisetas\" foi publicada e <em>todos</em> os produtos da loja ficaram 20% mais baratos.",
                            "promocao.php",
                            [
                                "Reduza o preço apenas dos produtos da categoria informada, em <code>percentual</code>%, arredondando para baixo (centavos inteiros).",
                                "Os demais produtos ficam exatamente como estavam.",
                            ],
                        ),
                        function_exercise(
                            "php", "Aplicar promoção", "aplicar_promocao", ["produtos", "categoria", "percentual"], PROMO_STARTER, PROMO_SOLUCAO,
                            tests(
                                t([[{"nome": "Camiseta Básica", "categoria": "camisetas", "preco": 5000}, {"nome": "Calça Jeans", "categoria": "calças", "preco": 12000}], "camisetas", 20],
                                  [{"nome": "Camiseta Básica", "categoria": "camisetas", "preco": 4000}, {"nome": "Calça Jeans", "categoria": "calças", "preco": 12000}]),
                                t([[{"nome": "Boné", "categoria": "acessórios", "preco": 3000}], "calças", 50], [{"nome": "Boné", "categoria": "acessórios", "preco": 3000}]),
                                t([[], "camisetas", 10], []),
                                t([[{"nome": "Regata", "categoria": "camisetas", "preco": 3999}], "camisetas", 10], [{"nome": "Regata", "categoria": "camisetas", "preco": 3599}]),
                            ),
                        ),
                    ],
                ),
                (
                    "Endereços amigáveis",
                    [
                        lesson_text(
                            "Links com acento e pontuação",
                            "As páginas dos produtos têm endereços como <code>/produto/calça-jeans-slim-2026!</code>, que quebram em alguns navegadores e no "
                            "compartilhamento do WhatsApp.",
                            "url.php",
                            [
                                "Troque as letras acentuadas pelas letras simples (a tabela <code>ACENTOS</code> já está pronta no código).",
                                "Deixe tudo em minúsculas e substitua qualquer sequência de caracteres que não seja letra ou número por <strong>um</strong> hífen.",
                                "Sem hífens no começo nem no fim.",
                            ],
                            "<code>strtr($texto, ACENTOS)</code> troca vários trechos de uma vez; <code>preg_replace</code> cuida da pontuação.",
                        ),
                        function_exercise(
                            "php", "Gerar o slug", "slug", ["titulo"], SLUG_STARTER, SLUG_SOLUCAO,
                            tests(
                                t(["Calça Jeans Slim 2026!"], "calca-jeans-slim-2026"), t(["  Vestido  Longo  "], "vestido-longo"),
                                t(["Saia Plissada (nova)"], "saia-plissada-nova"), t(["ÁGUA e Ração"], "agua-e-racao"), t([""], ""),
                            ),
                        ),
                    ],
                ),
                (
                    "Cadastro de clientes",
                    [
                        lesson_text(
                            "Cadastro aceita qualquer coisa",
                            "O formulário só confere se o nome foi preenchido. Já chegaram cadastros com e-mail <code>asdf</code> e idade 12.",
                            "cadastro.php",
                            [
                                "Devolva a lista de erros, nesta ordem: <code>\"nome é obrigatório\"</code> (vazio ou só espaços), <code>\"e-mail inválido\"</code>, "
                                "<code>\"é preciso ter 18 anos ou mais\"</code>.",
                                "E-mail válido tem a forma <code>algo@dominio.ext</code>, sem espaços.",
                                "Cadastro válido devolve <code>[]</code>.",
                            ],
                        ),
                        function_exercise(
                            "php", "Validar cadastro", "validar_cadastro", ["dados"], CADASTRO_STARTER, CADASTRO_SOLUCAO,
                            tests(
                                t([{"nome": "Ana", "email": "ana@email.com", "idade": 20}], []),
                                t([{"nome": " ", "email": "asdf", "idade": 12}], ["nome é obrigatório", "e-mail inválido", "é preciso ter 18 anos ou mais"]),
                                t([{"nome": "Bia", "email": "bia@email", "idade": 30}], ["e-mail inválido"]),
                                t([{"nome": "Caio", "email": "caio@email.com", "idade": 17}], ["é preciso ter 18 anos ou mais"]),
                                t([{"nome": "Duda", "email": "du da@email.com", "idade": 18}], ["e-mail inválido"]),
                            ),
                        ),
                    ],
                ),
                (
                    "Ranking de vendedores",
                    [
                        lesson_text(
                            "O ranking mostra só a última venda",
                            "O mural da loja mostra o \"top 3 do mês\", mas conta apenas a <em>última</em> venda de cada vendedor, em vez de somar todas.",
                            "vendedores.php",
                            [
                                "Some as vendas de cada vendedor e devolva os nomes dos 3 maiores totais, do maior para o menor.",
                                "Em caso de empate, ordem alfabética. Com menos de 3 vendedores, devolva todos.",
                            ],
                            "<code>usort</code> com o operador <code>&lt;=&gt;</code> ordena por vários critérios.",
                        ),
                        function_exercise(
                            "php", "Ranking de vendedores", "ranking_vendedores", ["vendas"], RANKING_STARTER, RANKING_SOLUCAO,
                            tests(
                                t([[["Ana", 100], ["Bia", 300], ["Ana", 250], ["Caio", 50], ["Duda", 300]]], ["Ana", "Bia", "Duda"]),
                                t([[]], []), t([[["Zé", 10]]], ["Zé"]), t([[["Bia", 5], ["Ana", 5], ["Caio", 5], ["Duda", 5]]], ["Ana", "Bia", "Caio"]),
                            ),
                        ),
                    ],
                ),
                (
                    "Fechamento do caixa (entrada e saída)",
                    [
                        lesson_text(
                            "R$ 72.4 no relatório",
                            "Programa completo: lê as vendas do dia em centavos e imprime o total. O relatório mostra <code>R$ 72.4</code>, "
                            "mas o contador quer <code>R$ 72,40</code>, com ponto nos milhares.",
                            "caixa.php",
                            [
                                "Entrada: <code>N</code> e depois <code>N</code> vendas em centavos, uma por linha.",
                                "Saída: <code>Total: R$ 1.234,56</code>.",
                            ],
                            "<code>number_format($valor, 2, ',', '.')</code> escolhe casas decimais e separadores.",
                        ),
                        output_exercise(
                            "php", "Total do dia", CAIXA_PHP_STARTER, CAIXA_PHP_SOLUCAO,
                            tests(
                                out("3\n1250\n990\n5000\n", "Total: R$ 72,40\n"), out("1\n100000\n", "Total: R$ 1.000,00\n"),
                                out("0\n", "Total: R$ 0,00\n"), out("2\n99\n1\n", "Total: R$ 1,00\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Rust - o estacionamento

TARIFA_STARTER = r'''// tarifa.rs - cobrança do Estacionamento Central
// Valores em centavos.

fn valor_do_estacionamento(minutos: i32) -> i32 {
    if minutos <= 15 {
        return 0;
    }
    let horas = (minutos - 15) / 60;
    let valor = horas * 500;
    if valor > 4000 { 4000 } else { valor }
}
'''

TARIFA_SOLUCAO = r'''fn valor_do_estacionamento(minutos: i32) -> i32 {
    if minutos <= 15 {
        return 0;
    }
    let horas = (minutos - 15 + 59) / 60;
    let valor = horas * 500;
    if valor > 4000 { 4000 } else { valor }
}
'''

PLACA_STARTER = r'''// placa.rs - cadastro de veículos
// Placas válidas: modelo antigo "ABC-1234" ou Mercosul "ABC1D23" (letras sempre maiúsculas).

fn placa_valida(placa: String) -> bool {
    placa.len() == 7
}
'''

PLACA_SOLUCAO = r'''fn placa_valida(placa: String) -> bool {
    let c: Vec<char> = placa.chars().collect();
    let letra = |i: usize| c[i].is_ascii_uppercase();
    let digito = |i: usize| c[i].is_ascii_digit();
    match c.len() {
        7 => letra(0) && letra(1) && letra(2) && digito(3) && letra(4) && digito(5) && digito(6),
        8 => letra(0) && letra(1) && letra(2) && c[3] == '-' && digito(4) && digito(5) && digito(6) && digito(7),
        _ => false,
    }
}
'''

VAGAS_STARTER = r'''// vagas.rs - sugestão de vagas para um grupo de carros que chega junto
// vagas[i] é true quando a vaga i está livre.

fn vagas_livres_consecutivas(vagas: Vec<bool>, quantidade: i32) -> i32 {
    for (i, livre) in vagas.iter().enumerate() {
        if *livre {
            return i as i32;
        }
    }
    -1
}
'''

VAGAS_SOLUCAO = r'''fn vagas_livres_consecutivas(vagas: Vec<bool>, quantidade: i32) -> i32 {
    let mut seguidas = 0;
    for (i, livre) in vagas.iter().enumerate() {
        if *livre {
            seguidas += 1;
        } else {
            seguidas = 0;
        }
        if seguidas == quantidade {
            return (i as i32) - quantidade + 1;
        }
    }
    -1
}
'''

FATURA_STARTER = r'''// faturamento.rs - fechamento do mês
// Cada valor é o faturamento de um dia, em centavos.

fn faturamento(centavos: Vec<i32>) -> i64 {
    let mut total: i32 = 0;
    for valor in centavos {
        total += valor;
    }
    total as i64
}
'''

FATURA_SOLUCAO = r'''fn faturamento(centavos: Vec<i32>) -> i64 {
    let mut total: i64 = 0;
    for valor in centavos {
        total += valor as i64;
    }
    total
}
'''

TICKET_STARTER = r'''use std::io;

// ticket.rs - impressão do ticket na saída.
// Entrada: os minutos de permanência. Saída: "Valor: R$ reais,centavos".
// 15 minutos grátis; depois R$ 5,00 por hora começada; no máximo R$ 40,00.

fn main() {
    let mut linha = String::new();
    io::stdin().read_line(&mut linha).unwrap();
    let minutos: i32 = linha.trim().parse().unwrap();
    let horas = (minutos - 15) / 60;
    let valor = if minutos <= 15 { 0 } else { horas * 500 };
    println!("Valor: R$ {}", valor / 100);
}
'''

TICKET_SOLUCAO = r'''use std::io;

fn main() {
    let mut linha = String::new();
    io::stdin().read_line(&mut linha).unwrap();
    let minutos: i32 = linha.trim().parse().unwrap();
    let horas = (minutos - 15 + 59) / 60;
    let mut valor = if minutos <= 15 { 0 } else { horas * 500 };
    if valor > 4000 {
        valor = 4000;
    }
    println!("Valor: R$ {},{:02}", valor / 100, valor % 100);
}
'''

PACK_RUST = Pack(
    match=[],
    new_course="Oficina de Rust: o Estacionamento Central",
    description="Rust na prática: tarifas, validação de placas, busca de vagas e somas sem estouro de inteiro.",
    categories=["rust", "exercicios"],
    intro=(
        "<p>O <strong>Estacionamento Central</strong> reescreveu seu sistema de cobrança em Rust. O compilador pegou muita coisa, "
        "mas ainda sobraram bugs de lógica e um estouro de inteiro que derruba o fechamento do mês. Em Rust você escreve "
        "<strong>só as funções</strong>, sem <code>main</code> (exceto nos exercícios de entrada e saída).</p>"
    ),
    modules=[
        (
            "Prática: o estacionamento (Rust)",
            [
                (
                    "Tarifa do estacionamento",
                    [
                        lesson_text(
                            "Uma hora e um minuto cobra só uma hora",
                            "Os clientes que passam alguns minutos da hora cheia não pagam a hora seguinte: a divisão de inteiros no Rust "
                            "arredonda para baixo.",
                            "tarifa.rs",
                            [
                                "Os primeiros 15 minutos são grátis.",
                                "Depois disso, R$ 5,00 (500 centavos) por hora <strong>começada</strong>.",
                                "O valor máximo do dia é R$ 40,00 (4000 centavos).",
                            ],
                            "para dividir arredondando para cima: <code>(a + b - 1) / b</code>.",
                        ),
                        function_exercise(
                            "rust", "Valor do estacionamento", "valor_do_estacionamento", ["minutos"], TARIFA_STARTER, TARIFA_SOLUCAO,
                            tests(t([0], 0), t([15], 0), t([16], 500), t([75], 500), t([76], 1000), t([1000], 4000), t([600], 4000)),
                            types=["int"], returns="int",
                        ),
                    ],
                ),
                (
                    "Cadastro de placas",
                    [
                        lesson_text(
                            "Qualquer texto de 7 letras vira placa",
                            "O cadastro só confere o tamanho da placa. Já foi cadastrada a placa <code>ABCDEFG</code>, e placas antigas com hífen "
                            "foram recusadas.",
                            "placa.rs",
                            [
                                "Modelo Mercosul: 3 letras maiúsculas, 1 dígito, 1 letra maiúscula e 2 dígitos (<code>ABC1D23</code>).",
                                "Modelo antigo: 3 letras maiúsculas, hífen e 4 dígitos (<code>ABC-1234</code>).",
                                "Qualquer outra coisa é inválida.",
                            ],
                            "<code>placa.chars().collect::&lt;Vec&lt;char&gt;&gt;()</code> dá acesso a cada caractere por posição.",
                        ),
                        function_exercise(
                            "rust", "Placa válida", "placa_valida", ["placa"], PLACA_STARTER, PLACA_SOLUCAO,
                            tests(
                                t(["ABC1D23"], True), t(["ABC-1234"], True), t(["abc1d23"], False), t(["ABC1234"], False),
                                t(["ABCD123"], False), t([""], False), t(["AB-1234"], False),
                            ),
                            types=["String"], returns="boolean",
                        ),
                    ],
                ),
                (
                    "Vagas para o grupo",
                    [
                        lesson_text(
                            "Vagas separadas para quem chegou junto",
                            "Quando um grupo de carros chega junto, o sistema sugere a primeira vaga livre, mesmo que as vagas seguintes estejam ocupadas e "
                            "o grupo fique espalhado.",
                            "vagas.rs",
                            [
                                "Devolva a posição da primeira vaga de uma sequência de <code>quantidade</code> vagas livres consecutivas.",
                                "Se não houver, devolva <code>-1</code>.",
                            ],
                        ),
                        function_exercise(
                            "rust", "Vagas consecutivas", "vagas_livres_consecutivas", ["vagas", "quantidade"], VAGAS_STARTER, VAGAS_SOLUCAO,
                            tests(
                                t([[True, False, True, True, True, False], 3], 2), t([[True, False, True], 2], -1), t([[True, True], 1], 0),
                                t([[], 1], -1), t([[False, True, True], 2], 1),
                            ),
                            types=["boolean[]", "int"], returns="int",
                        ),
                    ],
                ),
                (
                    "Fechamento do mês",
                    [
                        lesson_text(
                            "O programa derruba no fim do mês",
                            "Em meses de faturamento alto o fechamento falha com <code>attempt to add with overflow</code>: a soma está sendo guardada "
                            "num <code>i32</code>, que só vai até 2,1 bilhões de centavos.",
                            "faturamento.rs",
                            ["Some os valores dos dias e devolva o total como <code>i64</code>."],
                            "converta cada valor com <code>valor as i64</code> <em>antes</em> de somar.",
                        ),
                        function_exercise(
                            "rust", "Faturamento do mês", "faturamento", ["centavos"], FATURA_STARTER, FATURA_SOLUCAO,
                            tests(
                                t([[100, 250]], 350), t([[]], 0), t([[2000000000, 2000000000]], 4000000000), t([[2147483647, 1]], 2147483648),
                            ),
                            types=["int[]"], returns="long",
                        ),
                    ],
                ),
                (
                    "O ticket de saída (entrada e saída)",
                    [
                        lesson_text(
                            "Ticket com valor quebrado",
                            "Programa completo: lê os minutos de permanência e imprime o valor do ticket. O ticket sai como <code>R$ 5</code> "
                            "(sem os centavos) e ainda cobra a hora errada.",
                            "ticket.rs",
                            [
                                "Entrada: os minutos (um inteiro).",
                                "Saída: <code>Valor: R$ reais,centavos</code>. Mesma tarifa do exercício anterior, inclusive o teto de R$ 40,00.",
                            ],
                            "<code>println!(\"{},{:02}\", a, b)</code> completa com zero à esquerda.",
                        ),
                        output_exercise(
                            "rust", "Ticket de saída", TICKET_STARTER, TICKET_SOLUCAO,
                            tests(out("0\n", "Valor: R$ 0,00\n"), out("16\n", "Valor: R$ 5,00\n"), out("76\n", "Valor: R$ 10,00\n"), out("1000\n", "Valor: R$ 40,00\n")),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Ruby - a pizzaria

PEDIDO_STARTER = r'''# pedido.rb - fechamento do pedido da Pizzaria Bella Massa
# Cada item: [nome, preço em centavos, quantidade, borda_recheada]
# A borda recheada custa 800 centavos a mais por unidade.

def total_do_pedido(itens)
  itens.sum { |nome, preco, quantidade, borda| preco * quantidade }
end
'''

PEDIDO_SOLUCAO = r'''def total_do_pedido(itens)
  itens.sum { |_nome, preco, quantidade, borda| (preco + (borda ? 800 : 0)) * quantidade }
end
'''

TAXA_STARTER = r'''# entrega.rb - taxa de entrega da Pizzaria Bella Massa (em centavos)
# Até 3 km: 500. Acima disso, 150 por km adicional começado.
# Pedidos de 8000 ou mais têm entrega grátis até 5 km.

def taxa_de_entrega(distancia_km, valor_pedido)
  return 0 if valor_pedido >= 8000 && distancia_km <= 5
  extras = (distancia_km - 3).to_i
  500 + extras * 150
end
'''

TAXA_SOLUCAO = r'''def taxa_de_entrega(distancia_km, valor_pedido)
  return 0 if valor_pedido >= 8000 && distancia_km <= 5
  extras = [(distancia_km - 3).ceil, 0].max
  500 + extras * 150
end
'''

SABORES_STARTER = r'''# relatorio.rb - sabores mais pedidos da semana
# Os sabores chegam digitados à mão: "Calabresa", "calabresa " e "CALABRESA" são o mesmo sabor.

def contar_sabores(pedidos)
  contagem = {}
  pedidos.each do |sabor|
    contagem[sabor] += 1
  end
  contagem
end
'''

SABORES_SOLUCAO = r'''def contar_sabores(pedidos)
  contagem = Hash.new(0)
  pedidos.each { |sabor| contagem[sabor.strip.downcase] += 1 }
  contagem
end
'''

NOME_RUBY_STARTER = r'''# cardapio.rb - nomes dos sabores no cardápio digital
# "pizza de quatro queijos  " deve aparecer como "Quatro Queijos"

def nome_do_sabor(texto)
  texto.strip.sub(/^pizza de /i, "").capitalize
end
'''

NOME_RUBY_SOLUCAO = r'''def nome_do_sabor(texto)
  texto.strip.sub(/\Apizza (de|do|da) /i, "").split.map(&:capitalize).join(" ")
end
'''

TOTAL_RUBY_STARTER = r'''# fechamento.rb - total de pizzas do dia.
# Entrada: N e depois N linhas "sabor quantidade". Saída: "Total de pizzas: X"
n = gets.to_i
total = 0
n.times do
  sabor, quantidade = gets.split
  total += 1
end
puts "Total de pizzas: #{total}"
'''

TOTAL_RUBY_SOLUCAO = r'''n = gets.to_i
total = 0
n.times do
  sabor, quantidade = gets.split
  total += quantidade.to_i
end
puts "Total de pizzas: #{total}"
'''

PACK_RUBY = Pack(
    match=[],
    new_course="Oficina de Ruby: a pizzaria Bella Massa",
    description="Ruby no dia a dia de uma pizzaria: total do pedido, taxa de entrega, relatório de sabores e cardápio digital.",
    categories=["ruby", "exercicios"],
    intro=(
        "<p>A <strong>Pizzaria Bella Massa</strong> tem scripts em Ruby que fecham os pedidos, calculam a entrega e montam o "
        "relatório semanal. Em cada aula você conserta um deles. Em Ruby você escreve <strong>só os métodos</strong> (<code>def ... end</code>).</p>"
    ),
    modules=[
        (
            "Prática: a pizzaria (Ruby)",
            [
                (
                    "Total do pedido",
                    [
                        lesson_text(
                            "Borda recheada de graça",
                            "O fechamento do pedido soma só o preço da pizza vezes a quantidade. A borda recheada, que custa R$ 8,00 a mais por unidade, "
                            "nunca entra na conta.",
                            "pedido.rb",
                            [
                                "Cada item é <code>[nome, preço, quantidade, borda_recheada]</code>, com os preços em centavos.",
                                "Total = soma de <code>(preço + 800 se tiver borda) × quantidade</code> de todos os itens.",
                            ],
                        ),
                        function_exercise(
                            "ruby", "Total do pedido", "total_do_pedido", ["itens"], PEDIDO_STARTER, PEDIDO_SOLUCAO,
                            tests(
                                t([[["calabresa", 4500, 2, True], ["guaraná", 900, 3, False]]], 13300), t([[]], 0),
                                t([[["margherita", 4000, 1, False]]], 4000), t([[["portuguesa", 5000, 1, True]]], 5800),
                            ),
                        ),
                    ],
                ),
                (
                    "Taxa de entrega",
                    [
                        lesson_text(
                            "O motoboy cobra frete negativo",
                            "Para clientes pertinho da pizzaria (menos de 3 km) a taxa sai <em>menor que 500</em>, e para quem mora a 3,2 km sai o preço de 3 km: "
                            "o <code>to_i</code> joga fora a parte decimal em vez de contar o quilômetro começado.",
                            "entrega.rb",
                            [
                                "Até 3 km: 500. Acima disso, mais 150 por km adicional <strong>começado</strong> (3,2 km = 1 km extra).",
                                "Pedidos de 8000 ou mais com entrega até 5 km: taxa 0.",
                            ],
                            "<code>3.2.ceil</code> é 4; e o menor valor possível de extras é zero.",
                        ),
                        function_exercise(
                            "ruby", "Taxa de entrega", "taxa_de_entrega", ["distancia_km", "valor_pedido"], TAXA_STARTER, TAXA_SOLUCAO,
                            tests(
                                t([2, 3000], 500), t([3, 3000], 500), t([3.2, 3000], 650), t([5, 3000], 800), t([5, 8000], 0),
                                t([6, 9000], 950), t([5.1, 8000], 950), t([0, 0], 500),
                            ),
                        ),
                    ],
                ),
                (
                    "Sabores mais pedidos",
                    [
                        lesson_text(
                            "O relatório da semana nem sai",
                            "O script do relatório semanal termina com <code>NoMethodError: undefined method '+' for nil</code>. Além disso, "
                            "\"Calabresa\" e \"calabresa \" apareceriam como sabores diferentes.",
                            "relatorio.rb",
                            [
                                "Devolva um hash <code>{ sabor =&gt; quantidade de pedidos }</code>.",
                                "Os sabores são comparados sem espaços nas pontas e sem diferenciar maiúsculas; as chaves ficam em minúsculas.",
                            ],
                            "<code>Hash.new(0)</code> cria um hash em que toda chave nova começa em zero.",
                        ),
                        function_exercise(
                            "ruby", "Contar sabores", "contar_sabores", ["pedidos"], SABORES_STARTER, SABORES_SOLUCAO,
                            tests(
                                t([["Calabresa", "calabresa ", "Mussarela"]], {"calabresa": 2, "mussarela": 1}), t([[]], {}),
                                t([["A", "A", "A"]], {"a": 3}), t([["Frango Catupiry", "frango catupiry", "FRANGO CATUPIRY "]], {"frango catupiry": 3}),
                            ),
                        ),
                    ],
                ),
                (
                    "Cardápio digital",
                    [
                        lesson_text(
                            "\"Quatro queijos\" com a segunda palavra minúscula",
                            "O cardápio digital deixa só a primeira letra do nome do sabor maiúscula e mostra o \"pizza de\" que sobrou do cadastro.",
                            "cardapio.rb",
                            [
                                "Se o texto começar com <code>pizza de</code>, <code>pizza do</code> ou <code>pizza da</code>, tire esse começo.",
                                "Cada palavra restante começa com maiúscula e o resto fica minúsculo.",
                                "Ignore espaços sobrando.",
                            ],
                        ),
                        function_exercise(
                            "ruby", "Nome do sabor", "nome_do_sabor", ["texto"], NOME_RUBY_STARTER, NOME_RUBY_SOLUCAO,
                            tests(
                                t(["pizza de quatro queijos  "], "Quatro Queijos"), t(["PIZZA DO CHEFE"], "Chefe"),
                                t(["Calabresa acebolada"], "Calabresa Acebolada"), t(["  frango  com   catupiry "], "Frango Com Catupiry"),
                                t(["pizza da casa"], "Casa"),
                            ),
                        ),
                    ],
                ),
                (
                    "Fechamento do dia (entrada e saída)",
                    [
                        lesson_text(
                            "Conta linhas em vez de pizzas",
                            "Programa completo: lê os pedidos do dia e imprime quantas pizzas saíram. O script conta o número de <em>linhas</em> do pedido, "
                            "não de pizzas.",
                            "fechamento.rb",
                            [
                                "Entrada: <code>N</code> e depois <code>N</code> linhas <code>sabor quantidade</code>.",
                                "Saída: <code>Total de pizzas: X</code>, com X a soma das quantidades.",
                            ],
                        ),
                        output_exercise(
                            "ruby", "Total de pizzas", TOTAL_RUBY_STARTER, TOTAL_RUBY_SOLUCAO,
                            tests(
                                out("2\ncalabresa 2\nmussarela 3\n", "Total de pizzas: 5\n"), out("0\n", "Total de pizzas: 0\n"),
                                out("1\nportuguesa 1\n", "Total de pizzas: 1\n"), out("3\na 1\nb 1\nc 4\n", "Total de pizzas: 6\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== C e C++ - o posto de combustivel

MEDIA_C_STARTER = r'''// consumo.c - relatório do Posto Estrela
// Quantos litros, em média, o posto vende por dia (arredondando para o inteiro mais próximo).

int media_de_litros(int total_litros, int dias) {
    return total_litros / dias;
}
'''

MEDIA_C_SOLUCAO = r'''int media_de_litros(int total_litros, int dias) {
    if (dias == 0) {
        return 0;
    }
    return (total_litros * 2 + dias) / (dias * 2);
}
'''

FATURA_C_STARTER = r'''// faturamento.c - faturamento do mês do Posto Estrela
// O preço do litro está em centavos.

long long faturamento(int litros, int centavos_por_litro) {
    return litros * centavos_por_litro;
}
'''

FATURA_C_SOLUCAO = r'''long long faturamento(int litros, int centavos_por_litro) {
    return (long long) litros * centavos_por_litro;
}
'''

TIPO_C_STARTER = r'''// bomba.c - etiqueta da bomba de combustível

const char* tipo_do_combustivel(int octanagem) {
    if (octanagem >= 87) {
        return "comum";
    } else if (octanagem >= 91) {
        return "aditivada";
    } else if (octanagem >= 95) {
        return "podium";
    }
    return "invalido";
}
'''

TIPO_C_SOLUCAO = r'''const char* tipo_do_combustivel(int octanagem) {
    if (octanagem >= 95) {
        return "podium";
    } else if (octanagem >= 91) {
        return "aditivada";
    } else if (octanagem >= 87) {
        return "comum";
    }
    return "invalido";
}
'''

PLACA_C_STARTER = r'''// rodizio.c - promoção "dia do rodízio": desconto para placas que terminam no dígito do dia

bool placa_termina_com(const char* placa, int digito) {
    int tamanho = strlen(placa);
    return placa[tamanho] - '0' == digito;
}
'''

PLACA_C_SOLUCAO = r'''bool placa_termina_com(const char* placa, int digito) {
    int tamanho = strlen(placa);
    return placa[tamanho - 1] - '0' == digito;
}
'''

ACIMA_STARTER = r'''// bombas.cpp - quais abastecimentos ficaram acima da média do dia
// (o sistema já inclui as bibliotecas padrão e usa "using namespace std")

vector<int> abastecimentos_acima_da_media(vector<int> litros) {
    int soma = 0;
    for (int l : litros) soma += l;
    int media = litros.empty() ? 0 : soma / litros.size();
    vector<int> acima;
    for (int l : litros) {
        if (l >= media) acima.push_back(l);
    }
    return acima;
}
'''

ACIMA_SOLUCAO = r'''vector<int> abastecimentos_acima_da_media(vector<int> litros) {
    if (litros.empty()) return {};
    double soma = 0;
    for (int l : litros) soma += l;
    double media = soma / litros.size();
    vector<int> acima;
    for (int l : litros) {
        if (l > media) acima.push_back(l);
    }
    return acima;
}
'''

RESUMO_CPP_STARTER = r'''// painel.cpp - painel do Posto Estrela: "Bomba 1: 120L | Bomba 2: 80L"

string resumo_do_posto(vector<int> litros_por_bomba) {
    string resumo = "";
    for (size_t i = 0; i < litros_por_bomba.size(); i++) {
        if (i > 0) resumo += " | ";
        resumo += "Bomba " + to_string(i) + ": " + to_string(litros_por_bomba[i]);
    }
    return resumo;
}
'''

RESUMO_CPP_SOLUCAO = r'''string resumo_do_posto(vector<int> litros_por_bomba) {
    string resumo = "";
    for (size_t i = 0; i < litros_por_bomba.size(); i++) {
        if (i > 0) resumo += " | ";
        resumo += "Bomba " + to_string(i + 1) + ": " + to_string(litros_por_bomba[i]) + "L";
    }
    return resumo;
}
'''

ABASTECER_STARTER = r'''#include <stdio.h>

/* abastecer.c - cupom do abastecimento.
   Entrada: "litros preco_por_litro" (números com ponto decimal).
   Saída: "Total: R$ x.xx" com 2 casas decimais. */

int main() {
    double litros, preco;
    scanf("%lf %lf", &litros, &preco);
    int total = litros * preco;
    printf("Total: R$ %d\n", total);
    return 0;
}
'''

ABASTECER_SOLUCAO = r'''#include <stdio.h>

int main() {
    double litros, preco;
    scanf("%lf %lf", &litros, &preco);
    printf("Total: R$ %.2f\n", litros * preco);
    return 0;
}
'''

PACK_C = Pack(
    match=[],
    new_course="Oficina de C e C++: o Posto Estrela",
    description="C e C++ em funções pequenas e bugs clássicos: divisão por zero, estouro de inteiro, índice errado, comparações fora de ordem.",
    categories=["c", "cpp", "exercicios"],
    intro=(
        "<p>O <strong>Posto Estrela</strong> controla bombas e relatórios com programas em C e C++. Em cada aula você conserta uma "
        "função com um bug clássico da linguagem: divisão por zero, estouro de <code>int</code>, índice fora do texto.</p>"
        "<p>Você escreve <strong>só a função</strong>, sem <code>main</code>. As bibliotecas padrão e <code>using namespace std</code> "
        "(em C++) já estão prontos. Em C, o modo função aceita apenas números e texto (<code>const char*</code>); listas ficam para o C++.</p>"
    ),
    modules=[
        (
            "Prática: o posto de combustível (C)",
            [
                (
                    "Média de litros por dia",
                    [
                        lesson_text(
                            "O relatório trava quando o posto está fechado",
                            "Em dias de feriado o relatório divide por zero e o programa cai (<em>Floating point exception</em>). Além disso, a "
                            "média sai arredondada <em>para baixo</em>, e o gerente quer o inteiro mais próximo.",
                            "consumo.c",
                            [
                                "Devolva <code>total_litros / dias</code> arredondado para o inteiro mais próximo (metades sobem).",
                                "Com <code>dias</code> igual a 0, devolva 0.",
                            ],
                            "para arredondar a divisão a/b sem usar decimais: <code>(2*a + b) / (2*b)</code>.",
                        ),
                        function_exercise(
                            "c", "Média de litros", "media_de_litros", ["total_litros", "dias"], MEDIA_C_STARTER, MEDIA_C_SOLUCAO,
                            tests(t([7, 2], 4), t([10, 4], 3), t([5, 3], 2), t([10, 0], 0), t([1, 3], 0), t([9, 3], 3)),
                            types=["int", "int"], returns="int",
                        ),
                    ],
                ),
                (
                    "Faturamento do mês",
                    [
                        lesson_text(
                            "O faturamento fica negativo",
                            "Postos grandes, que vendem milhões de litros no mês, aparecem com faturamento <em>negativo</em> no relatório: "
                            "<code>litros * centavos</code> é calculado em <code>int</code>, que estoura.",
                            "faturamento.c",
                            ["Devolva <code>litros × centavos_por_litro</code> como <code>long long</code>, sem estourar."],
                            "converta um dos fatores para <code>long long</code> <em>antes</em> da multiplicação.",
                        ),
                        function_exercise(
                            "c", "Faturamento", "faturamento", ["litros", "centavos_por_litro"], FATURA_C_STARTER, FATURA_C_SOLUCAO,
                            tests(t([1000, 650], 650000), t([4000000, 650], 2600000000), t([0, 700], 0), t([3000000, 650], 1950000000)),
                            types=["int", "int"], returns="long",
                        ),
                    ],
                ),
                (
                    "Tipo de combustível",
                    [
                        lesson_text(
                            "Toda gasolina sai \"comum\"",
                            "A etiqueta da bomba mostra \"comum\" para qualquer octanagem a partir de 87, mesmo para a gasolina premium.",
                            "bomba.c",
                            [
                                "Octanagem 95 ou mais: <code>\"podium\"</code>; 91 ou mais: <code>\"aditivada\"</code>; 87 ou mais: <code>\"comum\"</code>.",
                                "Abaixo de 87: <code>\"invalido\"</code>.",
                            ],
                            "num <code>if / else if</code>, a primeira condição verdadeira vence: comece pelo maior limite.",
                        ),
                        function_exercise(
                            "c", "Tipo do combustível", "tipo_do_combustivel", ["octanagem"], TIPO_C_STARTER, TIPO_C_SOLUCAO,
                            tests(
                                t([95], "podium"), t([98], "podium"), t([91], "aditivada"), t([94], "aditivada"), t([87], "comum"),
                                t([90], "comum"), t([86], "invalido"), t([0], "invalido"),
                            ),
                            types=["int"], returns="String",
                        ),
                    ],
                ),
                (
                    "Promoção do rodízio",
                    [
                        lesson_text(
                            "Ninguém ganha o desconto",
                            "A promoção \"placa final 3 ganha desconto\" nunca vale para ninguém: a função olha o caractere <em>depois</em> do último.",
                            "rodizio.c",
                            [
                                "Devolva <code>true</code> se o último caractere da placa for o dígito informado.",
                                "Use <code>strlen</code> (já incluído) e lembre que o último caractere está na posição <code>tamanho - 1</code>.",
                            ],
                            "em C, uma string de tamanho <code>n</code> tem os índices <code>0</code> a <code>n-1</code>, e na posição <code>n</code> está o <code>'\\0'</code>.",
                        ),
                        function_exercise(
                            "c", "Placa termina com", "placa_termina_com", ["placa", "digito"], PLACA_C_STARTER, PLACA_C_SOLUCAO,
                            tests(
                                t(["ABC1D23", 3], True), t(["ABC1D23", 4], False), t(["XYZ-0000", 0], True), t(["ABC-1239", 9], True), t(["A", 1], False),
                            ),
                            types=["String", "int"], returns="boolean",
                        ),
                    ],
                ),
                (
                    "Cupom de abastecimento (entrada e saída)",
                    [
                        lesson_text(
                            "O cupom some com os centavos",
                            "Programa completo em C: lê os litros e o preço do litro e imprime o total. O cupom mostra <code>R$ 235</code>, porque o "
                            "total é guardado num <code>int</code>.",
                            "abastecer.c",
                            [
                                "Entrada: <code>litros preco_por_litro</code> (decimais com ponto).",
                                "Saída: <code>Total: R$ x.xx</code> com 2 casas decimais.",
                            ],
                            "<code>printf(\"%.2f\", valor)</code> imprime um <code>double</code> com 2 casas.",
                        ),
                        output_exercise(
                            "c", "Cupom de abastecimento", ABASTECER_STARTER, ABASTECER_SOLUCAO,
                            tests(
                                out("40 5.89\n", "Total: R$ 235.60\n"), out("10.5 6\n", "Total: R$ 63.00\n"), out("0 7.5\n", "Total: R$ 0.00\n"),
                                out("30 5.999\n", "Total: R$ 179.97\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
        (
            "Prática: o posto de combustível (C++)",
            [
                (
                    "Acima da média",
                    [
                        lesson_text(
                            "Quando todos abastecem igual, todos estão \"acima da média\"",
                            "O relatório de destaques lista abastecimentos <em>acima da média</em>, mas inclui os que estão exatamente na média "
                            "(e a média é calculada em inteiros, perdendo as casas decimais).",
                            "bombas.cpp",
                            [
                                "Devolva, na ordem original, os abastecimentos <strong>estritamente maiores</strong> que a média (com decimais).",
                                "Lista vazia: devolva uma lista vazia.",
                            ],
                            "use <code>double</code> para a média: <code>5.5</code> não pode virar <code>5</code>.",
                        ),
                        function_exercise(
                            "cpp", "Abastecimentos acima da média", "abastecimentos_acima_da_media", ["litros"], ACIMA_STARTER, ACIMA_SOLUCAO,
                            tests(
                                t([[10, 20, 30, 40]], [30, 40]), t([[10, 10, 10]], []), t([[5, 6]], [6]), t([[]], []), t([[3, 4, 4]], [4, 4]),
                            ),
                            types=["int[]"], returns="int[]",
                        ),
                    ],
                ),
                (
                    "Painel das bombas",
                    [
                        lesson_text(
                            "\"Bomba 0\" no painel",
                            "O painel eletrônico do posto mostra a primeira bomba como <code>Bomba 0</code> e esquece a unidade dos litros.",
                            "painel.cpp",
                            [
                                "Formato: <code>Bomba 1: 120L | Bomba 2: 80L</code> (as bombas começam em 1, separadas por <code> | </code>).",
                                "Sem bombas: texto vazio.",
                            ],
                        ),
                        function_exercise(
                            "cpp", "Resumo do posto", "resumo_do_posto", ["litros_por_bomba"], RESUMO_CPP_STARTER, RESUMO_CPP_SOLUCAO,
                            tests(
                                t([[120, 80]], "Bomba 1: 120L | Bomba 2: 80L"), t([[]], ""), t([[0]], "Bomba 1: 0L"),
                                t([[5, 6, 7]], "Bomba 1: 5L | Bomba 2: 6L | Bomba 3: 7L"),
                            ),
                            types=["int[]"], returns="String",
                        ),
                    ],
                ),
            ],
        ),
    ],
)
