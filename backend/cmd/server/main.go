// Command server runs the calculator API and serves the built frontend.
//
// Configuration (environment variables):
//
//	PORT        port to listen on (default 8080)
//	STATIC_DIR  directory containing the built frontend (default ./static)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"calculator/internal/api"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Stop cleanly on Ctrl+C or `docker stop`.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, os.Getenv); err != nil {
		slog.Error("server stopped", "error", err)
		stop()
		os.Exit(1)
	}
}

// run serves until ctx is cancelled, then shuts down gracefully. getenv
// reads the configuration (os.Getenv in production, a map in tests).
func run(ctx context.Context, getenv func(string) string) error {
	port := valueOr(getenv("PORT"), "8080")
	staticDir := valueOr(getenv("STATIC_DIR"), "./static")

	if _, err := os.Stat(staticDir); err != nil {
		slog.Warn("static directory not found; only the API will be served", "dir", staticDir)
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           api.NewRouter(staticDir),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serveErr := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr, "static_dir", staticDir)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err // failed to start, e.g. port already in use
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func valueOr(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}
