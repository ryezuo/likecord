# SEC-PREF4 Final Acceptance Record

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Acceptance date:** 2026-08-30

**Decision:** `SEC_PREF4_FINAL_GATE_PASS=true`

**Current blockers:** `0`

## Purpose and authority

This document is the consolidated, versioned execution record for the completed `SEC-PREF4` gate. The acceptance criteria remain defined by `pre-f4-runtime-upgrade-plan-2026-08-27.md`; this record captures the final candidate identity, accepted evidence, decision, rollback boundary, and deferred work.

`Candidate-B2-A`, `Candidate-B2-B`, `Candidate-B2-C`, and `Candidate-B2-D` were operational acceptance subdivisions and were not originally represented as dedicated versioned sections. This document consolidates their accepted outcomes without adding new implementation requirements.

## Accepted runtime package

The accepted runtime source remains:

`accepted pre-F.4 security candidate`

| Component | Historical image | Registry digest |
|---|---|---|
| API | `historical API image: accepted pre-F.4 security candidate` | `sha256:0ba918cfb5c9f4d8ded67993bc68bbba2b5862bebf06c4042f81985d79ec05cb` |
| Web | `historical WEB image: accepted pre-F.4 security candidate` | `sha256:af3e07c4840b8d3d23a0c341e7312e57a8b2cba17636f3eac4be22bcbb1c98e9` |

Both images are `linux/amd64`, form one matched immutable package, and have verified OCI revision correspondence to the accepted runtime source SHA.

The documentation-only commit that adds this record advances Git `HEAD` but does not change the accepted runtime package identity. It does not require an image rebuild, another Candidate-A, another staging deployment, or reopening `SEC-PREF4`.

## Mandatory sequence and final status

The mandatory sequence completed in order:

```text
SEC-BUILD-01        PASS
  -> SEC-WS-01      PASS
  -> SEC-TURN-01    PASS
  -> RUNTIME-NODE-01 PASS
  -> WEB-NEXT-01    PASS
  -> SEC-PREF4-GATE PASS
```

The application readiness race was corrected before final acceptance. The API emits `ws:ready` only after authenticated application room initialization, and Web reconciliation consumes the application-ready lifecycle rather than treating transport connection as readiness.

## Integrated acceptance

| Subdivision | Result | Accepted boundary |
|---|---|---|
| Candidate-B2-A | PASS | Auth/session, malformed UUID handling, R2 lifecycle and authorization, authenticated `ws:ready`, reconnect/reconciliation, basic realtime, and health |
| Candidate-B2-B | PASS | Browser messaging convergence, roles/hierarchy, permission revocation and canonical fallback, console, hydration, and cleanup |
| Candidate-B2-C | PASS | Voice, Screen Share, CONNECT/STREAM behavior, WebRTC/TURN, distinct networks, reconnect, and stale-viewer runtime retest |
| Candidate-B2-D | PASS | Final evidence reconciliation and binary gate decision |

The stale Screen Share viewer projection was remediated in source milestone `accepted pre-F.4 security candidate`. The staging runtime retest confirmed that a viewer reload removes the viewer from the presenter's Watching list, reconnect does not silently restore the subscription, and an explicit Join Stream action is required.

## TURN decision

- Authenticated TURN UDP relay candidate gathering: **PASS**.
- Real distinct-network test, fixed Internet ↔ mobile 4G/5G hotspot: **PASS**.
- Local and remote authenticated UDP relay candidates were observed, and a relay ↔ relay candidate pair was created.
- ICE selected a valid direct host ↔ host path because direct connectivity was available. A selected relay pair is **not required by the current authoritative gate**.
- TURN TCP is a conditional fallback where available. Functional authenticated TURN TCP allocation evidence already passed in the completed `SEC-TURN-01` boundary; artificial network degradation was not required.
- `TURN-TLS-01` formalizes the separate deferred TURNS/5349 certificate/key and functional-validation work. TURNS/5349 is not claimed as currently functional and is outside the completed `SEC-PREF4` gate.

## Deployment, health, and rollback

The matched API/Web package was deployed without recreating PostgreSQL, Redis, Caddy, or coturn. The Redis anonymous `/data` volume was preserved. Public API health and the public Web endpoint both returned HTTP 200.

The retained immediate matched-package rollback is:

| Component | Historical rollback image | Registry digest |
|---|---|---|
| API | `historical API image: malformed UUID route parameter remediation milestone` | `sha256:de9186f0d569b61fdc38f8957f28f2c3cd55b1824cf5f0fd974c1e29e36ce491` |
| Web | `historical WEB image: malformed UUID route parameter remediation milestone` | `sha256:53b7e45f100f0ee76a95ccc4f543e342a8dc1afc1771f127f88f9e0e646bed5b` |

Rollback restores API and Web only as a matched pair; it does not roll PostgreSQL backward or discard persistent volumes.

## Deferred and non-blocking work

| Item | Classification | SEC-PREF4 disposition |
|---|---|---|
| `UI-MSG-SENDER-FLICKER-01` | LOW, BEFORE-RC UX debt | Sender-only transient reconciliation flicker; no loss, duplication, receiver impact, or relevant console error; non-blocking |
| `UX-RESPONSIVE-01` | Preexisting narrow-viewport limitation; pre-RC UX sweep | Non-blocking |
| R-10 | BEFORE-RC API production dependency closure/pruning | Does not block F.4 |
| R-11 | BEFORE-RC non-root API/Web runtime users | Does not block F.4 |
| Intermittent Voice ICE auth 401 | BEFORE-RC reliability debt | Not reproduced on the accepted candidate; not reopened |
| `TURN-TLS-01` | Deferred TURNS/5349 work | Outside `SEC-PREF4`; current TURNS functionality is not asserted |

## Final decision

```text
SEC_PREF4_CANDIDATE_B2_A_PASS=true
SEC_PREF4_CANDIDATE_B2_B_PASS=true
SEC_PREF4_CANDIDATE_B2_C_PASS=true
TURN_UDP_CANDIDATE_GATHERING_PASS=true
TURN_SELECTED_RELAY_CURRENT_CANDIDATE_PASS=NOT_REQUIRED_BY_CURRENT_GATE
B2C_STALE_VIEWER_RUNTIME_RETEST_PASS=true
CURRENT_PREF4_BLOCKERS=0
SEC_PREF4_FINAL_GATE_PASS=true
NEXT_IMPLEMENTATION_STAGE=F.4
```

F.4 is the next implementation stage. It was not started by this documentation reconciliation.
