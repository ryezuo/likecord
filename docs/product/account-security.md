# ACCOUNT_SECURITY_01 — Accepted and frozen Account Security contract

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

## 1. Status

```text
STATUS=COMPLETE_ACCEPTED_FROZEN
CONTRACT_FINALIZED=true
CONTRACT_PENDING_USER_DECISIONS=false
IMPLEMENTATION_NOT_STARTED=false
IMPLEMENTATION_STARTED=true
IMPLEMENTATION_READY=true
AS1_IMPLEMENTED=true
AS1_AUTOMATED_VALIDATION_PASS=true
AS2_IMPLEMENTED=true
AS2_AUTOMATED_VALIDATION_PASS=true
AS3_COMPLETE=true
CONTRACT_ACCEPTED=true
CONTRACT_FROZEN=true
COMPLETE=true
ACCEPTED=true
```

This is the authoritative dedicated implementation contract. The preflight
evidence remains historical evidence; the dispositions in sections 12 and 23
are explicitly accepted and frozen product/security semantics. AS.1 and AS.2
are implemented and passed their proportional automated validation. AS.3 then
closed the API E2E gap, published and deployed same-source immutable API/Web
artifacts, safely applied the required migration, and passed the complete
Staging/manual matrix. ACCOUNT_SECURITY_01 is complete, accepted and frozen.

## 2. Authority and scope

This accepted dedicated owner precedes the roadmap for ACCOUNT_SECURITY_01.
Source still owns current implementation behavior. The scope is email/password change with current
password reauthentication, canonical unique email, existing password policy,
explicit session/token semantics, audit, rate limits and an explicit
`passwordChangeRequired` disposition. Section 22 is non-scope.

## 3. Baseline and inspected owners

Sections 3–10 preserve the read-only contract-preflight baseline from before
AS.1. They are historical evidence and do not override the implemented behavior
recorded in sections 14, 16, 17 and the current API/database/architecture owners.

Baseline `post-VI roadmap expansion milestone`, subject
`docs(product): expand post-vi roadmap`; branch created directly from it.

| Concern | Current evidence |
|---|---|
| Auth routes/cookies | `apps/api/src/auth/auth.controller.ts:15-155` |
| Register/login/refresh/logout/JWT | `apps/api/src/auth/auth.service.ts:24-188` |
| DTO/password policy | `apps/api/src/auth/dto/auth.dto.ts:1-28` |
| Hash/JWT owners | `apps/api/src/auth/password.ts:1-14`; `strategies/jwt.strategy.ts:6-28` |
| Refresh cleanup | `apps/api/src/auth/refresh-cleanup.service.ts:9-60` |
| User self/profile | `apps/api/src/user/user.controller.ts:53-66`; `user.service.ts:9-44`; `dto/update-profile.dto.ts:1-13` |
| Validation/CORS/CSRF | `apps/api/src/main.ts:13-43`; `csrf/csrf.middleware.ts:5-84`; `app.module.ts:63-66` |
| Strict mutation precedent | `apps/api/src/user/avatar/avatar.guard.ts:10-34` |
| Rate limits/audit | `apps/api/src/rate-limit/rate-limit.guard.ts:10-102`; `apps/api/src/audit/audit.service.ts:5-24` |
| Data/migrations | `packages/database/prisma/schema.prisma:15-41,250-281`; initial migration `:2-16,137-160,190-193,220-229` |
| Bootstrap | `apps/api/src/bootstrap/first-user-bootstrap.service.ts:47-95` |
| Web auth/API | `apps/web/src/lib/api.ts:10-140`; `hooks/useAuth.tsx:6-135` |
| Login/Register/Settings | `apps/web/src/app/page.tsx:9-74`; `app/register/page.tsx:10-96`; `components/settings/UserSettings.tsx:16-172` |
| Mounted owners | `apps/web/src/app/app/page.tsx:57-100,1086-1091` |
| WebSocket auth | `apps/api/src/ws/ws.gateway.ts:67-108` |
| Test seams (not run) | `apps/api/test/auth.e2e-spec.ts:65-321`; `first-user-bootstrap.e2e-spec.ts:67-222`; Web auth/settings suites |

Required product/API/database/architecture/navigation documents and relevant
security/operations records were inspected under repository precedence.

## 4. Current authentication architecture

- Login identifier is email only, using exact Prisma lookup. Username is not a
  login identifier.
- Register/login validate email but do not trim, lowercase or otherwise
  normalize it. Register checks/stores the exact value. Bootstrap alone trims
  email/username, without lowercase.
- Login verifies via direct `argon2.verify`; register and bootstrap share
  `hashPassword`. No shared verification helper exists.
- Successful register/login set Secure, HttpOnly, SameSite=Lax access/refresh
  cookies. Global JWT auth extracts the access cookie. Self routes derive the
  current User ID from auth and accept no target ID.

## 5. Current token/session lifecycle

- Access JWT lifetime: 900 seconds. Claims: `sub`, `email`, `username`, plus JWT
  timestamps. No role, permission, `passwordChangeRequired`, session ID, `jti`
  or auth version.
- Access JWTs are stateless signature/expiry credentials. No immediate
  revocation exists. Revoking refresh does not invalidate an issued access JWT;
  REST residual access lasts up to 15 minutes.
- WebSocket validates the JWT only at connection using `sub`; refresh revocation
  and later JWT expiry do not disconnect an established socket.
- Refresh lifetime: 30 days. The raw 64-byte random token is returned as a
  cookie; SHA-256 hash, User ID, optional agent/IP, expiry/revocation are stored
  in PostgreSQL.
- Rotation revokes the presented row then creates a new row/pair as separate
  writes. Reuse of the old row is rejected, but there is no token-family link,
  compromise detection or descendant/all-session response: rejection is not
  reuse detection.
- Logout revokes only the presented refresh token and clears this browser's
  cookies. Other sessions, issued access JWTs and sockets remain.
- The schema/user index permits future internal enumeration/updateMany by User,
  but no Auth method or session UI exposes it. Revoked rows are retained seven
  days; expired rows are removed by hourly cleanup.

On an ordinary Web 401, the API client attempts one single-flight refresh. If
refresh fails it throws, but does not clear `AuthProvider`'s user. Bootstrap and
manual logout do clear it. An already-mounted client can retain its shell and
repeatedly fail requests until reload/logout; its socket/media are not reconciled.

## 6. Email identity, normalization and uniqueness

There is no common normalization algorithm: Auth does none; bootstrap trims
only. Actual storage is PostgreSQL `TEXT` with exact unique index, not `CITEXT`;
no migration creates `citext`. Therefore case variants can coexist. The stale
physical description in `docs/database.md` is corrected by this preflight.

Email claims become stale after a change, but inspected REST controllers use
only authenticated `id` and WebSocket uses only `sub`; no current authorization
consumer uses claim email/username. That makes stale email semantically harmless
today, but does not decide whether stolen/other sessions should survive.

The accepted canonical invariant (D07) requires existing-data collision
audit/backfill and database enforcement; a migration is required.

## 7. Password policy/hashing

Policy is string length 8..128, no normalization or complexity rule. Argon2id
uses memory 65,536 KiB, time cost 3, parallelism 2. Register/bootstrap share the
hash helper; login verification is direct. Future change-password must reuse
these semantics and consolidate verification, not invent divergent rules.

## 8. `passwordChangeRequired`

The field exists/defaults false but production source never sets, reads, exposes,
clears or enforces it. The admin-reset document is explicitly unimplemented and
its referenced script does not exist. No forced-change UI/API exists. Its only
documented intent is an administrator temporary password, which would itself be
the valid current password. There is no existing state machine to reuse.

## 9. Audit, rate-limit and CSRF boundaries

`AuditLogService` already records actor, optional server, action/target/details;
Server/Channel/Category/Role/Invite/moderation use it. Auth/User actions do not.
`ACCOUNT_EMAIL_CHANGED` and `ACCOUNT_PASSWORD_CHANGED` fit its action column.
Accepted policy: actor/target=current User; omit old/new email, passwords, hashes,
tokens and cookies; optional metadata only for session-policy/count. No parallel
audit system.

Current Redis limits are register 3/hour/IP, login 5/min/IP, refresh 10/min/IP;
avatar mutations are 10/10min/account and fail closed. Accepted policy: dedicated
account+IP credential buckets, 5 failed reauth attempts/15min and 5 mutations/
hour/account, 429 plus `Retry-After`; values remain unaccepted.

### Security finding SEC-AS01-F01 — credential boundary remediated in AS.1

The generic CSRF middleware permits the first unsafe request when no CSRF cookie
was supplied (`csrf.middleware.ts:18-25,53-55`), permits missing Origin/Referer in
production, and compares allowed origin by prefix (`:77-83`). Register/login/
refresh/logout are explicitly exempt (`:41-46`), despite auth-test comments
calling refresh/logout protected. SameSite=Lax is defense in depth, not the
documented double-submit guarantee.

This pre-existing generic inconsistency remains **High** and is not a
comprehensive or application-wide CSRF audit. AS.1 added a bounded reusable
credential-mutation guard requiring an existing cookie/header match and exact
parsed Origin (Referer origin only when Origin is absent), following the avatar
precedent. Therefore the email/password mutation boundary is remediated while
the global generic finding remains unfixed.

## 10. Settings/Web ownership

`AuthProvider` owns one AuthUser. `UserSettings` owns `My Account`/`Appearance`;
email and username are read-only inside the profile form. DTO/Web API allow only
display name/bio, so PATCH `/users/@me` intentionally excludes email, username,
password.

Future owner: independent `Account Security` destination/forms within
`UserSettings`, never generic profile PATCH. The conditional Settings overlay is
inside persistent `AppContent`; WebSocket/Voice/Screen Share owners are above it,
so adding the surface needs no remount. No mailer/provider, verification token,
emailVerified field or verification/recovery flow exists; verified email is not
a current product concept.

## 11. Threat model

Cover stolen authenticated browser, CSRF/same-site attacker, session hijack,
reauth credential stuffing, email races, stale claims, stolen refresh token,
multi-device retention, audit leakage and partial PostgreSQL/session failure.
Never promise access/socket invalidation the architecture cannot enforce.

## 12. Decisions AS01-D01..D11

### AS01-D01 — Current password — `ACCEPT_OPTION_A`

Current password is required for email and password changes. This limits
stolen-session takeover and reuses Argon2 verification. A forced-flag user must
provide the valid temporary/current password; no bypass exists.

### AS01-D02 — Password-change sessions — `ACCEPT_OPTION_A`

A revoke other refresh sessions, rotate/reconcile current credentials, keep this
device/media. Best UX/security balance, but current tokens cannot identify or
immediately revoke other access/sockets. B revoke all refresh sessions/cookies
and force login, disconnecting current media; still cannot immediately revoke
other access/sockets without architecture work. Both cross PostgreSQL/cookie/
socket boundaries and cannot be distributed-atomic. The accepted policy is A:
preserve and rotate the explicitly reauthenticated current session and revoke
all others. D11 is mandatory enforcement; refresh-only deletion or a natural
15-minute JWT residual does not satisfy this policy.

### AS01-D03 — Email-change sessions/tokens — `ACCEPT_OPTION_A`

A rotate current credentials and revoke others; B revoke all/force new-email
login; C preserve all because stale email claims are currently unused.
The accepted policy is A, treating login-identity change as sensitive: preserve
and rotate current authentication with the canonical email claim, revoke all
other sessions and permit no stale email claim on the retained session.

### AS01-D04 — New-email ownership — `ACCEPT_OPTION_A`

A current password + canonical unique new email, without verification; B block
until verification; C add delivery/verification (scope expansion). A is accepted
because no verified-email promise, mail or recovery infrastructure
exists. Current-password reauthentication proves control of the current
Likecord account; it explicitly does **not** prove ownership/control of the new
mailbox. V1 adds no mail provider. Mailbox verification remains out of scope.

### AS01-D05 — `passwordChangeRequired` — `ACCEPT_OPTION_B`

A complete forced-change gate now (exposure and allowed-route/API/UI policy);
B bounded integration: require current/temp password, clear on successful password
change, block email while true, leave other Settings/logout available, without
claiming a global forced gate; C leave dormant. B is accepted: require the
current/temporary password, clear the field after successful password change,
and block email change while it is true. Do not introduce a second or broad
global forced-password state machine; other Settings/logout remain outside one.

### AS01-D06 — Password policy — `ACCEPTED`

Reuse is frozen: length 8..128, no normalization/new complexity, and the existing
Argon2id configuration. Verification ownership may be consolidated without
changing password semantics.

### AS01-D07 — Email normalization/uniqueness — `ACCEPT_OPTION_A`

A `trim()` then locale-independent lowercase of the whole address everywhere,
with migration; B trim only/case-sensitive identity; C trim plus database
`citext`. A is accepted: `trim()` then locale-independent lowercase for register,
login, bootstrap, change email and persisted canonical identity. The migration
must first find every legacy value that collapses to the same canonical email.
Any collision is a STOP requiring manual reconciliation: never pick a winner,
delete/merge accounts, add a suffix, fabricate an address or silently resolve.
After a clean audit, backfill and database uniqueness remain final authority;
map unique violations and never rely solely on check-then-write.

### AS01-D08 — Audit — `ACCEPTED`

Reuse the existing owner for email/password change events. Store no full old/new
email, password/hash, access/refresh token, cookie or credential secret. Exact
event names may follow existing vocabulary during implementation without a new
product gate. User+audit may share a PostgreSQL transaction.

### AS01-D09 — Abuse — `ACCEPTED`

Use separate fail-closed account-oriented counters: 5 failed reauthentication
attempts per 15 minutes, and 5 successful credential-mutation attempts per hour.
The counters are logically separate. IP may be an additional dimension. A limit
response precedes email-availability/password detail.

### AS01-D10 — CSRF/cookie/origin — `ACCEPT_OPTION_A`

A factor avatar-strength exact checks into reusable credential-route guard; B
harden global middleware first with regression coverage. A is accepted for
bounded AS.1 without claiming global remediation. If evidence shows active
exploitation on unrelated mutations, surface it separately under security
governance rather than silently expanding this stage. A reusable strict boundary must
require authenticated current account, a pre-existing cookie/header match and
exact parsed same origin; prefix matching and a first untokened credential
mutation are forbidden. SEC-AS01-F01 remains High, unfixed and blocking until
this boundary passes. This is not application-wide CSRF remediation.

### AS01-D11 — Real session revocation — `ACCEPTED`

`REFRESH_SESSION_REVOKED` is not
`ALREADY_ISSUED_ACCESS_TOKEN_INVALIDATED`. Options: session-ID claim validated
against durable/Redis state; User auth generation; Redis revocation extension;
or an account/session generation. The frozen security semantics require usable
session identity for access authentication and authenticated sockets. A revoked
session's issued access token must fail protected authorization, its refresh must
fail, and its socket must disconnect or otherwise fail closed. The retained
current session must rotate after either credential change. A 15-minute JWT
residual is explicitly not accepted as revocation. Exact PostgreSQL/Redis/bounded
combined storage remains an implementation choice; ephemeral truth may not
weaken durable recovery or this promise.

## 13. Accepted/frozen decisions summary

D01-A; D02-A with mandatory D11 enforcement; D03-A; D04-A; D05-B; D06 reuse;
D07-A; D08 existing audit/no full emails or secrets; D09 accepted separate
cadences; D10-A; D11 real session-bound revocation semantics. All are
`DECISION_ACCEPTED` and frozen for AS.1–AS.3 implementation.

## 14. Implemented AS.1 API boundary

AS.1 implements dedicated self-only PATCH `/users/@me/email` and
`/users/@me/password` routes with explicit DTOs, current-password verification,
strict CSRF/exact-origin admission and no target ID, query secret or generic
profile mutation. Errors use stable application codes without exposing database
constraints, hashes, tokens, cookies or stacks. Generic PATCH `/users/@me`
continues to exclude email and password.

## 15. Implemented AS.2 Settings UX

User Settings now has `ACCOUNT > Account Security` beside the preserved My
Account destination, with independent email (current read-only/new/current-
password/action) and password (current/new/confirm/action) forms. The forms use
email/current-password/new-password autocomplete, store no secrets, clear
sensitive fields after success and terminal failure, expose scoped pending/
success/error state, prevent double submission, and do not couple to profile
save. The existing page-layer, Appearance destination and separate Log Out
action remain intact.

`passwordChangeRequired` is included in the authenticated User projection. When
true, Account Security presents the bounded explanation and disables only email
mutation; password change, unrelated Settings, navigation and Log Out remain
available. A successful password change returns the authoritative User with the
flag false.

## 16. Implemented AS.1 session/token architecture

PostgreSQL is the durable session authority. Each `refresh_sessions` row is one
stable logical authenticated session: its row ID is the access JWT `sid`, and
`accessVersion` is the JWT `sv`. Routine refresh atomically replaces the
credential hash on the same active row, so it invalidates refresh-token reuse
without changing the logical session or disconnecting its socket. Protected
REST requests validate `sid`, `sv`, user ownership, expiry and revocation against
PostgreSQL. Credential changes increment the retained session version and revoke
all other rows, immediately rejecting old access/refresh credentials.

The current single API process maintains only the bounded socket association
index from session ID to authenticated sockets. PostgreSQL remains authoritative;
Redis is not session truth. Revocation quarantines affected sockets before
transport disconnect, so a disconnect failure cannot leave them authorizing new
packets. This is a bounded implementation choice under D11, not a newly frozen
product/security decision.

## 17. Failure/transaction ordering

Password follows rate admission -> verify current -> validate/hash -> serializable
PostgreSQL User/session/audit transaction -> socket reconciliation -> client.
Email follows the same ordering with shared canonicalization and database
uniqueness as final authority. Before transaction commit, failure changes no
credential state. The committed transaction rotates the current logical session
and revokes every other session before socket transport work. If post-commit
socket reconciliation throws, affected sockets were already quarantined, the
old current access version is invalid, and the API returns a recoverable 503
instead of misleading success; login with the new credential recovers. No
distributed atomicity across PostgreSQL, Redis, cookies/JWT and socket transport
is claimed.

## 18. Accepted implementation sequence and current position

1. AS.1 backend/auth/session: implemented and automated validation passed.
2. AS.2 Settings: implemented and automated-validated with independent forms,
   shared Auth reconciliation, bounded forced lifecycle and mounted-owner tests.
3. AS.3 integrated: immutable publication, controlled migration, real Staging
   multi-session/media matrix, final acceptance/freeze.

This three-slice sequence is complete and accepted. No later stage was started
by this closure; `THEME_ENGINE_01` is the exact next post-VI stage.

## 19. AS.1 automated validation

AS.1 covers unauthenticated and strict CSRF/origin cases; correct/wrong current
password and independent rate limits; normalization, invalid/same/conflict and
concurrent uniqueness; isolation/no target ID; password policy/hash/old-new
login; bounded forced flag; current/other refresh/access/socket semantics;
secret-free audit; migration collision/rollback/invariant; and transaction and
post-commit reconciliation failure.

AS.2 Web validation covers Settings navigation; forms independent from profile/
each other; autocomplete; validation/pending; wrong password/conflict/rate/CSRF;
auth reconciliation; definitive-invalid versus transient refresh behavior; no
secret storage; clearing; existing logout; no owner remount; and Voice/Screen
Share preservation. Focused Web Jest passed 9 suites/92 tests, the final full
Web suite passed 48 suites/645 tests, and Web typecheck passed. The focused API
response-projection unit seam passed 1 suite/3 tests and API typecheck passed.
Both linters passed with zero errors (79 existing Web warnings and 161 existing
API warnings).

AS.3 closed the earlier API E2E harness gap before publication. A fresh,
disposable PostgreSQL database received all nine repository migrations,
including `20260907120000_account_security_session_foundation`, with a separate
disposable Redis. The canonical focused Account Security and directly affected
Auth E2E suites then passed together: 2 suites and 31 tests. The former
`AS2_API_E2E_TEST_HARNESS_UNAVAILABLE` limitation is historical and no longer an
open validation gap.

## 20. Manual/Staging matrix

`AS-M01` correct email; `M02` wrong password; `M03` duplicate; `M04`
normalization; `M05` F5 after email; `M06` new/old email login; `M07` correct
password change; `M08` wrong current; `M09` new/old password login; `M10` current
session; `M11` second browser; `M12` third device; `M13` revoked refresh/reuse;
`M14` issued-access residual; `M15` socket; `M16` logout; `M17` forced flag;
`M18` rate limits; `M19` active Voice; `M20` active Screen Share; `M21` back/
refresh/error recovery; `M22` 100/125/150% zoom/reduced height; `M23` secret-free
audit; `M24` concurrent collision/post-commit failure. All AS-M01 through
AS-M24 passed on Staging. The user-provided critical evidence records an already
valid access request returning 200 immediately before revocation and 401 only
5–10 seconds afterward, excluding natural expiry; the already-connected other
session socket disconnected without browser refresh, and its refresh returned
401. The retained current session, active Voice and active Screen Share all
survived the successful credential mutation. Audit inspection found five
events, zero leaking details and zero non-self targets.

## 21. STOP conditions

Stop on implementation that contradicts frozen D01-D11; unavailable authoritative
verification; inconsistent normalization; unresolved migration collision; unenforceable session
promise; access/socket contradiction; mass assignment; newly required mail;
secret-leaking audit; weakened auth; Voice/WebRTC/Screen Share, username, MFA or
session-UI entanglement; any Critical/High defect. Discovered stops are
SEC-AS01-F01's credential boundary, D07 migration/collision policy and truthful
D02/D03 access/socket revocation architecture were satisfied in AS.1 and
validated in the final Staging matrix. The global generic CSRF finding remains
High and open; this milestone does not claim application-wide remediation.

## 22. Explicit non-scope and later gates

Username editing, MFA, session UI, OAuth/social, deletion, passwordless,
recovery-email redesign, broad profile redesign, mail provider, credential
realtime/profile/avatar events, Voice/WebRTC/Screen Share changes and later
roadmap items. This does not replace TEST-HARDEN-01, QA-GATE-01,
SEC-APP-AUDIT-01/remediation, SEC-DAST-01, RC-STABILIZATION or RC-SECURITY-GATE.

## 23. Explicit accepted decisions

| ID | Frozen disposition |
|---|---|
| D01 | A — current password for both changes; no forced-user bypass |
| D02 | A — preserve/rotate current session; revoke every other session under D11 |
| D03 | A — preserve/rotate current with canonical claim; revoke every other session |
| D04 | A — no mailbox verification; ownership is explicitly not proven |
| D05 | B — bounded flag integration; no global state machine |
| D06 | Reuse 8..128 and existing Argon2id semantics |
| D07 | A — trim+lowercase everywhere; collision-safe migration/manual STOP |
| D08 | Reuse AuditLog; no full emails or credential secrets |
| D09 | 5 failures/15m and separate 5 mutations/1h account counters |
| D10 | A — strict reusable credential guard implemented; global finding remains unfixed |
| D11 | Real access/refresh/socket revocation; no 15-minute residual acceptance |

## 24. Final integrated acceptance and freeze — 2026-09-07

AS.3 used application source
`account security controls milestone` for both services:

| Service | Historical image | Immutable OCI index | Application manifest | Provenance/attestation |
|---|---|---|---|---|
| API | `historical API image: account security controls milestone` | `sha256:db217f89fc6d58800f337db116c3ad35237b04d41b0deb09786b4b2d6c800397` | `sha256:007b4132443edba0e9056ebda09dcaa3d5bb63164f8e0e6a3ac7f27b5abb00e7` (`linux/amd64`) | `sha256:5677252fc2eacc6d491c68caf4136181bcaa8daf7fb6589f3b34caef1d05a485` |
| Web | `historical WEB image: account security controls milestone` | `sha256:926b0349989d2977a26c9c23d633b31d2e858cee8f9f5ea1cdb9b39682dd0d95` | `sha256:2a1cfc45c1565fe4d2f71312a91e997608aed9107606d089e3d7dc06f95bffd7` (`linux/amd64`) | `sha256:753858e1ff7eed12c9b7f1e126e87bb470ac7971bd9617634632fb3ecbd41c84` |

Release sanity passed the exact production Dockerfiles and default plain-Node
CMDs, verified packaged migration/client artifacts, health 200 and zero
restarts. Manual-operator `PREPARE -> DEPLOY -> VERIFY` passed. PREPARE created
and checksum-verified a nonempty PostgreSQL backup before migration and found no
canonical-email collision. `prisma migrate deploy` applied
`20260907120000_account_security_session_foundation`; final Prisma status was
current with no additional pending migration. API and Web were replaced
selectively by their immutable index references, remained healthy with zero
restarts, and preserved PostgreSQL, Redis, Caddy and coturn container invariants.

AS-M01–AS-M24 all passed, including mandatory AS-M11, M13, M14, M15, M19 and
M20. Runtime strict-CSRF missing/mismatch probes returned 403. The credential
mutation boundary is therefore remediated and validated, while the broader
SEC-AS01-F01 finding remains High with `GLOBAL_FIXED=false`. No R2 mutation,
Redis flush, automatic Screen/Voice reset, rollback or stale-media incident
occurred. The known restart-stale Voice and Screen Share debts remain separate
and unfixed.

## 25. Documentation impact

- Updated by final closure: this owner, the post-VI owner, roadmap and
  `AI_CONTEXT.md` navigation/current-stage pointers.
- New accepted decisions: final AS.3 integrated acceptance and
  ACCOUNT_SECURITY_01 completion/acceptance/freeze. D01–D11 are unchanged.
- Implemented bounded choices: PostgreSQL-authoritative stable logical sessions,
  session-version claims, same-row refresh rotation, dedicated credential routes
  and an in-process socket association/quarantine index for the current monolith.
- Proposed/deferred ideas not authoritative: none introduced by this closure;
  `THEME_ENGINE_01` remains the accepted next stage but is not started here.
- Stale documentation introduced: none.

```text
DOCUMENTATION_UPDATED=docs/product/account-security.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=ACCOUNT_SECURITY_01_final_AS3_acceptance_and_freeze
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 26. Status markers / next action

```text
ACCOUNT_SECURITY_01_STARTED=true
ACCOUNT_SECURITY_01_PREFLIGHT_COMPLETE=true
ACCOUNT_SECURITY_01_CONTRACT_CREATED=true
ACCOUNT_SECURITY_01_CONTRACT_FINALIZED=true
ACCOUNT_SECURITY_01_CONTRACT_ACCEPTED=true
ACCOUNT_SECURITY_01_CONTRACT_FROZEN=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_READY=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_STARTED=true
ACCOUNT_SECURITY_01_AS1_STARTED=true
ACCOUNT_SECURITY_01_AS1_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS1_AUTOMATED_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_AS2_STARTED=true
ACCOUNT_SECURITY_01_AS2_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS2_AUTOMATED_VALIDATION_PASS=true
AS2_API_E2E_REVALIDATED=true
AS2_API_E2E_PASS=true
ACCOUNT_SECURITY_01_AS3_COMPLETE=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_COMPLETE=true
ACCOUNT_SECURITY_01_FINAL_STAGING_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_FINAL_MANUAL_ACCEPTANCE_PASS=true
ACCOUNT_SECURITY_01_COMPLETE=true
ACCOUNT_SECURITY_01_ACCEPTED=true
ACCOUNT_SECURITY_01_FROZEN=true
ACCOUNT_SECURITY_01_USER_DECISIONS_PENDING=false
AS01_D01_ACCEPTED=true
AS01_D02_ACCEPTED=true
AS01_D03_ACCEPTED=true
AS01_D04_ACCEPTED=true
AS01_D05_ACCEPTED=true
AS01_D06_ACCEPTED=true
AS01_D07_ACCEPTED=true
AS01_D08_ACCEPTED=true
AS01_D09_ACCEPTED=true
AS01_D10_ACCEPTED=true
AS01_D11_ACCEPTED=true
CURRENT_PASSWORD_REQUIRED_FOR_EMAIL_CHANGE=true
CURRENT_PASSWORD_REQUIRED_FOR_PASSWORD_CHANGE=true
FORCED_PASSWORD_CURRENT_PASSWORD_BYPASS=false
PASSWORD_CHANGE_CURRENT_SESSION_POLICY=preserve_and_rotate
PASSWORD_CHANGE_OTHER_SESSIONS_POLICY=revoke_all
EMAIL_CHANGE_CURRENT_SESSION_POLICY=preserve_and_rotate
EMAIL_CHANGE_OTHER_SESSIONS_POLICY=revoke_all
EMAIL_CHANGE_STALE_TOKEN_CLAIMS_ALLOWED=false
NEW_EMAIL_VERIFICATION_REQUIRED=false
NEW_EMAIL_MAILBOX_OWNERSHIP_PROVEN=false
PASSWORD_CHANGE_REQUIRED_CLEARED_ON_SUCCESSFUL_PASSWORD_CHANGE=true
EMAIL_CHANGE_BLOCKED_WHILE_PASSWORD_CHANGE_REQUIRED=true
PASSWORD_POLICY_REUSE_EXISTING=true
PASSWORD_LENGTH_MIN=8
PASSWORD_LENGTH_MAX=128
PASSWORD_NEW_COMPLEXITY_RULES=false
PASSWORD_HASHING_REUSE_EXISTING_ARGON2ID=true
EMAIL_CANONICALIZATION=trim_lowercase
EMAIL_NORMALIZATION_REGISTER=true
EMAIL_NORMALIZATION_LOGIN=true
EMAIL_NORMALIZATION_BOOTSTRAP=true
EMAIL_NORMALIZATION_CHANGE_EMAIL=true
EMAIL_MIGRATION_REQUIRED=true
EMAIL_MIGRATION_CREATED=true
EMAIL_CANONICALIZATION_COLLISION_AUTO_RESOLUTION=false
EMAIL_CANONICALIZATION_COLLISION_REQUIRES_MANUAL_RECONCILIATION=true
EMAIL_CANONICALIZATION_COLLISION_ABORT_IMPLEMENTED=true
AUDIT_OWNER_REUSE_EXISTING=true
AUDIT_STORE_FULL_OLD_NEW_EMAIL=false
AUDIT_STORE_CREDENTIAL_SECRETS=false
REAUTH_FAILURE_LIMIT=5
REAUTH_FAILURE_WINDOW=15m
CREDENTIAL_MUTATION_LIMIT=5
CREDENTIAL_MUTATION_WINDOW=1h
REAUTH_FAILURE_COUNTER_SEPARATE_FROM_SUCCESSFUL_MUTATION_COUNTER=true
STRICT_CSRF_ORIGIN_GUARD_REQUIRED=true
CSRF_COOKIE_HEADER_MATCH_REQUIRED=true
EXACT_SAME_ORIGIN_REQUIRED=true
ORIGIN_PREFIX_MATCH_ALLOWED=false
FIRST_UNTOKENED_CREDENTIAL_MUTATION_ALLOWED=false
ACCESS_TOKEN_SESSION_IDENTITY_REQUIRED=true
ACCESS_TOKEN_SESSION_IDENTITY_IMPLEMENTED=true
REVOKED_SESSION_ACCESS_TOKEN_REJECTED=true
REVOKED_SESSION_REFRESH_REJECTED=true
REVOKED_SESSION_SOCKET_DISCONNECTED=true
CURRENT_SESSION_ROTATION_REQUIRED_AFTER_CREDENTIAL_CHANGE=true
CURRENT_SESSION_ROTATION_IMPLEMENTED=true
ROUTINE_REFRESH_PRESERVES_LOGICAL_SESSION=true
ACCESS_TOKEN_15_MINUTE_RESIDUAL_ACCEPTED_AS_REVOCATION=false
SESSION_STATE_STORAGE_ARCHITECTURE_FROZEN=false
SEC_AS01_F01_CONFIRMED=true
SEC_AS01_F01_SEVERITY=HIGH
SEC_AS01_F01_FIXED=false
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_REMEDIATED=true
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_VALIDATED=true
SEC_AS01_F01_GLOBAL_FIXED=false
SEC_AS01_F01_BLOCKS_CREDENTIAL_MUTATIONS=false
REALTIME_CREDENTIAL_EVENT_REQUIRED=false
ACCOUNT_SECURITY_SETTINGS_IMPLEMENTED=true
ACCOUNT_SECURITY_EMAIL_FORM_IMPLEMENTED=true
ACCOUNT_SECURITY_PASSWORD_FORM_IMPLEMENTED=true
AUTH_PROVIDER_EMAIL_RECONCILIATION_IMPLEMENTED=true
AUTH_PROVIDER_CURRENT_SESSION_PRESERVATION_IMPLEMENTED=true
AUTH_PROVIDER_INVALID_SESSION_CLEAR_IMPLEMENTED=true
PASSWORD_CHANGE_REQUIRED_SETTINGS_INTEGRATION_IMPLEMENTED=true
CREDENTIAL_UI_SECRET_PERSISTENCE=false
CREDENTIAL_UI_LOCAL_TOKEN_STORAGE=false
USER_SETTINGS_01_REOPENED=false
USER_AVATAR_02_REOPENED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
CURRENT_VOICE_PRESERVED_ON_SUCCESSFUL_CREDENTIAL_MUTATION=true
CURRENT_SCREEN_SHARE_PRESERVED_ON_SUCCESSFUL_CREDENTIAL_MUTATION=true
AS2_BACKEND_RECONCILIATION_REQUIRED=false
AS2_API_E2E_TEST_HARNESS_UNAVAILABLE=false
EMAIL_MIGRATION_APPLIED_STAGING=true
EMAIL_CANONICALIZATION_COLLISION_FOUND=false
DATABASE_BACKUP_BEFORE_MIGRATION_PASS=true
PREPARE_PASS=true
DEPLOY_PASS=true
VERIFY_PASS=true
API_WEB_SAME_SOURCE=true
REVOKED_SESSION_ACCESS_TOKEN_REJECTED_STAGING=true
REVOKED_SESSION_REFRESH_REJECTED_STAGING=true
REVOKED_SESSION_SOCKET_DISCONNECTED_STAGING=true
CURRENT_SESSION_PRESERVED_STAGING=true
CURRENT_VOICE_PRESERVED_STAGING=true
CURRENT_SCREEN_SHARE_PRESERVED_STAGING=true
AS_M01=PASS
AS_M02=PASS
AS_M03=PASS
AS_M04=PASS
AS_M05=PASS
AS_M06=PASS
AS_M07=PASS
AS_M08=PASS
AS_M09=PASS
AS_M10=PASS
AS_M11=PASS
AS_M12=PASS
AS_M13=PASS
AS_M14=PASS
AS_M14_PRE_HTTP=200
AS_M14_POST_HTTP=401
AS_M14_DELTA_SECONDS=5-10
AS_M14_NATURAL_EXPIRY_EXCLUDED=true
AS_M15=PASS
AS_M15_EXISTING_SOCKET_PRE=connected
AS_M15_EXISTING_SOCKET_POST=disconnected
AS_M15_BROWSER_REFRESH_BEFORE_EVIDENCE=false
AS_M16=PASS
AS_M17=PASS
AS_M18=PASS
AS_M19=PASS
AS_M20=PASS
AS_M21=PASS
AS_M22=PASS
AS_M23=PASS
AS_M24=PASS
AUDIT_EVENT_COUNT=5
AUDIT_LEAK_COUNT=0
AUDIT_SELF_TARGET_FAILURES=0
VOICE_STALE_STATE_AFTER_API_RESTART_01=true
VOICE_STALE_STATE_FIXED=false
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_FIXED=false
R2_MUTATED=false
FLUSHDB_PERFORMED=false
AUTOMATIC_SCREEN_STATE_RESET=false
AUTOMATIC_VOICE_STATE_RESET=false
ROLLBACK_PERFORMED=false
ACCOUNT_SECURITY_01_RUNTIME_SOURCE_MILESTONE=account security controls milestone
ACCOUNT_SECURITY_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:db217f89fc6d58800f337db116c3ad35237b04d41b0deb09786b4b2d6c800397
ACCOUNT_SECURITY_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:926b0349989d2977a26c9c23d633b31d2e858cee8f9f5ea1cdb9b39682dd0d95
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
NEXT_ACTION=commission_THEME_ENGINE_01
```
