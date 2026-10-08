package main

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestSelfPingTarget(t *testing.T) {
	cases := map[string]string{
		"":                                 "",
		"   ":                              "",
		"https://x.onrender.com":           "https://x.onrender.com/health",
		"https://x.onrender.com/":          "https://x.onrender.com/health",
		"  https://x.onrender.com//  ":     "https://x.onrender.com/health",
		"https://x.onrender.com/sub-path/": "https://x.onrender.com/sub-path/health",
	}
	for input, want := range cases {
		if got := selfPingTarget(input); got != want {
			t.Errorf("selfPingTarget(%q) = %q, quero %q", input, got, want)
		}
	}
}

func TestSelfPingCallsHealthRepeatedly(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			hits.Add(1)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	stop := startSelfPing(server.URL, 20*time.Millisecond, server.Client())
	defer stop()

	deadline := time.Now().Add(2 * time.Second)
	for hits.Load() < 3 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if hits.Load() < 3 {
		t.Fatalf("esperava ao menos 3 chamadas a /health, houve %d", hits.Load())
	}
}

func TestSelfPingStopsAndStaysOffWithoutURL(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
	}))
	defer server.Close()

	// Sem URL nada e chamado.
	startSelfPing("", 5*time.Millisecond, server.Client())()
	time.Sleep(30 * time.Millisecond)
	if hits.Load() != 0 {
		t.Fatalf("sem URL nao deveria chamar nada, houve %d chamadas", hits.Load())
	}

	// Depois de parar, nao chama mais.
	stop := startSelfPing(server.URL, 5*time.Millisecond, server.Client())
	time.Sleep(40 * time.Millisecond)
	stop()
	time.Sleep(20 * time.Millisecond)
	after := hits.Load()
	time.Sleep(40 * time.Millisecond)
	if hits.Load() != after {
		t.Fatalf("continuou chamando depois de parar: %d -> %d", after, hits.Load())
	}
}

func TestPingOnceReportsServerErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	if err := pingOnce(server.Client(), server.URL+"/health"); err == nil {
		t.Fatal("esperava erro para resposta 503")
	}
}
