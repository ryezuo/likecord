# Likecord — Deployment Guide

> **Historical design plan, not a current deployment recipe.** Provider, version, cost, backup and service examples below predate implemented Compose. Start with [self-hosting](architecture/self-hosting.md), [environment](architecture/environment.md), and the [staging runbook](operations/staging-vps.md).

## Infrastructure Overview

| Component | Provider | Monthly Cost |
|---|---|---|
| VPS | Hetzner CX32 (4 vCPU, 8 GB RAM, 80 GB NVMe) | ~EUR 7.99 |
| Object storage | DigitalOcean Spaces (250 GB, 1 TB outbound) | $5.00 |
| DNS | Hetzner DNS or Cloudflare (free) | $0 |
| SSL | Let's Encrypt (via Caddy auto-TLS) | $0 |
| Error tracking | Sentry (free tier, 5k events/mo) | $0 |
| Monitoring | Embedded health checks + container logs | $0 |
| **Total** | | **~EUR 13/mo** |

## Prerequisites

1. Hetzner account (CX32 in region closest to your friends)
2. DigitalOcean account (Spaces enabled, create bucket: `likecord-files` + `likecord-backups`)
3. Domain name (e.g., `example.com`, ~$10-15/yr); point A record to VPS IP
4. Docker and Docker Compose plugin installed on VPS
5. `age` installed on VPS (for backup encryption)

## VPS Provisioning

1. Create Hetzner CX32 server (Ubuntu 22.04 LTS)
2. Configure SSH key-only authentication
3. Configure firewall (ufw):

```bash
ufw allow 22/tcp          # SSH
ufw allow 443/tcp         # HTTPS (Caddy)
ufw allow 3478/tcp        # TURN TCP
ufw allow 3478/udp        # STUN/TURN
ufw allow 49152:49200/udp # TURN relay ports
ufw deny incoming
ufw enable
```

4. Install Docker + Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose-plugin
```

5. Install age:

```bash
sudo apt install age
```

## Docker Compose Services

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks:
      - edge_net
      - app_net
    restart: unless-stopped

  nextjs:
    build: ./apps/web
    expose:
      - "3000"
    networks:
      - app_net
    restart: unless-stopped

  nestjs:
    build: ./apps/api
    expose:
      - "3001"
    env_file: .env
    networks:
      - app_net
      - data_net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    expose:
      - "5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: likecord
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    networks:
      - data_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U likecord"]
      interval: 5s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    networks:
      - data_net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
    restart: unless-stopped

  coturn:
    image: coturn/coturn:4.6
    ports:
      - "3478:3478/tcp"
      - "3478:3478/udp"
      - "49152-49200:49152-49200/udp"
    volumes:
      - ./apps/turn/turnserver.conf:/etc/coturn/turnserver.conf:ro
    networks:
      - turn_net
    restart: unless-stopped

  backup:
    image: postgres:15-alpine
    entrypoint: ["/bin/sh", "-c"]
    command: ["supercronic /etc/backup/crontab"]
    volumes:
      - ./docker/backup/script.sh:/etc/backup/script.sh:ro
      - ./docker/backup/crontab:/etc/backup/crontab:ro
      - ./backups:/backups
    environment:
      PGHOST: postgres
      PGUSER: likecord
      PGPASSWORD_FILE: /run/secrets/db_password
      AWS_ACCESS_KEY_ID: ${DO_SPACES_KEY}
      AWS_SECRET_ACCESS_KEY: ${DO_SPACES_SECRET}
      AGE_PUBLIC_KEY: ${AGE_PUBLIC_KEY}
    secrets:
      - db_password
    networks:
      - data_net
    restart: unless-stopped

networks:
  edge_net:
  app_net:
  data_net:
    internal: true
  turn_net:

volumes:
  pg_data:
  redis_data:
  caddy_data:
  backup_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Caddyfile

```
example.com {
    reverse_proxy /api/v1/ws    nestjs:3001
    reverse_proxy /api/v1/*     nestjs:3001
    reverse_proxy /*            nextjs:3000
}
```

## coturn Configuration

File: `apps/turn/turnserver.conf`

```ini
listening-port=3478
tls-listening-port=5349
fingerprint
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=example.com
total-quota=100
bps-capacity=0
stale-nonce=600
no-multicast-peers
no-tlsv1
no-tlsv1_1
```

**`static-auth-secret` must never be committed to Git.** Set as environment variable `TURN_SECRET` in `.env`.

## Secrets Management

| Secret | Source | Stored In |
|---|---|---|
| `db_password` | Generated (openssl rand -base64 32) | `./secrets/db_password.txt` + password manager |
| `TURN_SECRET` | Generated | `.env` file + password manager |
| `JWT_ACCESS_SECRET` | Generated | `.env` file + password manager |
| `JWT_REFRESH_SECRET` | Generated (different from access) | `.env` file + password manager |
| `DO_SPACES_KEY` | DO Spaces API | `.env` file + password manager |
| `DO_SPACES_SECRET` | DO Spaces API | `.env` file + password manager |
| `SENTRY_DSN` | Sentry project | `.env` file |
| `AGE_PUBLIC_KEY` | age-keygen output | `.env` file (public) |
| `AGE_PRIVATE_KEY` | age-keygen output | **Password manager only** (never on VPS) |

## Backup Procedures

### Backup Encryption Key Setup

```bash
# Generate key pair ON YOUR LOCAL MACHINE (never on the VPS)
age-keygen -o backup-key.txt
# Output: public key: age1...
# Store backup-key.txt in password manager

# Deploy only the public key to VPS as environment variable
AGE_PUBLIC_KEY="age1..."
```

### Backup Script

File: `docker/backup/script.sh`

```bash
#!/bin/sh
TIMESTAMP=$(date +%Y-%m-%d)
FILENAME="likecord-$TIMESTAMP.dump.age"

# Dump + encrypt with age
pg_dump -Fc likecord | age -r "$AGE_PUBLIC_KEY" > "/backups/daily/$FILENAME"

# Upload to external object storage
aws s3 cp "/backups/daily/$FILENAME" "s3://likecord-backups/daily/$FILENAME"

# Cleanup local backups older than 30 days
find /backups/daily -name "*.dump.age" -mtime +30 -delete
```

File: `docker/backup/crontab`

```
0 3 * * * /etc/backup/script.sh
```

### Restore Procedure

```bash
# 1. Download encrypted backup from S3
aws s3 cp s3://likecord-backups/daily/2024-01-01.dump.age .

# 2. Decrypt with age (run on machine with private key)
age -d --identity backup-key.txt 2024-01-01.dump.age > 2024-01-01.dump

# 3. Restore to PostgreSQL
pg_restore -Fc -d likecord 2024-01-01.dump
```

### Full Disaster Recovery (VPS Loss)

```
1. Provision new Hetzner CX32
2. Install Docker + Compose
3. Clone Git repository
4. Restore .env from password manager
5. Install age, get public key
6. Download + decrypt latest backup from S3
7. Restore database
8. docker compose up -d
9. Update DNS A record if IP changed
```

## Monitoring

| Concern | Tool | Configuration |
|---|---|---|
| Public health | `GET /api/v1/health` | Returns `{ status: "ok" }` |
| Detailed health | `GET /api/v1/health/detailed` | DB, Redis, S3 connectivity (Docker internal only) |
| Metrics | `GET /api/v1/metrics` | Prometheus-format (Docker internal only) |
| Logs | Pino structured JSON to stdout | `docker compose logs -f` |
| Error tracking | Sentry | Captures all 5xx and unhandled rejections |

**Why /metrics is internal:** Exposing Prometheus metrics publicly is a common attack vector. Access via `docker exec` or a dedicated monitoring container on the same Docker network.

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

## Security Checklist

- [ ] Firewall allows only ports 22, 443, 3478 TCP/UDP, 49152-49200 UDP
- [ ] SSH key-only authentication (password auth disabled)
- [ ] PostgreSQL not exposed to host (Docker internal network only)
- [ ] Redis not exposed to host (Docker internal network only)
- [ ] `.env` and `secrets/` in `.gitignore`
- [ ] TURN `static-auth-secret` in environment variable, not in config file
- [ ] `age` private key stored in password manager, never on VPS
- [ ] Caddy auto-TLS enabled (no plain HTTP)
- [ ] WebSocket Origin validation enabled in NestJS Gateway
- [ ] Rate limiting active on all sensitive endpoints
