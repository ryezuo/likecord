# Likecord staging operations for forks

**Scope:** reusable operational guidance for the frozen source and [staging Compose template](../../docker-compose.staging.yml). This is not a live deployment procedure for the former owner's VPS. Select and validate your own environment, source and images before adapting it. The [operations summary](../history/operations.md) preserves historical outcomes; raw candidate scripts are omitted under the [archive policy](PUBLIC_ARCHIVE.md).

The former Likecord GHCR packages were deleted. Build and publish your own Web/API images, then pin their immutable references in your deployment. No historical digest in a feature record is a currently available release input. Follow the [self-hosting notes](../architecture/self-hosting.md), [environment reference](../architecture/environment.md) and [security policy](../../SECURITY.md).

## 1. Staging baseline and boundaries

The template separates Caddy, Web, API, PostgreSQL, Redis and coturn. Keep database/cache ports private. Review the template's Caddy and TURN listener/relay ports, firewall, TLS/DNS and coturn external-address settings for the target network. Inventory every actual service, including any backup service outside the template.

Use private environment files and distinct secrets. Build-time Web settings and API runtime settings have different owners; do not expose secrets through client build variables. For an empty database, apply migrations and then use the [first-user bootstrap](staging-first-user-bootstrap.md). Development seeds and sample passwords are not deployment credentials.

Before an API restart, establish a maintenance window and deliberately end active Voice/Screen sessions. Process restart with retained Redis can leave stale occupancy; this is unresolved product debt, not permission for automatic cache clearing.

## 2. Controlled application rollout — PREPARE / DEPLOY / VERIFY

A fork should implement these checks against its actual environment. There is no maintained generic deployment script in this archive. Each operation needs an explicit identity, source revision, Compose project/path, intended targets, prior runtime identities, candidate references and migration policy. Never select evidence or rollback inputs merely by newest directory.

### 2.1 Inputs and immutable identities

Build Web/API from the chosen source, retain provenance and publish to your own registry. Record the OCI index (if present), selected platform manifest, platform/config identity and revision label. A mutable tag, index digest, platform digest and local image ID are not interchangeable.

Capture both configured image references and actual running container image IDs. Confirm that candidate images can be pulled on the target host before promotion. Keep rollback images available in your own registry or verified local storage; a historical digest alone does not guarantee availability.

### 2.2 PREPARE — inspect before promotion

1. Confirm the exact Compose project, files, environment, target services and expected current runtime. Detect unexpected services or configuration drift.
2. Save private Compose hashes and complete runtime snapshots, including container/image identity, starts/restarts, state, health and relevant mounts/network/resource settings.
3. Pull and inspect candidates without recreating services. Verify source revision, platform and immutable identity.
4. Discover the actual database, role, network and available Prisma CLI. Inspect complete applied/pending migration history; approve the precise pending set.
5. Establish the required database backup and restore plan before schema changes. Structural/checksum checks do not prove restoration.
6. Persist successful checks under this explicit operation identity. A failure stops the operation without promoting candidates.

Compare snapshots by stable service identity. Ignore only explicitly understood ordering differences; reject duplicate/missing/extra services, malformed input and changes to actual values. Preserve both snapshots when a comparison fails. A later matching sample cannot explain an earlier discarded difference.

### 2.3 DEPLOY — change only intended services

Require successful PREPARE for the same inputs and recheck Compose/runtime drift immediately before mutation. Record attempt state before changing anything; preserve STOP evidence across reviewed retries.

For API schema changes, use the repository's deployed Prisma migration path and the approved pending set. Never use development migration generation or db push against a live database. Stop on migration failure. Promote API before dependent Web where the contract requires it, changing only the expected image references.

Recreate only target services with the equivalent of Compose --no-deps --no-build. A Web-only rollout does not authorize an API/infrastructure restart, migration or Redis mutation. Do not overwrite an entire Compose file over unrelated changes.

Readiness must be truthful: a configured healthcheck must pass; a container without one can only be reported as running without a healthcheck, supplemented by the appropriate application checks. Missing, exited, dead or unhealthy containers do not pass.

### 2.3.1 Manual Screen Share residual-state recovery

After an API restart, inspect Screen state read-only first. A nonzero screen:* key count alone does not establish staleness and does not authorize deletion.

Recovery requires proof that the old Socket.IO/WebRTC Screen sessions were invalidated and that no legitimate new share started after recovery. Prevent new shares during the inspection/recovery window; if current state cannot be distinguished from residual state, stop. Identify and review only the stale Screen keys, remove that reviewed set selectively, verify the expected remaining state, then refresh affected clients.

Never use FLUSHDB or blanket clearing. Do not touch voice:*, presence:*, ratelimit:* or ws:* in a Screen recovery. Voice recovery is a separate issue owned by the [functional debt record](../product/post-vi-product-ux.md). Manual cleanup does not fix the underlying process-loss behavior.

### 2.4 VERIFY — observe the result

Check configured references against actual running image IDs and inspected candidates, including source revision and platform. Verify readiness, restart state, expected public responses and bounded changed-service logs.

Confirm complete migration alignment/schema expectations and any feature-specific authenticated checks without exporting cookies or tokens. For media features, technical verification does not substitute for authorized browser/listening acceptance.

Compare all non-target services with PREPARE, including start/restart history and any backup service. Record actual outcomes and evidence limits. Do not call an operation complete when required authentication, operator or product checks remain unexecuted.

## 3. Migration and backup artifact policy

Discover database identity and privileges instead of assuming the API role can back up or migrate everything. Record the full migration set, failures and pending state from the actual database. Do not install ad hoc dependencies on the host to bypass a missing reviewed migration tool.

The tracked [backup prototype](../../docker/backup/script.sh) actively runs pg_dump. Its encryption and off-host upload commands remain commented out. This does not certify scheduled execution, retention, usable artifacts or restoration. A fork must establish encrypted/off-host backups, restore drills, object-storage protection and operational monitoring for its own environment.

## 4. Selective rollback policy

- Before any mutation, a failed check needs a STOP and preserved evidence, not rollback.
- A migration failure requires diagnosis; never automatically restore the database or reverse schema changes.
- If API promotion fails, assess API rollback against migration compatibility. A later Web failure does not justify reverting a healthy API or additive migration.
- For Web-only rollback, reverse only the exact intended Web image substitution, recreate only Web, and verify it plus non-target preservation.
- If unrelated Compose/runtime drift is detected, stop for review. Do not restore a whole old Compose file, remove volumes, clear Redis or choose rollback artifacts by directory recency.

## 5. Evidence policy

Keep resolved environment, raw runtime/configuration, private logs, authentication material and database backups outside Git with restricted access. Share only bounded sanitized findings. Record whether evidence came from automated checks, operator observations, authenticated reads or owner listening.

Never equate a published image with a deployment, an HTTP response with acoustic quality, or a structural backup check with a restore. The [historical operations summary](../history/operations.md) shows why those boundaries mattered.

## 6. Supported deployment shapes

The repository offers local development Compose and an image-based staging template. Fork maintainers must review and adapt either; neither provides production security certification. Source-based build instructions are in [README.md](../../README.md). Old candidate-specific scripts are historical evidence only.

## 7. Out of scope

This guide does not provide a hosted service, a live former-owner environment, an automated release system, account recovery tooling, a completed security/reliability gate or an SFU deployment. Preserve accepted application contracts when developing a fork's own operational process.
