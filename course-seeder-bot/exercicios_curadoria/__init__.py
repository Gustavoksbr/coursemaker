"""Pacotes de exercicios de codigo (Piston) para os cursos da curadoria."""
from . import pack_java, pack_logica, pack_misc, pack_novas, pack_python, pack_web

# A ordem aqui e a ordem em que os pacotes sao aplicados.
PACKS = [
    pack_logica.PACK,
    pack_python.PACK,
    pack_web.PACK_JS,
    pack_web.PACK_TS,
    pack_web.PACK_NODE,
    pack_java.PACK_BASICO,
    pack_java.PACK_ESTRUTURAS,
    pack_misc.PACK_GO,
    pack_misc.PACK_KOTLIN,
    pack_misc.PACK_AUTOMACAO,
    pack_novas.PACK_CSHARP,
    pack_novas.PACK_PHP,
    pack_novas.PACK_RUST,
    pack_novas.PACK_RUBY,
    pack_novas.PACK_C,
]
