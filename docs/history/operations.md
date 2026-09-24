# Historical operations summary

**Classification: HISTORICAL.** Likecord is a frozen public archive. This summary preserves lessons from the former staging operations; it does not authorize a deployment or describe a live instance. Current fork guidance is in the [generalized runbook](../operations/staging-vps.md); product behavior belongs to the dedicated [feature contracts](../product/).

Raw pre-cleanup scripts, Python harnesses, validation JSON and operator receipts are omitted from this archive. This summary retains their engineering lessons; the [archive policy](../operations/PUBLIC_ARCHIVE.md) explains the single-root history boundary. The Likecord GHCR Web/API packages were deleted after archival. Historical image references below and in feature/security records identify past artifacts; they are not available deployment inputs. Forks must build and publish their own images.

## Operation discipline and evidence boundaries

The former PREPARE → DEPLOY → VERIFY sequence tied one explicit operation identity to a source revision, immutable candidate images, captured Compose bytes, runtime inventory and private evidence directory. PREPARE inspected and pulled candidates without promoting them; DEPLOY rechecked the captured baseline before changing only target services; VERIFY established what actually ran and what remained unchanged. A STOP preserved the attempt's evidence instead of overwriting it or silently retrying.

An OCI index digest, platform manifest digest and local image/config ID have different roles. The configured Compose reference alone did not prove runtime identity: verification compared it with the container's actual image ID, inspected candidate/platform metadata and source revision, and checked readiness and restart state. Mutable tag resolution was recorded at publication time.

Snapshots included service/container identity, configured reference, actual image, start/restart state, health and bounded resource data. Comparisons needed stable service identity rather than incidental serialization order. Ignoring ordering did not justify ignoring real field changes, missing/extra services, duplicate identities or malformed input. Non-target services, including any backup service, had to retain their captured state.

Rollback was selective. A Web failure did not justify restarting a healthy API or reverting an additive migration. Only the exact intended image substitution could be reversed after checking for unrelated Compose drift. Migration failure required stopping and inspecting evidence, not an automatic database restore or blanket Redis reset. PREPARE backup structure/checksum validation was not a successful restore drill.

Local script tests, operator receipts, technical runtime verification, authenticated endpoint checks and owner listening/browser acceptance were separate evidence classes. HTTP 200, a meter or Connected state did not prove acoustic quality. A historical PASS applied only to its recorded source, environment and observed scope.

At public-archive preparation, staging hostnames were sanitized and the three Screen Share SHA256SUMS manifests were recalculated for the public script copies. Older validation/release hashes still describe the original operator artifacts, not those sanitized bytes. The owner accepted hostname exposure in earlier Git history. See [archive context](../operations/PUBLIC_ARCHIVE.md) and the [completed publication report](publication-readiness-2026-09-23.md).

## Voice VA.4 rollout progression

[owning Voice & Audio contract](../product/voice-audio-settings.md)

PREPARE r2 reported a captured operation and structurally validated backup. Review identified gaps in the proposed migration and preservation checks; the replacement r3 checked the complete migration/pending set, database and backup identity, image manifests and runtime baseline.

| Attempt | Historical result and lesson |
|---|---|
| r3 | Stopped before mutation while parsing an unrelated multiline Caddy environment value. The following revision limited secret-comparison inspection to its exact key. |
| r4 | Stopped before mutation because PostgreSQL inet text included a /32 prefix. An isolated database reproduction supported extracting host(inet_server_addr()) while retaining exact address equality. |
| r5 | Passed prechecks but stopped at confirmation: buffered read/write opening of /dev/tty required a seekable stream. |
| r6 | Used a read-only terminal stream and stdout prompt, checked with real Linux PTYs. It then stopped before mutation on a Caddy snapshot difference. Two later samples matched the baseline; the discarded original difference could not be reconstructed. |
| r7 | Normalized only mount/alias ordering, retained scalar/resource checks and saved both snapshots plus a safe field summary on failure. The operator subsequently reported successful deployment, expected migrations, healthy immutable candidates and non-target preservation. |

Earlier STOP evidence and the original backup were retained across the reviewed continuations. The r7 receipt reported both expected migrations applied, 15 total and none pending. Separate server VERIFY covered runtime, migrations/schema, public RN assets and infrastructure preservation. A later authenticated read of eight capture preferences completed technical verification without changing saved choices.

The integrated VA.4 matrix was subsequently accepted: T01 was operator evidence, and M01–M17 passed with their recorded agent/owner origins. Physical input switching and RNNoise remote listening were owner evidence, not universal compatibility or quality claims. Two disposable accounts remained because safe deletion was not established. The dedicated contract retains the final accepted/frozen feature boundary and detailed matrix history; broader Voice reliability debt at project freeze is still recorded in [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

## Screen Share SSUX.3

[owning Screen Share contract](../product/screen-share-ux.md)

The SSUX.3 technical candidate passed its recorded checks and was published from source SSUX.3 integration candidate. Its handoff scoped promotion to Web while preserving API and infrastructure, followed by the outstanding real-browser/listening matrix. Candidate publication was not whole-stage acceptance. CALL degradation after a viewer joined a stream remained a blocker.

## Generic Screen Audio64

Historical Audio64 rollout

The generic Screen audio candidate used a 64 kbps maximum with AEC/NS/AGC disabled and no application-assigned contentHint. It did not establish stereo delivery or diagnose CALL crackling.

A first DEPLOY attempt stopped before mutation because Redis/PostgreSQL snapshot lines changed order. Read-only diagnosis established equal inventory and full per-service values. The corrected gate compared complete original line bytes keyed by service, ignoring only service-line order and rejecting duplicates, empty/malformed input and any actual field difference; 26 local regression cases were recorded. No rollback was needed for that pre-mutation STOP.

The later owner report said the generic profile was deployed, but CALL crackling remained observable, including with Screen locally muted or at zero volume and relief after Leave Stream. This superseded the earlier pending-deployment checkpoint without proving the root cause. Screen stereo stayed deferred and SSUX.3 acceptance remained incomplete.

## CALL inbound diagnostics

[freeze defects and remaining work](../../PROJECT_STATUS.md)

The opt-in, read-only CALL inbound stats candidate was published from source historical CALL diagnostics candidate. Its recorded Web checks passed (70 suites / 931 tests, typecheck, lint and production build). Only Web was published; no new API artifact was part of that operation. The handoff bound PREPARE, selective deployment/rollback and VERIFY to an exact baseline, then proposed the bounded S0–S3 comparison.

At freeze that diagnostic candidate had not been deployed or manually validated, and the experiment had not established a diagnosis. The former handoff commands are no longer distributed; deleted registry images cannot be used to resume that operation. A fork must rebuild from its chosen source and establish fresh deployment and evidence boundaries.
