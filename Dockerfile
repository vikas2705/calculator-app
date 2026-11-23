# One image runs the whole app: the Go server answers the API and serves the
# built React frontend from the same origin (so no CORS is needed).
#
#   docker compose up --build        then open http://localhost:8080

# ---- 1. Build the frontend ----
FROM node:24.18.0-alpine3.24 AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. Build the backend (static binary, no C toolchain needed at runtime) ----
FROM golang:1.27.4-alpine3.24 AS backend
WORKDIR /src
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- 3. Runtime ----
FROM alpine:3.24.4
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=backend /out/server ./server
COPY --from=frontend /app/dist ./static

USER app
ENV PORT=8080 \
    STATIC_DIR=/app/static
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["./server"]
