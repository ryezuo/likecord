# Likecord Pre-F.4 Runtime and Security Remediation Plan

**Plan date:** 2026-08-27
**Plan status:** Phase B complete; implementation not started
**Audit branch:** `historical pre-F.4 runtime security audit`

## Baseline

Checkpoint:

`channel and category permissions milestone`

Phase A audit:

`docs/security/dependency-runtime-audit-2026-08-27.md`

Phase A is authoritative. Phase B performed only targeted verification needed to freeze exact production-stable targets and breaking boundaries. No new evidence contradicted a Phase A finding. Registry tags were not treated as proof of production suitability: prereleases were excluded, Node 26 Current was excluded, and Prisma 8 remained excluded even though registry state around that line is ambiguous.

### Target verification snapshot

| Decision surface | Targeted evidence used on 2026-08-27 |
|---|---|
| Node 24 exact images | [Node official Docker tags](https://hub.docker.com/_/node/tags?name=24.20.0), including `24.20.0-bookworm-slim` and `24.20.0-alpine3.24`; [Node release policy](https://nodejs.org/en/about/previous-releases) |
| Next/React | [Next support policy](https://nextjs.org/support-policy), [Next 16.3.3 package](https://www.npmjs.com/package/next), [React versions](https://react.dev/versions), and exact npm stable metadata for React/DOM/types |
| Socket.IO | [GHSA-2m8v-j782-fhvr](https://github.com/socketio/socket.io/security/advisories/GHSA-2m8v-j782-fhvr) and exact npm stable metadata for parser/client |
| coturn | [official coturn image tags](https://hub.docker.com/r/coturn/coturn/tags) and [coturn releases](https://github.com/coturn/coturn/releases), which identify `4.17.2-r0` as the concrete Docker release |
| Nest | [Nest migration guide](https://docs.nestjs.com/migration-guide) and exact registry metadata/peer ranges for the runtime, testing, auth, CLI, and schematics packages |
| Prisma | [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [Prisma Client setup](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction), and exact stable registry metadata for 6.19.3/7.10.0 and the PostgreSQL adapter |
| pnpm | [pnpm releases](https://github.com/pnpm/pnpm/releases) plus exact registry engines: stable 11.24.0 is optional and 12 is prerelease; neither is needed by the selected targets |

## Phase A Findings

- URGENT: 4
- BEFORE-RC: 9
- POST-1.0: 2
- NO ACTION: 6

The counts are classifications, not stage counts. Some BEFORE-RC controls execute early because they are prerequisites for safe urgent builds; their Phase A classification does not change.

## Release Decision

**Can F.4 start now? NO.**

F.4 unlocks only after all of the following objective conditions hold:

1. `socket.io-parser` resolves to exactly `4.2.7` on every public server/browser runtime path, no `4.2.6` runtime copy remains, Socket.IO server and clients are on `4.8.3`, and the specified realtime regression passes.
2. both Compose definitions use `coturn/coturn:4.17.2-r0`, and a real staging browser/device test proves authenticated UDP relay, TCP fallback where available, Voice, and Screen Share without unexpected loopback/internal peer relay.
3. API build/runtime use `node:24.20.0-bookworm-slim`; Web build/runtime use `node:24.20.0-alpine3.24`; the workspace Node engine and Node typings align to Node 24; native `argon2`, Prisma, Nest, Next standalone, TLS/CA, R2, ICE, and health checks pass.
4. Web resolves exactly `next@16.3.3`, `react@19.2.8`, `react-dom@19.2.8`, `@types/react@19.2.18`, and `@types/react-dom@19.2.5`; no Next 15 bridge is introduced; the full frontend regression passes.
5. every new build used exact `pnpm@9.15.4`, and `.dockerignore` excluded `.env.*` and `cookies.txt` before any new remediation image was built.
6. all automated checks, risk-based local regression, and the integrated read-only dependency audit pass; there is no newly introduced reachable high/critical advisory and no registry critical advisory.
7. one Git checkpoint and one immutable, digest-recorded API/Web GHCR image package are deployed to staging, all required staging checks pass, and the previous app image tags plus coturn reference remain immediately rollback-capable.

Until every condition passes, F.4 remains blocked. A failed condition stops the sequence; it is not waived by a successful build or by lower raw audit counts.

## Decision Matrix

| Finding | Classification | Action | Exact target | Deadline | Microstage | Blocks F.4? | Blocks RC? |
|---|---|---|---|---|---|---|---|
| R-01 | URGENT | UPGRADE | Node `24.20.0`; API `node:24.20.0-bookworm-slim`; Web `node:24.20.0-alpine3.24`; `@types/node@24.13.3` | BEFORE-F4 | `RUNTIME-NODE-01` | Yes | Yes |
| R-02 | URGENT | UPGRADE | `next@16.3.3` directly, without a Next 15 bridge | BEFORE-F4 | `WEB-NEXT-01` | Yes | Yes |
| R-03 | URGENT | UPGRADE | `socket.io@4.8.3`, both clients `4.8.3`, root override `socket.io-parser=4.2.7` | BEFORE-F4 | `SEC-WS-01` | Yes | Yes |
| R-04 | URGENT | UPGRADE | `coturn/coturn:4.17.2-r0` in local and staging Compose | BEFORE-F4 | `SEC-TURN-01` | Yes | Yes |
| R-05 | BEFORE-RC | UPGRADE | `react@19.2.8`, `react-dom@19.2.8`, React types `19.2.18`/`19.2.5` | BEFORE-RC | `WEB-NEXT-01` | Yes, because coupled to R-02 | Yes |
| R-06 | BEFORE-RC | UPGRADE | Nest runtime/testing family `12.0.1`; CLI/schematics/passport `12.0.0`; JWT `12.0.1`; required TS `6.0.3` + typescript-eslint `8.68.0` | BEFORE-RC | `RUNTIME-NEST-01` | No | Yes |
| R-07 | BEFORE-RC | UPGRADE | Prisma `5.22.0` -> `6.19.3` -> `7.10.0`, as two boundaries; no Prisma 8 | BEFORE-RC | `DATA-PRISMA-06`, `DATA-PRISMA-07` | No | Yes |
| R-08 | BEFORE-RC | HARDEN | keep exact `pnpm@9.15.4`; install it once per Docker build family; frozen lockfile | BEFORE-RC | `SEC-BUILD-01` | No by classification; prerequisite to F.4 images | Yes |
| R-09 | BEFORE-RC | HARDEN | versioned base/infra tags pinned to reviewed multi-arch digests with a retained manifest | BEFORE-RC | `SUPPLY-CHAIN-01` | No | Yes |
| R-10 | BEFORE-RC | HARDEN | production-only API dependency closure; no full workspace dev store in runner | BEFORE-RC | `CONTAINER-API-01` | No | Yes |
| R-11 | BEFORE-RC | HARDEN | API and Web run as UID/GID `1000:1000`; writable paths explicitly owned | BEFORE-RC | `CONTAINER-USER-01` | No | Yes |
| R-12 | BEFORE-RC | HARDEN | `.dockerignore` adds `.env.*` and `cookies.txt`, with required-input verification | BEFORE-RC | `SEC-BUILD-01` | No by classification; prerequisite to first image | Yes |
| R-13 | BEFORE-RC | HARDEN | SPDX JSON SBOM, image scan policy, keyless signature/provenance verification, digest manifest | BEFORE-RC | `SUPPLY-CHAIN-01` | No | Yes |
| R-14 | POST-1.0 | HARDEN | measured Caddy/coturn health, read-only, capability, and resource controls | POST-1.0 | Post-1.0 backlog | No | No |
| R-15 | POST-1.0 | MONITOR | keep ioredis 5 and current general tooling until isolated value-driven audits | POST-1.0 | Post-1.0 backlog | No | No |
| R-16 | NO ACTION | ACCEPT | preserve PostgreSQL 15; normal patch/digest refresh only | NONE | `SUPPLY-CHAIN-01` records only | No | No |
| R-17 | NO ACTION | ACCEPT | preserve Redis 7.4; normal patch/digest refresh only | NONE | `SUPPLY-CHAIN-01` records only | No | No |
| R-18 | NO ACTION | ACCEPT | preserve Caddy 2; normal patch/digest refresh only | NONE | `SUPPLY-CHAIN-01` records only | No | No |
| R-19 | NO ACTION | ACCEPT | preserve AWS SDK for JavaScript v3 | NONE | None | No | No |
| R-20 | NO ACTION | ACCEPT | no emergency overrides; supported parents/pruning may remove non-reachable paths | NONE | Incidental only | No | No |
| R-21 | NO ACTION | ACCEPT | preserve explicit app tags, runtime secrets, internal data network, volumes, no privileged/socket mounts | NONE | All release stages preserve | No | No |

## Detailed Decisions

### R-01

- **Finding ID:** R-01
- **Component:** Node.js API and Web build/runtime
- **Phase A classification:** URGENT
- **Evidence quality:** CONFIRMED
- **ACTION:** UPGRADE
- **CURRENT:** API `node:20-slim`; Web `node:20-alpine`; root engine `>=20.0.0`; resolved Node typings `20.19.43`
- **TARGET:** Node `24.20.0` LTS; API base/runner `node:24.20.0-bookworm-slim`; Web base/runner `node:24.20.0-alpine3.24`; root engine `>=24.20.0 <25`; every workspace `@types/node` exactly `24.13.3`
- **TARGET TYPE:** MAJOR
- **DEADLINE:** BEFORE-F4
- **WHY NOW:** Node 20 is EOL and both production runners use it.
- **WHY THIS TARGET:** 24.20.0 is the current supported LTS, exact official image tags exist, and it satisfies Next 16, Prisma 7, Nest 12, pnpm 9, and current package engine floors.
- **WHY NOT A NEWER TARGET:** Node 26 is Current rather than the production LTS selected by policy; `@types/node` stays on the matching 24 line rather than latest 26.
- **SECURITY MOTIVATION:** Restore supported runtime security servicing and remove mutable major-only bases from the urgent path.
- **COMPATIBILITY MOTIVATION:** Move API/Web build and runtime together; local metadata permits Node 24 for `argon2@0.41.1` and Prisma 5, while image tests must prove native binary, OpenSSL/CA, Prisma engines, Nest startup, Next standalone, R2, and ICE behavior.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-02

- **Finding ID:** R-02
- **Component:** Next.js
- **Phase A classification:** URGENT
- **Evidence quality:** CONFIRMED version/support; AVIF trigger INCONCLUSIVE
- **ACTION:** UPGRADE
- **CURRENT:** `next@14.2.35`
- **TARGET:** exactly `next@16.3.3`
- **TARGET TYPE:** MAJOR
- **DEADLINE:** BEFORE-F4
- **WHY NOW:** 14.x is unsupported and the installed version is within multiple vendor/registry advisory ranges.
- **WHY THIS TARGET:** 16.3.3 is the patched stable supported line verified on the plan date; the app uses App Router, layouts/pages, rewrites, cookie auth, client hydration, and standalone output that can be directly regression-tested.
- **WHY NOT A NEWER TARGET:** no newer stable 16.x was verified; canary/next releases are excluded. Next 15.5.24 adds a second migration/rollback boundary without an identified direct-migration blocker.
- **SECURITY MOTIVATION:** Leave unsupported affected ranges and resume vendor patch coverage.
- **COMPATIBILITY MOTIVATION:** Isolate the framework migration after Node 24 and pair only with its React/type line and required lint/config adjustments.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-03

- **Finding ID:** R-03
- **Component:** Socket.IO parser/server/client
- **Phase A classification:** URGENT
- **Evidence quality:** CONFIRMED AFFECTED and reachable
- **ACTION:** UPGRADE
- **CURRENT:** server resolves `4.8.3`; Web/API-test clients `4.7.5`; parser `4.2.6`
- **TARGET:** exact direct server/client declarations `4.8.3` plus root `pnpm.overrides` entry `socket.io-parser: 4.2.7`; one runtime parser version only
- **TARGET TYPE:** PATCH
- **DEADLINE:** BEFORE-F4
- **WHY NOW:** the public parser path permits unauthenticated memory exhaustion.
- **WHY THIS TARGET:** 4.2.7 is the fixed 4.x parser and 4.8.3 aligns the existing 4.x peers. A root override is an auditable deterministic constraint rather than a lockfile accident.
- **WHY NOT A NEWER TARGET:** no Socket.IO major is needed; the selected versions are the current stable 4.x releases.
- **SECURITY MOTIVATION:** Remove the reachable vulnerable parser copy.
- **COMPATIBILITY MOTIVATION:** Preserve `/api/v1/ws`, cookie auth, Redis/presence, Channel/permission events, Voice/Screen Share signaling, reconnect, and binary events without protocol-major churn.
- **BREAKING RISK:** MEDIUM
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** LOW

### R-04

- **Finding ID:** R-04
- **Component:** coturn image
- **Phase A classification:** URGENT
- **Evidence quality:** CONFIRMED affected range and reachable authenticated service
- **ACTION:** UPGRADE
- **CURRENT:** `coturn/coturn:4.6`
- **TARGET:** `coturn/coturn:4.17.2-r0` in both Compose definitions; retain the resolved deployment digest in the checkpoint record
- **TARGET TYPE:** MINOR
- **DEADLINE:** BEFORE-F4
- **WHY NOW:** the 4.6 line predates applicable peer/loopback protections.
- **WHY THIS TARGET:** 4.17.2 is the current stable release and `-r0` is its concrete immutable Docker release revision.
- **WHY NOT A NEWER TARGET:** no newer stable coturn release was verified; rolling `4`, `4.17`, and `latest` tags are not acceptable targets.
- **SECURITY MOTIVATION:** Gain the fixed peer-protection behavior without weakening auth or relay restrictions.
- **COMPATIBILITY MOTIVATION:** Preserve static-auth-secret credentials, TCP/UDP, external IP, ports `49152-49200`, quotas, browser ICE, Voice, and Screen Share; no SFU or TURN redesign.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-05

- **Finding ID:** R-05
- **Component:** React, React DOM, and typings
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED
- **ACTION:** UPGRADE
- **CURRENT:** React/DOM `18.3.1`; types `18.3.31`/`18.3.7`
- **TARGET:** `react@19.2.8`, `react-dom@19.2.8`, `@types/react@19.2.18`, `@types/react-dom@19.2.5`
- **TARGET TYPE:** MAJOR
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** although classified BEFORE-RC, it is tightly coupled to the selected supported Next destination and therefore executes before F.4.
- **WHY THIS TARGET:** exact stable React 19.2 patches satisfy Next 16.3.3 peers and align runtime/types.
- **WHY NOT A NEWER TARGET:** experimental React builds and unmatched latest type majors are excluded.
- **SECURITY MOTIVATION:** Keep the supported web framework stack coherent and maintainable.
- **COMPATIBILITY MOTIVATION:** A single Next/React regression boundary avoids testing an unsupported mixed stack twice.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-06

- **Finding ID:** R-06
- **Component:** NestJS package family
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED version; affected transitive exploit paths largely absent
- **ACTION:** UPGRADE
- **CURRENT:** runtime/testing family `10.4.22`; JWT `10.2.0`; Passport `10.0.3`; CLI `10.4.x`; schematics `10.2.x`
- **TARGET:** `@nestjs/common`, `core`, `platform-express`, `platform-socket.io`, `websockets`, and `testing` `12.0.1`; `@nestjs/jwt@12.0.1`; `@nestjs/passport@12.0.0`; `@nestjs/cli@12.0.0`; `@nestjs/schematics@12.0.0`; narrowly required `typescript@6.0.3`, `@typescript-eslint/parser@8.68.0`, and `@typescript-eslint/eslint-plugin@8.68.0`
- **TARGET TYPE:** MAJOR
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** v10 is legacy and supported-parent upgrades remove stale transitive paths before RC.
- **WHY THIS TARGET:** targeted registry verification confirms these as stable coordinated releases and their peers admit Nest 12; Node 24.20 satisfies the CLI/schematics engine floor. Schematics 12 requires TypeScript `>=6`, while typescript-eslint 8 supports `<6.1`, so stable TypeScript 6.0.3 and typescript-eslint 8.68.0 form the narrow compatible tooling set.
- **WHY NOT A NEWER TARGET:** no newer stable Nest family versions were verified; prerelease Nest packages are excluded. TypeScript 7.0.2 is not admitted by typescript-eslint 8 and is unnecessary.
- **SECURITY MOTIVATION:** Restore supported framework maintenance and remove legacy parent paths rather than forcing transitive overrides.
- **COMPATIBILITY MOTIVATION:** Isolate API framework behavior from Next; validate REST, auth, multipart/upload, WS adapters, exception/filter behavior, reflection, and tests together.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-07

- **Finding ID:** R-07
- **Component:** Prisma CLI/client and PostgreSQL adapter architecture
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED versions and GA/prerelease status
- **ACTION:** UPGRADE
- **CURRENT:** `prisma@5.22.0`, `@prisma/client@5.22.0`, `prisma-client-js`, six historical migrations
- **TARGET:** boundary one `prisma@6.19.3` + `@prisma/client@6.19.3`; boundary two `prisma@7.10.0` + `@prisma/client@7.10.0` + `@prisma/adapter-pg@7.10.0` + `pg@8.23.0` + `@types/pg@8.23.1` + `dotenv@17.4.2`, required `prisma.config.ts`, explicit generated-client output and CommonJS-compatible module format
- **TARGET TYPE:** MAJOR
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** v5 is two GA majors behind and Prisma 7 is the approved maximum for this release.
- **WHY THIS TARGET:** 6.19.3 is the last stable 6 boundary; 7.10.0 is the stable 7 target. Separate checkpoints expose v6 schema/client breaks before adopting v7 config, generated output, adapter, and connection-pool changes.
- **WHY NOT A NEWER TARGET:** Prisma 8 is prerelease/ambiguous-current and explicitly excluded; combining 5 -> 7 would erase the diagnostic and rollback boundary.
- **SECURITY MOTIVATION:** Restore a supported database-tooling line and reduce future unpatchable drift.
- **COMPATIBILITY MOTIVATION:** Preserve the data model and six migration files; v7 requires a driver adapter and generated client path, so all imports/client constructors, pool semantics, Docker generation, migrations, seed/bootstrap, and API queries need a dedicated boundary.
- **BREAKING RISK:** CRITICAL
- **DATA/SCHEMA RISK:** MEDIUM
- **ROLLBACK COMPLEXITY:** HIGH

### R-08

- **Finding ID:** R-08
- **Component:** pnpm/Docker build reproducibility
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED
- **ACTION:** HARDEN
- **CURRENT:** root says `pnpm@9.15.4`; Docker runs unversioned `npm i -g pnpm` in both deps and builder stages
- **TARGET:** keep root `packageManager: pnpm@9.15.4`; Docker installs `pnpm@9.15.4` once in each shared build base; every install remains `--frozen-lockfile`
- **TARGET TYPE:** CONFIG
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** urgent runtime work needs new images, so a non-deterministic installer cannot remain on that build path.
- **WHY THIS TARGET:** option A minimizes independent toolchain churn and is compatible with all selected targets.
- **WHY NOT A NEWER TARGET:** pnpm 11.24.0 is stable but not required and needs Node `>=22.13`; adopting it would add avoidable resolver/build behavior change. pnpm 12 is RC and prohibited.
- **SECURITY MOTIVATION:** Prevent an unreviewed package-manager release from altering a security rebuild.
- **COMPATIBILITY MOTIVATION:** Keep the known lockfile format/resolution while changing frameworks and runtimes.
- **BREAKING RISK:** LOW
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** LOW

### R-09

- **Finding ID:** R-09
- **Component:** base/infra image identity
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED declarations; deployed digests INCONCLUSIVE
- **ACTION:** HARDEN
- **CURRENT:** mutable major/family tags with no retained deployed digest
- **TARGET:** reviewed multi-arch digest pins and a release manifest for Node `24.20.0-bookworm-slim`/`24.20.0-alpine3.24`, coturn `4.17.2-r0`, PostgreSQL `15.19-alpine`, Redis `7.4.11-alpine`, Caddy `2.11.4-alpine`, backup image, and both GHCR app images; digest updates occur only by reviewed change
- **TARGET TYPE:** PROCESS
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** RC must be reproducible and auditable from source to deployed artifact.
- **WHY THIS TARGET:** preserves supported majors while making the exact pulled artifact and rollback identity explicit.
- **WHY NOT A NEWER TARGET:** this is not a major-upgrade vehicle; later stable patches enter only through the same review/scan process.
- **SECURITY MOTIVATION:** Reduce tag-mutation and incident-response ambiguity.
- **COMPATIBILITY MOTIVATION:** A multi-arch index digest is captured for the deployed architecture; tag and digest must agree before rollout.
- **BREAKING RISK:** MEDIUM
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-10

- **Finding ID:** R-10
- **Component:** API runtime dependency closure
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED
- **ACTION:** HARDEN
- **CURRENT:** runner receives the entire root store/workspace package tree, including development dependencies
- **TARGET:** a production-only deploy/pruned closure for `@likecord/api` plus required built workspace/database artifacts; no API runner dev dependencies, test tools, CLI, or unrelated Web packages
- **TARGET TYPE:** CONFIG
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** the present runtime surface and scanner noise are materially larger than the executing service.
- **WHY THIS TARGET:** preserve pnpm workspace links and Prisma generated output while reducing only the final runner payload.
- **WHY NOT A NEWER TARGET:** changing package manager or build system is unrelated; use pnpm 9's supported deploy/prune mechanism.
- **SECURITY MOTIVATION:** Reduce exploitable code and false-positive triage surface.
- **COMPATIBILITY MOTIVATION:** Execute only after Prisma 7 fixes the generated-client/adapter layout that the runtime image must copy.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-11

- **Finding ID:** R-11
- **Component:** API/Web runtime identity
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED
- **ACTION:** HARDEN
- **CURRENT:** both app runners execute as root
- **TARGET:** final API/Web processes run as existing official-image `node` UID/GID `1000:1000`; copied files are owned/readable; `/app/uploads` and every other required write path are explicitly writable by that identity
- **TARGET TYPE:** CONFIG
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** root magnifies an application compromise and must be removed before RC.
- **WHY THIS TARGET:** reuse the official image identity consistently across Debian and Alpine rather than inventing divergent users.
- **WHY NOT A NEWER TARGET:** rootless Docker/host redesign is outside scope; application-level non-root is the minimal supported control.
- **SECURITY MOTIVATION:** Limit container privilege after exploitation.
- **COMPATIBILITY MOTIVATION:** Isolate permissions/volume behavior after API pruning so failures have a narrow cause and rollback.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-12

- **Finding ID:** R-12
- **Component:** Docker build context
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED
- **ACTION:** HARDEN
- **CURRENT:** `.env` and `.env.local` ignored, but `.env.*` variants and `cookies.txt` are not; builders use `COPY . .`
- **TARGET:** add `.env.*` and `cookies.txt` to `.dockerignore`; prove all Dockerfile `COPY` inputs remain present and secrets/cookie jars are absent from sent context/layers
- **TARGET TYPE:** CONFIG
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** classification remains BEFORE-RC, but execution is advanced before the first remediation image to avoid propagating a known context gap.
- **WHY THIS TARGET:** it exactly aligns the sensitive patterns identified by Phase A without broad context redesign.
- **WHY NOT A NEWER TARGET:** aggressive allowlisting/context splitting is a larger build refactor and is unnecessary for the immediate closure.
- **SECURITY MOTIVATION:** Prevent avoidable secret/cookie material from reaching build caches or layers.
- **COMPATIBILITY MOTIVATION:** a dry context inventory and both builds prove required workspace/config/public inputs were not excluded.
- **BREAKING RISK:** LOW
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** LOW

### R-13

- **Finding ID:** R-13
- **Component:** release evidence and supply-chain gate
- **Phase A classification:** BEFORE-RC
- **Evidence quality:** CONFIRMED repository absence
- **ACTION:** HARDEN
- **CURRENT:** no retained SBOM, image scan gate, signature/provenance verification, or digest manifest
- **TARGET:** per-digest API/Web SPDX JSON SBOM; pinned scanner workflow with reachable high/critical triage and zero unaccepted registry critical; keyless Cosign signature verification; SLSA-compatible build provenance; retained tag-to-digest/base-digest/rollback manifest
- **TARGET TYPE:** PROCESS
- **DEADLINE:** BEFORE-RC
- **WHY NOW:** RC requires repeatable evidence and actionable supply-chain triage.
- **WHY THIS TARGET:** ties evidence to immutable image digests and preserves explicit exception ownership/expiry instead of treating raw path counts as exploits.
- **WHY NOT A NEWER TARGET:** a platform replacement is unnecessary; use the existing GHCR/GitHub release path with pinned actions/tools.
- **SECURITY MOTIVATION:** Improve prevention, auditability, and incident response.
- **COMPATIBILITY MOTIVATION:** scanning policy recognizes Phase A reachability/vendor severity and does not force unsafe transitive overrides merely to reduce counts.
- **BREAKING RISK:** MEDIUM
- **DATA/SCHEMA RISK:** NONE
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-14

- **Finding ID:** R-14
- **Component:** container defense in depth
- **Phase A classification:** POST-1.0
- **Evidence quality:** CONFIRMED
- **ACTION:** HARDEN
- **CURRENT:** incomplete Caddy/coturn health checks and read-only/capability/resource controls
- **TARGET:** measured service-specific health checks, minimum proven capabilities, read-only roots plus explicit writable mounts, and resource limits; TURN low ports/relay behavior must remain functional
- **TARGET TYPE:** CONFIG
- **DEADLINE:** POST-1.0
- **WHY NOW:** not now; retain as a defined post-1.0 security stage.
- **WHY THIS TARGET:** defense in depth after urgent/runtime and RC supply-chain controls stabilize.
- **WHY NOT A NEWER TARGET:** no container/orchestrator redesign is justified.
- **SECURITY MOTIVATION:** Reduce blast radius and improve resilience.
- **COMPATIBILITY MOTIVATION:** measurement is required because blind capability/read-only changes can break Caddy or TURN.
- **BREAKING RISK:** HIGH
- **DATA/SCHEMA RISK:** LOW
- **ROLLBACK COMPLEXITY:** MEDIUM

### R-15 through R-21 preserve decisions

| Finding | Evidence quality | ACTION | CURRENT | TARGET | Target type | Deadline | Decision rationale |
|---|---|---|---|---|---|---|---|
| R-15 | CONFIRMED newer stable releases; no blocker | MONITOR | ioredis 5; current TS/Turbo/Jest/Babel-Jest | unchanged until isolated post-1.0 audit | PROCESS | POST-1.0 | Avoid unrelated RESP3/toolchain churn during security remediation. |
| R-16 | CONFIRMED policy; deployed patch INCONCLUSIVE | ACCEPT | PostgreSQL 15 family | preserve major 15; record/refresh supported patch and digest | PROCESS | NONE | Major 15 is supported; no novelty-driven DB upgrade. |
| R-17 | CONFIRMED policy; deployed patch INCONCLUSIVE | ACCEPT | Redis 7 family | preserve 7.4 Extended GA; record/refresh supported patch and digest | PROCESS | NONE | No major security requirement. |
| R-18 | CONFIRMED | ACCEPT | Caddy 2 family | preserve Caddy 2; record/refresh supported patch and digest | PROCESS | NONE | Current major is appropriate. |
| R-19 | CONFIRMED | ACCEPT | AWS SDK v3 | preserve v3; routine patch/minor cadence only | PROCESS | NONE | Active line with no applicable blocker. |
| R-20 | CONFIRMED versions; NOT AFFECTED/LIKELY NOT REACHABLE paths | ACCEPT | non-reachable transitive/tooling findings and unused direct `nanoid` | no standalone override; remove `nanoid` only if still unused during API-prune implementation | PROCESS | NONE | Supported parents and runtime pruning are safer than indiscriminate overrides. |
| R-21 | CONFIRMED positive configuration | ACCEPT | explicit staging tags, runtime secrets, internal data network, persistence, no privileged/socket mounts | preserve all controls | PROCESS | NONE | These are safeguards, not upgrade candidates. |

R-15 through R-21 are non-actionable upgrade findings, so breaking/data/rollback ratings do not apply. R-09/R-13 may record preserved component digests but must not reinterpret R-16 through R-21 as upgrade work.

## Compatibility Graph

```text
SEC-BUILD-01 (R-08, R-12 enabling hardening)
└── SEC-WS-01 (R-03)
    └── SEC-TURN-01 (R-04; mandatory staging TURN proof)
        └── RUNTIME-NODE-01 (R-01)
            └── WEB-NEXT-01 (R-02 + coupled R-05)
                └── SEC-PREF4-GATE
                    └── F.4 unlocked only if the objective gate passes

RUNTIME-NODE-01
└── RUNTIME-NEST-01 (R-06; later BEFORE-RC work)

SEC-PREF4-GATE
└── DATA-PRISMA-06 (R-07)
    └── DATA-PRISMA-07 (R-07)
        └── CONTAINER-API-01 (R-10)
            └── CONTAINER-USER-01 (R-11)
                └── SUPPLY-CHAIN-01 (R-09, R-13; BEFORE-RC gate)
```

The mandatory pre-F.4 execution order is intentionally linear: `SEC-BUILD-01` -> `SEC-WS-01` -> `SEC-TURN-01` -> `RUNTIME-NODE-01` -> `WEB-NEXT-01` -> `SEC-PREF4-GATE`. Each stage consumes the prior stage's passing checkpoint; no pre-F.4 stage is run in parallel or out of order. Node precedes Next because Node 24 is the shared supported runtime. Nest stays separate from Next because they are unrelated framework majors and remains later BEFORE-RC work. Prisma uses two major boundaries, and API pruning follows Prisma 7 because generated-client/adapter layout determines the production closure. Non-root follows pruning so filesystem/volume failures are isolated. Full digest/SBOM/provenance closure runs after final image construction.

## Pre-F.4 Mandatory Microstages

### SEC-BUILD-01

- **Scope:** close the known sensitive Docker-context gap and make both application build families use exact pnpm 9.15.4 before any remediation image is created.
- **Findings closed:** R-08 and R-12. Their classification remains BEFORE-RC; their execution is advanced as a safety prerequisite.
- **Exact starting state:** root `packageManager` is `pnpm@9.15.4`; Dockerfiles install unversioned pnpm twice; `.dockerignore` lacks `.env.*` and `cookies.txt`.
- **Exact target state:** shared build bases install `pnpm@9.15.4` once; deps/build use the frozen existing lock; `.dockerignore` includes `.env.*` and `cookies.txt`; required Docker build inputs remain included.
- **Why isolated/grouped this way:** both are tiny build-input controls required before the first image. They share Docker build validation and have one low-complexity rollback.
- **Expected files changed:** `.dockerignore`, `apps/api/Dockerfile`, `apps/web/Dockerfile`.
- **Explicit files/systems NOT to change:** manifests, lockfile, source, Compose, schema/migrations, images in GHCR, staging/prod.
- **Dependency prerequisites:** checkpoint baseline only.
- **Breaking surfaces:** Docker layer inheritance, package-manager availability, build-context excludes.
- **Data/schema impact:** none.
- **Security impact:** prevents sensitive context inclusion and unreviewed package-manager drift.
- **Rollback boundary:** one Git revert of three config files; no deployed state.
- **Stop conditions:** a required input is excluded; pnpm version differs from 9.15.4; frozen install changes lockfile; either image cannot build; context inspection finds an environment/cookie file.
- **Automated validation:** verify `pnpm --version` inside build stage is `9.15.4`; clean frozen install; API/Web typecheck, lint, tests; Docker API/Web local builds; inspect context/layers for sensitive filenames; `git diff --check`.
- **Manual local validation:** start both locally built images; health endpoints and Web home/login shell load. Full product regression is deferred to the integrated gate.
- **Staging validation:** not required.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **NO**; staging deployment **NO**.
- **Recommended Codex model:** GPT-5.6 Luna.
- **Recommended reasoning:** High.

### SEC-WS-01

- **Scope:** deterministic Socket.IO 4.x parser remediation and client alignment.
- **Findings closed:** R-03 after the integrated gate passes.
- **Exact starting state:** server resolved 4.8.3; clients 4.7.5; one parser 4.2.6.
- **Exact target state:** exact server/client 4.8.3 declarations, root parser override exactly 4.2.7, lockfile with no 4.2.6 runtime entry.
- **Why isolated/grouped this way:** parser fix and client alignment share the wire protocol and must be tested together; no Socket.IO major or other dependency update belongs here.
- **Expected files changed:** root `package.json`, `apps/api/package.json`, `apps/web/package.json`, `pnpm-lock.yaml`.
- **Explicit files/systems NOT to change:** WS source/path/auth, Redis topology, Voice/Screen Share design, Dockerfiles/Compose, schema/migrations, staging.
- **Dependency prerequisites:** `SEC-BUILD-01` checkpoint.
- **Breaking surfaces:** Engine.IO/Socket.IO handshake, binary frames, reconnect, test client/server parity.
- **Data/schema impact:** none.
- **Security impact:** removes reachable parser memory exhaustion.
- **Rollback boundary:** package-only Git checkpoint; reinstall prior frozen lock.
- **Stop conditions:** any parser below 4.2.7 remains on a production path; duplicate incompatible parsers; protocol/auth/reconnect regression; override affects an unrelated incompatible package.
- **Automated validation:** frozen install; dependency tree/lock assertion for parser 4.2.7 only; API/Web typecheck and lint; API/Web tests; WS E2E covering authenticated connection, messaging, permissions, binary event, reconnect, Voice and Screen Share signals, Redis/presence; read-only production audit; `git diff --check`.
- **Manual local validation:** two authenticated clients exercise messaging, Channel/permission realtime, Voice join/leave signaling, Screen Share start/view/stop, disconnect/reconnect, and presence.
- **Staging validation:** performed at `SEC-PREF4-GATE`, not as an intermediate deployment.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **NO**; staging deployment **NO**.
- **Recommended Codex model:** GPT-5.6 Terra.
- **Recommended reasoning:** High.

### SEC-TURN-01

- **Scope:** replace only the coturn image reference and validate the existing TURN architecture.
- **Findings closed:** R-04 after real staging validation succeeds.
- **Exact starting state:** `coturn/coturn:4.6` in local/staging Compose; existing static secret, credentials, network, external IP, relay range, and quotas.
- **Exact target state:** `coturn/coturn:4.17.2-r0` in both Compose files; exact resolved staging digest recorded; all existing options/security controls preserved.
- **Why isolated/grouped this way:** infrastructure image rollback and real NAT/browser verification are distinct from app packages and app image rollout.
- **Expected files changed:** `docker-compose.yml`, `docker-compose.staging.yml`, deployment/checkpoint evidence only.
- **Explicit files/systems NOT to change:** TURN architecture, SFU topology, API credential algorithm, app source, Node/Next/Nest/Prisma, DB/Redis/Caddy majors, schema/migrations.
- **Dependency prerequisites:** passing `SEC-WS-01` checkpoint; authorized staging maintenance window and two real networks/devices.
- **Breaking surfaces:** coturn option compatibility, external IP discovery, UDP/TCP listeners, relay allocation, quotas, restart persistence.
- **Data/schema impact:** none.
- **Security impact:** gains peer/loopback protections fixed after 4.6 without weakening TURN configuration.
- **Rollback boundary:** Compose image reference and recorded previous image digest; no application image change.
- **Stop conditions:** credentials fail; UDP relay absent; TCP fallback regresses where available; unexpected loopback/internal peer relay succeeds; relay range/external IP/quotas differ; Voice or Screen Share fails; rollback image unavailable.
- **Automated validation:** render/validate both Compose files; start/config/log/port/health checks; credential expiry/invalid credential tests; restart and allocation persistence checks; read-only image scan; `git diff --check`.
- **Manual local validation:** basic credential issuance and local ICE configuration sanity only.
- **Staging validation:** **mandatory** real browser/device test across distinct networks: force/observe relay candidates, UDP TURN, TCP fallback where available, credential success/expiry/rejection, Voice, Screen Share, restart recovery, external IP and `49152-49200`, plus negative loopback/internal peer attempts. Do not loosen TURN security to pass.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **YES** (the reviewed upstream coturn release/digest); staging deployment **YES** before proceeding to the final gate.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### RUNTIME-NODE-01

- **Scope:** move API and Web build/runtime together to exact Node 24 LTS and align declared engine/type surfaces.
- **Findings closed:** R-01 after integrated staging gate.
- **Exact starting state:** Node 20 Debian slim/Alpine build and runner images, engine `>=20`, Node 20 typings.
- **Exact target state:** API `node:24.20.0-bookworm-slim` in base/runner; Web `node:24.20.0-alpine3.24` in base/runner; root engine `>=24.20.0 <25`; API/Web/database `@types/node@24.13.3`; pnpm remains 9.15.4.
- **Why isolated/grouped this way:** all runtime/native behavior changes together while Next and Nest major code migrations remain separate diagnostic boundaries.
- **Expected files changed:** root `package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/database/package.json`, `pnpm-lock.yaml`, both Dockerfiles.
- **Explicit files/systems NOT to change:** Next/React/Nest/Prisma versions, Compose infra images, business/UI source, schema/migrations, staging/prod.
- **Dependency prerequisites:** passing `SEC-TURN-01` checkpoint; the earlier `SEC-BUILD-01` and `SEC-WS-01` checkpoints are required transitively.
- **Breaking surfaces:** native argon2 binary/load, Prisma engine generation, OpenSSL/CA/TLS, Nest startup, Next standalone, OS libc difference, health commands.
- **Data/schema impact:** no intended change; local DB compatibility smoke only.
- **Security impact:** restores supported LTS runtime and exact base tags.
- **Rollback boundary:** runtime/framework Git checkpoint plus prior local images; no DB change.
- **Stop conditions:** native build/runtime fallback is unexplained; Prisma generate/query fails; TLS/CA or R2 fails; either image/healthcheck fails; Node version is not 24.20.0 in both final runners.
- **Automated validation:** frozen install; API/Web/database typecheck and lint; API/Web tests and relevant E2E; Prisma generate/validate/migrate status against local disposable DB; Docker API/Web builds; assert runtime Node/OpenSSL/argon2; API and Web health/startup; TLS request and R2 upload/download integration; ICE endpoint; read-only dependency audit; `git diff --check`.
- **Manual local validation:** register/login/refresh/logout, basic message/attachment flow, Web navigation, Voice ICE credential retrieval, local Voice signaling.
- **Staging validation:** deferred to `SEC-PREF4-GATE` to avoid an intermediate app release.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **NO**; staging deployment **NO**.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### WEB-NEXT-01

- **Scope:** direct supported Next 16 migration with its coupled React 19 runtime/types and only required framework config/lint/source adaptations.
- **Findings closed:** R-02 and R-05 after integrated staging gate.
- **Exact starting state:** Next 14.2.35, React/DOM 18.3.1, React types 18.3.31/18.3.7, App Router, rewrites, CommonJS Next config, standalone output, `next lint`.
- **Exact target state:** Next 16.3.3, React/DOM 19.2.8, React types 19.2.18/19.2.5; standalone production output and `/api/:path*` rewrite preserved; lint uses the existing ESLint toolchain because `next lint` is removed; no Next 15 bridge.
- **Why isolated/grouped this way:** React/runtime/types are inseparable from the supported Next destination; UI polish and backend majors are unrelated and excluded.
- **Expected files changed:** `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/next.config.js` only if required, Web ESLint config/script, and the smallest Web source/test set required by documented Next/React breaking changes.
- **Explicit files/systems NOT to change:** visual redesign; message alignment; CONNECT/STREAM tooltip polish; Screen Share detached drag/resize/bounds/fullscreen/volume; API/Nest/Prisma/infra; schema/migrations.
- **Dependency prerequisites:** passing `RUNTIME-NODE-01` checkpoint; the earlier `SEC-BUILD-01`, `SEC-WS-01`, and `SEC-TURN-01` checkpoints are required transitively.
- **Breaking surfaces:** App Router/RSC boundaries, layouts/pages, routes, rewrites, async request APIs if introduced, cookie/session flow, hydration, React effects/types, tests, lint/build, standalone file layout.
- **Data/schema impact:** none.
- **Security impact:** leaves unsupported/advisory-affected Next 14 and resumes vendor support.
- **Rollback boundary:** Web framework Git checkpoint and prior Web image; no API/data change.
- **Stop conditions:** direct 14 -> 16 cannot pass due a concrete documented blocker; hydration/browser-console error; auth/cookie/rewrite regression; canonical navigation or permission UI regression; standalone image failure. A bridge requires a Phase B amendment before implementation, never an improvised downgrade.
- **Automated validation:** frozen install; Web typecheck/lint/tests; API compatibility tests; build with production standalone output; Docker Web build/start/health; route/rewrite/auth tests; hydration-sensitive component tests; read-only audit; `git diff --check`.
- **Manual local validation:** full substantial Web regression: register/login/refresh/logout; canonical routes, sidebar/navigation and F.2 fallback; history/send/edit/delete; attachments/R2; Channel/Category CRUD; F.3 realtime sync; F.3.5A Roles/hierarchy; F.3.5B permissions/revocation; Voice lifecycle/UI; Screen Share UI/signaling; reconnect; browser console/hydration; narrow viewport sanity.
- **Staging validation:** performed at `SEC-PREF4-GATE` with the integrated app image package.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **NO**; staging deployment **NO**.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### SEC-PREF4-GATE

- **Scope:** integrate, audit, package, deploy, and prove the complete urgent remediation boundary; no feature work.
- **Findings closed:** final closure evidence for R-01 through R-04 and coupled R-05; confirms early R-08/R-12 controls.
- **Exact starting state:** all five implementation stages have passing local checkpoints but no combined application deployment.
- **Exact target state:** one clean combined commit; immutable GHCR `likecord-api:git-<12-char-checkpoint-SHA>` and `likecord-web:git-<same-SHA>` with recorded digests; staging uses those exact images plus coturn 4.17.2-r0; every F.4 unlock condition passes.
- **Why isolated/grouped this way:** safe local stages form one release boundary, avoiding unnecessary deployments while preserving individual Git rollback points.
- **Expected files changed:** validation/release evidence and, only if the existing deployment convention requires it, staging tag metadata; no remediation code should originate here.
- **Explicit files/systems NOT to change:** new dependencies, feature/UI work, schema/migrations, staging DB mutation, production deployment.
- **Dependency prerequisites:** successful `SEC-BUILD-01`, `SEC-WS-01`, `SEC-TURN-01`, `RUNTIME-NODE-01`, and `WEB-NEXT-01`; authorized staging window.
- **Breaking surfaces:** combined auth/realtime/WebRTC/runtime/framework deployment and rollback package.
- **Data/schema impact:** none; read-only/normal application behavior only.
- **Security impact:** converts locally passing fixes into a stable, auditable staging proof.
- **Rollback boundary:** revert staging app tags to prior immutable API/Web pair and coturn to its recorded prior digest; restore only as a matched package.
- **Stop conditions:** dirty/unreviewed source; any urgent version assertion fails; newly introduced reachable high/critical advisory; any automated/manual/staging failure; images not tied to Git SHA/digests; rollback package unavailable.
- **Automated validation:** clean frozen install; all workspace typechecks/lints/tests; API E2E; Prisma generate/validate and read-only migration status; Docker API/Web builds; exact runtime/package assertions; read-only full and production audits; image scans; Compose validation; `git diff --check` and allowed-scope review.
- **Manual local validation:** full auth, messaging, attachments, navigation, roles, Channel permissions, Voice, Screen Share, reconnect, and negative permission-revocation regression on final local images.
- **Staging validation:** **mandatory** on exact candidate digests: auth/session; routes/rewrites; API/Web health; Node/argon2/Prisma/Nest; TLS/CA and R2; parser/runtime tree; authenticated WS, messaging, permission events, Redis/presence, reconnect, Voice and Screen Share signaling; real UDP/TCP TURN relay and negative peer tests; browser console/hydration; rollback drill evidence.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **YES**; staging deployment **YES**.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

## F.4 Unlock Gate

F.4 is unlocked only when:

```text
R-01 + R-02 + R-03 + R-04 tested remediation
+ R-05 coupled React target
+ deterministic pnpm and safe build context
+ complete automated validation
+ complete risk-based local regression
+ real staging TURN/browser/device validation
+ integrated staging app regression on immutable digests
+ no newly introduced reachable high/critical advisory
+ no registry critical advisory
+ documented matched-package rollback
= PASS
```

A raw `pnpm audit` count reduction, a package install, a local compile, or a partial staging smoke does not independently satisfy this gate.

## BEFORE-RC Microstages

### RUNTIME-NEST-01

- **Scope:** coordinated Nest 10 -> 12 family migration only.
- **Findings closed:** R-06.
- **Exact starting state:** passing pre-F.4 checkpoint on Node 24 with Nest runtime/testing 10.4.22.
- **Exact target state:** core/common/platform-express/platform-socket.io/websockets/testing 12.0.1; JWT 12.0.1; Passport/CLI/schematics 12.0.0; TypeScript 6.0.3 and typescript-eslint parser/plugin 8.68.0 as the minimum required compatibility adjustment; existing Express, Socket.IO 4.8.3, auth, upload and metadata behavior preserved.
- **Why isolated/grouped this way:** Nest peers must move together; Next and Prisma are separate breaking domains.
- **Expected files changed:** root `package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/database/package.json`, `packages/config-eslint/package.json`, `pnpm-lock.yaml`, and required Nest/TypeScript config/source/tests only.
- **Explicit files/systems NOT to change:** Next/React, Prisma/schema/migrations, Docker bases, Compose, UX.
- **Dependency prerequisites:** Node stage and pre-F.4 gate.
- **Breaking surfaces:** bootstrap, decorators/metadata, guards/interceptors/filters, Express adapter, multipart, WS gateway/adapter, tests/CLI.
- **Data/schema impact:** low; no schema change.
- **Security impact:** supported parents replace legacy affected-but-unused paths.
- **Rollback boundary:** API framework Git checkpoint and API image only.
- **Stop conditions:** peer mismatch; auth/API/WS/upload behavior changes; new reachable high/critical advisory; undocumented compatibility shim.
- **Automated validation:** API typecheck/lint/tests/E2E; Web typecheck/tests for protocol compatibility; Nest startup/health; auth, upload, WS, permissions, Voice/Screen Share signal E2E; Docker API build; read-only audit; `git diff --check`.
- **Manual local validation:** auth, server/channel/message/upload, roles/permissions, realtime, Voice/Screen Share signaling.
- **Staging validation:** mandatory before Nest checkpoint is accepted because it changes the public API/WS runtime.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable API image **YES**; staging deployment **YES**.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### DATA-PRISMA-06

- **Scope:** Prisma 5.22.0 -> stable 6.19.3 boundary with no intentional schema change.
- **Findings closed:** partial R-07 boundary; R-07 remains open until v7 passes.
- **Exact starting state:** Prisma CLI/client 5.22.0, `prisma-client-js`, six migrations.
- **Exact target state:** CLI/client exactly 6.19.3; schema models and all six migration files byte-for-byte unchanged unless formatting-only schema output is separately reviewed and avoided; generated client and runtime queries pass.
- **Why isolated/grouped this way:** catches v6 Node/TS, relation, `Bytes`, error-class, generator, and engine effects before the v7 architecture change.
- **Expected files changed:** `packages/database/package.json`, `apps/api/package.json`, `pnpm-lock.yaml`, only required Prisma API compatibility source/tests; no migration file.
- **Explicit files/systems NOT to change:** historical migrations, data model, `db push`, staging DB, Next/Nest/infra.
- **Dependency prerequisites:** pre-F.4 gate; Node 24.
- **Breaking surfaces:** generated types, error handling, transactions, relation metadata, CLI/generate, Docker engine copy.
- **Data/schema impact:** medium validation risk; intended schema/data change none.
- **Security impact:** reaches final stable v6 diagnostic boundary.
- **Rollback boundary:** package/database-tooling Git checkpoint; disposable DBs only.
- **Stop conditions:** Prisma proposes an unexplained schema migration; any historical migration changes; zero-deploy or populated-clone compatibility fails; data diff; staging access would be required.
- **Automated validation:** Prisma format-check/validate/generate; API/database typecheck/lint/tests/E2E; deploy all six migrations from zero to disposable PostgreSQL 15; `migrate status`; populated local clone read/write/query comparison; Docker API build/start; read-only audit; `git diff --check`; assert migration files unchanged.
- **Manual local validation:** register/login, seed/bootstrap on disposable data, server/channel/message/permissions/upload operations and restart persistence.
- **Staging validation:** no staging DB access; deploy an immutable API candidate only to an isolated disposable staging database if one is explicitly provisioned and authorized.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image **NO**; staging deployment **NO**. Any later authorized isolated-staging exercise is a separate validation package, not a condition for this v6 checkpoint.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### DATA-PRISMA-07

- **Scope:** Prisma 6.19.3 -> stable 7.10.0 architecture boundary, still with no intentional database schema migration.
- **Findings closed:** R-07.
- **Exact starting state:** passing Prisma 6.19.3 checkpoint and unchanged six migrations.
- **Exact target state:** CLI/client/adapter-pg 7.10.0, pg 8.23.0, `@types/pg` 8.23.1, dotenv 17.4.2; required `prisma.config.ts`; `prisma-client` generator with explicit repository-owned output and CommonJS-compatible format; `PrismaPg` adapter supplied to every client construction; pool/timeout behavior explicitly mapped; schema models and six migrations unchanged.
- **Why isolated/grouped this way:** v7 changes config, generated output/imports, ESM/CJS interaction, adapter construction, and connection pooling; it needs its own rollback and database proof.
- **Expected files changed:** database/API manifests and lock; `packages/database/prisma.config.ts`; schema generator/datasource config only; generated-client ignore/build config; database/API Prisma construction/import source/tests; Docker API generation/copy paths.
- **Explicit files/systems NOT to change:** model definitions, six migration SQL files, staging DB, `db push`, `migrate reset`, unrelated API/Web/infra.
- **Dependency prerequisites:** accepted `DATA-PRISMA-06`; Node 24.
- **Breaking surfaces:** generated client imports, CommonJS compilation, driver adapter, pool limits/timeouts, transaction semantics, CLI env/config, seed/bootstrap, Docker output.
- **Data/schema impact:** medium; no migration is expected or allowed.
- **Security impact:** reaches approved stable supported Prisma maximum without prerelease adoption.
- **Rollback boundary:** database-tooling/application checkpoint plus prior Prisma 6 API image; database remains schema-identical.
- **Stop conditions:** any generated migration/schema drift; historical migration edit; pool behavior cannot be made equivalent; all client constructors are not adapter-backed; zero/populated validation fails; Prisma 8/prerelease is selected; staging DB access is required.
- **Automated validation:** validate/generate under v7 config; API/database typecheck/lint/tests/E2E; deploy six migrations from zero; validate populated local clone and row/schema checksums; transaction/error/pool/reconnect tests; seed/bootstrap; Docker API build/start with only required generated output; read-only audit; `git diff --check`; assert historical migrations unchanged.
- **Manual local validation:** full DB-backed auth, server/channel/role/permission/message/upload flows; restart, connection recovery and bounded pool observation.
- **Staging validation:** mandatory on an explicitly authorized disposable staging DB clone before normal staging; never `db push` or `migrate reset`; normal populated staging DB only after read-only compatibility proof and rollback approval.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable API image **YES**; staging deployment **YES** only with the authorized database boundary above.
- **Recommended Codex model:** GPT-5.6 Sol.
- **Recommended reasoning:** xHigh.

### CONTAINER-API-01

- **Scope:** construct a production-only API runtime dependency closure after Prisma 7 layout is known.
- **Findings closed:** R-10; may incidentally remove R-20 paths but does not reclassify them.
- **Exact starting state:** API runner copies full root store and all workspace packages.
- **Exact target state:** only API production dependencies, built API, required shared/database output, Prisma generated client/adapter, and runtime assets exist; no Web/test/CLI/dev dependency closure. Remove direct `nanoid` only if the implementation-time source search still proves it unused.
- **Why isolated/grouped this way:** runtime packaging is separate from non-root permissions and package upgrades; Prisma 7 determines required artifacts.
- **Expected files changed:** API Dockerfile, relevant build/deploy scripts/config, manifests/lock only if unused `nanoid` is removed, runtime packaging tests.
- **Explicit files/systems NOT to change:** app behavior, database schema/migrations, Web image, Compose identity, framework versions.
- **Dependency prerequisites:** `DATA-PRISMA-07`.
- **Breaking surfaces:** pnpm workspace symlinks, generated Prisma output, native argon2, package exports, startup paths.
- **Data/schema impact:** low; none intended.
- **Security impact:** smaller executing surface and lower scanner noise.
- **Rollback boundary:** API image construction checkpoint; prior API image remains available.
- **Stop conditions:** runtime module missing; dev package remains without documented runtime need; Prisma/argon2/startup fails; image contains unrelated Web workspace; image size/dependency closure is not explainable.
- **Automated validation:** production dependency listing/SBOM diff; API typecheck/lint/tests/E2E before prune; pruned Docker build/start/health; argon2/Prisma/R2/WS smoke; read-only production audit/image scan; `git diff --check`.
- **Manual local validation:** full API-backed auth, messages, attachments, permissions, Voice/Screen Share signaling and restart.
- **Staging validation:** mandatory with immutable pruned API image before acceptance.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable API image **YES**; staging deployment **YES**.
- **Recommended Codex model:** GPT-5.6 Terra.
- **Recommended reasoning:** High.

### CONTAINER-USER-01

- **Scope:** run final API and Web processes as non-root with explicit writable-path ownership.
- **Findings closed:** R-11.
- **Exact starting state:** passing pruned API and Web runners execute as root.
- **Exact target state:** both final runners use UID/GID 1000 (`node`); source/runtime files are read-only to that identity except explicit writable paths; uploads volume ownership and restart behavior pass.
- **Why isolated/grouped this way:** filesystem/volume permissions have an operational rollback distinct from dependency pruning.
- **Expected files changed:** both Dockerfiles, Compose volume/user settings only if required, container tests/docs.
- **Explicit files/systems NOT to change:** dependency versions, package manager, DB schema/migrations, service architecture, TURN/Caddy privileges.
- **Dependency prerequisites:** `CONTAINER-API-01`.
- **Breaking surfaces:** bind/named-volume ownership, startup, logs/temp/cache, low ports (app services use 3000/3001).
- **Data/schema impact:** low; uploads permissions only.
- **Security impact:** reduces post-exploitation privilege.
- **Rollback boundary:** matched API/Web container checkpoint; volume data is retained and ownership rollback documented.
- **Stop conditions:** process reports UID 0; any implicit world-writable workaround; uploads/restart fail; ownership mutation risks existing data; health checks fail.
- **Automated validation:** image inspect/runtime UID assertion; read-only filesystem/write-path probes; API/Web builds/start/health; full tests/E2E; upload create/read/restart; negative writes outside allowed paths; scan; `git diff --check`.
- **Manual local validation:** auth, messaging, upload/download and restart/persistence.
- **Staging validation:** mandatory for volume ownership, uploads and restart on exact candidate images.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable matched API/Web images **YES**; staging deployment **YES**.
- **Recommended Codex model:** GPT-5.6 Terra.
- **Recommended reasoning:** High.

### SUPPLY-CHAIN-01

- **Scope:** pin/record exact image identities and establish retained SBOM, scanning, signing/provenance, and rollback evidence.
- **Findings closed:** R-09 and R-13; records but does not upgrade R-16 through R-18/R-21.
- **Exact starting state:** version/family tags without complete base/infra digest manifest; no retained release evidence gate.
- **Exact target state:** reviewed tag+multi-arch digest pins for every base/infra/app/backup image; SPDX JSON SBOM per API/Web digest; pinned image scanner and documented reachable severity exceptions with owner/expiry; keyless Cosign signatures verified by identity; SLSA-compatible provenance; matched tag/digest/base/rollback manifest retained for each release.
- **Why isolated/grouped this way:** digest identity is the join key for SBOM, scan, signature, provenance, deployment, and rollback; splitting them would leave incomplete evidence.
- **Expected files changed:** Dockerfiles/Compose digest references, pinned release workflow/config, security/release evidence documentation and generated release artifacts according to repository policy.
- **Explicit files/systems NOT to change:** PostgreSQL/Redis/Caddy majors, app behavior, schema/migrations, pnpm/TS/Turbo/Jest/ioredis majors.
- **Dependency prerequisites:** final pre-RC application/runtime/container checkpoints.
- **Breaking surfaces:** multi-arch digest selection, registry permissions, action/tool pinning, signature identity, base refresh process, deployment/rollback metadata.
- **Data/schema impact:** low; image identity only.
- **Security impact:** reproducible artifact identity, detection, provenance, and incident response.
- **Rollback boundary:** workflow/config checkpoint plus last verified signed digest set; digest refreshes are individually revertible.
- **Stop conditions:** tag/digest mismatch; architecture unavailable; unsigned/unverifiable image; SBOM not tied to digest; untriaged reachable high/critical or any registry critical; unpinned third-party action/tool; rollback digest unavailable.
- **Automated validation:** resolve/compare multi-arch manifests; build/push by Git SHA; generate/validate SPDX JSON; scan dependency and final images; sign/verify digest and provenance identity; Compose pull/config/health; full app regression; `git diff --check`.
- **Manual local validation:** release evidence review and one rollback-manifest rehearsal.
- **Staging validation:** mandatory final pre-RC deployment and rollback drill on exact signed digests.
- **GHCR/checkpoint requirement:** Git checkpoint **YES**; immutable image package **YES**; staging deployment **YES**.
- **Recommended Codex model:** GPT-5.6 Terra.
- **Recommended reasoning:** High.

## POST-1.0

- **R-14:** create a separately approved container-defense stage only after observing Caddy/coturn write paths, health semantics, capabilities, and resource use. Target service-specific health checks, read-only roots with explicit writable mounts, minimum proven capabilities, and resource limits. No blind `cap_drop: ALL`, low-port change, or TURN relay change.
- **R-15:** monitor ioredis 6 and general TypeScript/Turbo/Jest/Babel-Jest modernization. Each future major gets a value-driven isolated plan; ioredis 6 must explicitly validate RESP3 behavior before selection.

## NO ACTION / Preserve

- PostgreSQL stays on major 15. The supply-chain stage may pin a supported 15 patch/digest but must not create a database-major migration.
- Redis stays on 7.4 Extended GA. No Redis 8 novelty upgrade.
- Caddy stays on major 2. No replacement or architecture change.
- AWS SDK remains v3. Normal patch/minor maintenance may happen later.
- ioredis remains 5 for this release.
- Phase A non-reachable advisory paths do not receive emergency overrides. Supported parents and API pruning may remove them naturally.
- Explicit app tags, runtime-only secrets, internal data network, persistent volumes, no privileged containers, and no Docker socket mounts are preserved.

## Validation Strategy

### Automated

Every implementation checkpoint runs `git diff --check`, exact version/runtime assertions, frozen install, affected workspace typecheck/lint/tests, relevant E2E, and a read-only audit. Image-affecting stages build and start the affected image and assert health. The final gates run all workspace checks and both Docker builds. Prisma stages additionally validate/generate, deploy the six migrations from zero, validate a populated disposable clone, and assert historical migration files unchanged.

Audit results are evaluated by reachability and vendor evidence, not only totals. The immediate gates are: no registry critical, no newly introduced reachable high/critical issue, parser exactly 4.2.7 with no vulnerable runtime copy, and documented dispositions for remaining paths.

### Local manual

Small package/config stages receive focused smoke tests. Node and Next receive broader regressions. Before the integrated pre-F.4 release, final local images must pass auth/session, canonical navigation/F.2 fallback, messaging, attachments/R2, F.3 realtime Channel sync, F.3.5A Roles/hierarchy, F.3.5B Channel permissions/revocation, Voice lifecycle/signaling, Screen Share, reconnect, health, and browser-console/hydration checks.

### Staging

Staging is mandatory for coturn, the integrated pre-F.4 release, Nest, Prisma 7 under the explicitly authorized database boundary, API pruning, non-root volumes, and the pre-RC supply-chain gate. The coturn proof requires real browsers/devices on distinct networks and observed relay candidates; automated startup is insufficient. The integrated pre-F.4 deploy uses one matched API/Web Git-SHA image pair and records digests plus rollback tags.

No Prisma stage may run `db push`, `migrate reset`, or rewrite migrations. No stage accesses staging/prod data without explicit authorization. A disposable database or authorized sanitized clone is the default validation surface.

### Pre-RC final

The pre-RC gate requires every BEFORE-RC finding closed, signed digest-pinned images and retained SBOM/provenance, full automated/local regression, mandatory staging checks, a rollback drill, six-migration zero-deploy proof, populated-database compatibility proof, and no newly introduced reachable high/critical advisory.

## Rollback Boundaries

| Boundary type | Stages | Rollback unit | Data concern |
|---|---|---|---|
| Package-only | `SEC-WS-01` | manifests + lockfile Git checkpoint; reinstall frozen prior graph | None |
| Container/infrastructure | `SEC-BUILD-01`, `SEC-TURN-01`, `CONTAINER-API-01`, `CONTAINER-USER-01`, `SUPPLY-CHAIN-01` | config/Docker checkpoint plus prior digest/tag; app images roll back as a matched pair | Preserve volumes; document ownership reversal |
| Runtime/framework | `RUNTIME-NODE-01`, `WEB-NEXT-01`, `RUNTIME-NEST-01`, `SEC-PREF4-GATE` | Git checkpoint plus immutable prior app image package | No schema mutation; session/protocol compatibility verified |
| Database-tooling | `DATA-PRISMA-06`, `DATA-PRISMA-07` | separate v6/v7 checkpoints and prior API image/client generation | No schema migration; six historical migrations unchanged; validate zero and populated DBs |

Rollback means restoring the whole boundary, not mixing an old API with a new generated client, an old Web with a mismatched protocol package, or a tag with an unrecorded digest.

## Dependency Audit Baseline

Phase A full audit:

- 6 low
- 22 moderate
- 34 high
- 0 registry critical

Phase A production audit:

- 3 low
- 19 moderate
- 26 high
- 0 registry critical

These are advisory path counts, not independent exploitable defects. Multiple paths can lead to one package/advisory, and development-only or unreachable features can appear in the totals. Vendor advisories and demonstrated Likecord reachability can supersede registry severity or feed timing; every gate therefore retains path evidence and an explicit disposition.

## Do-Not-Upgrade List

- Prisma 8 prerelease/ambiguous-current state
- Node 26 Current
- pnpm 12 RC
- PostgreSQL major
- Redis major
- Caddy replacement or novelty-driven major change
- ioredis 6
- general TypeScript, Turbo, Jest, or Babel-Jest modernization (except the exact TypeScript 6.0.3/typescript-eslint 8.68.0 compatibility change required by Nest schematics 12)

These remain excluded unless a selected supported framework target proves a narrow hard blocker. Such a blocker stops the stage and requires an explicit plan amendment; it does not authorize opportunistic modernization.

## UI/UX Deferred Note

The runtime remediation must preserve, but not implement, these later polish requirements:

- own messages right-aligned and other users' messages left-aligned;
- CONNECT denied explanatory disabled/tooltip UX;
- STREAM denied control mirroring the SPEAK denied disabled/tooltip UX;
- Screen Share detached/popout drag;
- resize;
- viewport bounds;
- fullscreen;
- stream volume;
- other presentation polish.

## Requirement Completion

| Requirement | Status | Evidence |
|---|---|---|
| REQ-01 — exact remediation decisions | **DONE** | R-01 through R-21 have an allowed action, exact target/preserve decision, deadline, and mapping; all actionable findings have the required risk/rationale fields. |
| REQ-02 — microstage architecture | **DONE** | Six pre-F.4 and six BEFORE-RC stages define dependencies, rollback boundaries, files, stop conditions, automated/local/staging validation, checkpoint/image policy, and model/effort. |
| REQ-03 — execution plan and release gate | **DONE** | This artifact contains the required baseline, matrix, graph, objective F.4 gate, audit baseline, exclusions, validation/rollback strategy, and deferred UI note. |

No remediation, install, lockfile regeneration, build, deployment, database access, commit, push, or tag was performed in Phase B.
