package main

import (
	"net/http"
	"sort"
)

// supportedLanguages diz quais linguagens o executor em uso sabe rodar: todas as do mapa `languages` no Piston, so as
// que tem receita (imagem Docker / processo local) nos outros executores. `function` e `output` separam o que serve
// para cada modo de correcao (o modo funcao precisa de um harness; todo executor roda programas completos).
func supportedLanguages() (function, output []string) {
	for key := range languages {
		if (docker != nil || local != nil) && pistonOnlyLanguages[key] {
			continue
		}
		output = append(output, key)
		_, dynamic := harnesses[key]
		_, typed := typedBuilders[key]
		if dynamic || typed {
			function = append(function, key)
		}
	}
	sort.Strings(function)
	sort.Strings(output)
	return function, output
}

// handleLanguages deixa o backend perguntar o que este executor roda, para nao oferecer ao criador de exercicios uma
// linguagem que o executor em producao (ex.: processos locais na Render) nao tem.
func handleLanguages(w http.ResponseWriter, r *http.Request) {
	function, output := supportedLanguages()
	writeJSON(w, http.StatusOK, map[string][]string{"function": function, "output": output})
}
