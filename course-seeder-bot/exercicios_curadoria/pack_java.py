"""Java: a cantina da escola (Java Basico) e a fila do banco (Estruturas de Dados)."""
from .base import Pack, function_exercise, lesson_text, out, output_exercise, t, tests

# =========================================================================== Java basico: a cantina

TOTAL_STARTER = '''// Cantina.java - sistema da cantina do Colégio Horizonte
// Preços em centavos. precos[i] é o preço do item i e quantidades[i] quantas unidades o aluno pediu.

static int totalDoPedido(int[] precos, int[] quantidades) {
    int total = 0;
    for (int i = 0; i <= precos.length; i++) {
        total += precos[i] * quantidades[i];
    }
    return total;
}
'''

TOTAL_SOLUCAO = '''static int totalDoPedido(int[] precos, int[] quantidades) {
    int total = 0;
    for (int i = 0; i < precos.length; i++) {
        total += precos[i] * quantidades[i];
    }
    return total;
}
'''

SALDO_STARTER = '''// Cantina.java - tela de saldo da carteirinha
// O saldo vem em centavos (1250 = R$ 12,50).

static String formatarSaldo(int saldoCentavos) {
    return "R$ " + saldoCentavos / 100 + "," + saldoCentavos % 100;
}
'''

SALDO_SOLUCAO = '''static String formatarSaldo(int saldoCentavos) {
    return String.format("R$ %d,%02d", saldoCentavos / 100, saldoCentavos % 100);
}
'''

ESTOQUE_STARTER = '''// Estoque.java - baixa de estoque no fim do intervalo
// estoque[i] é quanto havia do produto i; vendas[i], quanto foi vendido dele.

static int[] estoqueAposVendas(int[] estoque, int[] vendas) {
    int[] novo = new int[estoque.length];
    for (int i = 0; i < estoque.length; i++) {
        novo[i] = estoque[i] - vendas[i];
    }
    return novo;
}
'''

ESTOQUE_SOLUCAO = '''static int[] estoqueAposVendas(int[] estoque, int[] vendas) {
    int[] novo = new int[estoque.length];
    for (int i = 0; i < estoque.length; i++) {
        novo[i] = Math.max(estoque[i] - vendas[i], 0);
    }
    return novo;
}
'''

COMPRA_STARTER = '''// Regras.java - o que cada aluno pode comprar na cantina

static boolean podeComprar(int idade, boolean temAutorizacao, String produto) {
    if (produto.equals("energetico") && idade >= 18) {
        return true;
    }
    if (produto.equals("cafe") && idade >= 12 || temAutorizacao) {
        return true;
    }
    return false;
}
'''

COMPRA_SOLUCAO = '''static boolean podeComprar(int idade, boolean temAutorizacao, String produto) {
    if (produto.equals("energetico")) {
        return idade >= 18;
    }
    if (produto.equals("cafe")) {
        return idade >= 12 || temAutorizacao;
    }
    return true;
}
'''

CAIXA_STARTER = '''import java.util.Scanner;

// Caixa.java - fecha a conta de um aluno na cantina.
// Entrada: N, e depois N linhas "preço quantidade" (preço em centavos).
// Saída: "Total: R$ x,yy"

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int total = 0;
        for (int i = 0; i < n; i++) {
            int preco = sc.nextInt();
            int quantidade = sc.nextInt();
            total += preco;
        }
        System.out.println("Total: R$ " + total / 100.0);
    }
}
'''

CAIXA_SOLUCAO = '''import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int total = 0;
        for (int i = 0; i < n; i++) {
            int preco = sc.nextInt();
            int quantidade = sc.nextInt();
            total += preco * quantidade;
        }
        System.out.printf("Total: R$ %d,%02d%n", total / 100, total % 100);
    }
}
'''

PACK_BASICO = Pack(
    match=["Java Básico"],
    new_course="Oficina de Java: a cantina do colégio",
    description="Métodos, vetores e condições em Java, consertando o sistema da cantina de uma escola.",
    categories=["java", "exercicios"],
    intro=(
        "<p>A cantina do <strong>Colégio Horizonte</strong> usa um sistema em Java que o professor de informática escreveu "
        "num fim de semana. Funciona, mas tem bugs clássicos: laço que passa do fim do vetor, formatação de dinheiro, "
        "regras de negócio no <code>if</code> errado.</p>"
        "<p>Em Java você escreve <strong>só o método <code>static</code></strong> (sem a classe): o sistema coloca o seu "
        "código dentro de uma classe <code>Main</code> e chama o método com os testes.</p>"
    ),
    modules=[
        (
            "Prática: a cantina do colégio (Java)",
            [
                (
                    "Total do pedido",
                    [
                        lesson_text(
                            "O caixa trava no meio do pedido",
                            "Quando o aluno pede qualquer coisa, o caixa da cantina dá erro "
                            "<code>ArrayIndexOutOfBoundsException</code> e fecha. O laço que soma o pedido vai um passo além do que deveria.",
                            "Cantina.java",
                            [
                                "O total é a soma de <code>precos[i] × quantidades[i]</code>, em centavos.",
                                "Pedido vazio: 0.",
                            ],
                            "um vetor com <code>n</code> posições vai de <code>0</code> a <code>n - 1</code>.",
                        ),
                        function_exercise(
                            "java", "Total do pedido", "totalDoPedido", ["precos", "quantidades"], TOTAL_STARTER, TOTAL_SOLUCAO,
                            tests(
                                t([[350, 500, 1200], [2, 1, 1]], 2400), t([[], []], 0), t([[100], [0]], 0), t([[199, 250], [3, 4]], 1597),
                            ),
                            types=["int[]", "int[]"], returns="int",
                        ),
                    ],
                ),
                (
                    "Saldo da carteirinha",
                    [
                        lesson_text(
                            "R$ 12,5 e R$ 0,5",
                            "Na tela de saldo, o aluno que tem R$ 12,05 vê <code>R$ 12,5</code>, e quem tem 5 centavos vê "
                            "<code>R$ 0,5</code>. Falta completar os centavos com zero.",
                            "Cantina.java",
                            ["Devolva o saldo como <code>R$ reais,centavos</code>, com sempre 2 dígitos nos centavos."],
                            "<code>String.format(\"%02d\", n)</code> completa com zero à esquerda.",
                        ),
                        function_exercise(
                            "java", "Formatar saldo", "formatarSaldo", ["saldoCentavos"], SALDO_STARTER, SALDO_SOLUCAO,
                            tests(t([1250], "R$ 12,50"), t([5], "R$ 0,05"), t([0], "R$ 0,00"), t([100], "R$ 1,00"), t([99999], "R$ 999,99"), t([1205], "R$ 12,05")),
                            types=["int"], returns="String",
                        ),
                    ],
                ),
                (
                    "Baixa de estoque",
                    [
                        lesson_text(
                            "Estoque negativo",
                            "Depois do intervalo, o relatório mostrou \"-3 coxinhas\" no estoque: o sistema registra vendas de produtos "
                            "que já tinham acabado (a baixa foi feita na ordem errada, na correria).",
                            "Estoque.java",
                            [
                                "Devolva um novo vetor com <code>estoque[i] - vendas[i]</code> para cada produto.",
                                "O estoque <strong>nunca fica abaixo de zero</strong>.",
                            ],
                        ),
                        function_exercise(
                            "java", "Baixa de estoque", "estoqueAposVendas", ["estoque", "vendas"], ESTOQUE_STARTER, ESTOQUE_SOLUCAO,
                            tests(t([[10, 5, 0], [3, 5, 0]], [7, 0, 0]), t([[10, 5], [12, 1]], [0, 4]), t([[], []], []), t([[3], [4]], [0])),
                            types=["int[]", "int[]"], returns="int[]",
                        ),
                    ],
                ),
                (
                    "Quem pode comprar o quê",
                    [
                        lesson_text(
                            "Energético para criança",
                            "A diretora descobriu que um aluno de 10 anos, com a autorização do pai para o <em>café</em>, comprou um energético. "
                            "O culpado é uma condição com <code>&amp;&amp;</code> e <code>||</code> misturados.",
                            "Regras.java",
                            [
                                "<code>\"energetico\"</code>: somente quem tem 18 anos ou mais, com ou sem autorização.",
                                "<code>\"cafe\"</code>: 12 anos ou mais, ou com autorização dos pais.",
                                "Qualquer outro produto: liberado para todos.",
                            ],
                            "resolva um produto por vez, cada um com seu próprio <code>if</code> e seu próprio <code>return</code>.",
                        ),
                        function_exercise(
                            "java", "Regras de compra", "podeComprar", ["idade", "temAutorizacao", "produto"], COMPRA_STARTER, COMPRA_SOLUCAO,
                            tests(
                                t([17, True, "energetico"], False), t([18, False, "energetico"], True), t([10, False, "cafe"], False),
                                t([10, True, "cafe"], True), t([12, False, "cafe"], True), t([8, False, "suco"], True),
                                t([20, False, "salgado"], True),
                            ),
                            types=["int", "boolean", "String"], returns="boolean",
                        ),
                    ],
                ),
                (
                    "Fechando a conta (entrada e saída)",
                    [
                        lesson_text(
                            "O total sai sem a quantidade",
                            "Programa completo: o caixa lê os itens com <code>Scanner</code> e imprime a conta. O total ignora a quantidade "
                            "e sai como <code>R$ 12.0</code>, e o gerente quer o padrão da cantina.",
                            "Caixa.java",
                            [
                                "Entrada: um inteiro <code>N</code> e depois <code>N</code> linhas com <code>preço quantidade</code> (preço em centavos).",
                                "Saída: <code>Total: R$ reais,centavos</code>, com 2 dígitos nos centavos.",
                            ],
                            "<code>System.out.printf(\"%d,%02d%n\", a, b)</code> formata sem concatenar texto.",
                        ),
                        output_exercise(
                            "java", "Fechar a conta", CAIXA_STARTER, CAIXA_SOLUCAO,
                            tests(
                                out("2\n350 2\n500 1\n", "Total: R$ 12,00\n"), out("1\n199 1\n", "Total: R$ 1,99\n"),
                                out("0\n", "Total: R$ 0,00\n"), out("3\n100 3\n250 2\n1000 1\n", "Total: R$ 18,00\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)

# =========================================================================== Estruturas de dados: a fila do banco

BUSCA_STARTER = '''// FilaDoBanco.java - busca da senha chamada
// `senhas` está em ordem crescente. Devolva a posição da senha ou -1 se ela não estiver na lista.

static int buscaBinaria(int[] senhas, int alvo) {
    int inicio = 0;
    int fim = senhas.length;
    while (inicio <= fim) {
        int meio = (inicio + fim) / 2;
        if (senhas[meio] == alvo) {
            return meio;
        } else if (senhas[meio] < alvo) {
            inicio = meio + 1;
        } else {
            fim = meio - 1;
        }
    }
    return -1;
}
'''

BUSCA_SOLUCAO = '''static int buscaBinaria(int[] senhas, int alvo) {
    int inicio = 0;
    int fim = senhas.length - 1;
    while (inicio <= fim) {
        int meio = (inicio + fim) / 2;
        if (senhas[meio] == alvo) {
            return meio;
        } else if (senhas[meio] < alvo) {
            inicio = meio + 1;
        } else {
            fim = meio - 1;
        }
    }
    return -1;
}
'''

DUPLICADAS_STARTER = '''// FilaDoBanco.java - painel de senhas
// Às vezes a mesma senha é digitada duas vezes. Cada senha deve aparecer uma vez só, na ordem em que chegou.

static List<Integer> removerDuplicadas(List<Integer> senhas) {
    List<Integer> unicas = new ArrayList<>();
    for (int senha : senhas) {
        // TODO: só adicionar a senha se ainda não estiver na lista
        unicas.add(senha);
    }
    return unicas;
}
'''

DUPLICADAS_SOLUCAO = '''static List<Integer> removerDuplicadas(List<Integer> senhas) {
    List<Integer> unicas = new ArrayList<>();
    for (int senha : senhas) {
        if (!unicas.contains(senha)) {
            unicas.add(senha);
        }
    }
    return unicas;
}
'''

ORDENAR_STARTER = '''// FilaDoBanco.java - atendimento por prioridade
// Ordene as prioridades do menor para o maior (bubble sort), sem alterar o vetor original.

static int[] ordenarPrioridades(int[] prioridades) {
    int[] copia = prioridades.clone();
    for (int i = 0; i < copia.length - 1; i++) {
        for (int j = 0; j < copia.length - 1; j++) {
            if (copia[j] > copia[j + 1]) {
                copia[j] = copia[j + 1];
                copia[j + 1] = copia[j];
            }
        }
    }
    return copia;
}
'''

ORDENAR_SOLUCAO = '''static int[] ordenarPrioridades(int[] prioridades) {
    int[] copia = prioridades.clone();
    for (int i = 0; i < copia.length - 1; i++) {
        for (int j = 0; j < copia.length - 1; j++) {
            if (copia[j] > copia[j + 1]) {
                int temporario = copia[j];
                copia[j] = copia[j + 1];
                copia[j + 1] = temporario;
            }
        }
    }
    return copia;
}
'''

BALANCEADA_STARTER = '''// Planilha.java - validação das fórmulas da planilha de caixa
// Uma fórmula é válida quando todo ( [ { tem o seu ) ] } na ordem certa, como em "[(1+2)*3]".

static boolean expressaoBalanceada(String expressao) {
    int abertos = 0;
    for (char c : expressao.toCharArray()) {
        if (c == '(') abertos++;
        if (c == ')') abertos--;
    }
    return abertos == 0;
}
'''

BALANCEADA_SOLUCAO = '''static boolean expressaoBalanceada(String expressao) {
    Deque<Character> pilha = new ArrayDeque<>();
    for (char c : expressao.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            pilha.push(c);
        } else if (c == ')' || c == ']' || c == '}') {
            if (pilha.isEmpty()) {
                return false;
            }
            char abertura = pilha.pop();
            boolean combina = (abertura == '(' && c == ')') || (abertura == '[' && c == ']') || (abertura == '{' && c == '}');
            if (!combina) {
                return false;
            }
        }
    }
    return pilha.isEmpty();
}
'''

PACK_ESTRUTURAS = Pack(
    match=["Estrutura de Dados e Algoritmos em Java"],
    new_course="Oficina de Estruturas de Dados: a fila do banco",
    description="Busca binária, listas, ordenação e pilhas em Java, aplicadas ao painel de senhas de uma agência bancária.",
    categories=["java", "estrutura-de-dados", "algoritmos", "exercicios"],
    intro=(
        "<p>O painel de senhas de uma agência bancária foi escrito por três estagiários diferentes e cada um deixou um "
        "defeito: uma busca que sai do vetor, uma lista com senhas repetidas, uma ordenação que perde valores. Em cada aula "
        "você ajusta um método <code>static</code> (sem a classe) e testa.</p>"
    ),
    modules=[
        (
            "Prática: a fila do banco (Java)",
            [
                (
                    "Busca binária",
                    [
                        lesson_text(
                            "A busca da senha estoura o vetor",
                            "Quando a senha procurada não está na lista, o painel dá <code>ArrayIndexOutOfBoundsException</code>. "
                            "A busca binária está quase certa: um dos limites começa errado.",
                            "FilaDoBanco.java",
                            ["Devolva a posição da senha em um vetor ordenado, ou <code>-1</code> se ela não existir.", "O vetor pode estar vazio."],
                            "se o último índice válido é <code>length - 1</code>, o <code>fim</code> deve começar nele.",
                        ),
                        function_exercise(
                            "java", "Busca binária", "buscaBinaria", ["senhas", "alvo"], BUSCA_STARTER, BUSCA_SOLUCAO,
                            tests(
                                t([[1, 3, 5, 7, 9], 7], 3), t([[1, 3, 5, 7, 9], 1], 0), t([[1, 3, 5, 7, 9], 9], 4),
                                t([[1, 3, 5, 7, 9], 4], -1), t([[], 1], -1), t([[5], 5], 0), t([[1, 3, 5, 7, 9], 10], -1),
                            ),
                            types=["int[]", "int"], returns="int",
                        ),
                    ],
                ),
                (
                    "Senhas repetidas",
                    [
                        lesson_text(
                            "A mesma senha aparece duas vezes",
                            "O atendente digitou a senha 42 duas vezes e o painel chamou o cliente em dobro.",
                            "FilaDoBanco.java",
                            ["Devolva uma nova lista com cada senha uma só vez, na ordem em que apareceu pela primeira vez."],
                        ),
                        function_exercise(
                            "java", "Remover senhas repetidas", "removerDuplicadas", ["senhas"], DUPLICADAS_STARTER, DUPLICADAS_SOLUCAO,
                            tests(
                                t([[3, 1, 3, 2, 1]], [3, 1, 2]), t([[]], []), t([[7, 7, 7]], [7]), t([[1, 2, 3]], [1, 2, 3]),
                            ),
                            types=["List<Integer>"], returns="List<Integer>",
                        ),
                    ],
                ),
                (
                    "Atendimento por prioridade",
                    [
                        lesson_text(
                            "A ordenação perde números",
                            "Depois de ordenar, o painel mostra senhas repetidas e some com outras. A troca de posições no "
                            "<em>bubble sort</em> sobrescreve um valor antes de guardá-lo.",
                            "FilaDoBanco.java",
                            ["Devolva um vetor novo com as prioridades em ordem crescente.", "Não altere o vetor recebido."],
                            "para trocar dois valores você precisa de uma variável temporária.",
                        ),
                        function_exercise(
                            "java", "Ordenar prioridades", "ordenarPrioridades", ["prioridades"], ORDENAR_STARTER, ORDENAR_SOLUCAO,
                            tests(t([[3, 1, 2]], [1, 2, 3]), t([[5, 4, 3, 2, 1]], [1, 2, 3, 4, 5]), t([[]], []), t([[2, 2, 1]], [1, 2, 2]), t([[9]], [9])),
                            types=["int[]"], returns="int[]",
                        ),
                    ],
                ),
                (
                    "Fórmulas da planilha",
                    [
                        lesson_text(
                            "Fórmula errada passa na validação",
                            "A planilha do caixa só confere se há tantos <code>(</code> quanto <code>)</code>. Assim, <code>)(</code> e "
                            "<code>[(1+2]*3)</code> passam como válidas.",
                            "Planilha.java",
                            [
                                "Valem os pares <code>( )</code>, <code>[ ]</code> e <code>{ }</code>; os outros caracteres são ignorados.",
                                "Cada fechamento precisa corresponder ao abridor mais recente ainda aberto.",
                            ],
                            "uma pilha (<code>ArrayDeque</code>) guarda os abridores pendentes.",
                        ),
                        function_exercise(
                            "java", "Fórmula balanceada", "expressaoBalanceada", ["expressao"], BALANCEADA_STARTER, BALANCEADA_SOLUCAO,
                            tests(
                                t(["(1+2)*3"], True), t(["((1+2)"], False), t([")("], False), t(["[(1+2)*3]"], True),
                                t(["[(1+2]*3)"], False), t([""], True), t(["{[()]}"], True),
                            ),
                            types=["String"], returns="boolean",
                        ),
                    ],
                ),
            ],
        ),
    ],
)
