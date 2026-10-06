package main

import (
	"strings"
	"testing"
)

func TestLimitedBufferCapsWithoutFailing(t *testing.T) {
	b := &limitedBuffer{max: 5}
	if n, err := b.Write([]byte("abc")); n != 3 || err != nil {
		t.Fatalf("n=%d err=%v", n, err)
	}
	if n, err := b.Write([]byte("defgh")); n != 5 || err != nil { // diz que gravou tudo, para nao dar SIGPIPE
		t.Fatalf("n=%d err=%v", n, err)
	}
	if n, err := b.Write([]byte("xyz")); n != 3 || err != nil {
		t.Fatalf("n=%d err=%v", n, err)
	}
	if got := b.String(); !strings.HasPrefix(got, "abcde") || !strings.Contains(got, "truncada") || strings.Contains(got, "f") {
		t.Errorf("String() = %q", got)
	}

	small := &limitedBuffer{max: 10}
	small.Write([]byte("ok"))
	if small.String() != "ok" {
		t.Errorf("sem corte nao deveria acrescentar aviso: %q", small.String())
	}
}

func TestLocalCommandUsesTheRunDirectory(t *testing.T) {
	got := localCommand(dockerSpecs["c"].command)
	if strings.Contains(got, "/tmp/") || !strings.Contains(got, "./main") {
		t.Errorf("comando: %s", got)
	}
}

func TestSupportedLanguagesFollowTheExecutor(t *testing.T) {
	function, output := supportedLanguages()
	if len(function) < 12 || len(output) < 12 {
		t.Fatalf("o Piston deveria rodar todas as linguagens: funcao=%v saida=%v", function, output)
	}

	local = &localRunner{}
	defer func() { local = nil }()
	function, output = supportedLanguages()
	for _, key := range append(append([]string{}, function...), output...) {
		if pistonOnlyLanguages[key] {
			t.Errorf("%s so roda no Piston, mas aparece para o executor local", key)
		}
	}
	if len(output) != 5 || len(function) != 5 {
		t.Errorf("o executor local deveria rodar 5 linguagens: funcao=%v saida=%v", function, output)
	}
}
