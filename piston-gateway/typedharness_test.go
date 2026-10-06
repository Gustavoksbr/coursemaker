package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestTypedLiterals(t *testing.T) {
	cases := []struct {
		name  string
		style literalStyle
		typ   string
		value string
		want  string
	}{
		{"csharp array", csharpStyle, "int[]", `[1,2]`, "new int[]{1, 2}"},
		{"csharp list long", csharpStyle, "List<Long>", `[1]`, "new List<long>{1L}"},
		{"csharp string", csharpStyle, "String", `"a\"b"`, `"a\"b"`},
		{"cpp vector", cppStyle, "double[]", `[1,2.5]`, "std::vector<double>{1.0, 2.5}"},
		{"cpp long", cppStyle, "long", `7`, "7LL"},
		{"cpp utf8 string", cppStyle, "String", `"é"`, `std::string("\303\251", 2)`},
		{"c string", cStyle, "String", `"a?b"`, `"a\?b"`},
		{"c null", cStyle, "String", `null`, "NULL"},
		{"go slice", goStyle, "String[]", `["a","b"]`, `[]string{"a", "b"}`},
		{"go unicode", goStyle, "String", `"é"`, `"` + `\` + `u00e9"`},
		{"rust vec", rustStyle, "long[]", `[1,-2]`, "vec![1_i64, -2_i64]"},
		{"rust string", rustStyle, "String", `"é"`, `String::from("\u{e9}")`},
		{"rust double", rustStyle, "double", `3`, "3.0_f64"},
		{"kotlin ints", kotlinStyle, "int[]", `[1,2]`, "intArrayOf(1, 2)"},
		{"kotlin strings", kotlinStyle, "String[]", `["a"]`, `arrayOf<String>("a")`},
		{"kotlin list", kotlinStyle, "List<Boolean>", `[true]`, "listOf<Boolean>(true)"},
		{"kotlin dollar", kotlinStyle, "String", `"$x"`, `"\$x"`},
	}
	for _, c := range cases {
		got, err := c.style.literal(c.typ, json.RawMessage(c.value))
		if err != nil {
			t.Errorf("%s: %v", c.name, err)
			continue
		}
		if got != c.want {
			t.Errorf("%s: got %s, want %s", c.name, got, c.want)
		}
	}
}

func TestTypedLiteralsRejectWrongValues(t *testing.T) {
	bad := []struct{ typ, value string }{
		{"int", `"x"`}, {"int", `3000000000`}, {"int", `1.5`}, {"boolean", `1`}, {"String", `5`}, {"int[]", `5`}, {"int[]", `[1,"a"]`},
	}
	for _, c := range bad {
		if _, err := goStyle.literal(c.typ, json.RawMessage(c.value)); err == nil {
			t.Errorf("%s %s: deveria ter sido recusado", c.typ, c.value)
		}
	}
}

func TestEveryTypedProgramHidesTheExpectedValue(t *testing.T) {
	for language, build := range typedBuilders {
		req := runTestsRequest{
			Language: language, Code: "int dobro(int x) { return x * 2; }", FunctionName: "dobro", ParamTypes: []string{"int"},
			Tests: []testCase{{Args: []json.RawMessage{json.RawMessage("4")}, Expected: json.RawMessage("987654321")}},
		}
		program, err := build(req, "@@CM-test@@")
		if err != nil {
			t.Errorf("%s: %v", language, err)
			continue
		}
		if strings.Contains(program, "987654321") {
			t.Errorf("%s: o valor esperado vazou para o codigo gerado", language)
		}
		if !strings.Contains(program, "@@CM-test@@") || !strings.Contains(program, "dobro(4") && !strings.Contains(program, "dobro(4_i32") {
			t.Errorf("%s: faltou o marcador ou a chamada de teste", language)
		}
	}
}

func TestTypedParamTypesProblem(t *testing.T) {
	tests := []testCase{{Args: []json.RawMessage{json.RawMessage("[1]")}}}
	if msg := typedParamTypesProblem("c", []string{"int[]"}, tests); msg == "" {
		t.Error("C nao deveria aceitar arrays")
	}
	if msg := typedParamTypesProblem("go", []string{"int[]"}, tests); msg != "" {
		t.Errorf("Go deveria aceitar int[]: %s", msg)
	}
	if msg := typedParamTypesProblem("rust", []string{"Object"}, tests); msg == "" {
		t.Error("tipo fora do conjunto deveria ser recusado")
	}
	if msg := typedParamTypesProblem("go", []string{"int", "int"}, tests); msg == "" {
		t.Error("numero de argumentos diferente de paramTypes deveria ser recusado")
	}
}

func TestTypedTypeNames(t *testing.T) {
	cases := map[[2]string]string{
		{"csharp", "int[]"}:         "int[]",
		{"csharp", "List<String>"}:  "List<string>",
		{"cpp", "long[]"}:           "std::vector<long long>",
		{"go", "double[]"}:          "[]float64",
		{"rust", "String[]"}:        "Vec<String>",
		{"kotlin", "int[]"}:         "IntArray",
		{"kotlin", "String[]"}:      "Array<String>",
		{"kotlin", "List<Integer>"}: "List<Int>",
		{"c", "String"}:             "const char*",
	}
	for in, want := range cases {
		if got := typedTypeName(in[0], in[1]); got != want {
			t.Errorf("typedTypeName(%s, %s) = %s, want %s", in[0], in[1], got, want)
		}
	}
}

func TestFixGccSnippets(t *testing.T) {
	student := "int f() {\n  return 1 +;\n}"
	output := "main.c: In function 'f':\nmain.c:2:13: error: expected expression\n    2 | #include <math.h>\n      |             ^\n   50 | printf(\"gerado\");\n      |        ^\n"
	got := fixGccSnippets(output, student)
	if !strings.Contains(got, "2 |   return 1 +;") {
		t.Errorf("o trecho nao voltou a ser o codigo do aluno:\n%s", got)
	}
	if strings.Contains(got, "gerado") || strings.Contains(got, "math.h") {
		t.Errorf("sobrou trecho do codigo gerado:\n%s", got)
	}
}

func TestErrorsInGeneratedCode(t *testing.T) {
	student := "fn f() {}\nfn g() {}"
	if errorsInGeneratedCode("--> main.rs:2:5", student) {
		t.Error("erro na linha 2 e do aluno")
	}
	if !errorsInGeneratedCode("--> main.rs:69:16", student) {
		t.Error("erro na linha 69 e do codigo gerado")
	}
	if !errorsInGeneratedCode("main.cs(4,31): error", "static int F() { return 1; }") {
		t.Error("erro do C# depois do codigo do aluno deveria contar como gerado")
	}
}

func TestTypeScriptLineShift(t *testing.T) {
	if got := shiftTSLines("main.ts(3,5): error TS1: x"); got != "main.ts(2,5): error TS1: x" {
		t.Errorf("got %s", got)
	}
}
