"""Python 3: o mercadinho da Dona Lucia (textos, dicionarios e listas)."""
from .base import Pack, function_exercise, lesson_text, t, tests

NOME_STARTER = '''# clientes.py - cadastro de clientes do Mercadinho da Dona Lúcia
# As fichas chegam digitadas de qualquer jeito: "  maria  DA silva ", "JOSÉ DOS SANTOS"...

def normalizar_nome(nome):
    return nome.title()
'''

NOME_SOLUCAO = '''PEQUENAS = {"da", "de", "do", "das", "dos", "e"}

def normalizar_nome(nome):
    palavras = nome.lower().split()
    resultado = []
    for indice, palavra in enumerate(palavras):
        if indice > 0 and palavra in PEQUENAS:
            resultado.append(palavra)
        else:
            resultado.append(palavra.capitalize())
    return " ".join(resultado)
'''

CARTAO_STARTER = '''# pagamento.py - recibo do cartão no mercadinho
# O recibo impresso nunca pode mostrar o número completo do cartão.

def mascarar_cartao(numero):
    resultado = ""
    for posicao, caractere in enumerate(numero):
        if caractere.isdigit() and posicao >= len(numero) - 4:
            resultado += "*"
        else:
            resultado += caractere
    return resultado
'''

CARTAO_SOLUCAO = '''def mascarar_cartao(numero):
    digitos_restantes = sum(1 for c in numero if c.isdigit())
    resultado = ""
    for caractere in numero:
        if caractere.isdigit():
            digitos_restantes -= 1
            resultado += "*" if digitos_restantes >= 4 else caractere
        else:
            resultado += caractere
    return resultado
'''

CORREDOR_STARTER = '''# estoque.py - organização das prateleiras
# Cada produto é uma lista [nome, corredor], por exemplo ["arroz", "grãos"].

def agrupar_por_corredor(produtos):
    corredores = {}
    for nome, corredor in produtos:
        corredores[corredor] = [nome]
    return corredores
'''

CORREDOR_SOLUCAO = '''def agrupar_por_corredor(produtos):
    corredores = {}
    for nome, corredor in produtos:
        if corredor not in corredores:
            corredores[corredor] = []
        corredores[corredor].append(nome)
    for nomes in corredores.values():
        nomes.sort()
    return corredores
'''

REPOSICAO_STARTER = '''# estoque.py - lista de reposição que a Dona Lúcia imprime toda manhã
# `estoque` é um dicionário {produto: quantidade}.

def lista_de_reposicao(estoque, minimo):
    precisam = []
    for produto in estoque:
        if estoque[produto] < minimo:
            precisam.append(produto)
    return precisam
'''

REPOSICAO_SOLUCAO = '''def lista_de_reposicao(estoque, minimo):
    precisam = [(quantidade, produto) for produto, quantidade in estoque.items() if quantidade <= minimo]
    precisam.sort()
    return [produto for quantidade, produto in precisam]
'''

PACK = Pack(
    match=["Python 3: Fundamentos"],
    new_course="Oficina de Python: o mercadinho da Dona Lúcia",
    description=(
        "Exercícios de Python com cara de trabalho de verdade: cadastro de clientes, recibos, estoque e "
        "listas de reposição de um mercadinho de bairro."
    ),
    categories=["python", "fundamentos", "exercicios"],
    intro=(
        "<p>A Dona Lúcia toca o <strong>Mercadinho do Bairro</strong> com um sistema feito por um sobrinho. Funciona "
        "quase sempre... e é aí que você entra: cada aula traz um trecho do código dele, uma regra do mercado e o "
        "que está dando errado. Você conserta a função e envia.</p>"
    ),
    modules=[
        (
            "Prática: o mercadinho da Dona Lúcia (Python)",
            [
                (
                    "Cadastro de clientes",
                    [
                        lesson_text(
                            "Nomes digitados de qualquer jeito",
                            "As fichas de cadastro chegam com espaços sobrando e letras maiúsculas e minúsculas misturadas. "
                            "O código atual usa <code>title()</code>, que deixa \"Maria Da Silva\" com o <em>Da</em> maiúsculo.",
                            "clientes.py",
                            [
                                "Remova espaços extras no começo, no fim e entre as palavras.",
                                "Cada palavra começa com maiúscula e o resto fica minúsculo.",
                                "As palavras <code>da, de, do, das, dos, e</code> ficam minúsculas, "
                                "<strong>exceto se forem a primeira palavra</strong>.",
                            ],
                            "<code>nome.split()</code> sem argumento já ignora os espaços repetidos.",
                        ),
                        function_exercise(
                            "python", "Normalizar o nome", "normalizar_nome", ["nome"], NOME_STARTER, NOME_SOLUCAO,
                            tests(
                                t(["  maria  da silva "], "Maria da Silva"), t(["JOSÉ DOS SANTOS"], "José dos Santos"),
                                t(["ana"], "Ana"), t([""], ""), t(["joão e maria"], "João e Maria"), t(["de souza"], "De Souza"),
                            ),
                        ),
                    ],
                ),
                (
                    "Recibo do cartão",
                    [
                        lesson_text(
                            "Escondendo o número do cartão",
                            "O recibo precisa mostrar só os <strong>4 últimos dígitos</strong>. O código atual faz o contrário "
                            "com os espaços: conta a posição dos caracteres, e quando o número vem com espaços "
                            "(\"1234 5678 9012 3456\") ele mascara a quantidade errada.",
                            "pagamento.py",
                            [
                                "Troque cada dígito por <code>*</code>, menos os 4 últimos <em>dígitos</em>.",
                                "Espaços e traços ficam onde estão.",
                                "Se houver 4 dígitos ou menos, nada é mascarado.",
                            ],
                        ),
                        function_exercise(
                            "python", "Mascarar o cartão", "mascarar_cartao", ["numero"], CARTAO_STARTER, CARTAO_SOLUCAO,
                            tests(
                                t(["1234567890123456"], "************3456"), t(["1234 5678 9012 3456"], "**** **** **** 3456"),
                                t(["123"], "123"), t(["1234-5678-9012-3456"], "****-****-****-3456"),
                                t(["4111 111111 11111"], "**** ****** *1111"),
                            ),
                        ),
                    ],
                ),
                (
                    "Organizando as prateleiras",
                    [
                        lesson_text(
                            "Só sobra um produto por corredor",
                            "A tela de organização das prateleiras agrupa os produtos por corredor, mas cada corredor mostra "
                            "apenas o último produto cadastrado: o código <em>troca</em> a lista em vez de acrescentar.",
                            "estoque.py",
                            [
                                "Receba uma lista de <code>[nome, corredor]</code> e devolva um dicionário "
                                "<code>{corredor: [nomes]}</code>.",
                                "Os nomes de cada corredor saem em ordem alfabética.",
                            ],
                        ),
                        function_exercise(
                            "python", "Agrupar por corredor", "agrupar_por_corredor", ["produtos"], CORREDOR_STARTER, CORREDOR_SOLUCAO,
                            tests(
                                t([[["feijão", "grãos"], ["arroz", "grãos"], ["sabão", "limpeza"]]],
                                  {"grãos": ["arroz", "feijão"], "limpeza": ["sabão"]}),
                                t([[]], {}),
                                t([[["leite", "frios"]]], {"frios": ["leite"]}),
                                t([[["b", "x"], ["a", "x"], ["c", "y"], ["d", "x"]]], {"x": ["a", "b", "d"], "y": ["c"]}),
                            ),
                        ),
                    ],
                ),
                (
                    "Lista de reposição",
                    [
                        lesson_text(
                            "O que está acabando?",
                            "Toda manhã a Dona Lúcia imprime a lista de produtos para repor. O código atual devolve os produtos "
                            "na ordem em que foram cadastrados e ignora os que estão <em>exatamente</em> no estoque mínimo.",
                            "estoque.py",
                            [
                                "Entram na lista os produtos com quantidade <strong>menor ou igual</strong> ao mínimo.",
                                "A lista sai ordenada pela menor quantidade; em empate, por ordem alfabética.",
                            ],
                            "uma lista de tuplas <code>(quantidade, produto)</code> já ordena do jeito que você precisa.",
                        ),
                        function_exercise(
                            "python", "Lista de reposição", "lista_de_reposicao", ["estoque", "minimo"],
                            REPOSICAO_STARTER, REPOSICAO_SOLUCAO,
                            tests(
                                t([{"leite": 3, "arroz": 10, "feijão": 3, "açúcar": 0}, 5], ["açúcar", "feijão", "leite"]),
                                t([{"arroz": 10, "sal": 8}, 5], []),
                                t([{"café": 5, "chá": 5, "mate": 4}, 5], ["mate", "café", "chá"]),
                                t([{}, 5], []),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)
