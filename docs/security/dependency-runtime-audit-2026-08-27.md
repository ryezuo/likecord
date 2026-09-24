# Likecord Dependency / Runtime / Security Audit

**Date:** 2026-08-27
**Source checkpoint:** `channel and category permissions milestone`
**Checkpoint tag:** `audit-stage1f35b-channel-permissions-complete-2026-08-27`
**Audit branch:** `historical pre-F.4 runtime security audit`
**Staging application tag supplied for this audit:** `staging-f35b-channel and category permissions milestone`

## Scope

This Phase A audit covers the exact dependency graph, runtime and framework lifecycle, known advisories, Docker and infrastructure image lines, container construction, and dependency/image supply-chain posture at the stated checkpoint. It is evidence for a later upgrade-decision phase; it performs no upgrade or remediation.

## Explicit non-scope

Authentication design, the permission engine, role hierarchy, channel and WebRTC authorization, broader application security testing, deployment changes, database access, and implementation of any recommendation are explicitly outside this audit. The prior F.3.5B validation is accepted as complete and is not repeated.

Evidence labels in this report have the following meaning:

- **CONFIRMED AFFECTED:** the resolved version is in the advisory range and the relevant Likecord path is present.
- **NOT AFFECTED:** a required exploit condition is absent in Likecord.
- **LIKELY NOT REACHABLE:** the package/version is affected but repository evidence does not expose the vulnerable feature at runtime.
- **INCONCLUSIVE:** the available evidence cannot establish the exact runtime state or exploit path.

## Executive Summary

**Phase B status:** COMPLETE. The authoritative exact-target and ordered execution plan is [pre-f4-runtime-upgrade-plan-2026-08-27.md](./pre-f4-runtime-upgrade-plan-2026-08-27.md). Urgent remediation is planned but not started, so the Phase A release decision remains unchanged: F.4 is blocked.

**Is it safe to begin F.4 before performing upgrades? No.** Four findings meet the task's **URGENT** definition and should be cleared before normal feature work resumes:

1. Both application images build and run on Node.js 20, which reached end-of-life on 2026-03-24 and no longer receives security fixes.
2. The web app resolves Next.js 14.2.35. Next.js 14 is outside the vendor's LTS policy, the installed version falls in 21 registry advisory ranges, and it also falls in the range of the 2026-08-25 critical AVIF Image Optimization advisory. The AVIF trigger is **INCONCLUSIVE** for Likecord, but App Router/RSC and rewrite-related advisory families are directly relevant and the major receives no routine fixes.
3. `socket.io-parser` 4.2.6 is used by the public `/api/v1/ws` service and is affected by unauthenticated, low-complexity memory exhaustion (CVE-2026-69185 / GHSA-2m8v-j782-fhvr). The fixed 4.x parser is 4.2.7.
4. `coturn/coturn:4.6` is a public TURN service. The tag represents the obsolete 4.6 line (historically 4.6.3 at its latest revision), which is within the affected range of authenticated TURN peer-protection bypasses fixed in 4.13.x. Likecord issues time-limited TURN credentials to authenticated users and does not configure an independent denied-peer allowlist, so the loopback-relay exposure is relevant.

Before RC, Likecord should also coordinate the supported React, NestJS, and Prisma migrations; make the package-manager and image inputs reproducible; reduce the API runtime dependency surface; run app containers as non-root; close Docker-context ignore gaps; and add release-time dependency/image scanning with retained SBOM/provenance evidence.

The supported PostgreSQL 15, Redis 7.4, and Caddy 2 lines should deliberately remain on their current majors. AWS SDK for JavaScript v3, ioredis 5, and general TypeScript/Turbo/Jest modernization do not justify unrelated churn now. Prisma 8 is an RC and is explicitly not a production target.

Evidence remains **INCONCLUSIVE** for the exact digests and package revisions actually pulled in staging because the Docker daemon/runtime was not inspectable in this audit. The exact text and package-manager context of the earlier Prisma RC warning was not retained in the repository. The Next.js AVIF advisory is version-confirmed, but repository evidence shows no `next/image`, AVIF format configuration, or remote image patterns, so practical trigger reachability was not established.

## Exact Current Inventory

| Component | Current version/tag | Resolved source | Runtime/build/dev | Support status | Evidence |
|---|---:|---|---|---|---|
| Node.js — API | `node:20-slim` in base and runner; tag currently maps to Node 20.20.2 variants | `apps/api/Dockerfile` | Build + runtime | **EOL 2026-03-24** | [Node release schedule](https://nodejs.org/en/about/previous-releases), [Node EOL policy](https://nodejs.org/en/about/eol), [Docker Hub Node 20 tags](https://hub.docker.com/_/node/tags?name=20&page=1) |
| Node.js — Web | `node:20-alpine` in base and runner; Node 20 final line | `apps/web/Dockerfile` | Build + runtime | **EOL 2026-03-24** | Same official Node evidence; tag is mutable |
| pnpm | `packageManager: pnpm@9.15.4`; engine `>=9`; Docker runs unversioned `npm i -g pnpm` twice per image build | Root `package.json`, Dockerfiles | Build/toolchain | No formal support window found; pnpm 11.24.0 is current stable, pnpm 12 is RC | [pnpm releases](https://github.com/pnpm/pnpm/releases) |
| TypeScript | Range `^5.4.0`; resolved/installed `5.9.3` | Manifests, lockfile, installed package metadata | Build/dev | Maintained; not a security blocker | `package.json`, workspace manifests, `pnpm-lock.yaml` |
| Turbo | Range `^2.0.0`; resolved/installed `2.9.18` | Root manifest, lockfile, installed metadata | Build/dev | Maintained 2.x; no material advisory found | `package.json`, `turbo.json`, `pnpm-lock.yaml` |
| Next.js | Range `^14.2.0`; resolved/installed `14.2.35` | Web manifest, lockfile, installed metadata | Web runtime | **14.x unsupported**; 16.x Active LTS, 15.x Maintenance LTS | [Next.js support policy](https://nextjs.org/support-policy) |
| React / React DOM | Ranges `^18.3.0`; both resolved `18.3.1` | Web manifest, lockfile, installed metadata | Web runtime | Previous documented major; latest docs are 19.2 | [React versions](https://react.dev/versions) |
| NestJS core/common/platform-express/platform-socket.io/websockets | Ranges `^10.3.0`; resolved `10.4.22` | API manifest, lockfile, installed metadata | API runtime | v10 is a legacy major; current stable line is v12 | [Nest migration guide](https://docs.nestjs.com/migration-guide), [@nestjs/core registry](https://www.npmjs.com/package/@nestjs/core) |
| Prisma CLI / `@prisma/client` | Ranges `^5.14.0`; both resolved `5.22.0` | Database/API manifests, lockfile, installed metadata | Build + API runtime | Superseded; official current GA is Prisma 7; Prisma 8 is RC | [Prisma 7 status](https://www.prisma.io/docs), [Prisma 8 status](https://www.prisma.io/docs/v8) |
| Socket.IO server | Range `^4.7.0`; resolved `4.8.3` | API manifest, lockfile, installed metadata | API runtime | Current stable 4.x server | [Socket.IO security history](https://github.com/socketio/socket.io/security) |
| Socket.IO client | Exact `4.7.5` in Web and API dev dependencies | Manifests, lockfile, installed metadata | Browser runtime + API tests | Stable 4.x, one minor behind server/current 4.8.3 | [Socket.IO 4.8.3 distribution](https://cdn.socket.io/4.8.3/) |
| `socket.io-parser` | Transitive `4.2.6` | Lockfile and installed metadata; parent is server/client | API + browser protocol runtime | Affected; fixed in 4.2.7 | [GHSA-2m8v-j782-fhvr](https://github.com/socketio/socket.io/security/advisories/GHSA-2m8v-j782-fhvr) |
| ioredis | Range `^5.4.0`; resolved `5.11.1` | API manifest, lockfile, installed metadata | API runtime | Supported in practice; v6.0.0 is a breaking current major, with no applicable audit finding | [ioredis releases](https://github.com/redis/ioredis/releases) |
| AWS SDK S3 client + presigner | Ranges `^3.1116.0`; resolved `3.1116.0` | API manifest, lockfile, installed metadata | API runtime (R2) | Active v3 line; registry current was 3.1120.0 on audit date | [AWS SDK v3 documentation](https://docs.aws.amazon.com/sdk-for-javascript/), [v3 support policy notes](https://github.com/aws/aws-sdk-js-v3) |
| Jest | Range `^29.7.0`; resolved `29.7.0`; related Babel/JSDOM tooling includes 30.x | Workspace manifests, lockfile, installed metadata | Test/dev only | Old but not a runtime security blocker | Workspace manifests and lockfile |
| `tsx` / `ts-jest` | `tsx` exact `^4.22.4` resolved 4.22.4; `ts-jest ^29.1.0` | API manifest and lockfile | Dev/test only | No material runtime finding | API manifest and lockfile |
| PostgreSQL | `postgres:15-alpine` for database and local backup; current tag maps to 15.19 Alpine | Compose files | Infrastructure runtime | 15 supported through 2027-11-11 | [PostgreSQL version policy](https://www.postgresql.org/support/versioning/), [15.19 release notes](https://www.postgresql.org/docs/release/15.19/), [Docker Hub tags](https://hub.docker.com/_/postgres/tags?name=15&page=1) |
| Redis | `redis:7-alpine`; current tag maps to Redis 7.4.11 Alpine | Compose files | Infrastructure runtime | Redis 7.4 Extended GA through 2029-12-01 | [Redis OSS lifecycle](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/), [Docker Hub layer](https://hub.docker.com/layers/library/redis/7.4-alpine/) |
| Caddy | `caddy:2-alpine`; current tag maps to 2.11.4 Alpine | Compose files | Edge runtime | Current stable 2.x line | [Caddy releases](https://github.com/caddyserver/caddy/releases), [official image tags](https://hub.docker.com/_/caddy/) |
| coturn | `coturn/coturn:4.6`; historically advances within the 4.6 line, whose last application release is 4.6.3 | Compose files | Public TURN runtime | Obsolete and affected; current stable is 4.17.2 | [coturn Docker changelog](https://github.com/coturn/coturn/blob/master/docker/coturn/CHANGELOG.md), [coturn releases](https://github.com/coturn/coturn/releases), [Docker Hub](https://hub.docker.com/r/coturn/coturn/) |
| Likecord staging app images | GHCR `likecord-web:${STAGING_TAG}` and `likecord-api:${STAGING_TAG}`; supplied current tag `staging-f35b-channel and category permissions milestone` | Staging Compose and audit input | App runtime | Immutable-tag operating process is documented/completed; registry digest not inspected | `docker-compose.staging.yml`, deployment docs, task baseline |

### Dependency graph and lock evidence

- `pnpm-lock.yaml` is lockfile format 9 and pins concrete package tarball/integrity data plus workspace links. The manifest's exact `packageManager` field is a useful local pin; most application dependencies use caret ranges, while `socket.io-client` is exact at 4.7.5.
- Existing installed package metadata corroborated the lock for the material packages listed above. No installation or lockfile regeneration was performed.
- `pnpm list --recursive --depth 0` could not be used reliably: the host exposed pnpm 11.19.0 rather than the declared pnpm 9.15.4 and failed while opening its local dependency-state database. Per the audit rule, dependencies were not reinstalled just to make that query work. Inventory therefore uses manifests + lockfile + existing installed package metadata.
- The host's Node 24.13.0 and pnpm 11.19.0 are audit-machine tooling only; they are not evidence of the deployed application runtime.

## Security Advisory Findings

Read-only `pnpm audit --json` reported **6 low, 22 moderate, 34 high, 0 critical** advisory instances across 1,097 total dependency entries (482 dependencies, 605 dev dependencies, 45 optional). `pnpm audit --prod --json` reported **3 low, 19 moderate, 26 high, 0 critical** across its production view. Counts are instances/paths, not 60 independent exploitable defects.

The production report grouped advisories under: Next.js (21), `brace-expansion` (6), Multer (5), PostCSS (4), `file-type` (2), `js-yaml` (2), nanoid (2), `ws` (2), and one each for Nest core, `body-parser`, `qs`, and `socket.io-parser`. The registry scan had not yet ingested the two vendor-published Next.js critical advisories from 2026-08-25, so the vendor advisories below supersede its zero-critical total.

| Package/component | Installed version | Advisory | Affected? | Runtime relevance | Severity | Classification | Fixed stable version | Evidence |
|---|---:|---|---|---|---|---|---:|---|
| Next.js | 14.2.35 | 21 registry findings: Image Optimizer DoS/cache growth; RSC/App Router DoS and disclosure; request smuggling/SSRF; cache confusion/poisoning; XSS; middleware bypass | **CONFIRMED AFFECTED** by ranges | Mixed feature prerequisites, but Likecord uses App Router, RSC delivery, self-hosting, and a rewrite; unsupported major cannot receive the current patch stream | High/moderate/low | **URGENT** | Current supported fixed lines 15.5.24 or 16.3.3 | Local `pnpm audit --prod --json`; [Next support policy](https://nextjs.org/support-policy); [July 2026 release summary](https://nextjs.org/blog) |
| Next.js Image Optimization | 14.2.35 | GHSA-2xp9-vwfh-vxw4 — AVIF optimization through vulnerable `libheif` can yield unauthenticated RCE | **CONFIRMED AFFECTED** version; trigger **INCONCLUSIVE** | No `next/image`, `images.formats`, `remotePatterns`, or AVIF asset use was found; framework endpoint still ships | Critical 9.5 | **URGENT** as part of unsupported Next finding | 15.5.24 / 16.3.3 | [Vendor advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [August 2026 security release](https://nextjs.org/blog/august-2026-security-release) |
| Next.js on Windows | 14.2.35 | CVE-2026-75604 / GHSA-p293-qw3h-jr36 — Windows filesystem RCE | **NOT AFFECTED** | Likecord runners are Linux (`slim`/Alpine), not Windows; Likecord also has App Router only | Critical 9.0 | **NO ACTION** for this advisory | 15.5.24 / 16.3.3 | [Vendor advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) |
| `socket.io-parser` | 4.2.6 | CVE-2026-69185 / GHSA-2m8v-j782-fhvr — zero-attachment memory exhaustion | **CONFIRMED AFFECTED** | Public `/api/v1/ws` traffic is parsed by this package; no workaround | High 7.5 | **URGENT** | 4.2.7 | [Vendor advisory](https://github.com/socketio/socket.io/security/advisories/GHSA-2m8v-j782-fhvr) |
| coturn | declared 4.6 line | CVE-2026-53450 / GHSA-w4hf-cr3w-6h79 — IPv4-mapped loopback peer-protection bypass | **CONFIRMED AFFECTED** | Authenticated TURN clients can relay to host loopback; Likecord's TURN endpoint and relay range are public and credentials are issued to users | High | **URGENT** | 4.13.0; current 4.17.2 | [Vendor advisory](https://github.com/coturn/coturn/security/advisories/GHSA-w4hf-cr3w-6h79) |
| coturn | declared 4.6 line | GHSA-2x4g-wx24-48m4 — peer ACL canonicalization/scope bypass | **CONFIRMED AFFECTED** version; topology impact varies | No explicit peer ACL is present, but it reinforces that the public 4.6 relay lacks current address-validation fixes | Moderate | **URGENT** with coturn line | 4.13.1; current 4.17.2 | [Vendor advisory](https://github.com/coturn/coturn/security/advisories/GHSA-2x4g-wx24-48m4) |
| `@nestjs/core` | 10.4.22 | CVE-2026-35515 / GHSA-36xv-jgw5-4q75 — newline injection in SSE event type/id | Version affected; Likecord **NOT AFFECTED** | No `@Sse`, `SseStream`, or SSE endpoint exists | Moderate | **NO ACTION** for advisory; lifecycle is separately BEFORE-RC | 11.1.18+ | [Vendor advisory](https://github.com/nestjs/nest/security/advisories/GHSA-36xv-jgw5-4q75) |
| Multer | 2.0.2 transitive from Nest platform-express | Five advisories; representative CVE-2026-5079 / GHSA-72gw-mp4g-v24j nested-field multipart DoS | Version affected; **LIKELY NOT REACHABLE** | Likecord does not use FileInterceptor, Multer, or ParseFilePipe; upload code reads the raw request and applies custom byte validation | High | **NO ACTION** for advisory; remove/fix through planned Nest/runtime-surface work | 2.2.0 | [GHSA-72gw-mp4g-v24j](https://github.com/advisories/GHSA-72gw-mp4g-v24j), [Multer changelog](https://github.com/expressjs/multer/blob/main/CHANGELOG.md) |
| `file-type` | 20.4.1 transitive from Nest common | Two parser DoS advisories, including CVE-2026-32630 / GHSA-j47w-4g3g-c36v | Version affected; **LIKELY NOT REACHABLE** | No FileTypeValidator or `file-type` call exists; Likecord uses its own magic-byte validator | Moderate | **NO ACTION** for advisory | 21.3.2+ | [GHSA-j47w-4g3g-c36v](https://github.com/advisories/GHSA-j47w-4g3g-c36v) |
| nanoid | 3.3.14 direct declaration | CVE-2026-67214 / GHSA-28wg-ghj8-5hjv and related invalid-size generator DoS | Version affected; **LIKELY NOT REACHABLE** | No source import/use of nanoid was found | High | **NO ACTION** for advisory; remove unused declaration during a normal dependency cleanup | 3.3.18+ for both reported 3.x issues | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) |
| `ws` | 8.17.1 below `socket.io-client` 4.7.5; API server path has 8.21.0 | GHSA-58qx-3vcg-4xpx and GHSA-96hv-2xvq-fx4p | Version affected; **LIKELY NOT REACHABLE** | The affected copy is the Node fallback under the web client; browsers use native WebSocket, and the standalone web runner does not invoke it as a server | Moderate/high | **NO ACTION** for current runtime; align Socket.IO client in Phase B | 8.21.0+ (8.21.1 includes follow-up limits) | [ws security history](https://github.com/websockets/ws/security), [ws releases](https://github.com/websockets/ws/releases) |
| PostCSS | 8.4.31 under Next | Four source-map/XSS/path disclosure advisories, latest through GHSA-fxqj-rqcc-2cmp | Version affected; **LIKELY NOT REACHABLE** | Build-time CSS processing of trusted repository input; not a public parser in the standalone runtime | Moderate | **NO ACTION** as a standalone override; disappears with supported Next | 8.5.23+ | [Vendor advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp), [PostCSS releases](https://github.com/postcss/postcss/releases) |
| `body-parser` / `qs` | 1.20.4 / 6.14.2 | Invalid `limit` enforcement and specialized `qs.stringify` crash | **NOT AFFECTED** / **LIKELY NOT REACHABLE** | Likecord does not set an invalid body-parser limit or call the vulnerable stringify mode | Low/moderate | **NO ACTION** | Upstream fixed lines | Local audit plus repository configuration search |
| `brace-expansion`, `js-yaml`, `tmp`, `glob`, webpack, Ajv, picomatch, fast-uri | Multiple dev/config paths | ReDoS, parser/CPU, temporary-file, and tooling findings | Version ranges affected; **LIKELY NOT REACHABLE** | Lint/build/test/config paths processing trusted project input; some appear in the production audit because workspace config packages declare them as dependencies and the API image copies the entire root store | Up to high | **NO ACTION** as individual runtime findings; runtime pruning is BEFORE-RC | Varies | Local audit, lockfile parent paths, Dockerfile copy behavior |

The 21 Next.js registry advisories were: GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj, GHSA-3g8h-86w9-wvmq, GHSA-ffhc-5mcf-pf4q, GHSA-vfv6-92ff-j949, GHSA-gx5p-jg67-6x7h, GHSA-h64f-5h5j-jqjh, GHSA-c4j6-fc7j-m34r, GHSA-wfc6-r584-vfw7, GHSA-36qx-fr4f-26g5, GHSA-m99w-x7hq-7vfj, GHSA-89xv-2m56-2m9x, GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q, GHSA-4c39-4ccg-62r3, GHSA-p9j2-gv94-2wf4, and GHSA-955p-x3mx-jcvp. Installed 14.2.35 is in every reported affected range.

## Runtime / Framework Lifecycle

| Runtime/framework | Status on 2026-08-27 | Current supported stable line(s) | Latest appropriate stable target | Change type | Relevant breaking-change risk | Official evidence |
|---|---|---|---|---|---|---|
| Node.js | 20 is EOL and receives no security patches | 24 LTS and 22 LTS; 26 is Current, not LTS | Node 24.20.0 LTS | Major | Native modules (`argon2`), OpenSSL/CA behavior, image distro differences, Prisma engines, build output | [Release schedule](https://nodejs.org/en/about/previous-releases), [EOL consequences](https://nodejs.org/en/about/eol) |
| Next.js | 14 unsupported | 16 Active LTS; 15 Maintenance LTS | 16.3.3; 15.5.24 only as a short-lived supported bridge | Major | 14→15→16 router/cache behavior, async request APIs, build defaults, image defaults, lint removal; must retest rewrite and standalone output | [Support policy](https://nextjs.org/support-policy), [upgrade guides](https://nextjs.org/docs/app/guides/upgrading), [August security release](https://nextjs.org/blog/august-2026-security-release) |
| React / React DOM | 18 is the previous documented major | 19.2 is current | Matching current React 19.2 patch with supported Next | Major | Rendering/hydration behavior, typings, ref handling, tests; coordinate with Next rather than change alone | [Versions](https://react.dev/versions), [React 19.2](https://react.dev/blog/2025/10/01/react-19-2) |
| NestJS | 10 is a legacy major and misses later transitive/security maintenance | 12 is current stable | Current stable 12.x | Major | v12 packages are ESM; CLI/schematics require Node 22.22.3+, 24.15+, or 26; framework packages must move together; test/bootstrap assumptions need review | [Migration guide](https://docs.nestjs.com/migration-guide) |
| Prisma | 5.22 is materially behind; no authoritative per-major EOL table was found | Prisma 7 is current GA and fully supported; Prisma 8 is RC | Stage through latest stable 6.x, then stable 7.10.0; do not use v8 RC | Two majors, staged | v6 Node/TS floors, PostgreSQL implicit m-n metadata, `Bytes` and error types; v7 ESM/config/driver-adapter/client generation changes. Likecord has no preview features or `Bytes`, and uses an explicit `MemberRole` join model, reducing some v6 risk | [Upgrade to v6](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v6), [older-version summary](https://docs.prisma.io/docs/orm/v6/more/upgrades/older-versions), [Prisma 7 status](https://www.prisma.io/docs), [Prisma 8 RC](https://www.prisma.io/docs/v8) |
| Socket.IO | Server 4.8.3 is current; client 4.7.5 is behind; parser lock is vulnerable | Current stable 4.x | Keep server major; resolve parser 4.2.7 and align client to 4.8.3 | Patch/transitive + client minor | Binary attachment limits changed for security; exercise realtime, reconnection, binary/event tests | [Security history](https://github.com/socketio/socket.io/security), [parser advisory](https://github.com/socketio/socket.io/security/advisories/GHSA-2m8v-j782-fhvr) |
| AWS SDK for JavaScript | v3 is active and the installed packages are only a few releases behind | v3 | Remain on v3; normal patch/minor cadence, not an emergency major change | Patch/minor | AWS v3 releases frequently; confirm R2 compatibility and Node floor in routine maintenance | [AWS v3 docs](https://docs.aws.amazon.com/sdk-for-javascript/), [v3 Node/TS policy](https://github.com/aws/aws-sdk-js-v3) |
| PostgreSQL | Major 15 supported | 15–18 supported; latest major 18 | Keep 15 and ensure current minor 15.19 | Minor only | PostgreSQL says minor updates are lower risk than remaining behind; 15.19 has security/config notes but no dump/restore requirement | [Version policy](https://www.postgresql.org/support/versioning/), [15.19 notes](https://www.postgresql.org/docs/release/15.19/) |
| Redis OSS | `redis:7-alpine` currently maps to supported 7.4.11 | 7.4 is Extended GA to 2029; newer 8.x exists | Keep 7.4 current patch | Patch only | No major migration need; verify persistence/compatibility when refreshing the image | [OSS lifecycle](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/) |
| Caddy | `2-alpine` currently maps to current 2.11.4 | 2.x | Keep current 2.11.x | Patch/minor only | Validate Caddyfile and TLS behavior on routine refresh | [Caddy releases](https://github.com/caddyserver/caddy/releases), [official image](https://hub.docker.com/_/caddy/) |
| coturn | 4.6 is obsolete and confirmed within affected ranges | Current stable 4.17.2 | 4.17.2 or later stable 4.x image revision | Multi-release jump within 4.x | TURN CLI defaults and security hardening changed; validate static-auth credentials, UDP/TCP/TLS listeners, external IP, relay range, quotas, browser ICE fallback | [Releases](https://github.com/coturn/coturn/releases), [Docker changelog](https://github.com/coturn/coturn/blob/master/docker/coturn/CHANGELOG.md) |
| pnpm | Manifest pins 9.15.4, but Docker ignores it; no formal pnpm major-support table found | 11.24.0 current stable; 12 is RC | First make Docker honor an exact compatible stable version; Phase B may choose latest 9.15.x or test 11.24.0 | Patch or major depending decision | Lockfile format, peer resolution, Corepack/runtime compatibility; pnpm 12 must not be selected because it is prerelease | [pnpm releases](https://github.com/pnpm/pnpm/releases) |

## Container / Supply Chain Review

### Image and build inputs

| Input | Declared reference | Audit result |
|---|---|---|
| API base/runner | `node:20-slim` | Official but EOL runtime; mutable tag; no digest |
| Web base/runner | `node:20-alpine` | Official but EOL runtime; mutable tag; no digest |
| PostgreSQL + backup | `postgres:15-alpine` | Supported major, currently maps to 15.19; mutable tag; no digest |
| Redis | `redis:7-alpine` | Supported 7.4 line, currently maps to 7.4.11; mutable tag; no digest |
| Caddy | `caddy:2-alpine` | Current 2.11.4 line; mutable tag; no digest |
| coturn | `coturn/coturn:4.6` | Obsolete application line, mutable within 4.6; no digest |
| Likecord staging apps | GHCR repo + required `${STAGING_TAG}` | Uses explicit release-like tag, never `latest`; supplied package is operationally immutable, but a tag is not cryptographically immutable and deployed digest was not inspected |

Docker's own guidance confirms that tags are mutable and digest references are reproducible, while also warning that digest pins require an intentional refresh workflow to receive security fixes. The appropriate RC posture is a versioned tag plus digest (or a release manifest recording the resolved digest) with automated update alerts—not an indefinitely frozen digest. Evidence: [Docker build best practices](https://docs.docker.com/build/building/best-practices/) and [image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/).

### Build/runtime construction

- Both application Dockerfiles are multi-stage. The Web runner uses Next standalone output, which is a good production-surface reduction.
- The API runner is not minimal despite its comment: it copies the complete API workspace directory, root pnpm store, and every workspace package after a full workspace install. It does not perform a production-only deploy/prune. Dev/config/tool packages therefore remain physically present even when not executable through the API.
- Both builders perform a frozen install in `deps`, copy the full repository, then perform another frozen install. The builds run `npm i -g pnpm` without a version in both dependency and builder stages, bypassing `packageManager: pnpm@9.15.4`. This makes future builds dependent on whatever npm serves and may select a pnpm major incompatible with lockfile 9.
- Neither application runner declares `USER`; both therefore run as root. No Compose-level user override, `read_only`, `cap_drop`, or `security_opt` is present. Infrastructure image users could not be verified without inspecting pulled images, so their effective users are **INCONCLUSIVE**.
- There is no `privileged: true`, `cap_add`, host PID/IPC/network mode, or Docker socket mount in either Compose file. No container has direct Docker daemon control.

### Secrets and Docker context

- Application and infrastructure secrets are supplied at runtime through Compose environment interpolation or the local `.env` file. No Docker build `ARG`, secret value, or credential-copy instruction was found. Secret values are intentionally not reproduced here.
- The root `.dockerignore` excludes exact `.env`, `.env.local`, `secrets`, backups, VCS data, dependencies, build outputs, docs, and logs.
- Coverage does not match `.gitignore`: `.gitignore` excludes `.env.*` and `cookies.txt`, while `.dockerignore` does not exclude `.env.production`, `.env.staging`, other environment variants, or `cookies.txt`. Ignored local files matching these patterns existed during the audit. Because builders execute `COPY . .`, those files can enter the builder context/layers or a remote builder/cache even though the current runners copy narrower outputs. This is a confirmed context-control gap; no secret contents were read or disclosed.

### Network, health, restart, and persistence

- Staging exposes only Caddy on 80/443 and coturn on 3478 TCP/UDP, 5349 TCP, and UDP relay ports 49152–49200. Web, API, PostgreSQL, and Redis have no staging host-port publication. `data_net` is internal in staging, and coturn is isolated on `turn_net`.
- Local Compose binds PostgreSQL and Redis to loopback. Caddy and coturn are public on their declared host ports. Local Web/API use anonymous port publishing (`"3000"`/`"3001"`), which can bind a random host port on all interfaces; this is a local-development exposure, not staging evidence.
- Staging Web, API, PostgreSQL, and Redis have healthchecks; Caddy and coturn do not. Local PostgreSQL and Redis have healthchecks, while local app/edge/TURN services do not.
- All services use `restart: unless-stopped`. Staging dependencies gate on Web/API/database health where appropriate.
- PostgreSQL, Redis (local), uploads (staging), and Caddy data/config are persisted in named volumes. The local backup service persists backup output via a bind mount and runs root's cron file. Staging has no backup service in this Compose document; backup policy is outside the evidence available here.

### Supply-chain evidence

- Positive: frozen lockfile installs, integrity-pinned package lock, explicit GHCR app tags, prebuilt staging images, no `latest` app tag, no staging build from the VPS working tree, and no Docker socket/privileged containers.
- Missing from repository evidence: retained SBOMs, image vulnerability scan gates, signed image/provenance verification, base-image digest records, dependency review policy, and a package release-age control. These are release-process gaps, not proof that an image is compromised.
- Docker daemon access was denied from the audit environment. `docker inspect`, deployed image IDs/digests, effective users, and live health state are therefore **INCONCLUSIVE**. Declared Compose/Dockerfile evidence is conclusive; live staging state was not accessed, as required.

## Risk Matrix

| ID | Component | Finding | Evidence quality | Impact | Likelihood | Primary classification | Required before | Suggested direction |
|---|---|---|---|---|---|---|---|---|
| R-01 | Node.js | API and Web use EOL Node 20 | **CONFIRMED** | High: future runtime flaws receive no fixes | High/certain support gap | **URGENT** | More feature work / F.4 | Move build and runtime together to current LTS Node 24 and retest native/runtime behavior |
| R-02 | Next.js | 14.2.35 is unsupported and inside numerous advisory ranges, including a new critical version range | **CONFIRMED** version/support; AVIF trigger **INCONCLUSIVE** | Critical/high | Medium-high due public web/App Router | **URGENT** | More feature work / F.4 | Move to patched supported line; prefer 16.3.3, with 15.5.24 only as a bridge if necessary |
| R-03 | Socket.IO parser | 4.2.6 public parser has unauthenticated memory-exhaustion issue | **CONFIRMED** | High availability impact | High: public low-complexity input | **URGENT** | More feature work / F.4 | Resolve 4.x parser to 4.2.7 and regression-test realtime/binary parsing |
| R-04 | coturn | Public 4.6 line lacks peer/loopback protections fixed in later stable releases | **CONFIRMED** range and reachable authenticated service | Host-local/internal relay exposure; availability/confidentiality follow-on | Medium: requires Likecord TURN credentials | **URGENT** | More feature work / F.4 | Move to a current stable immutable coturn image revision and validate TURN paths |
| R-05 | React | 18.3.1 is previous major and coupled to the unsupported Next stack | **CONFIRMED** | Medium compatibility/maintenance risk | Medium over release horizon | **BEFORE-RC** | RC | Coordinate React 19.2 with supported Next; do not upgrade alone |
| R-06 | NestJS | v10 is legacy and carries affected-but-unused transitive packages | **CONFIRMED** version; exploit paths largely absent | Medium maintenance/security drift | Medium | **BEFORE-RC** | RC | Coordinated Nest 12 migration after Node LTS; retest API, WS, upload, and tests |
| R-07 | Prisma | 5.22 is two GA majors behind; v8 is RC | **CONFIRMED** version and official GA/RC status | Medium future compatibility/support risk | Medium | **BEFORE-RC** | RC | Stage stable 5→6→7 with schema/client/migration validation; never jump to RC |
| R-08 | pnpm/build | Docker installs unversioned pnpm, ignoring exact packageManager and repeating install | **CONFIRMED** | High reproducibility/build-break risk | High on future rebuild | **BEFORE-RC** | RC; preferably with urgent runtime rebuild | Make builders honor one exact compatible stable pnpm and one frozen dependency graph |
| R-09 | Base/infra images | Major-only mutable tags and no retained deployed digests | **CONFIRMED** declarations; deployed digest **INCONCLUSIVE** | Medium supply-chain/auditability risk | Medium | **BEFORE-RC** | RC | Record/pin reviewed digests with automated refresh alerts and rollback metadata |
| R-10 | API runtime image | Entire workspace dependency store and packages ship; no production prune | **CONFIRMED** | Medium attack surface and scanner noise | Medium | **BEFORE-RC** | RC | Produce a runtime-only API dependency set while preserving pnpm workspace links |
| R-11 | App container identity | API and Web runners execute as root | **CONFIRMED** | High if an app exploit succeeds | Medium | **BEFORE-RC** | RC | Add explicit non-root runtime users and verify volume ownership/startup |
| R-12 | Docker build context | `.dockerignore` misses `.env.*` variants and `cookies.txt` while builder copies `.` | **CONFIRMED** | Potential secret/context disclosure to layers/cache/builders | Medium | **BEFORE-RC** | RC; fix alongside image rebuild | Align secret/credential patterns and narrowly scope build context |
| R-13 | Release evidence | No retained SBOM, image scan gate, signature/provenance verification, or digest manifest | **CONFIRMED** repository absence | Medium incident response and supply-chain assurance gap | Medium | **BEFORE-RC** | RC | Generate/retain SBOMs, scan release images, and verify provenance/signatures |
| R-14 | Container defense in depth | Caddy/coturn healthchecks and read-only/capability/resource hardening are incomplete | **CONFIRMED** | Low-medium resilience impact | Low-medium after urgent fixes | **POST-1.0** | After 1.0 | Add measured health/resource/read-only/cap-drop controls without breaking low-port/TURN operation |
| R-15 | General modernization | ioredis 6 and newer TypeScript/Turbo/Jest exist without an applicable blocker | **CONFIRMED** newer stable releases; no urgent advisory | Low | Low | **POST-1.0** | After 1.0 | Modernize only in isolated, value-driven maintenance stages |
| R-16 | PostgreSQL | Major 15 is supported; tag currently maps to current 15.19 | **CONFIRMED** policy; deployed patch **INCONCLUSIVE** | Low if current patch is pulled | Low | **NO ACTION** | None beyond normal patch cadence | Keep 15; verify/record current minor digest |
| R-17 | Redis | Tag currently maps to supported 7.4.11 Extended GA | **CONFIRMED** policy; deployed patch **INCONCLUSIVE** | Low | Low | **NO ACTION** | None beyond normal patch cadence | Keep Redis 7.4; no major jump for novelty |
| R-18 | Caddy | Caddy 2 tag currently maps to current 2.11.4 | **CONFIRMED** | Low | Low | **NO ACTION** | None beyond normal refresh | Keep Caddy 2; record digest and refresh intentionally |
| R-19 | AWS SDK v3 | Active line, only a few releases behind, no applicable audit finding | **CONFIRMED** | Low | Low | **NO ACTION** | None | Retain v3 and normal patch/minor maintenance |
| R-20 | Non-reachable package advisories | Nest SSE, Multer, file-type, nanoid, browser-client `ws`, PostCSS, body-parser/qs, and tooling findings lack Likecord runtime paths | **CONFIRMED** versions; **NOT AFFECTED/LIKELY NOT REACHABLE** paths | Low practical exposure | Low | **NO ACTION** | None as standalone emergency work | Let supported framework updates/pruning remove them; avoid indiscriminate overrides |
| R-21 | App image/deployment controls | Explicit staging tags, runtime secret injection, internal data network, persistence, no privileged/socket mounts | **CONFIRMED** configuration and supplied immutable-package status | Positive control | N/A | **NO ACTION** | Preserve | Keep immutable release-tag/rollback discipline and avoid build-time secrets |

**Risk-matrix totals:** URGENT 4; BEFORE-RC 9; POST-1.0 2; NO ACTION 6.

## Known Preliminary Concerns — VERIFIED RESULT

### Node runtime support

**VERIFIED: URGENT.** Node 20 reached EOL on 2026-03-24. Both final application images declare Node 20; this is not merely a development engine constraint. The appropriate production target is the current LTS, Node 24.20.0, not Current Node 26.

### Next.js major support

**VERIFIED: URGENT.** Next.js 14 is listed as unsupported. Installed 14.2.35 is in all 21 Next advisory ranges returned by the registry and in both vendor critical ranges published on 2026-08-25. The Windows-only critical is **NOT AFFECTED** by Linux staging. The AVIF critical is version-confirmed but practical reachability is **INCONCLUSIVE**. Other App Router/RSC/rewrite families are materially closer to Likecord's actual architecture, so “no `next/image` imports” does not make the major safe.

### Prisma 5.22 status and appropriate stable path

**VERIFIED: BEFORE-RC, not URGENT.** Prisma 5.22.0 is materially behind current GA Prisma 7, but the read-only audit found no Prisma package advisory. Prisma does not publish a clear per-major support/EOL table that proves v5 is presently unpatched. The safe planning input is a tested stable 5→latest 6.x→7.10.0 sequence, not a direct speculative jump. Likecord has no preview features or `Bytes` fields and uses an explicit join model, which removes several known v6 schema hazards; its generator binary targets and v7 client/config architecture still require deliberate validation.

### Prisma RC warning seen during migrate status

**VERIFIED RESULT: the warning must not drive an RC upgrade.** Official current documentation says Prisma 8 is a Release Candidate and Prisma 7 remains fully supported. The exact earlier terminal warning and its CLI/registry context are not versioned, so reproducing its wording is **INCONCLUSIVE**. Whether it displayed an RC due a registry channel or a package-name transition, it is not authoritative evidence that the RC is the correct production target.

### Mutable Docker base tags

**VERIFIED: BEFORE-RC reproducibility concern.** Every declared base/infra tag is mutable and no digest is recorded. This does not make supported PostgreSQL/Redis/Caddy majors unsafe; it means the exact artifact cannot be reconstructed or attested from Git alone. Digest pinning materially improves reproducibility only when paired with an update cadence, scanning, and reviewed digest changes.

### Confirmed production dependency advisories

**VERIFIED:** `socket.io-parser` 4.2.6 is the clearest confirmed-and-reachable production package vulnerability and is **URGENT**. Next.js 14.2.35 is confirmed within numerous production advisory ranges and unsupported, also **URGENT**, though individual feature prerequisites vary. The Next AVIF critical is version-confirmed/reachability-inconclusive; the Windows critical is not applicable. coturn is an infrastructure image rather than a JavaScript package, but its 4.6 line is confirmed affected and publicly reachable with authenticated credentials. Other production-scan entries are not presently mapped to a vulnerable runtime path and are not independent emergency blockers.

## Safe-to-Defer List

The following should not be changed merely because a newer version exists:

- PostgreSQL 15 → 18: keep supported major 15 and current minor patching.
- Redis 7.4 → 8.x: keep the Extended GA line through the release horizon.
- Caddy 2 → any novelty-driven alternative: current major and patch line are appropriate.
- AWS SDK v3 packages: remain on v3; normal small patch/minor maintenance is sufficient.
- ioredis 5 → 6: v6 changes the default protocol to RESP3 and requires Node 20+, but no current advisory requires the major before RC.
- TypeScript, Turbo, Jest, Babel-Jest, and general test-tool modernization: isolate after 1.0 unless a supported framework migration requires a narrow compatibility change.
- Prisma 8 RC: do not adopt prerelease software for this release.
- Standalone overrides for Multer, `file-type`, nanoid, PostCSS, `ws`, `body-parser`, `qs`, or lint/config transitive packages solely to silence counts: first remove unused code/packages, update supported parents, and prune runtime dependencies in planned stages.
- Broad container hardening that is not required for root removal or secret/build-context safety (for example, exhaustive read-only filesystem/capability tuning): measure and stage after 1.0 so TURN/Caddy behavior is not broken blindly.

## Phase B Inputs

Phase B must use these facts without reclassifying “newer” as automatically “safer”:

1. Feature work should remain paused until R-01 through R-04 have decisioned, tested remediation microstages.
2. The Socket.IO parser fix is a targeted 4.x resolution to 4.2.7; the client can be aligned to 4.8.3 in the same compatibility-tested stage. No Socket.IO major is required.
3. coturn must leave the 4.6 line. Select a concrete current stable 4.17.2 image revision/digest and validate browser ICE/TURN TCP/UDP/TLS, external IP, relay range, quotas, and static-auth-secret behavior.
4. Move both build and runtime images together from Node 20 to Node 24 LTS. Validate native `argon2`, Prisma engines, OpenSSL/CA behavior, healthchecks, and standalone output.
5. The Next/React stage should target supported patched Next 16.3.3 with a matching React 19.2 patch. A patched 15.5.24 bridge is acceptable only if Phase B documents why the direct supported target cannot yet pass.
6. Make Docker honor an exact compatible stable pnpm before rebuilding. pnpm 12 is RC; do not select it. Decide separately whether to stay on the last 9.x patch for minimal change or validate pnpm 11.24.0.
7. Before RC, stage Nest 12 as a coordinated package family and Prisma through stable v6 then v7.10.0, with API/realtime/upload/E2E and migration/schema validation at each boundary.
8. Before RC, close `.dockerignore` credential-pattern gaps, produce a production-only API image, set non-root users, record reviewed base/infra digests, and retain SBOM/scan/provenance evidence.
9. Preserve supported PostgreSQL 15, Redis 7.4, Caddy 2, AWS SDK v3, immutable GHCR release tags, runtime-only secret injection, the staging internal data network, volumes, healthchecks, and rollback discipline.
10. Exact currently deployed infrastructure/app image digests must be captured by the authorized deployment process in Phase B; this Phase A intentionally did not access staging.

## Requirement Completion

| Requirement | Status | Evidence |
|---|---|---|
| REQ-01 — Establish exact installed/runtime inventory | **DONE** | Manifests, lockfile, installed metadata, Dockerfiles, both Compose files, ignores, configs, source reachability, and read-only full/production audit scans were inspected; dependency-tree CLI limitation is explicitly recorded. |
| REQ-02 — Verify current lifecycle/security status externally | **DONE** | Current official lifecycle/release sources and vendor/GitHub advisories were checked as of 2026-08-27; prereleases are distinguished and affected ranges/reachability are normalized. |
| REQ-03 — Produce evidence-based risk matrix without upgrades | **DONE** | This report contains only URGENT, BEFORE-RC, POST-1.0, and NO ACTION classifications, with counts, required timing, evidence quality, defer list, and Phase B facts. |

No dependency, runtime, image, source file, schema, migration, deployment, or environment was changed during this audit.
