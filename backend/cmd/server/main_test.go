package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"
)

// freePort asks the OS for a port that is free right now.
func freePort(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return strconv.Itoa(l.Addr().(*net.TCPAddr).Port)
}

func envFrom(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

// get retries briefly while the server starts.
func get(t *testing.T, url string) (int, string) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for {
		resp, err := http.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			return resp.StatusCode, string(body)
		}
		if time.Now().After(deadline) {
			t.Fatalf("server did not start: %v", err)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

func TestRunServesAndShutsDownGracefully(t *testing.T) {
	static := t.TempDir()
	if err := os.WriteFile(filepath.Join(static, "index.html"), []byte("<h1>calculator</h1>"), 0o644); err != nil {
		t.Fatal(err)
	}
	port := freePort(t)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- run(ctx, envFrom(map[string]string{"PORT": port, "STATIC_DIR": static})) }()

	base := "http://127.0.0.1:" + port
	if status, body := get(t, base+"/health"); status != http.StatusOK || body != "{\"status\":\"ok\"}\n" {
		t.Fatalf("/health = %d %q", status, body)
	}
	if status, body := get(t, base+"/"); status != http.StatusOK || body != "<h1>calculator</h1>" {
		t.Fatalf("/ = %d %q", status, body)
	}

	cancel() // what Ctrl+C or `docker stop` does
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("graceful shutdown returned %v, want nil", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("server did not shut down")
	}
}

func TestRunWithoutStaticDirStillServesTheAPI(t *testing.T) {
	port := freePort(t)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- run(ctx, envFrom(map[string]string{"PORT": port, "STATIC_DIR": filepath.Join(t.TempDir(), "missing")}))
	}()

	if status, _ := get(t, "http://127.0.0.1:"+port+"/health"); status != http.StatusOK {
		t.Fatalf("/health = %d", status)
	}
	cancel()
	if err := <-done; err != nil {
		t.Fatalf("shutdown: %v", err)
	}
}

func TestRunReportsAPortInUse(t *testing.T) {
	l, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	port := strconv.Itoa(l.Addr().(*net.TCPAddr).Port)

	if err := run(context.Background(), envFrom(map[string]string{"PORT": port})); err == nil {
		t.Fatal("want an error when the port is taken")
	}
}

func TestValueOr(t *testing.T) {
	if got := valueOr("", "8080"); got != "8080" {
		t.Errorf("empty value: got %q", got)
	}
	if got := valueOr("9000", "8080"); got != "9000" {
		t.Errorf("set value: got %q", got)
	}
}
