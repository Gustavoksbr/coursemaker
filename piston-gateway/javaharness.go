package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf16"
)

// Modo funcao em Java.
//
// JS e Python recebem os argumentos como JSON pelo stdin e chamam a funcao do aluno de forma
// dinamica. Java e tipado: nao ha como chamar soma(int, int) sem saber os tipos, e a biblioteca
// padrao do Java 15 (a do Piston) nem le JSON. Entao aqui o gateway GERA o codigo: cada argumento
// vira um literal Java do tipo declarado (`2`, `new int[]{1, 2}`, `new ArrayList<String>(...)`) e
// o resultado volta serializado como JSON, na mesma linha marcada que os outros harnesses usam.
//
// O aluno escreve so o(s) metodo(s) estaticos, sem classe: o codigo dele e colocado DENTRO de
// `public class Main {`, e esse prefixo fica na mesma linha da primeira linha do aluno. Assim os
// numeros de linha das mensagens do javac e das excecoes batem com o que ele ve no editor.

// javaScalars sao os tipos de parametro aceitos e como cada um aparece em uma lista (`List<...>`).
var javaScalars = map[string]string{
	"int":     "Integer",
	"long":    "Long",
	"double":  "Double",
	"boolean": "Boolean",
	"String":  "String",
}

// javaBoxedToScalar faz o caminho inverso, para ler `List<Integer>` -> int.
var javaBoxedToScalar = map[string]string{
	"Integer": "int",
	"Long":    "long",
	"Double":  "double",
	"Boolean": "boolean",
	"String":  "String",
}

var javaListRe = regexp.MustCompile(`^List<([A-Za-z]+)>$`)

// javaTypeKind descreve um tipo aceito: escalar, array (`int[]`) ou lista (`List<Integer>`).
type javaTypeKind struct {
	scalar string // int, long, double, boolean, String
	array  bool
	list   bool
}

// parseJavaType devolve false se o tipo esta fora do conjunto fechado.
func parseJavaType(t string) (javaTypeKind, bool) {
	if _, ok := javaScalars[t]; ok {
		return javaTypeKind{scalar: t}, true
	}
	if strings.HasSuffix(t, "[]") {
		base := strings.TrimSuffix(t, "[]")
		if _, ok := javaScalars[base]; ok {
			return javaTypeKind{scalar: base, array: true}, true
		}
		return javaTypeKind{}, false
	}
	if m := javaListRe.FindStringSubmatch(t); m != nil {
		if scalar, ok := javaBoxedToScalar[m[1]]; ok {
			return javaTypeKind{scalar: scalar, list: true}, true
		}
	}
	return javaTypeKind{}, false
}

// javaScalarLiteral escreve um valor JSON como literal Java do tipo `scalar`. `inList` pede a forma
// que mantem o tipo certo dentro de Arrays.asList (1L e 1.0, nunca 1 puro).
func javaScalarLiteral(scalar string, value any) (string, error) {
	if value == nil {
		if scalar == "String" {
			return "null", nil
		}
		return "", fmt.Errorf("null so vale para String, array e lista")
	}

	switch scalar {
	case "boolean":
		b, ok := value.(bool)
		if !ok {
			return "", fmt.Errorf("esperado true ou false")
		}
		return strconv.FormatBool(b), nil

	case "String":
		s, ok := value.(string)
		if !ok {
			return "", fmt.Errorf("esperado um texto entre aspas")
		}
		return javaQuote(s), nil

	case "int", "long":
		n, ok := value.(json.Number)
		if !ok {
			return "", fmt.Errorf("esperado um numero inteiro")
		}
		i, err := strconv.ParseInt(n.String(), 10, 64)
		if err != nil {
			return "", fmt.Errorf("esperado um numero inteiro")
		}
		if scalar == "int" {
			if i < -2147483648 || i > 2147483647 {
				return "", fmt.Errorf("fora do intervalo de int")
			}
			return strconv.FormatInt(i, 10), nil
		}
		return strconv.FormatInt(i, 10) + "L", nil

	case "double":
		n, ok := value.(json.Number)
		if !ok {
			return "", fmt.Errorf("esperado um numero")
		}
		f, err := strconv.ParseFloat(n.String(), 64)
		if err != nil {
			return "", fmt.Errorf("esperado um numero")
		}
		lit := strconv.FormatFloat(f, 'g', -1, 64)
		if !strings.ContainsAny(lit, ".eE") {
			lit += ".0"
		}
		return lit, nil
	}
	return "", fmt.Errorf("tipo desconhecido: %s", scalar)
}

// javaLiteral escreve o argumento `raw` como expressao Java do tipo `typ`.
func javaLiteral(typ string, raw json.RawMessage) (string, error) {
	kind, ok := parseJavaType(typ)
	if !ok {
		return "", fmt.Errorf("tipo nao suportado: %s", typ)
	}

	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var value any
	if err := dec.Decode(&value); err != nil {
		return "", fmt.Errorf("valor JSON invalido")
	}

	if !kind.array && !kind.list {
		return javaScalarLiteral(kind.scalar, value)
	}

	if value == nil {
		return "null", nil
	}
	items, ok := value.([]any)
	if !ok {
		return "", fmt.Errorf("esperado uma lista [..]")
	}
	parts := make([]string, len(items))
	for i, item := range items {
		lit, err := javaScalarLiteral(kind.scalar, item)
		if err != nil {
			return "", fmt.Errorf("item %d: %w", i+1, err)
		}
		parts[i] = lit
	}

	if kind.array {
		return fmt.Sprintf("new %s[]{%s}", kind.scalar, strings.Join(parts, ", ")), nil
	}
	boxed := javaScalars[kind.scalar]
	return fmt.Sprintf("new java.util.ArrayList<%s>(java.util.Arrays.<%s>asList(%s))",
		boxed, boxed, strings.Join(parts, ", ")), nil
}

// javaQuote escreve um literal de texto Java. Tudo fora de ASCII imprimivel vira \uXXXX (o javac
// le \u antes de qualquer outra coisa, por isso quebra de linha, aspas e barra usam escapes proprios).
func javaQuote(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch {
		case r == '"':
			b.WriteString(`\"`)
		case r == '\\':
			b.WriteString(`\\`)
		case r == '\n':
			b.WriteString(`\n`)
		case r == '\r':
			b.WriteString(`\r`)
		case r == '\t':
			b.WriteString(`\t`)
		case r >= 0x20 && r < 0x7f:
			b.WriteRune(r)
		case r > 0xFFFF:
			hi, lo := utf16.EncodeRune(r)
			fmt.Fprintf(&b, `\u%04x\u%04x`, hi, lo)
		default:
			fmt.Fprintf(&b, `\u%04x`, r)
		}
	}
	b.WriteByte('"')
	return b.String()
}

var javaImportRe = regexp.MustCompile(`(?m)^[ \t]*import[ \t]+(?:static[ \t]+)?[\w.*]+[ \t]*;[ \t]*$`)

// hoistImports tira os `import` do codigo do aluno (nao existem dentro de uma classe) e devolve-os
// para irem ao topo. Cada import vira uma linha em branco, para nao mudar a numeracao.
func hoistImports(code string) (imports []string, rest string) {
	rest = javaImportRe.ReplaceAllStringFunc(code, func(match string) string {
		imports = append(imports, strings.TrimSpace(match))
		return ""
	})
	return imports, rest
}

// javaHelpers e o que o Main gerado usa para devolver cada resultado em JSON. Fica depois do
// codigo do aluno. Todo nome comeca com __cm para nao colidir com o que ele escrever.
const javaHelpers = `
  static String __cmMarker = "%s";

  static void __cmRun(int i, java.util.concurrent.Callable<Object> call) {
    String line;
    try {
      line = "{\"i\":" + i + ",\"ok\":true,\"value\":" + __cmJson(call.call()) + "}";
    } catch (Throwable e) {
      Throwable cause = e;
      String name = cause.getClass().getSimpleName();
      String message = cause.getMessage();
      line = "{\"i\":" + i + ",\"ok\":false,\"error\":" + __cmQuote(name + (message == null ? "" : ": " + message)) + "}";
    }
    System.out.println(__cmMarker + line);
    System.out.flush();
  }

  static String __cmJson(Object v) {
    if (v == null) return "null";
    if (v instanceof Boolean || v instanceof Integer || v instanceof Long || v instanceof Short || v instanceof Byte) {
      return v.toString();
    }
    if (v instanceof Double || v instanceof Float) {
      double d = ((Number) v).doubleValue();
      if (Double.isNaN(d) || Double.isInfinite(d)) throw new IllegalArgumentException("valor nao finito: " + d);
      return v.toString();
    }
    if (v instanceof CharSequence || v instanceof Character) return __cmQuote(v.toString());
    StringBuilder sb = new StringBuilder("[");
    if (v.getClass().isArray()) {
      int n = java.lang.reflect.Array.getLength(v);
      for (int i = 0; i < n; i++) {
        if (i > 0) sb.append(',');
        sb.append(__cmJson(java.lang.reflect.Array.get(v, i)));
      }
      return sb.append(']').toString();
    }
    if (v instanceof java.util.Collection) {
      boolean first = true;
      for (Object item : (java.util.Collection<?>) v) {
        if (!first) sb.append(',');
        first = false;
        sb.append(__cmJson(item));
      }
      return sb.append(']').toString();
    }
    if (v instanceof java.util.Map) {
      sb = new StringBuilder("{");
      boolean first = true;
      for (java.util.Map.Entry<?, ?> entry : ((java.util.Map<?, ?>) v).entrySet()) {
        if (!first) sb.append(',');
        first = false;
        sb.append(__cmQuote(String.valueOf(entry.getKey()))).append(':').append(__cmJson(entry.getValue()));
      }
      return sb.append('}').toString();
    }
    throw new IllegalArgumentException("tipo de retorno nao suportado: " + v.getClass().getName());
  }

  static String __cmQuote(String s) {
    StringBuilder sb = new StringBuilder("\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"') sb.append("\\\"");
      else if (c == '\\') sb.append("\\\\");
      else if (c == '\n') sb.append("\\n");
      else if (c == '\r') sb.append("\\r");
      else if (c == '\t') sb.append("\\t");
      else if (c < 0x20 || c > 0x7e) sb.append(String.format("\\u%%04x", (int) c));
      else sb.append(c);
    }
    return sb.append('"').toString();
  }
}
`

// buildJavaProgram monta o arquivo Main.java: prefixo (na mesma linha do codigo do aluno), o
// codigo dele, e o main gerado com uma chamada por teste. Os valores esperados nunca entram.
func buildJavaProgram(req runTestsRequest, marker string) (string, error) {
	if len(req.ParamTypes) == 0 {
		// Uma funcao sem parametros e valida; so garantimos que o campo bate com os testes abaixo.
		req.ParamTypes = []string{}
	}

	var calls strings.Builder
	for i, test := range req.Tests {
		args := make([]string, len(req.ParamTypes))
		for j, typ := range req.ParamTypes {
			lit, err := javaLiteral(typ, test.Args[j])
			if err != nil {
				return "", fmt.Errorf("teste %d, argumento %d: %w", i+1, j+1, err)
			}
			args[j] = lit
		}
		fmt.Fprintf(&calls, "    __cmRun(%d, () -> %s(%s));\n", i, req.FunctionName, strings.Join(args, ", "))
	}

	imports, code := hoistImports(req.Code)
	prefix := strings.Join(imports, " ")
	if prefix != "" {
		prefix += " "
	}
	prefix += "import java.util.*; import java.util.function.*; import java.util.stream.*; public class Main {"

	var out strings.Builder
	out.WriteString(prefix)
	out.WriteString(code)
	out.WriteString("\n  public static void main(String[] __cmArgs) {\n")
	out.WriteString(calls.String())
	out.WriteString("  }\n")
	fmt.Fprintf(&out, javaHelpers, marker)
	return out.String(), nil
}

// javaParamTypesProblem confere os tipos declarados contra os testes (sem gerar nada).
func javaParamTypesProblem(paramTypes []string, tests []testCase) string {
	for _, typ := range paramTypes {
		if _, ok := parseJavaType(typ); !ok {
			return fmt.Sprintf("tipo de parametro nao suportado: %s", typ)
		}
	}
	for i, test := range tests {
		if len(test.Args) != len(paramTypes) {
			return fmt.Sprintf("o teste %d tem %d argumento(s), mas paramTypes tem %d", i+1, len(test.Args), len(paramTypes))
		}
	}
	return ""
}

// javaCallHint explica o erro mais comum de quem escreve o metodo: o javac aponta para a linha da
// chamada gerada (`__cmRun(...)`), que o aluno nunca escreveu, quando o metodo nao e `static`, tem
// outro nome ou outros tipos de parametro.
func javaCallHint(req runTestsRequest, stderr string) string {
	if !strings.Contains(stderr, "__cmRun(") {
		return ""
	}
	params := make([]string, len(req.ParamTypes))
	for i, typ := range req.ParamTypes {
		params[i] = typ + " p" + strconv.Itoa(i+1)
	}
	return fmt.Sprintf("\nDica: o erro acima esta na chamada de teste, nao no seu codigo. Confira se o metodo e static, "+
		"se o nome e %s e se recebe (%s).\n", req.FunctionName, strings.Join(params, ", "))
}
