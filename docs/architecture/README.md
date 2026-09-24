# Architecture guide

This index points to the current detailed owners rather than copying their contracts. Start with [PROJECT_STATUS.md](../../PROJECT_STATUS.md) for the freeze state.

| Concern | Current owner |
|---|---|
| Service topology, auth/session lifecycle, PostgreSQL/Redis roles, Caddy, coturn and storage | [Architecture baseline](../architecture.md) |
| REST and Socket.IO contracts | [API specification](../api-spec.md) |
| Prisma schema and durable data | [Database contract](../database.md) |
| Roles, channel access and moderation | [Permissions model](../product/permissions-model.md) |
| Voice capture, playback graph, device settings and CALL controls | [Voice & Audio settings](../product/voice-audio-settings.md) |
| Screen sender/receiver lifecycle and current defect | [Screen Share UX](../product/screen-share-ux.md) |
| Authenticated object/media delivery | [Media Delivery Foundation](../product/media-delivery-foundation.md) |
| Configuration and safe examples | [Environment reference](environment.md) |
| Local versus Internet-facing operation | [Self-hosting notes](self-hosting.md), [staging runbook](../operations/staging-vps.md) |

The implemented media topology is client WebRTC mesh with Socket.IO signaling and coturn relay. LiveKit/mediasoup SFU work is a proposed evaluation, not a deployed service. Backups and restore need independent operator review; the local `docker/backup/script.sh` prototype actively executes `pg_dump`, while encryption and off-host upload commands remain commented out. This is not production backup certification.
