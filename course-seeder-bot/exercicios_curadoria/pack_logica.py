"""Logica de programacao em Python: a padaria do Seu Ze."""
from .base import Pack, function_exercise, lesson_text, out, output_exercise, t, tests, text

PADARIA = "padaria.py"

# ------------------------------------------------------------------ 1. desconto por quantidade

DESCONTO_STARTER = '''# caixa.py - Padaria Pão Quente
# Preços sempre em centavos (um pão francês custa 50).

def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade > 10:
        total = total * 90 // 100
    return total
'''

DESCONTO_SOLUCAO = '''def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade >= 10:
        total = total * 90 // 100
    return total
'''

# ------------------------------------------------------------------ 2. troco

TROCO_STARTER = '''# caixa.py - Padaria Pão Quente

def calcular_troco(total, pago):
    return pago - total
'''

TROCO_SOLUCAO = '''def calcular_troco(total, pago):
    if pago < total:
        return None
    return pago - total
'''

# ------------------------------------------------------------------ 3. notas do troco

NOTAS_STARTER = '''# caixa.py - Padaria Pão Quente
# Valores em reais inteiros. O gaveteiro tem notas de 100, 50, 20, 10, 5, 2 e moedas de 1.

NOTAS = [100, 50, 20, 10, 5, 2, 1]

def notas_do_troco(troco):
    quantidades = []
    for nota in NOTAS:
        quantidades.append(troco // nota)
        # TODO: descontar do troco o que já foi devolvido com esta nota
    return quantidades
'''

NOTAS_SOLUCAO = '''NOTAS = [100, 50, 20, 10, 5, 2, 1]

def notas_do_troco(troco):
    quantidades = []
    for nota in NOTAS:
        quantidades.append(troco // nota)
        troco = troco % nota
    return quantidades
'''

# ------------------------------------------------------------------ 4. status do pao

STATUS_STARTER = '''# etiqueta.py - impressora de etiquetas da vitrine

def status_do_pao(horas_desde_que_saiu_do_forno):
    horas = horas_desde_que_saiu_do_forno
    if horas < 24:
        return "amanhecido"
    elif horas < 12:
        return "do dia"
    elif horas < 4:
        return "fresco"
    return "descartar"
'''

STATUS_SOLUCAO = '''def status_do_pao(horas_desde_que_saiu_do_forno):
    horas = horas_desde_que_saiu_do_forno
    if horas < 4:
        return "fresco"
    elif horas < 12:
        return "do dia"
    elif horas < 24:
        return "amanhecido"
    return "descartar"
'''

# ------------------------------------------------------------------ 5. resumo do dia

RESUMO_STARTER = '''# fechamento.py - fechamento do caixa da Padaria Pão Quente
# Cada venda é uma lista [nome do produto, quantidade, preço unitário em centavos].

def resumo_do_dia(vendas):
    total = 0
    itens = 0
    mais_vendido = None
    maior_quantidade = 0
    for nome, quantidade, preco in vendas:
        total += preco
        itens += 1
        if quantidade > maior_quantidade:
            maior_quantidade = quantidade
            mais_vendido = nome
    return {"total": total, "itens": itens, "mais_vendido": mais_vendido}
'''

RESUMO_SOLUCAO = '''def resumo_do_dia(vendas):
    total = 0
    itens = 0
    mais_vendido = None
    maior_quantidade = 0
    for nome, quantidade, preco in vendas:
        total += preco * quantidade
        itens += quantidade
        if quantidade > maior_quantidade:
            maior_quantidade = quantidade
            mais_vendido = nome
    return {"total": total, "itens": itens, "mais_vendido": mais_vendido}
'''

# ------------------------------------------------------------------ 6. programa completo (entrada e saida)

CUPOM_STARTER = '''# cupom.py - imprime o cupom que sai na boca do caixa
# Entrada: a 1ª linha é o total da compra em centavos; a 2ª é o valor pago em centavos.
# Saída: "Troco: R$ x,yy"

total = int(input())
pago = int(input())
troco = pago - total
print("Troco: R$ " + str(troco / 100))
'''

CUPOM_SOLUCAO = '''total = int(input())
pago = int(input())
troco = pago - total
print("Troco: R$ %d,%02d" % (troco // 100, troco % 100))
'''

PACK = Pack(
    match=[
        "Lógica de Programação",
        "Algoritmos e Logica de Programacao (Curso em Video)",
        "Curso de Algoritmos e Lógica de Programação",
    ],
    new_course="Oficina de Lógica de Programação: a padaria do Seu Zé",
    description=(
        "Pratique lógica de programação consertando o sistema de uma padaria: descontos, troco, "
        "etiquetas e fechamento de caixa, com código parecido com o que você encontraria no trabalho."
    ),
    categories=["logica", "python", "exercicios"],
    intro=(
        "<p>Seu Zé abriu a <strong>Padaria Pão Quente</strong> e o sistema do caixa, escrito às pressas, está "
        "cheio de pequenos erros. Em cada aula você recebe um trecho do código <em>de verdade</em>, a regra que a "
        "padaria quer e o que está errado ou faltando. Você ajusta a função, testa e envia.</p>"
        "<p>Todos os preços estão em <strong>centavos</strong>, para fugir de problemas com números decimais.</p>"
    ),
    modules=[
        (
            "Prática: o caixa da padaria (Python)",
            [
                (
                    "Desconto por quantidade",
                    [
                        lesson_text(
                            "O desconto não está pegando",
                            "O Seu Zé prometeu: <strong>quem leva 10 pães ou mais ganha 10% de desconto no total</strong>. "
                            "Só que ontem um cliente levou exatamente 10 pães e pagou sem desconto.",
                            "caixa.py",
                            [
                                "A partir de 10 unidades (inclusive), o total ganha 10% de desconto.",
                                "O desconto é arredondado para baixo: o total final é um número inteiro de centavos.",
                                "Com menos de 10 unidades o preço é só preço × quantidade.",
                            ],
                            "compare o que o código faz com o que a regra diz: <em>mais que 10</em> ou <em>10 ou mais</em>?",
                        ),
                        function_exercise(
                            "python", "Desconto por quantidade", "preco_com_desconto", ["preco_unitario", "quantidade"],
                            DESCONTO_STARTER, DESCONTO_SOLUCAO,
                            tests(
                                t([50, 10], 450), t([50, 9], 450), t([200, 20], 3600), t([333, 10], 2997),
                                t([333, 11], 3296), t([100, 1], 100), t([70, 0], 0),
                            ),
                        ),
                    ],
                ),
                (
                    "Calculando o troco",
                    [
                        lesson_text(
                            "Cliente pagou a menos",
                            "O sistema devolve troco negativo quando o cliente entrega menos dinheiro do que o total, e a "
                            "gaveta do caixa abre mesmo assim.",
                            "caixa.py",
                            [
                                "Se o valor pago for maior ou igual ao total, devolva a diferença em centavos.",
                                "Se o valor pago for menor que o total, devolva <code>None</code>: o caixa avisa que falta dinheiro.",
                            ],
                        ),
                        function_exercise(
                            "python", "Troco do cliente", "calcular_troco", ["total", "pago"],
                            TROCO_STARTER, TROCO_SOLUCAO,
                            tests(t([450, 500], 50), t([450, 400], None), t([450, 450], 0), t([0, 0], 0), t([1999, 2000], 1)),
                        ),
                    ],
                ),
                (
                    "Notas e moedas do troco",
                    [
                        lesson_text(
                            "Quantas notas devolver?",
                            "Para devolver o troco com o menor número de cédulas, o caixa começa pela nota maior e vai descendo. "
                            "A função já percorre as notas, mas devolve números absurdos: ela esquece de abater o que já foi dado.",
                            "caixa.py",
                            [
                                "Devolva uma lista com a quantidade de cada nota, na ordem <code>[100, 50, 20, 10, 5, 2, 1]</code>.",
                                "Exemplo: troco de 289 → <code>[2, 1, 1, 1, 1, 2, 0]</code>.",
                            ],
                            "depois de devolver as notas de 50, quanto ainda falta devolver? O resto da divisão (<code>%</code>) ajuda.",
                        ),
                        function_exercise(
                            "python", "Notas do troco", "notas_do_troco", ["troco"],
                            NOTAS_STARTER, NOTAS_SOLUCAO,
                            tests(
                                t([289], [2, 1, 1, 1, 1, 2, 0]), t([99], [0, 1, 2, 0, 1, 2, 0]), t([0], [0, 0, 0, 0, 0, 0, 0]),
                                t([1], [0, 0, 0, 0, 0, 0, 1]), t([100], [1, 0, 0, 0, 0, 0, 0]), t([8], [0, 0, 0, 0, 1, 1, 1]),
                            ),
                        ),
                    ],
                ),
                (
                    "A etiqueta da vitrine",
                    [
                        lesson_text(
                            "Pão fresco aparecendo como amanhecido",
                            "A etiqueta da vitrine diz há quanto tempo o pão saiu do forno. Hoje <em>todo</em> pão novo aparece como "
                            "\"amanhecido\": a ordem das condições está errada.",
                            "etiqueta.py",
                            [
                                "Menos de 4 horas: <code>\"fresco\"</code>.",
                                "De 4 a 11 horas: <code>\"do dia\"</code>.",
                                "De 12 a 23 horas: <code>\"amanhecido\"</code>.",
                                "24 horas ou mais: <code>\"descartar\"</code>.",
                            ],
                            "num <code>if/elif</code>, a primeira condição verdadeira vence. Comece pela mais restritiva.",
                        ),
                        function_exercise(
                            "python", "Status do pão", "status_do_pao", ["horas_desde_que_saiu_do_forno"],
                            STATUS_STARTER, STATUS_SOLUCAO,
                            tests(
                                t([0], "fresco"), t([6], "do dia"), t([3], "fresco"), t([4], "do dia"), t([11], "do dia"),
                                t([12], "amanhecido"), t([23], "amanhecido"), t([24], "descartar"), t([100], "descartar"),
                            ),
                        ),
                    ],
                ),
                (
                    "Fechamento do caixa",
                    [
                        lesson_text(
                            "O total do dia não bate",
                            "No fim do expediente o Seu Zé confere o fechamento e o total nunca bate com o dinheiro da gaveta. "
                            "O motivo: a função soma o preço de cada <em>venda</em>, esquecendo que cada venda pode ter várias unidades.",
                            "fechamento.py",
                            [
                                "<code>total</code>: soma de preço × quantidade de todas as vendas (em centavos).",
                                "<code>itens</code>: total de unidades vendidas.",
                                "<code>mais_vendido</code>: o produto com maior quantidade numa única venda (em empate, o primeiro); "
                                "<code>None</code> se não houve vendas.",
                            ],
                        ),
                        function_exercise(
                            "python", "Fechamento do dia", "resumo_do_dia", ["vendas"],
                            RESUMO_STARTER, RESUMO_SOLUCAO,
                            tests(
                                t([[["pão francês", 30, 50], ["bolo", 2, 1500], ["café", 10, 400]]],
                                  {"total": 8500, "itens": 42, "mais_vendido": "pão francês"}),
                                t([[]], {"total": 0, "itens": 0, "mais_vendido": None}),
                                t([[["sonho", 3, 600]]], {"total": 1800, "itens": 3, "mais_vendido": "sonho"}),
                                t([[["café", 4, 400], ["suco", 4, 700]]], {"total": 4400, "itens": 8, "mais_vendido": "café"}),
                            ),
                        ),
                    ],
                ),
                (
                    "O cupom do caixa (entrada e saída)",
                    [
                        lesson_text(
                            "O troco aparece com ponto",
                            "Agora um programa completo: o script lê o total e o valor pago, em centavos, e imprime o cupom. "
                            "O gerente reclamou que o troco sai como <code>R$ 0.5</code>, e na padaria se escreve "
                            "<code>R$ 0,50</code>, com duas casas e vírgula.",
                            "cupom.py",
                            [
                                "Entrada: uma linha com o total e outra com o valor pago (centavos).",
                                "Saída: uma linha no formato <code>Troco: R$ reais,centavos</code>, sempre com 2 dígitos nos centavos.",
                            ],
                            "<code>\"%02d\" % n</code> escreve um inteiro com no mínimo 2 dígitos, completando com zero.",
                        ),
                        output_exercise(
                            "python", "Cupom do troco", CUPOM_STARTER, CUPOM_SOLUCAO,
                            tests(
                                out("450\n500\n", "Troco: R$ 0,50\n"),
                                out("1999\n2000\n", "Troco: R$ 0,01\n"),
                                out("350\n1000\n", "Troco: R$ 6,50\n"),
                                out("0\n0\n", "Troco: R$ 0,00\n"),
                                out("12345\n20000\n", "Troco: R$ 76,55\n"),
                            ),
                        ),
                    ],
                ),
            ],
        ),
    ],
)
