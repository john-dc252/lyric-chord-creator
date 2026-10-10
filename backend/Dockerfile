# syntax=docker/dockerfile:1

FROM rust:1-slim-bookworm AS build
WORKDIR /app

# Optional build-time settings, embedded in the binary as defaults (runtime env still
# overrides). Values passed here are visible in the image metadata — prefer runtime env
# for secrets (DATABASE_URL credentials, OIDC client secrets).
ARG DATABASE_URL= \
    DB_MAX_CONNECTIONS= \
    BIND_ADDR= \
    CORS_ORIGINS= \
    PUBLIC_URL= \
    FRONTEND_URL= \
    OIDC_PROVIDERS= \
    SESSION_IDLE_HOURS= \
    SESSION_MAX_AGE_DAYS= \
    RATE_LIMIT_SIGN_IN_PER_MINUTE= \
    RATE_LIMIT_AUTH_READ_PER_MINUTE= \
    RATE_LIMIT_TEMPLATE_READ_PER_MINUTE= \
    RATE_LIMIT_TEMPLATE_WRITE_PER_MINUTE= \
    CLIENT_IP_HEADER=

COPY Cargo.toml Cargo.lock ./
COPY locales locales
COPY src src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release --locked \
    && cp target/release/lyric-chord-backend /usr/local/bin/

FROM debian:bookworm-slim
# CA roots for outbound TLS (OIDC providers, managed Postgres).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bin/lyric-chord-backend /usr/local/bin/
USER 10001:10001
ENV BIND_ADDR=0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/lyric-chord-backend"]
