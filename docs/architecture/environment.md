# Environment reference

This describes variables used by the current source and Compose files at the 2026-09-23 freeze. Values below are **examples or placeholders**, never production credentials. Local [`.env.example`](../../.env.example) is loaded into the API by `docker-compose.yml`; [`.env.staging.example`](../../.env.staging.example) supplies interpolation for `docker-compose.staging.yml`. A Web `NEXT_PUBLIC_*` variable must be set at **Web build time**.

| Name | Used by | Required / purpose | Safe example |
|---|---|---|---|
| `NODE_ENV` | API, Web | Set by Compose; selects production safety checks and runtime behavior | `development` locally; `production` for public deploy |
| `DATABASE_URL` | API, Prisma | Required connection to PostgreSQL | `postgresql://USER:PASSWORD@postgres:5432/DB` |
| `POSTGRES_PASSWORD` | Staging Compose | Required for staging PostgreSQL and its API URL; supply privately | `CHANGE_ME_RANDOM_URL_SAFE_VALUE` |
| `REDIS_URL` | API | Redis cache, presence, rate limits and Voice state; local default exists | `redis://redis:6379` |
| `API_PORT` | API | Optional HTTP listen port | `3001` |
| `APP_ORIGIN` | API | Allowed application origin for CORS and credential changes; set explicitly for public deployment | `https://example.com` |
| `CORS_ORIGIN` | API / WebSocket | Optional allowed origin; use the deployed HTTPS origin | `https://example.com` |
| `JWT_ACCESS_SECRET` | API | Required in production; sign access credentials | `CHANGE_ME_UNIQUE_RANDOM_VALUE` |
| `JWT_REFRESH_SECRET` | API | Required by refresh token signing; use a distinct random value | `CHANGE_ME_ANOTHER_RANDOM_VALUE` |
| `LINK_PREVIEW_CACHE_HMAC_SECRET` | API | Required by active Link Preview cache, at least 32 bytes and distinct | `CHANGE_ME_THIRD_RANDOM_VALUE` |
| `TURN_SECRET` | API, coturn | Shared TURN HMAC credential; required when running coturn | `CHANGE_ME_FOURTH_RANDOM_VALUE` |
| `TURN_HOST` | API | Hostname returned for TURN endpoints | `turn.example.com` |
| `TURN_EXTERNAL_IP` | Staging coturn | Required public IPv4 when TURN runs behind Docker NAT | `203.0.113.10` |
| `STORAGE_DRIVER` | API | `local` or `r2`; defaults to local | `local` |
| `UPLOAD_DIR` | API | Local-storage directory; persist the volume in a deployment | `/app/uploads` |
| `R2_ACCOUNT_ID` | API | Required when `STORAGE_DRIVER=r2` | `CHANGE_ME_ACCOUNT_ID` |
| `R2_ACCESS_KEY_ID` | API | Required when R2 enabled | `CHANGE_ME_ACCESS_KEY_ID` |
| `R2_SECRET_ACCESS_KEY` | API | Required when R2 enabled | `CHANGE_ME_SECRET_ACCESS_KEY` |
| `R2_ENDPOINT` | API | Required when R2 enabled | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `R2_BUCKET` | API | Bucket name when R2 enabled | `your-private-bucket` |
| `R2_PRESIGNED_UPLOAD_TTL` | API | Optional upload URL lifetime in seconds | `300` |
| `R2_PRESIGNED_DOWNLOAD_TTL` | API | Optional download URL lifetime in seconds | `600` |
| `GHCR_OWNER` | Staging Compose | Required image registry namespace | `your-github-user-or-org` |
| `STAGING_TAG` | Staging Compose | Required pinned Web/API image tag; immutable digest is preferable for release operation | `staging-YYYYMMDD-01` |
| `LIKECORD_STAGING_DOMAIN` | Staging Compose | Required DNS name for Caddy/API/TURN | `staging.example.com` |
| `NEXT_PUBLIC_API_URL` | Web build | Optional API base URL; leave unset for same-origin proxy | `https://example.com` |
| `NEXT_PUBLIC_DEBUG_ATTACHMENTS` | Web build | Optional diagnostic switch; leave false for normal use | `false` |
| `NEXT_PUBLIC_WEBRTC_FORCE_RELAY` | Web build | Optional TURN relay diagnostic; leave false for normal use | `false` |
| `RATE_LIMIT_LOGIN_POINTS`, `RATE_LIMIT_LOGIN_WINDOW` | API | Optional login threshold/window override | `5`, `60` |
| `RATE_LIMIT_REGISTER_POINTS`, `RATE_LIMIT_REGISTER_WINDOW` | API | Optional registration threshold/window override | `3`, `3600` |
| `RATE_LIMIT_REFRESH_POINTS`, `RATE_LIMIT_REFRESH_WINDOW` | API | Optional refresh threshold/window override | `10`, `60` |
| `BOOTSTRAP_EMAIL`, `BOOTSTRAP_USERNAME` | One-shot API CLI | Optional identity inputs; otherwise prompted in TTY | `owner@example.com`, `owner` |

The first-user CLI explicitly rejects `BOOTSTRAP_PASSWORD`; it asks through a hidden TTY prompt. Test-only `LIKECORD_TEST_DATABASE_URL` and `LIKECORD_TEST_REDIS_URL` belong to isolated API test setup, never a live instance. `HTTP_PROXY`, `HTTPS_PROXY` and `NODE_USE_ENV_PROXY` are environment/network controls used by test or platform code, not Likecord deployment credentials. The old `DO_SPACES_*`, `SENTRY_DSN` and `AGE_PUBLIC_KEY` entries were removed from the local example because current application code does not consume them; the backup script's age command remains commented out. See [self-hosting](self-hosting.md) before adapting the deployment.
