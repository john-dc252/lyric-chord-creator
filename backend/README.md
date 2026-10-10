# lyric-chord-backend

Rust API (axum + SeaORM + Postgres) for signed-in users' templates. Signed-out users keep using the frontend's local IndexedDB.

## Dev

```sh
cp .env.example .env
docker compose up -d     # Postgres (dev only)
cargo run                # http://localhost:8080; migrations run on startup
cargo test               # integration tests need the compose DB
```

The frontend dev server (`pnpm dev`, port 3000) talks to it via `VITE_API_URL` in `../.env.development`.

`STUB_USERS_FILE` (debug builds only) adds a "stub" sign-in provider: a login form checked against `dev-users.txt` (`email:password:name` per line). It goes through the same redirect/code flow as real providers.

## Prod

Compose is not used. Settings are read from the runtime environment, falling back to values captured at build time:

```sh
DATABASE_URL=postgres://user:pass@db-host:5432/lcc \
PUBLIC_URL=https://api.example.com/ FRONTEND_URL=https://example.com/apps/lyric-chord-creator/ \
OIDC_PROVIDERS='[{"name":"google","label":"Google","issuer":"https://accounts.google.com","clientId":"...","clientSecret":"..."}]' \
CORS_ORIGINS=https://example.com BIND_ADDR=0.0.0.0:3000 cargo build --release
```

Build-time values are embedded in the binary — treat it as a secret if it contains credentials. Stub sign-in is not compiled into release builds.

### Docker

```sh
docker build -t lyric-chord-backend .
docker run -p 8080:8080 -e DATABASE_URL=… -e PUBLIC_URL=… -e FRONTEND_URL=… -e OIDC_PROVIDERS='[…]' lyric-chord-backend
```

Every setting below is also a build arg (`--build-arg OIDC_PROVIDERS=…`) baked in as a default; build args are visible in image metadata, so pass secrets at runtime. The image listens on `0.0.0.0:8080`, runs as a non-root user, and includes CA certificates for outbound TLS.

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | — | required |
| `DB_MAX_CONNECTIONS` | `10` | |
| `BIND_ADDR` | `127.0.0.1:8080` | Docker image: `0.0.0.0:8080` |
| `CORS_ORIGINS` | none | comma-separated |
| `SESSION_IDLE_HOURS` | `168` | session expires after this much inactivity |
| `SESSION_MAX_AGE_DAYS` | `90` | absolute session lifetime |
| `PUBLIC_URL` | — | required; this API's external URL |
| `FRONTEND_URL` | — | required; post-sign-in landing page |
| `OIDC_PROVIDERS` | none | JSON list: `name`, `label?`, `issuer`, `clientId`, `clientSecret`, `scopes?` (default `["email","profile"]`) |
| `STUB_USERS_FILE` | none | debug builds only |
| `RATE_LIMIT_SIGN_IN_PER_MINUTE` | `10` | `/auth/{p}/start\|callback`, `/auth/exchange`, stub login |
| `RATE_LIMIT_AUTH_READ_PER_MINUTE` | `60` | `/auth/config`, `/auth/me`, logout, account deletion |
| `RATE_LIMIT_TEMPLATE_READ_PER_MINUTE` | `300` | includes export |
| `RATE_LIMIT_TEMPLATE_WRITE_PER_MINUTE` | `120` | a batch counts as one request |
| `CLIENT_IP_HEADER` | none | e.g. `x-forwarded-for`; only behind a trusted proxy |

Rate limits are per user when a valid bearer token is sent, otherwise per IP (IPv6 per /64); `0` disables a tier. State is in memory, so limits apply per instance.

Each OIDC provider needs `{PUBLIC_URL}auth/{name}/callback` registered as a redirect URI. Adding a provider is configuration only.

## Sign-in flow

1. SPA generates a random `client_state` (16–128 chars of `[A-Za-z0-9_-]`), stores it in `sessionStorage`, and navigates to the provider's `startUrl` from `/auth/config` with `?client_state=…`.
2. Backend redirects to the provider (authorization code + PKCE + nonce); the provider redirects back to `/auth/{name}/callback`.
3. Backend redirects to `FRONTEND_URL?login_code=…&client_state=…`, or `?login_error=<code>[&client_state=…]`.
4. SPA **must** check `client_state` matches its stored value (prevents login CSRF), then `POST /auth/exchange { code }` within 60 s → `{ token, user }`.

The token is an opaque bearer session stored hashed (SHA-256) in Postgres: revocable via `/auth/logout` (this session) or `/auth/logout-all` (every session), with sliding expiry.

`login_error` codes: `invalid_client_state`, `invalid_state`, `access_denied`, `provider_error`, `provider_unavailable`, `token_exchange_failed`, `invalid_id_token`, `email_unverified`, `missing_email`.

## API

All `/templates` routes need `Authorization: Bearer <token>`. Templates use the frontend `SavedTemplate` shape (epoch-ms timestamps); `title`/`artist` are derived from `content` on the server.

| Method | Path | |
|---|---|---|
| GET | `/health` | |
| GET | `/auth/config` | `{ providers: [{ name, label, startUrl }] }` |
| GET | `/auth/{name}/start?client_state=` | redirect to provider |
| GET | `/auth/{name}/callback` | provider redirect target |
| GET/POST | `/auth/stub/login` | stub login form (debug + `STUB_USERS_FILE` only) |
| POST | `/auth/exchange` | `{ code }` → `{ token, user }` |
| GET | `/auth/me` | current user |
| DELETE | `/auth/me` | delete account (templates and sessions cascade) |
| POST | `/auth/logout` | revoke this session |
| POST | `/auth/logout-all` | revoke all sessions |
| GET | `/templates?q=&field=` | `field`: `all` (full-text, ranked) \| `name` \| `title` \| `artist` \| `lyrics` (substring); title/artist match any song in the template |
| GET | `/templates/export` | zip of all templates as `.lcct.txt` files |
| POST | `/templates/batch` | `{ templates: [{ name, content, createdAt?, updatedAt? }] }` (≤ 100) → per-item `{ template }` or `{ status, error }` |
| POST | `/templates` | `{ name, content }` → 201 |
| GET | `/templates/{id}` | |
| PUT | `/templates/{id}` | upsert `{ name, content, createdAt?, updatedAt? }` — for syncing local templates |
| DELETE | `/templates/{id}` | 204 |

Names are unique per user, case-insensitive (409 on conflict). Over-limit requests get 429 with `Retry-After`. Error text lives in `locales/app.yml` (rust-i18n, embedded at build time).
