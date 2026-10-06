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

// Modo funcao em linguagens tipadas alem de Java (C#, C, C++, Go, Rust, Kotlin).
//
// Segue a mesma ideia do javaharness.go: o gateway GERA o codigo. Cada argumento vira um literal
// da linguagem, a partir de um vocabulario de tipos unico (o mesmo do Java: int, long, double,
// boolean, String, int[], List<Integer>...) que cada linguagem traduz para os seus tipos nativos.
// O resultado volta em JSON na linha marcada, igual aos outros harnesses, e os valores esperados
// nunca entram no codigo gerado.
//
// O codigo do aluno vem primeiro e, sempre que a linguagem permite, na mesma linha em que o arquivo
// comeca (ou com uma diretiva de linha), para que os numeros de linha das mensagens de erro batam
// com os do editor.

// typedBuilders diz como montar o programa de cada linguagem tipada. Java fica em javaharness.go.
var typedBuilders = map[string]func(req runTestsRequest, marker string) (string, error){
	"java":   buildJavaProgram,
	"csharp": buildCSharpProgram,
	"cpp":    buildCppProgram,
	"c":      buildCProgram,
	"go":     buildGoProgram,
	"rust":   buildRustProgram,
	"kotlin": buildKotlinProgram,
}

// literalStyle diz como cada linguagem escreve os valores do vocabulario de tipos.
type literalStyle struct {
	null   string
	boolLn func(b bool) string
	intLn  func(scalar string, i int64) string
	dblLn  func(f float64) string
	strLn  func(s string) string
	array  func(scalar string, parts []string) string
	list   func(scalar string, parts []string) string
}

func (st literalStyle) scalar(scalar string, value any) (string, error) {
	if value == nil {
		if scalar == "String" {
			return st.null, nil
		}
		return "", fmt.Errorf("null so vale para String, array e lista")
	}
	switch scalar {
	case "boolean":
		b, ok := value.(bool)
		if !ok {
			return "", fmt.Errorf("esperado true ou false")
		}
		return st.boolLn(b), nil
	case "String":
		s, ok := value.(string)
		if !ok {
			return "", fmt.Errorf("esperado um texto entre aspas")
		}
		return st.strLn(s), nil
	case "int", "long":
		n, ok := value.(json.Number)
		if !ok {
			return "", fmt.Errorf("esperado um numero inteiro")
		}
		i, err := strconv.ParseInt(n.String(), 10, 64)
		if err != nil {
			return "", fmt.Errorf("esperado um numero inteiro")
		}
		if scalar == "int" && (i < -2147483648 || i > 2147483647) {
			return "", fmt.Errorf("fora do intervalo de int")
		}
		return st.intLn(scalar, i), nil
	case "double":
		n, ok := value.(json.Number)
		if !ok {
			return "", fmt.Errorf("esperado um numero")
		}
		f, err := strconv.ParseFloat(n.String(), 64)
		if err != nil {
			return "", fmt.Errorf("esperado um numero")
		}
		return st.dblLn(f), nil
	}
	return "", fmt.Errorf("tipo desconhecido: %s", scalar)
}

// literal escreve o argumento `raw` como expressao do tipo `typ` (do vocabulario).
func (st literalStyle) literal(typ string, raw json.RawMessage) (string, error) {
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
		return st.scalar(kind.scalar, value)
	}
	if value == nil {
		return st.null, nil
	}
	items, ok := value.([]any)
	if !ok {
		return "", fmt.Errorf("esperado uma lista [..]")
	}
	parts := make([]string, len(items))
	for i, item := range items {
		lit, err := st.scalar(kind.scalar, item)
		if err != nil {
			return "", fmt.Errorf("item %d: %w", i+1, err)
		}
		parts[i] = lit
	}
	if kind.array {
		return st.array(kind.scalar, parts), nil
	}
	return st.list(kind.scalar, parts), nil
}

func formatDouble(f float64) string {
	lit := strconv.FormatFloat(f, 'g', -1, 64)
	if !strings.ContainsAny(lit, ".eE") {
		lit += ".0"
	}
	return lit
}

func formatBool(b bool) string { return strconv.FormatBool(b) }

// quoteUnicode escreve um texto com \uXXXX para tudo fora do ASCII imprimivel (Java, C#, Kotlin).
// extra lista caracteres que precisam de barra antes (ex.: "$" no Kotlin).
func quoteUnicode(s, extra string) string {
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
			if strings.ContainsRune(extra, r) {
				b.WriteByte('\\')
			}
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

// quoteOctalBytes escreve um texto C/C++: cada byte UTF-8 fora do ASCII imprimivel vira \ooo
// (tres digitos, para o digito seguinte nao ser engolido pelo escape).
func quoteOctalBytes(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, c := range []byte(s) {
		switch {
		case c == '"':
			b.WriteString(`\"`)
		case c == '\\':
			b.WriteString(`\\`)
		case c == '\n':
			b.WriteString(`\n`)
		case c == '\r':
			b.WriteString(`\r`)
		case c == '\t':
			b.WriteString(`\t`)
		case c == '?': // evita trigrafos (??/ etc.)
			b.WriteString(`\?`)
		case c >= 0x20 && c < 0x7f:
			b.WriteByte(c)
		default:
			fmt.Fprintf(&b, `\%03o`, c)
		}
	}
	b.WriteByte('"')
	return b.String()
}

// quoteRust escreve um texto Rust: \u{XXXX} para tudo fora do ASCII imprimivel.
func quoteRust(s string) string {
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
		default:
			fmt.Fprintf(&b, `\u{%x}`, r)
		}
	}
	b.WriteByte('"')
	return b.String()
}

// typedTypeNames traduz o vocabulario de tipos para os tipos nativos de cada linguagem (usado nas
// mensagens de dica; o editor faz a mesma traducao para escrever o codigo inicial).
func typedTypeName(language, typ string) string {
	kind, ok := parseJavaType(typ)
	if !ok {
		return typ
	}
	scalars := map[string]map[string]string{
		"csharp": {"int": "int", "long": "long", "double": "double", "boolean": "bool", "String": "string"},
		"cpp":    {"int": "int", "long": "long long", "double": "double", "boolean": "bool", "String": "std::string"},
		"c":      {"int": "int", "long": "long long", "double": "double", "boolean": "bool", "String": "const char*"},
		"go":     {"int": "int", "long": "int64", "double": "float64", "boolean": "bool", "String": "string"},
		"rust":   {"int": "i32", "long": "i64", "double": "f64", "boolean": "bool", "String": "String"},
		"kotlin": {"int": "Int", "long": "Long", "double": "Double", "boolean": "Boolean", "String": "String"},
	}
	names, ok := scalars[language]
	if !ok {
		return typ
	}
	name := names[kind.scalar]
	switch {
	case kind.array && (language == "csharp"):
		return name + "[]"
	case kind.array && language == "go":
		return "[]" + name
	case kind.array && language == "cpp", kind.list && language == "cpp":
		return "std::vector<" + name + ">"
	case (kind.array || kind.list) && language == "rust":
		return "Vec<" + name + ">"
	case kind.array && language == "kotlin":
		if kind.scalar == "String" {
			return "Array<String>"
		}
		return name + "Array"
	case kind.list && language == "csharp", kind.list && language == "kotlin":
		return "List<" + name + ">"
	case kind.list && language == "go":
		return "[]" + name
	}
	return name
}

// typedTypeProblem diz por que `typ` nao serve em `language` (ou "" se serve). C so tem escalares
// e texto: um array em C precisa de um tamanho a parte, o que nao cabe na assinatura da funcao.
func typedTypeProblem(language, typ string) string {
	kind, ok := parseJavaType(typ)
	if !ok {
		return fmt.Sprintf("tipo de parametro nao suportado: %s", typ)
	}
	if language == "c" && (kind.array || kind.list) {
		return fmt.Sprintf("em C so ha escalares e String no modo funcao (tipo %s nao suportado)", typ)
	}
	return ""
}

// typedParamTypesProblem confere os tipos declarados contra a linguagem e contra os testes.
func typedParamTypesProblem(language string, paramTypes []string, tests []testCase) string {
	for _, typ := range paramTypes {
		if msg := typedTypeProblem(language, typ); msg != "" {
			return msg
		}
	}
	for i, test := range tests {
		if len(test.Args) != len(paramTypes) {
			return fmt.Sprintf("o teste %d tem %d argumento(s), mas paramTypes tem %d", i+1, len(test.Args), len(paramTypes))
		}
	}
	return ""
}

// buildCalls gera uma chamada por teste: `format` recebe o indice, o nome da funcao e os argumentos.
func buildCalls(req runTestsRequest, style literalStyle, format string) (string, error) {
	var calls strings.Builder
	for i, test := range req.Tests {
		args := make([]string, len(req.ParamTypes))
		for j, typ := range req.ParamTypes {
			lit, err := style.literal(typ, test.Args[j])
			if err != nil {
				return "", fmt.Errorf("teste %d, argumento %d: %w", i+1, j+1, err)
			}
			args[j] = lit
		}
		fmt.Fprintf(&calls, format, i, req.FunctionName, strings.Join(args, ", "))
	}
	return calls.String(), nil
}

// typedCallHint explica o erro mais comum: o compilador aponta a chamada gerada, que o aluno nunca
// escreveu, quando a funcao tem outro nome, outros tipos ou nao e static.
func typedCallHint(req runTestsRequest, output string) string {
	generated := strings.Contains(output, "__cmRun(") || strings.Contains(output, "cm_run(") || strings.Contains(output, "__CM_RUN") ||
		errorsInGeneratedCode(output, req.Code)
	if !generated {
		return ""
	}
	params := make([]string, len(req.ParamTypes))
	for i, typ := range req.ParamTypes {
		params[i] = typedTypeName(req.Language, typ)
	}
	extra := ""
	if req.Language == "csharp" {
		extra = "se o metodo e static, "
	}
	return fmt.Sprintf("\nDica: o erro acima esta na chamada de teste, nao no seu codigo. Confira %sse o nome e %s e se recebe (%s).\n",
		extra, req.FunctionName, strings.Join(params, ", "))
}

// ---------------------------------------------------------------------------------------- C#

var csharpStyle = literalStyle{
	null:   "null",
	boolLn: formatBool,
	intLn: func(scalar string, i int64) string {
		if scalar == "long" {
			return strconv.FormatInt(i, 10) + "L"
		}
		return strconv.FormatInt(i, 10)
	},
	dblLn: formatDouble,
	strLn: func(s string) string { return quoteUnicode(s, "") },
	array: func(scalar string, parts []string) string {
		return fmt.Sprintf("new %s[]{%s}", typedTypeName("csharp", scalar), strings.Join(parts, ", "))
	},
	list: func(scalar string, parts []string) string {
		return fmt.Sprintf("new List<%s>{%s}", typedTypeName("csharp", scalar), strings.Join(parts, ", "))
	},
}

var csharpUsingRe = regexp.MustCompile(`(?m)^[ \t]*using[ \t]+(?:static[ \t]+)?[\w.]+(?:[ \t]*=[ \t]*[\w.<>,\[\] ]+)?[ \t]*;[ \t]*$`)

const csharpHelpers = `
  static string __cmMarker = "%s";

  static void __cmRun(int i, Func<object> call) {
    string line;
    try {
      line = "{\"i\":" + i + ",\"ok\":true,\"value\":" + __cmJson(call()) + "}";
    } catch (Exception e) {
      if (e is System.Reflection.TargetInvocationException && e.InnerException != null) e = e.InnerException;
      string message = e.Message;
      line = "{\"i\":" + i + ",\"ok\":false,\"error\":" + __cmQuote(e.GetType().Name + (string.IsNullOrEmpty(message) ? "" : ": " + message)) + "}";
    }
    Console.WriteLine(__cmMarker + line);
    Console.Out.Flush();
  }

  static string __cmJson(object v) {
    if (v == null) return "null";
    if (v is bool) return (bool) v ? "true" : "false";
    if (v is int || v is long || v is short || v is byte || v is sbyte || v is uint || v is ulong || v is ushort) {
      return Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture);
    }
    if (v is double || v is float) {
      double d = Convert.ToDouble(v);
      if (double.IsNaN(d) || double.IsInfinity(d)) throw new ArgumentException("valor nao finito: " + d);
      return d.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
    }
    if (v is decimal) return ((decimal) v).ToString(System.Globalization.CultureInfo.InvariantCulture);
    if (v is string || v is char) return __cmQuote(v.ToString());
    if (v is System.Collections.IDictionary) {
      var sb = new System.Text.StringBuilder("{");
      bool first = true;
      foreach (System.Collections.DictionaryEntry entry in (System.Collections.IDictionary) v) {
        if (!first) sb.Append(',');
        first = false;
        sb.Append(__cmQuote(Convert.ToString(entry.Key))).Append(':').Append(__cmJson(entry.Value));
      }
      return sb.Append('}').ToString();
    }
    if (v is System.Collections.IEnumerable) {
      var sb = new System.Text.StringBuilder("[");
      bool first = true;
      foreach (object item in (System.Collections.IEnumerable) v) {
        if (!first) sb.Append(',');
        first = false;
        sb.Append(__cmJson(item));
      }
      return sb.Append(']').ToString();
    }
    throw new ArgumentException("tipo de retorno nao suportado: " + v.GetType().Name);
  }

  static string __cmQuote(string s) {
    var sb = new System.Text.StringBuilder("\"");
    foreach (char c in s) {
      if (c == '"') sb.Append("\\\"");
      else if (c == '\\') sb.Append("\\\\");
      else if (c == '\n') sb.Append("\\n");
      else if (c == '\r') sb.Append("\\r");
      else if (c == '\t') sb.Append("\\t");
      else if (c < 0x20 || c > 0x7e) sb.Append("\\u").Append(((int) c).ToString("x4"));
      else sb.Append(c);
    }
    return sb.Append('"').ToString();
  }
}
`

// buildCSharpProgram coloca o codigo do aluno dentro de `public class Program {` (na mesma linha da
// primeira linha dele). O aluno escreve so o(s) metodo(s) static, sem classe.
func buildCSharpProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, csharpStyle, "    __cmRun(%[1]d, () => (object) %[2]s(%[3]s));\n")
	if err != nil {
		return "", err
	}
	var usings []string
	code := csharpUsingRe.ReplaceAllStringFunc(req.Code, func(match string) string {
		usings = append(usings, strings.TrimSpace(match))
		return ""
	})
	prefix := strings.Join(usings, " ")
	if prefix != "" {
		prefix += " "
	}
	prefix += "using System; using System.Collections.Generic; using System.Linq; using System.Text; public class Program {"

	var out strings.Builder
	out.WriteString(prefix)
	out.WriteString(code)
	out.WriteString("\n  public static void Main(string[] __cmArgs) {\n")
	out.WriteString(calls)
	out.WriteString("  }\n")
	fmt.Fprintf(&out, csharpHelpers, marker)
	return out.String(), nil
}

// ---------------------------------------------------------------------------------------- C++

var cppStyle = literalStyle{
	null:   "{}",
	boolLn: formatBool,
	intLn: func(scalar string, i int64) string {
		if scalar == "long" {
			return strconv.FormatInt(i, 10) + "LL"
		}
		return strconv.FormatInt(i, 10)
	},
	dblLn: formatDouble,
	strLn: func(s string) string { return "std::string(" + quoteOctalBytes(s) + ", " + strconv.Itoa(len(s)) + ")" },
	array: func(scalar string, parts []string) string {
		return fmt.Sprintf("std::vector<%s>{%s}", typedTypeName("cpp", scalar), strings.Join(parts, ", "))
	},
	list: func(scalar string, parts []string) string {
		return fmt.Sprintf("std::vector<%s>{%s}", typedTypeName("cpp", scalar), strings.Join(parts, ", "))
	},
}

const cppHelpers = `
static const char* __cmMarker = "%s";

static std::string __cmQuote(const std::string& s) {
  std::string o = "\"";
  for (unsigned char c : s) {
    if (c == '"') o += "\\\"";
    else if (c == '\\') o += "\\\\";
    else if (c == '\n') o += "\\n";
    else if (c == '\r') o += "\\r";
    else if (c == '\t') o += "\\t";
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%%04x", (unsigned) c); o += b; }
    else o += (char) c;
  }
  return o + "\"";
}

static std::string __cmJson(bool v) { return v ? "true" : "false"; }
static std::string __cmJson(int v) { return std::to_string(v); }
static std::string __cmJson(unsigned v) { return std::to_string(v); }
static std::string __cmJson(long v) { return std::to_string(v); }
static std::string __cmJson(unsigned long v) { return std::to_string(v); }
static std::string __cmJson(long long v) { return std::to_string(v); }
static std::string __cmJson(unsigned long long v) { return std::to_string(v); }
static std::string __cmJson(double v) {
  if (std::isnan(v) || std::isinf(v)) throw std::runtime_error("valor nao finito");
  char b[40];
  for (int p = 15; p <= 17; p++) {
    snprintf(b, sizeof b, "%%.*g", p, v);
    if (strtod(b, nullptr) == v) break;
  }
  return b;
}
static std::string __cmJson(float v) { return __cmJson((double) v); }
static std::string __cmJson(const std::string& v) { return __cmQuote(v); }
static std::string __cmJson(const char* v) { return v ? __cmQuote(v) : "null"; }
static std::string __cmJson(char v) { return __cmQuote(std::string(1, v)); }
static std::string __cmJson(const std::vector<bool>& v) {
  std::string o = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += v[i] ? "true" : "false"; }
  return o + "]";
}
template <typename T> static std::string __cmJson(const std::vector<T>& v) {
  std::string o = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += __cmJson(v[i]); }
  return o + "]";
}

template <typename F> static void __cmRun(int i, F call) {
  std::string line;
  try {
    line = "{\"i\":" + std::to_string(i) + ",\"ok\":true,\"value\":" + __cmJson(call()) + "}";
  } catch (const std::exception& e) {
    line = "{\"i\":" + std::to_string(i) + ",\"ok\":false,\"error\":" + __cmQuote(std::string("exception: ") + e.what()) + "}";
  } catch (...) {
    line = "{\"i\":" + std::to_string(i) + ",\"ok\":false,\"error\":\"erro desconhecido\"}";
  }
  std::cout << __cmMarker << line << std::endl;
}
`

// cppPrelude e o que vem antes do codigo do aluno. A diretiva #line faz o compilador contar as linhas
// do aluno a partir de 1, como no editor.
const cppPrelude = "#include <bits/stdc++.h>\nusing namespace std;\n#line 1\n"

func buildCppProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, cppStyle, "  __cmRun(%[1]d, [&]() { return %[2]s(%[3]s); });\n")
	if err != nil {
		return "", err
	}
	var out strings.Builder
	out.WriteString(cppPrelude)
	out.WriteString(req.Code)
	fmt.Fprintf(&out, "\n"+cppHelpers, marker)
	out.WriteString("\nint main() {\n")
	out.WriteString(calls)
	out.WriteString("  return 0;\n}\n")
	return out.String(), nil
}

// ---------------------------------------------------------------------------------------- C

var cStyle = literalStyle{
	null:   "NULL",
	boolLn: formatBool,
	intLn: func(scalar string, i int64) string {
		if scalar == "long" {
			return strconv.FormatInt(i, 10) + "LL"
		}
		return strconv.FormatInt(i, 10)
	},
	dblLn: formatDouble,
	strLn: quoteOctalBytes,
	array: func(string, []string) string { return "NULL" }, // C nao aceita arrays (validado antes)
	list:  func(string, []string) string { return "NULL" },
}

const cHelpers = `
static const char* __cmMarker = "%s";

static void __cm_quote(const char* s) {
  putchar('"');
  for (const unsigned char* p = (const unsigned char*) s; *p; p++) {
    unsigned char c = *p;
    if (c == '"') fputs("\\\"", stdout);
    else if (c == '\\') fputs("\\\\", stdout);
    else if (c == '\n') fputs("\\n", stdout);
    else if (c == '\r') fputs("\\r", stdout);
    else if (c == '\t') fputs("\\t", stdout);
    else if (c < 0x20) printf("\\u%%04x", (unsigned) c);
    else putchar(c);
  }
  putchar('"');
}
static void __cm_bool(_Bool v) { fputs(v ? "true" : "false", stdout); }
static void __cm_int(int v) { printf("%%d", v); }
static void __cm_uint(unsigned v) { printf("%%u", v); }
static void __cm_long(long v) { printf("%%ld", v); }
static void __cm_ulong(unsigned long v) { printf("%%lu", v); }
static void __cm_llong(long long v) { printf("%%lld", v); }
static void __cm_ullong(unsigned long long v) { printf("%%llu", v); }
static void __cm_double(double v) {
  if (v != v || v - v != 0) { fputs("null", stdout); return; }
  char b[40];
  for (int p = 15; p <= 17; p++) {
    snprintf(b, sizeof b, "%%.*g", p, v);
    if (strtod(b, NULL) == v) break;
  }
  fputs(b, stdout);
}
static void __cm_str(const char* v) { if (v) __cm_quote(v); else fputs("null", stdout); }

#define __CM_JSON(x) _Generic((x), _Bool: __cm_bool, int: __cm_int, unsigned: __cm_uint, long: __cm_long, \
  unsigned long: __cm_ulong, long long: __cm_llong, unsigned long long: __cm_ullong, double: __cm_double, \
  float: __cm_double, char*: __cm_str, const char*: __cm_str)(x)

#define __CM_RUN(i, expr) do { \
    __typeof__(expr) __cm_v = (expr); \
    printf("%%s{\"i\":%%d,\"ok\":true,\"value\":", __cmMarker, (i)); \
    __CM_JSON(__cm_v); \
    printf("}\n"); fflush(stdout); \
  } while (0)
`

const cPrelude = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <math.h>\n#line 1\n"

func buildCProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, cStyle, "  __CM_RUN(%[1]d, %[2]s(%[3]s));\n")
	if err != nil {
		return "", err
	}
	var out strings.Builder
	out.WriteString(cPrelude)
	out.WriteString(req.Code)
	fmt.Fprintf(&out, "\n"+cHelpers, marker)
	out.WriteString("\nint main(void) {\n")
	out.WriteString(calls)
	out.WriteString("  return 0;\n}\n")
	return out.String(), nil
}

// ---------------------------------------------------------------------------------------- Go

var goStyle = literalStyle{
	null:   `""`,
	boolLn: formatBool,
	intLn:  func(_ string, i int64) string { return strconv.FormatInt(i, 10) },
	dblLn:  formatDouble,
	strLn:  strconv.QuoteToASCII,
	array: func(scalar string, parts []string) string {
		return fmt.Sprintf("[]%s{%s}", typedTypeName("go", scalar), strings.Join(parts, ", "))
	},
	list: func(scalar string, parts []string) string {
		return fmt.Sprintf("[]%s{%s}", typedTypeName("go", scalar), strings.Join(parts, ", "))
	},
}

var (
	goPackageRe = regexp.MustCompile(`(?m)^[ \t]*package[ \t]+\w+[ \t]*$`)
	goImportRe  = regexp.MustCompile(`(?m)^[ \t]*import[ \t]*(?:\([^)]*\)|(?:[\w._]+[ \t]+)?"[^"\n]+")[ \t]*$`)
)

const goHelpers = `
const __cmMarker = "%s"

func __cmRun(i int, call func() interface{}) {
	line := ""
	func() {
		defer func() {
			if r := recover(); r != nil {
				msg, _ := __cmjson.Marshal("panic: " + __cmfmt.Sprint(r))
				line = __cmfmt.Sprintf("{\"i\":%%d,\"ok\":false,\"error\":%%s}", i, msg)
			}
		}()
		v := call()
		if rv := __cmreflect.ValueOf(v); rv.IsValid() && rv.Kind() == __cmreflect.Slice && rv.IsNil() {
			v = __cmreflect.MakeSlice(rv.Type(), 0, 0).Interface()
		}
		b, err := __cmjson.Marshal(v)
		if err != nil {
			panic(err)
		}
		line = __cmfmt.Sprintf("{\"i\":%%d,\"ok\":true,\"value\":%%s}", i, b)
	}()
	__cmfmt.Println(__cmMarker + line)
}
`

func buildGoProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, goStyle, "\t__cmRun(%[1]d, func() interface{} { return %[2]s(%[3]s) })\n")
	if err != nil {
		return "", err
	}
	// Os imports do aluno sobem para o topo (cada um vira uma linha em branco); os nossos usam apelido
	// para nao colidir com os dele.
	var imports []string
	code := goPackageRe.ReplaceAllString(req.Code, "")
	code = goImportRe.ReplaceAllStringFunc(code, func(match string) string {
		imports = append(imports, strings.TrimSpace(match))
		return strings.Repeat("\n", strings.Count(match, "\n"))
	})

	var out strings.Builder
	out.WriteString("package main\nimport (\n\t__cmfmt \"fmt\"\n\t__cmjson \"encoding/json\"\n\t__cmreflect \"reflect\"\n)\n")
	for _, imp := range imports {
		out.WriteString(imp + "\n")
	}
	out.WriteString("//line main.go:1\n")
	out.WriteString(code)
	fmt.Fprintf(&out, "\n"+goHelpers, marker)
	out.WriteString("\nfunc main() {\n")
	out.WriteString(calls)
	out.WriteString("}\n")
	return out.String(), nil
}

// ---------------------------------------------------------------------------------------- Rust

var rustStyle = literalStyle{
	null:   `String::new()`,
	boolLn: formatBool,
	intLn: func(scalar string, i int64) string {
		if scalar == "long" {
			return strconv.FormatInt(i, 10) + "_i64"
		}
		return strconv.FormatInt(i, 10) + "_i32"
	},
	dblLn: func(f float64) string { return formatDouble(f) + "_f64" },
	strLn: func(s string) string { return "String::from(" + quoteRust(s) + ")" },
	array: func(_ string, parts []string) string { return "vec![" + strings.Join(parts, ", ") + "]" },
	list:  func(_ string, parts []string) string { return "vec![" + strings.Join(parts, ", ") + "]" },
}

const rustHelpers = `
const CM_MARKER: &str = "%s";

trait CmJson { fn cm_json(&self) -> Result<String, String>; }

macro_rules! cm_int { ($($t:ty),*) => { $(impl CmJson for $t { fn cm_json(&self) -> Result<String, String> { Ok(self.to_string()) } })* } }
cm_int!(i8, i16, i32, i64, i128, isize, u8, u16, u32, u64, u128, usize);

impl CmJson for bool { fn cm_json(&self) -> Result<String, String> { Ok(self.to_string()) } }
impl CmJson for f64 {
  fn cm_json(&self) -> Result<String, String> {
    if self.is_finite() { Ok(format!("{}", self)) } else { Err(format!("valor nao finito: {}", self)) }
  }
}
impl CmJson for f32 { fn cm_json(&self) -> Result<String, String> { (*self as f64).cm_json() } }
impl CmJson for String { fn cm_json(&self) -> Result<String, String> { Ok(cm_quote(self)) } }
impl CmJson for &str { fn cm_json(&self) -> Result<String, String> { Ok(cm_quote(self)) } }
impl CmJson for char { fn cm_json(&self) -> Result<String, String> { Ok(cm_quote(&self.to_string())) } }
impl<T: CmJson> CmJson for Vec<T> {
  fn cm_json(&self) -> Result<String, String> {
    let mut parts = Vec::new();
    for item in self { parts.push(item.cm_json()?); }
    Ok(format!("[{}]", parts.join(",")))
  }
}
impl<T: CmJson> CmJson for Option<T> {
  fn cm_json(&self) -> Result<String, String> {
    match self { Some(v) => v.cm_json(), None => Ok("null".to_string()) }
  }
}

fn cm_quote(s: &str) -> String {
  let mut o = String::from("\"");
  for c in s.chars() {
    match c {
      '"' => o.push_str("\\\""),
      '\\' => o.push_str("\\\\"),
      '\n' => o.push_str("\\n"),
      '\r' => o.push_str("\\r"),
      '\t' => o.push_str("\\t"),
      c if (c as u32) >= 0x20 && (c as u32) < 0x7f => o.push(c),
      c => { let mut buf = [0u16; 2]; for u in c.encode_utf16(&mut buf) { o.push_str(&format!("\\u{:04x}", u)); } }
    }
  }
  o.push('"');
  o
}

fn cm_run<R: CmJson, F: FnOnce() -> R>(i: usize, call: F) {
  let line = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(call)) {
    Ok(v) => match v.cm_json() {
      Ok(json) => format!("{{\"i\":{},\"ok\":true,\"value\":{}}}", i, json),
      Err(e) => format!("{{\"i\":{},\"ok\":false,\"error\":{}}}", i, cm_quote(&e)),
    },
    Err(payload) => {
      let msg = if let Some(s) = payload.downcast_ref::<&str>() { s.to_string() }
        else if let Some(s) = payload.downcast_ref::<String>() { s.clone() }
        else { String::from("erro desconhecido") };
      format!("{{\"i\":{},\"ok\":false,\"error\":{}}}", i, cm_quote(&format!("panic: {}", msg)))
    }
  };
  println!("{}{}", CM_MARKER, line);
}
`

func buildRustProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, rustStyle, "  cm_run(%[1]d, || %[2]s(%[3]s));\n")
	if err != nil {
		return "", err
	}
	var out strings.Builder
	out.WriteString(req.Code)
	fmt.Fprintf(&out, "\n"+rustHelpers, marker)
	out.WriteString("\nfn main() {\n  std::panic::set_hook(Box::new(|_| {}));\n")
	out.WriteString(calls)
	out.WriteString("}\n")
	return out.String(), nil
}

// ---------------------------------------------------------------------------------------- Kotlin

var kotlinStyle = literalStyle{
	null:   "null",
	boolLn: formatBool,
	intLn: func(scalar string, i int64) string {
		if scalar == "long" {
			return strconv.FormatInt(i, 10) + "L"
		}
		return strconv.FormatInt(i, 10)
	},
	dblLn: formatDouble,
	strLn: func(s string) string { return quoteUnicode(s, "$") },
	array: func(scalar string, parts []string) string {
		ctor := map[string]string{"int": "intArrayOf", "long": "longArrayOf", "double": "doubleArrayOf", "boolean": "booleanArrayOf", "String": "arrayOf<String>"}[scalar]
		return fmt.Sprintf("%s(%s)", ctor, strings.Join(parts, ", "))
	},
	list: func(scalar string, parts []string) string {
		return fmt.Sprintf("listOf<%s>(%s)", typedTypeName("kotlin", scalar), strings.Join(parts, ", "))
	},
}

const kotlinHelpers = `
const val __cmMarker = "%s"

fun __cmQuote(s: String): String {
  val sb = StringBuilder("\"")
  for (c in s) {
    when {
      c == '"' -> sb.append("\\\"")
      c == '\\' -> sb.append("\\\\")
      c == '\n' -> sb.append("\\n")
      c == '\r' -> sb.append("\\r")
      c == '\t' -> sb.append("\\t")
      c.code < 0x20 || c.code > 0x7e -> sb.append("\\u").append(String.format("%%04x", c.code))
      else -> sb.append(c)
    }
  }
  return sb.append('"').toString()
}

fun __cmNumber(d: Double): String {
  if (d.isNaN() || d.isInfinite()) throw IllegalArgumentException("valor nao finito: " + d)
  return d.toString()
}

fun __cmJson(v: Any?): String = when (v) {
  null -> "null"
  is Boolean, is Int, is Long, is Short, is Byte -> v.toString()
  is Double -> __cmNumber(v)
  is Float -> __cmNumber(v.toDouble())
  is CharSequence -> __cmQuote(v.toString())
  is Char -> __cmQuote(v.toString())
  is IntArray -> v.joinToString(",", "[", "]")
  is LongArray -> v.joinToString(",", "[", "]")
  is BooleanArray -> v.joinToString(",", "[", "]")
  is DoubleArray -> v.joinToString(",", "[", "]") { __cmNumber(it) }
  is Array<*> -> v.joinToString(",", "[", "]") { __cmJson(it) }
  is Map<*, *> -> v.entries.joinToString(",", "{", "}") { __cmQuote(it.key.toString()) + ":" + __cmJson(it.value) }
  is Iterable<*> -> v.joinToString(",", "[", "]") { __cmJson(it) }
  else -> throw IllegalArgumentException("tipo de retorno nao suportado: " + v.javaClass.name)
}

fun __cmRun(i: Int, call: () -> Any?) {
  val line = try {
    "{\"i\":" + i + ",\"ok\":true,\"value\":" + __cmJson(call()) + "}"
  } catch (e: Throwable) {
    val message = e.message
    "{\"i\":" + i + ",\"ok\":false,\"error\":" + __cmQuote(e.javaClass.simpleName + (if (message == null) "" else ": " + message)) + "}"
  }
  println(__cmMarker + line)
  System.out.flush()
}
`

func buildKotlinProgram(req runTestsRequest, marker string) (string, error) {
	calls, err := buildCalls(req, kotlinStyle, "  __cmRun(%[1]d) { %[2]s(%[3]s) }\n")
	if err != nil {
		return "", err
	}
	var out strings.Builder
	out.WriteString(req.Code)
	fmt.Fprintf(&out, "\n"+kotlinHelpers, marker)
	out.WriteString("\nfun main() {\n")
	out.WriteString(calls)
	out.WriteString("}\n")
	return out.String(), nil
}
