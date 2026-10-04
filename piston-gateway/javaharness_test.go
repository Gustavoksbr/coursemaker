package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestJavaLiteral(t *testing.T) {
	cases := []struct {
		typ, value, want string
	}{
		{"int", `2`, `2`},
		{"int", `-5`, `-5`},
		{"long", `3000000000`, `3000000000L`},
		{"double", `2`, `2.0`},
		{"double", `2.5`, `2.5`},
		{"double", `1e21`, `1e+21`},
		{"boolean", `true`, `true`},
		{"String", `"abc"`, `"abc"`},
		{"String", `null`, `null`},
		{"int[]", `[1, 2, 3]`, `new int[]{1, 2, 3}`},
		{"int[]", `[]`, `new int[]{}`},
		{"int[]", `null`, `null`},
		{"double[]", `[1, 2.5]`, `new double[]{1.0, 2.5}`},
		{"String[]", `["a", null]`, `new String[]{"a", null}`},
		{"List<Integer>", `[1, 2]`, `new java.util.ArrayList<Integer>(java.util.Arrays.<Integer>asList(1, 2))`},
		{"List<Long>", `[1]`, `new java.util.ArrayList<Long>(java.util.Arrays.<Long>asList(1L))`},
		{"List<Double>", `[1]`, `new java.util.ArrayList<Double>(java.util.Arrays.<Double>asList(1.0))`},
		{"List<String>", `[]`, `new java.util.ArrayList<String>(java.util.Arrays.<String>asList())`},
	}
	for _, c := range cases {
		got, err := javaLiteral(c.typ, raw(c.value))
		if err != nil {
			t.Errorf("%s %s: erro inesperado: %v", c.typ, c.value, err)
			continue
		}
		if got != c.want {
			t.Errorf("%s %s = %s, queria %s", c.typ, c.value, got, c.want)
		}
	}
}

func TestJavaLiteralRejectsWrongValues(t *testing.T) {
	bad := []struct{ typ, value string }{
		{"int", `2.5`},
		{"int", `"2"`},
		{"int", `3000000000`}, // nao cabe em int
		{"int", `null`},
		{"boolean", `1`},
		{"String", `5`},
		{"double", `"x"`},
		{"int[]", `5`},
		{"int[]", `[1, "a"]`},
		{"int[]", `[1, null]`},
		{"List<Integer>", `{"a": 1}`},
		{"char", `"a"`},      // fora do conjunto fechado
		{"int[][]", `[[1]]`}, // idem
		{"List<Object>", `[]`},
		{"int", `{{{`},
	}
	for _, c := range bad {
		if got, err := javaLiteral(c.typ, raw(c.value)); err == nil {
			t.Errorf("%s %s deveria ser rejeitado, mas gerou %s", c.typ, c.value, got)
		}
	}
}

func TestJavaQuote(t *testing.T) {
	cases := map[string]string{
		`abc`:        `"abc"`,
		`a"b`:        `"a\"b"`,
		`a\b`:        `"a\\b"`,
		"a\nb":       `"a\nb"`,
		"tab\t":      `"tab\t"`,
		"á":          `"\u00e1"`,
		"\u0001":     `"\u0001"`,
		"\U0001F600": `"\ud83d\ude00"`,
	}
	for in, want := range cases {
		if got := javaQuote(in); got != want {
			t.Errorf("javaQuote(%q) = %s, queria %s", in, got, want)
		}
	}
}

func TestHoistImports(t *testing.T) {
	code := "import java.util.Scanner;\nstatic int f() {\n  return 1;\n}\n  import static java.lang.Math.*;\n"
	imports, rest := hoistImports(code)
	if len(imports) != 2 || imports[0] != "import java.util.Scanner;" || imports[1] != "import static java.lang.Math.*;" {
		t.Fatalf("imports = %v", imports)
	}
	if strings.Count(rest, "\n") != strings.Count(code, "\n") {
		t.Errorf("hoistImports mudou a quantidade de linhas")
	}
	if strings.Contains(rest, "import") {
		t.Errorf("sobrou import no codigo: %q", rest)
	}
}

func javaRequest() runTestsRequest {
	return runTestsRequest{
		Language:     "java",
		FunctionName: "soma",
		Code:         "static int soma(int a, int b) {\n  return a + b;\n}",
		ParamTypes:   []string{"int", "int"},
		Tests: []testCase{
			{Args: []json.RawMessage{raw(`2`), raw(`3`)}, Expected: raw(`SEGREDO-5`)},
			{Args: []json.RawMessage{raw(`-5`), raw(`-7`)}, Expected: raw(`SEGREDO-12`)},
		},
	}
}

func TestBuildJavaProgram(t *testing.T) {
	program, err := buildJavaProgram(javaRequest(), "@@CM-x@@")
	if err != nil {
		t.Fatal(err)
	}

	// O codigo do aluno comeca na linha 1, junto do prefixo: os numeros de linha dele nao mudam.
	firstLine := strings.SplitN(program, "\n", 2)[0]
	if !strings.HasPrefix(firstLine, "import java.util.*;") || !strings.HasSuffix(firstLine, "public class Main {static int soma(int a, int b) {") {
		t.Errorf("primeira linha inesperada: %q", firstLine)
	}
	secondLine := strings.Split(program, "\n")[1]
	if secondLine != "  return a + b;" {
		t.Errorf("a segunda linha do aluno deveria continuar na linha 2, veio %q", secondLine)
	}

	for _, want := range []string{
		"__cmRun(0, () -> soma(2, 3));",
		"__cmRun(1, () -> soma(-5, -7));",
		`__cmMarker = "@@CM-x@@"`,
		"public static void main(String[] __cmArgs)",
	} {
		if !strings.Contains(program, want) {
			t.Errorf("faltou no programa gerado: %s", want)
		}
	}
	if strings.Contains(program, "SEGREDO") {
		t.Error("o valor esperado vazou para o programa que vai ao sandbox")
	}
	// Chaves equilibradas: a classe Main fecha uma vez no fim.
	if strings.Count(program, "{") != strings.Count(program, "}") {
		t.Errorf("chaves desequilibradas: %d abrem, %d fecham", strings.Count(program, "{"), strings.Count(program, "}"))
	}
}

func TestBuildJavaProgramHoistsImportsToTheFirstLine(t *testing.T) {
	req := javaRequest()
	req.Code = "import java.util.Scanner;\nstatic int soma(int a, int b) {\n  return a + b;\n}"
	program, err := buildJavaProgram(req, "@@CM-x@@")
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(program, "\n")
	if !strings.HasPrefix(lines[0], "import java.util.Scanner; import java.util.*;") {
		t.Errorf("o import do aluno deveria ir para a primeira linha: %q", lines[0])
	}
	// A linha original do import virou uma linha em branco: "static int soma" continua na linha 2.
	if lines[1] != "static int soma(int a, int b) {" {
		t.Errorf("a numeracao mudou: linha 2 = %q", lines[1])
	}
}

func TestBuildJavaProgramNamesTheBadTest(t *testing.T) {
	req := javaRequest()
	req.Tests[1].Args[0] = raw(`"abc"`)
	_, err := buildJavaProgram(req, "m")
	if err == nil || !strings.Contains(err.Error(), "teste 2, argumento 1") {
		t.Fatalf("erro deveria apontar o teste e o argumento, veio: %v", err)
	}
}

func TestValidateRunTestsJava(t *testing.T) {
	ok := javaRequest()
	if msg := validateRunTests(ok); msg != "" {
		t.Fatalf("requisicao valida rejeitada: %s", msg)
	}

	noTypes := javaRequest()
	noTypes.ParamTypes = nil
	if validateRunTests(noTypes) == "" {
		t.Error("sem paramTypes, mas com 2 argumentos por teste: deveria rejeitar")
	}

	badType := javaRequest()
	badType.ParamTypes = []string{"int", "Object"}
	if validateRunTests(badType) == "" {
		t.Error("tipo fora do conjunto fechado deveria ser rejeitado")
	}

	noParams := javaRequest()
	noParams.ParamTypes = []string{}
	noParams.Tests = []testCase{{Args: []json.RawMessage{}, Expected: raw(`1`)}}
	if msg := validateRunTests(noParams); msg != "" {
		t.Errorf("funcao sem parametros e valida: %s", msg)
	}
}

func TestJavaCompileFailureDetection(t *testing.T) {
	if !isJavaCompileFailure("Main.java:1: error: ';' expected\n1 error\nerror: compilation failed\n") {
		t.Error("deveria reconhecer erro de compilacao")
	}
	if isJavaCompileFailure("Exception in thread \"main\" java.lang.ArithmeticException") {
		t.Error("excecao em runtime nao e erro de compilacao")
	}
}

func TestConcurrencyFor(t *testing.T) {
	if concurrencyFor(languages["java"]) != 2 || concurrencyFor(languages["cpp"]) != 2 {
		t.Error("Java e C++ devem rodar com 2 execucoes simultaneas")
	}
	if concurrencyFor(languages["python"]) != outputConcurrency {
		t.Error("Python usa a concorrencia padrao")
	}
}

func TestJavaCallHint(t *testing.T) {
	req := javaRequest()
	if hint := javaCallHint(req, "Main.java:2: error: ';' expected"); hint != "" {
		t.Errorf("erro no codigo do aluno nao deveria ganhar dica: %q", hint)
	}
	hint := javaCallHint(req, "Main.java:5: error: cannot find symbol\n    __cmRun(0, () -> soma(1));")
	if !strings.Contains(hint, "static") || !strings.Contains(hint, "soma") || !strings.Contains(hint, "int p1, int p2") {
		t.Errorf("dica incompleta: %q", hint)
	}
}
