# Likecord Theme Engine — THEME_ENGINE_01

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> **Status:** `PREFLIGHT_COMPLETE / CONTRACT_FINALIZED / CONTRACT_ACCEPTED /
> CONTRACT_FROZEN / IMPLEMENTATION_COMPLETE / TE.1_IMPLEMENTED /
> TE.1_AUTOMATED_VALIDATION_PASS / TE.2_IMPLEMENTED /
> TE.2_AUTOMATED_VALIDATION_PASS / TE.3_COMPLETE / COMPLETE / ACCEPTED /
> FROZEN`
>
> **Recorded:** 2026-09-07
>
> **Classification:** TE01-D01 through TE01-D10 remain accepted and frozen. TE.1
> and TE.2 are implemented and automatically validated. TE.3 integrated
> publication/Staging acceptance is complete; the milestone is accepted and
> frozen.

```text
THEME_ENGINE_01_STARTED=true
THEME_ENGINE_01_PREFLIGHT_COMPLETE=true
THEME_ENGINE_01_CONTRACT_CREATED=true
THEME_ENGINE_01_CONTRACT_FINALIZED=true
THEME_ENGINE_01_CONTRACT_ACCEPTED=true
THEME_ENGINE_01_CONTRACT_FROZEN=true
THEME_ENGINE_01_IMPLEMENTATION_READY=true
THEME_ENGINE_01_IMPLEMENTATION_STARTED=true
THEME_ENGINE_01_TE1_STARTED=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE1_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE2_STARTED=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE2_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE3_STARTED=true
THEME_ENGINE_01_TE3_COMPLETE=true
THEME_ENGINE_01_IMPLEMENTATION_COMPLETE=true
THEME_ENGINE_01_COMPLETE=true
THEME_ENGINE_01_ACCEPTED=true
THEME_ENGINE_01_FROZEN=true
THEME_ENGINE_01_USER_DECISIONS_PENDING=false
```

## 1. Authority, scope and classification

This is the dedicated current owner for Theme Engine discovery, accepted and
frozen architecture, future implementation boundaries and acceptance planning. The
accepted and frozen [Visual Identity contract](./visual-identity-refresh.md)
owns Likecord Default. The [post-VI contract](./post-vi-product-ux.md) and
[roadmap](./ui-ux-roadmap.md) own stage order. The [API](../api-spec.md),
[database](../database.md), [architecture](../architecture.md) and actual source
own current implementation behavior.

This accepted contract made `THEME_ENGINE_01` implementation-ready. The later
TE.1 commission implemented only its typed data/API/bootstrap slice. It did not
start TE.2, TE.3, `THEME_WIN98_01` or `THEME_WINXP_01`.

Accepted requirements are: one typed registry, Likecord Default, one root theme
identity, cross-device durable preference, no-flash bootstrap, safe fallback,
semantic token coverage, live application without product-owner remounts and a
future Appearance integration when at least two selectable themes exist. The
exact TE01-D01 through TE01-D10 architectural and UX choices are frozen below.

Likecord Default must remain materially unchanged. This engine may expose the
existing identity through a stable token scope; it may not recolor, reshape,
re-space or otherwise redesign it.

## 2. Baseline and source owners inspected

The precheck used branch `historical account security 01 as2 work` at exact source
`account security milestone`, with a clean tracked/index state
and only the permitted untracked `docs/design/` path. That path was not
inspected or modified. GitHub `origin` was reachable before editing. The work
then moved to `historical theme engine 01 preflight work` at the same parent.

Documentation inspected:

- `AGENTS.md`, `AI_CONTEXT.md`, this roadmap and the post-VI contract;
- the frozen Visual Identity contract, especially its token, accessibility,
  motion, surface and final-acceptance sections;
- `docs/api-spec.md`, `docs/database.md` and `docs/architecture.md`;
- current User Settings material in the post-VI contract and roadmap. No
  separate dedicated User Settings document exists.

Production/source owners inspected read-only:

- root/bootstrap: `apps/web/src/app/layout.tsx`, `auth-wrapper.tsx`,
  `app/layout.tsx`, `channels/layout.tsx`, public Login/Register/Invite routes,
  `components/AuthGate.tsx`, `hooks/useAuth.tsx`, `lib/api.ts`, Next config and
  tracked Caddy configurations;
- persistent application ownership: `apps/web/src/app/app/page.tsx`
  (`AppContent`), `components/settings/UserSettings.tsx` and
  `SettingsLayer.tsx`;
- theme/style: `apps/web/src/app/globals.css`, production TS/TSX inline colors,
  `components/ui/icons.tsx`, brand/media consumers and role-color consumers;
- preferences: `hooks/useUserPreferences.tsx`, Web API methods,
  `apps/api/src/user/user.controller.ts`, `preference.service.ts`, its update
  DTO, `packages/shared/src/index.ts`, Prisma schema and preference migrations;
- tests: Web user-preference, Appearance, Settings lifecycle, AuthGate, layout,
  chat-scroll, Message Delete and Voice style assertions; API preference unit
  and E2E owners. Tests were inspected, not executed.

## 3. Current visual and token architecture

`apps/web/src/app/layout.tsx` imports the single global stylesheet. Its one
`:root` defines Likecord Default and declares `color-scheme: dark`. There is no
alternate theme scope, registry, theme class, `data-theme`, theme provider or
`prefers-color-scheme` mapping.

The root token families are already broad:

| Family | Current owners |
|---|---|
| Depth/background | `--bg-base`, `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-elevated`, hover/active/media/overlay and semantic aliases |
| Brand | violet/indigo/blue/cyan stops, solid primary/hover, accent aliases and the scarce brand gradient |
| Text | primary, secondary, muted, disabled, link and explicit on-brand/on-danger/on-semantic |
| State | success, warning, danger, danger-solid/hover, info and subtle state backgrounds |
| Border/focus | subtle/default/highlight/control, scrollbar colors, focus ring/gap/width/offset |
| Shape/elevation | radius scale plus legacy `--radius`, low/elevated shadows |
| Type/space/motion | font, type sizes/weights/line heights, spacing scale, durations and easing |

Current production stylesheet color audit found no literal hex/RGB/HSL color
after the root token block. Product surfaces use CSS variables for their visual
colors. The fixed `#99aab5` in `ServerSettings.tsx` is the default value of
user-editable persisted role-color data, and Member Panel renders persisted role
colors dynamically; neither is a theme color. Dynamic positions, crop geometry,
visibility and media styles are functional values rather than theme gaps.

## 4. Current root and hydration architecture

The root layout is a Server Component but emits only `<html lang="en">`; the
element has no class, data attribute or inline theme style. It wraps the route
tree in the client `AuthProvider`. Authentication starts after hydration with
`GET /users/@me`, using HttpOnly access/refresh cookies and the shared client
refresh owner.

Protected `/channels/*` content passes through `AuthGate`. Only after Auth has a
user does the client `UserPreferencesProvider` mount and call authenticated
`GET /users/@me/preferences`. During that request it exposes deterministic
defaults. Therefore the earliest current durable preference availability is
after client hydration and successful authentication; current initial HTML
cannot know a user's preference.

`ChannelsLayout` mounts `AppPage` inside the persistent preference provider.
`AppContent` owns WebSocket, Voice, Screen Share, Chat and the Settings layer.
Settings is conditionally rendered inside that still-mounted tree. Theme state
can change above or alongside `AppContent` without remounting those owners.

There is no inline bootstrap script, root hydration exception, theme cookie,
server-side preference fetch or repository-declared Content Security Policy.
Tracked Next/Caddy configuration therefore does not currently block an inline
script, but a future CSP must use a nonce/hash-compatible solution; weakening a
CSP is prohibited. A pre-hydration DOM mutation would require either React to
render the matching attribute or a narrowly justified `<html>` hydration
exception for that attribute only. Blanket mismatch suppression is not valid.

## 5. Current UserPreference and API architecture

`UserPreference` is a typed one-to-zero-or-one account row. It currently has
only `showSendButton Boolean @default(false)` and `updatedAt`. Theme is absent
from the Prisma model, the migration, shared `UserPreferenceDto`, API projection,
update DTO, Web defaults and provider.

`GET/PATCH /users/@me/preferences` is authenticated and account-owned. GET
projects defaults without materializing a missing row. PATCH is a partial,
strictly allowlisted DTO: `whitelist` and `forbidNonWhitelisted` reject `theme`
today. A real write uses a Prisma upsert. PostgreSQL is the only durable
authority; Redis and browser storage are not preference databases.

The Web provider resets on account identity change, fetches after Auth, keeps an
authoritative value and latest desired value, serializes writes, applies
optimistically, accepts the server response as authoritative, rolls back to the
last confirmed value on failure and supports retry. Theme should reuse this
queue/reconciliation model rather than create an independent PATCH race. No
debounce timing is required by current evidence.

Adding a durable theme field requires a Prisma schema change and migration,
shared DTO/API projection/update validation changes, provider/default changes
and tests. The previous post-VI sentence saying `UserPreference.theme` already
exists and needs no further migration is contradicted by current source.

## 6. Tokenization-gap inventory

| Area | Classification | Evidence and future boundary |
|---|---|---|
| Background/depth, text, muted/disabled, border, brand, status, selection, hover/active | `TOKEN_ALREADY_CORRECT` | Major surfaces consume semantic root variables. Future themes can override the same roles. |
| Inputs, overlays/dialogs, tooltips/context menus, scrollbars, Composer, Settings, Voice, Screen Share, Auth/Invite | `TOKEN_ALREADY_CORRECT` for color | Their color declarations resolve through semantic variables; inline SVGs generally use `currentColor`. |
| `color-scheme: dark` | `TOKENIZATION_GAP` | It is fixed globally. Each registered theme needs explicit UA `color-scheme` metadata/scope; it must not be inferred from OS preference. |
| Legacy/literal geometry on shared chrome | `TOKENIZATION_GAP` where an alternate theme proves need | Some controls/rows still use legacy `--radius` or literal 3/4/6/8/14 px radii and local focus/speaking rings. Do not normalize all now; future engine work should cover only selectors required for root-scoped shape/elevation changes. |
| Default role color and dynamic role colors | `INTENTIONALLY_INVARIANT` content data | `#99aab5` and persisted RGB values communicate user-selected role identity, not theme chrome. Themes must preserve readable surrounding surfaces. |
| Media canvas | `INTENTIONALLY_INVARIANT` | `--bg-media:#000000` protects video/image viewing and may remain black unless a future media contract proves otherwise. |
| Likecord icon/image URLs | `INTENTIONALLY_INVARIANT` for the engine | The frozen canonical Likecord asset remains unchanged. Theme-specific original artwork belongs to later theme contracts. |
| Circles, pills, media geometry, dynamic positions | `INTENTIONALLY_INVARIANT` unless a later owner proves otherwise | Avatar/status circles, new-message pill, Tooltip/popover coordinates, media `object-fit` and crop/stream geometry encode content or behavior. |
| Win98/XP-specific bevels, title bars, iconography or fonts | `THEME_SPECIFIC_CHROME_FUTURE` | Only bounded root-scoped CSS/assets proven by the later theme owner; no JSX/product tree fork. |

The initial engine does not need a general CSS rewrite. Required coverage is the
existing semantic root map plus explicit `color-scheme`. If later theme proofs
need shared chrome variables, likely bounded candidates are control border
style/width, shared radius/elevation roles and font roles. Exact selectors to
audit then are `.btn`, shared form controls, `.settings-layer` and
`.settings-nav-item`, `.modal`, `.context-menu`, `.tooltip-content`,
`.composer-inner`, `.server-rail-icon`, `.channel-item`, `.voice-channel-btn`,
`.user-panel`, `.home-*`, `.screen-share-*` and Auth/Invite surfaces. Those are
extension seams, not accepted alternate-theme styling.

## 7. TE01-D01 — Theme identity and registry

### Options

1. Store/display the public label everywhere.
2. Use a stable internal ID and one typed registry mapping ID to label, root
   attribute, availability and optional metadata.
3. Scatter theme constants between API, provider, Settings and CSS.

### Accepted disposition — option 2

Use one shared durable `ThemeId` contract following current
uppercase domain-value conventions. Add only `LIKECORD_DEFAULT` during the
engine stage; do not reserve or expose Win98/XP values before their contracts.
The Web registry maps that ID to user-facing `Likecord Default`, root attribute
`likecord-default`, availability and explicit UA `colorScheme`. Later internal
IDs remain independent of mutable public names.

The registry is the sole Web mapping. Shared/API validation owns allowed durable
IDs; CSS owns token maps. No provider-specific component forks.

The registry is the single owner of Web theme presentation and the product uses
one component tree. Consequence: one narrow mapping layer, compile-time consumers
and stable storage; later theme registration is explicit. Exact public Win98/XP
names/assets remain unresolved under their later owners.

## 8. TE01-D02 — Durable persistence

### Options

1. Typed `UserPreference.theme` column and current authenticated GET/PATCH.
2. Free-form JSON/key-value preferences.
3. Browser-only persistence.

### Accepted disposition — option 1

Add a bounded `String @default("LIKECORD_DEFAULT")` column with a
short `VarChar` and a migration-level CHECK for currently supported IDs, matching
the repository's string-plus-CHECK bounded-domain convention. Use a shared
`ThemeId`, strict DTO allowlist and registry validation. PostgreSQL remains
authoritative. Do not use a PostgreSQL/Prisma enum or JSON bag: a CHECK keeps the
current schema convention and makes later value addition/removal explicit while
avoiding database-enum removal friction.

A migration is required and authorized for the future commissioned TE.1
implementation, but none is created by this documentation task. Future theme IDs
will require a deliberate CHECK-constraint widening migration as well as
registry/CSS work. The existing missing-row projection returns
`LIKECORD_DEFAULT`; an empty PATCH remains non-materializing. Migration execution
and rollout retain their normal later implementation controls.

## 9. TE01-D03 — Default and fallback

### Accepted disposition

Likecord Default is the authoritative fallback for a missing row/value,
invalid or removed value, preference hydration failure, bootstrap-cache failure
and unauthenticated routes. No `SYSTEM`, `LIGHT` or separate `DARK` theme is
accepted. Product theme selection is not driven by `prefers-color-scheme`.

## 10. TE01-D04 — No-flash bootstrap

### Evidence

Current server HTML has no authenticated preference. Auth and preferences resolve
client-side in sequence. Rendering Likecord Default and switching only after the
API response necessarily flashes on every non-default reload.

### Options

| Option | Flash/mismatch | Correctness and complexity |
|---|---|---|
| A. Server-resolve before `<html>` | Strongest strict no-flash and no DOM mutation mismatch | Root becomes dynamic and must forward/authenticate cookies through an API call. Current root has no server auth/refresh owner; expired-access handling would require additional auth bootstrap design. |
| B. Tiny pre-hydration local mirror, then API reconciliation | Prevents the normal repeat-load default flash; requires a narrowly owned root mutation/hydration rule | Smallest current-source fit. A cold device, stale cache or externally changed account can show cached/default presentation until the canonical GET reconciles. |
| C. Default then switch after hydration | Simple and cross-device correct eventually | Fails the accepted normal repeat-load no-wrong-default-paint guarantee; reject. |
| D. Server-visible signed/bootstrap cookie plus API reconciliation | Can combine early server markup with account lifecycle | Requires cookie issuance/clearing and auth integration not present today; remains a larger hybrid, not a free shortcut. |

### Accepted disposition — option B

Use a validated local pre-hydration theme mirror followed by authoritative
authenticated API reconciliation. With a valid mirror on a normal repeat load,
the application must not first paint the wrong default theme and then visibly
switch. This guarantee does not promise zero transition on a cold/new device,
with stale cache, or after an external cross-device preference change. Such a
case may initially show Likecord Default or the validated cached theme until the
canonical authenticated preference resolves. API/PostgreSQL always wins.

The bounded mirror contains only a validated, non-sensitive `ThemeId`. It is not
durable authority, never PATCHes the API by itself, never carries unrelated
preferences and never overrides the authenticated response. Option A or D would
require a new explicit architecture decision; implementation must not switch to
server-side root authentication/bootstrap automatically.

Any pre-hydration bootstrap must work within the effective deployment CSP and
security boundary without weakening CSP or using blanket
`suppressHydrationWarning`. If an exact root-attribute hydration exception is
necessary, it must be limited to the root theme identity and proven by automated
and real-browser acceptance.

## 11. Local bootstrap mirror boundary

Under accepted D04-B:

- persist only a validated, non-sensitive theme ID in a theme-specific key;
- treat it as bootstrap cache, never durable truth or PATCH input;
- initialize the provider/root from the same validated registry value;
- let authenticated API/PostgreSQL overwrite stale cache and live DOM state;
- invalid/missing/unavailable storage yields Likecord Default without throwing;
- public Login/Register/Invite ignore the authenticated cache and use default;
- normal logout and definitive authentication invalidation immediately reset the
  root to default and clear the active bootstrap key;
- an account identity change resets to default before applying that account's
  authoritative response; no cached value may be promoted into Account B's row;
- no other preference is mirrored for convenience.

A single unscoped cache cannot prove Account A/Account B isolation before Auth is
known. The accepted lifecycle therefore resets to Likecord Default and clears the
active mirror on logout or definitive auth invalidation. Account identity change
resets first, cancels or ignores stale hydration/writes, and applies only the new
account's authoritative preference after resolution. No Account A cached theme
may be written into Account B's preference. If implementation cannot prove this
cache/account boundary safe, stop and reconcile the contract before continuing.

## 12. TE01-D05 — Root attribute strategy

### Accepted disposition

Use one `data-theme="<registry-root-value>"` on `<html>`, with explicit
`data-theme="likecord-default"` rather than implicit absence. CSS conceptually
remains:

```css
:root,
[data-theme="likecord-default"] { /* existing Likecord Default tokens */ }

[data-theme="future-id"] { /* semantic overrides owned later */ }
```

An attribute is inspectable, does not collide with structural utility classes
and keeps theme identity out of components. React/provider/bootstrap must share
one setter/parser. Do not scatter classes. This is a technical decision and does
not require separate product acceptance.

## 13. TE01-D06 — Appearance selector timing

### Accepted disposition — option B

- A one-option selector is truthful but non-actionable clutter.
- B keeps the registry/persistence/bootstrap infrastructure but withholds the
  selector until at least one accepted alternate theme is implemented.
- C previews or disabled future options and would turn unaccepted themes into
  product promises.

Use B. Keep the existing Appearance section and Show Send Button, but do not show
a one-option theme selector. A selector becomes visible in User Settings →
Appearance only when at least two real selectable registered themes exist. Do
not create another Settings destination, disabled Win98/XP options, “Coming
Soon” theme rows or future preview placeholders.

## 14. TE01-D07 — Live-switch owner

### Accepted disposition

Extend `UserPreferencesProvider` as the canonical state/write owner and derive
root attribute application from its theme value. A separate `ThemeContext` would
duplicate preference state and is not justified. A small registry/root helper is
appropriate because parsing and DOM application are not persistence concerns.

Use the existing optimistic latest-intent display, serialized write queue,
server-response authority, last-confirmed rollback and retry. Applying an
attribute on `<html>` does not require reload, navigation or remount of
`AppContent`, WebSocket, Voice, Screen Share or Chat. This is a technical owner
choice already implied by the accepted persistent-tree architecture.

## 15. TE01-D08 — Unknown and future themes

### Accepted disposition

PATCH must reject any ID absent from the current server allowlist. GET and Web
must still defensively coerce unknown database, old-build or cache values to
`LIKECORD_DEFAULT`; unknown data must never select an empty token scope. The
provider reports hydration error only when the request fails, while an invalid
value is safely normalized and may be logged diagnostically without exposing it
to the UI.

On PATCH failure, restore the last confirmed theme and matching cache/root
attribute. A missing optional theme asset must fall back to default chrome/asset,
not blank the application. This is a safety rule, not a product choice.

## 16. TE01-D09 — Semantic token contract

### Accepted disposition

The engine contract is one component tree driven primarily by the semantic
families in section 3. Likecord Default definitions remain materially identical.
Each registered theme must define compatible background/depth, text, status,
border/focus, brand/action, selection, scrollbar, radius/elevation, font and
motion roles, plus explicit UA `color-scheme`.

Theme overrides may not erase non-color status cues, selection, focus, disabled
semantics or readable on-fill pairings. Raw component literals discovered later
are tokenized only when they prevent a registered theme from satisfying the
contract. This technical contract does not accept any alternate visual design.

## 17. Accessibility and user preference interaction

Current CSS implements `prefers-reduced-motion: reduce` by zeroing motion tokens
and disabling animation/transition/scroll behavior, and uses system `Highlight`
for focus under `forced-colors: active`. Theme selection must not become an
accessibility-mode substitute or override either rule. Browser zoom and reduced
height remain independent validation dimensions.

Native controls currently rely on `color-scheme: dark` plus explicit tokenized
form/option colors. Every theme must declare its own supported UA color scheme;
OS `prefers-color-scheme` must not choose a Likecord theme. Focus, selection,
status and error/loading/fallback readability remain mandatory per-theme
acceptance. Registry metadata for Likecord Default is explicitly `dark`.

## 18. Unauthenticated and account-switch behavior

Likecord Default is required for Login, Register and Invite. Authenticated local
theme cache is not applied to these public routes. There is no accepted
requirement to expose an authenticated account's theme before login. This also
avoids presenting Account A's cached choice to a public or Account B session.

On successful login, the theme owner resolves Account B's API preference before
treating a cache as authoritative. On logout, auth invalidation or account-ID
change, reset the root/default immediately and cancel/ignore stale hydration and
writes using the provider's generation model. Cross-device behavior remains:
Account A changes theme in browser/device 1; browser/device 2 obtains that durable
value from authenticated GET. A cache may accelerate paint but never replace
that read.

## 19. Future Win98/XP extension boundary — TE01-D10

### Accepted disposition

The engine freezes only a registry entry seam, one root attribute, semantic token
map, explicit `color-scheme`, optional bounded original metadata/assets and a way
to attach root-scoped CSS chrome where a later owner proves necessary. It does
not freeze Win98/XP internal IDs, public names, colors, icons, fonts, artwork,
wallpapers, sounds, Microsoft assets or per-theme layout/JSX/component trees.

`THEME_WIN98_01` and `THEME_WINXP_01` remain separate `NOT_STARTED` owners. They
must use original CSS/assets with license review and explicit public-name/asset
acceptance. If either requires per-theme JSX/product trees, behavior changes or
replacement of accessibility inputs, stop. This boundary is already accepted at
the roadmap level; later public naming/assets still require user decisions.

Future substantial theme implementation must use the repository's
`.codex/skills/likecord-ui-review/SKILL.md` workflow while preserving this
contract and the frozen Visual Identity owner.

## 20. Failure-state contract

| Failure | Safe result |
|---|---|
| Preference GET fails | Usable Likecord Default or validated bootstrap cache under the accepted D04 guarantee; expose recoverable preference error in Appearance. |
| PATCH fails | Restore last server-confirmed ID, DOM attribute and cache; retain retry intent. |
| Invalid server/cache value | Normalize to Likecord Default; never emit an unknown CSS-only state. |
| Storage unavailable | Continue with default/API state; storage exceptions never block render. |
| Hydration race/account change | Generation/abort ownership ignores stale results and resets before the next account. |
| Theme asset missing | Default asset/chrome; no blank control or surface. |
| Registry/CSS mismatch | Fail default and stop release validation; do not ship a partially registered theme. |

## 21. Accepted implementation slices

These slices remain accepted and frozen. TE.1 and TE.2 are implemented and TE.3
is complete:

1. **TE.1 — typed data/API/bootstrap foundation:** shared theme value, registry,
   Prisma column and migration, strict GET/PATCH/default/fallback, chosen D04
   bootstrap, provider queue integration and automated tests.
2. **TE.2 — root/live integration:** root attribute, explicit `color-scheme`,
   live/rollback behavior, only proven engine-blocking token gaps, no visible
   selector while only Likecord Default exists, lifecycle and default-regression
   tests.
3. **TE.3 — integrated acceptance:** one same-source publication, controlled
   migration with `PREPARE -> DEPLOY -> VERIFY`, Staging cross-device/no-flash/
   account-switch checks, default visual regression, accessibility/zoom matrix,
   Voice/Screen Share lifecycle, TE-M01–TE-M24 and final acceptance/freeze.

A two-slice implementation is not cleaner because schema/API/bootstrap risk and
integrated publication/migration acceptance have distinct owners. No additional
micro-slices are accepted without evidence.

## 22. Future automated validation matrix

No test was run in this preflight. Future implementation must add focused tests
to the existing owners and then use package-declared runners:

- data/API: missing-row default, valid mutation, invalid/unknown rejection,
  strict unknown-field rejection, cross-user isolation, concurrent first writes,
  migration default/CHECK and no JSON preference bag;
- provider: bootstrap/cache parsing, loading/failure/default, serialized rapid
  theme changes, latest intent, server disagreement, rollback/retry, account
  generation cancellation, logout reset and storage failure;
- root/hydration: first emitted identity, accepted pre-hydration path, invalid or
  stale cache, no unexpected hydration warning and no mismatch masking beyond
  the exact root attribute if D04-B requires it;
- UI/lifecycle: Appearance behavior, live root update, reload and second-client
  persistence, Settings/route changes, and no `AppContent`, WebSocket, Voice,
  Screen Share or Chat remount;
- visual/accessibility contracts: Likecord Default tokens remain identical,
  semantic focus/status pairs remain, reduced motion and forced colors stay
  independent, and no hidden theme-specific JSX behavior appears.

Existing anchors include `user-preferences.test.tsx`,
`user-settings-appearance.test.tsx`, `user-settings-lifecycle.test.tsx`,
`auth-gate.test.tsx`, `layout.test.tsx`, relevant CSS-reading regression tests,
`preference.service.spec.ts` and `user-preferences.e2e-spec.ts`. A new bounded
root/bootstrap test owner will be required because none exists today.

## 23. Manual/Staging matrix

The final single-theme disposition below is accepted and frozen for TE.3:

| ID | Check | Current disposition |
|---|---|---|
| TE-M01 | Likecord Default on first login and missing preference | `PASS` |
| TE-M02 | Accepted Appearance theme control behavior | `PASS` |
| TE-M03 | Live theme application without reload | `NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` |
| TE-M04 | Durable persistence after reload | `NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` |
| TE-M05 | Second browser/device resolves the same server preference | `NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` |
| TE-M06 | Logout/login persistence for the same account | `NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` |
| TE-M07 | Account A to B isolation on one browser | `PASS` |
| TE-M08 | Unknown/invalid DB and local fallback | `PASS` |
| TE-M09 | Preference-fetch failure remains usable/recoverable | `PASS` |
| TE-M10 | Mutation failure rolls back root/UI/cache | `NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` |
| TE-M11 | No visible theme flash under the exact accepted D04 guarantee | `PASS` |
| TE-M12 | No hydration warning/error | `PASS` |
| TE-M13 | Route navigation preserves selected theme | `PASS` |
| TE-M14 | Settings open/close preserves theme and focus model | `PASS` |
| TE-M15 | Active Voice remains connected and mounted | `PASS` |
| TE-M16 | Active Screen Share remains unchanged and mounted | `PASS` |
| TE-M17 | Chat/messaging state and Composer remain mounted | `PASS` |
| TE-M18 | Login/Register/Invite follow the accepted public/default rule | `PASS` |
| TE-M19 | Likecord Default visual regression across accepted core surfaces | `PASS` |
| TE-M20 | 100%/125%/150% browser zoom | `PASS` |
| TE-M21 | Reduced-height desktop reachability | `PASS` |
| TE-M22 | Reduced-motion independence | `PASS` |
| TE-M23 | Focus, selection, status and text readability | `PASS` |
| TE-M24 | Browser console/hydration clean | `PASS` |

### 23.1 Accepted single-theme classification semantics

`NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED` is neither PASS nor FAIL and is
not an environment skip. The current product intentionally registers only
`LIKECORD_DEFAULT` and withholds the selector until two real accepted selectable
themes exist. TE-M03, TE-M04, TE-M05, TE-M06 and TE-M10 therefore cannot obtain
meaningful product-level manual evidence for a genuinely different selection,
persistence, cross-client resolution, relogin or visible rollback. Their
underlying engine behavior remains covered by the accepted automated evidence;
that evidence is not downgraded and is not relabeled as manual PASS.

These five checks become mandatory when the first alternate-theme owner
registers the second real selectable theme. Under the current roadmap that owner
is expected to be `THEME_WIN98_01`, which remains `NOT_STARTED`; this
classification does not start it or freeze its public name, assets or visual
direction. TE-M01, TE-M02, TE-M07, TE-M08, TE-M09 and TE-M11 through TE-M24
remain meaningful with Likecord Default and passed the final TE.3 integrated
acceptance.

## 24. STOP conditions

Future work stops if Likecord Default cannot remain materially unchanged; theme
selection requires product-component or JSX forks; changing theme remounts
`AppContent` or realtime/media/chat owners; strict no-flash cannot be achieved
under the accepted D04 boundary without weakening security/CSP; persistence
requires JSON settings; account cache cannot be reconciled safely; an unknown ID
can create blank/unreadable UI; unrelated backend architecture, Win98/XP
implementation, Visual Identity reopening, Voice/WebRTC/Screen Share behavior,
responsive redesign or another unaccepted product decision becomes necessary.

## 25. Final accepted decision matrix

| Decision | Final disposition | Frozen implementation consequence |
|---|---|---|
| TE01-D01 registry/IDs | `ACCEPT_RECOMMENDATION` | Stable shared `ThemeId`; one Web registry; only `LIKECORD_DEFAULT`; no component-tree forks |
| TE01-D02 persistence | `ACCEPT_RECOMMENDATION` | Bounded string column + migration CHECK; current authenticated GET/PATCH/provider; PostgreSQL authority |
| TE01-D03 fallback | `ACCEPT_RECOMMENDATION` | Likecord Default for missing/unknown/failure/public; no Light/System/separate Dark |
| TE01-D04 bootstrap | `ACCEPT_OPTION_B` | Validated theme-only local pre-hydration mirror, then authoritative API reconciliation; bounded repeat-load guarantee |
| TE01-D05 root identity | `ACCEPT_RECOMMENDATION` | Exactly one explicit `<html data-theme="likecord-default">` identity; shared parser/setter |
| TE01-D06 selector timing | `ACCEPT_OPTION_B` | No one-option selector or future placeholders; expose in Appearance at two real registered themes |
| TE01-D07 live owner | `ACCEPT_RECOMMENDATION` | Extend `UserPreferencesProvider`; no duplicate `ThemeContext`; no lifecycle-owner remount |
| TE01-D08 unknown values | `ACCEPT_RECOMMENDATION` | PATCH rejects unknown; GET/Web/cache normalize to default; rollback root/cache/value together |
| TE01-D09 semantic tokens | `ACCEPT_RECOMMENDATION` | One component tree and compatible semantic roles; explicit per-theme UA color scheme; no general CSS cleanup |
| TE01-D10 future seam | `ACCEPT_RECOMMENDATION` | Freeze only registry/root/token/metadata/bounded-chrome seam; Win98/XP names/assets/design remain later decisions |

TE01-D01 through TE01-D10 are final, accepted and frozen. No Theme Engine user
decision remains pending. Future Win98/XP public naming, assets and visual
direction remain separately owned and do not block TE.1.

## 26. TE.1 implementation and automated validation — 2026-09-07

TE.1 implements the shared `ThemeId` domain with only `LIKECORD_DEFAULT`, the
single Web registry (`Likecord Default`, `likecord-default`, selectable,
`colorScheme: dark`), and typed `UserPreference.theme`. Migration
`20260907180000_add_theme_preference` adds `VARCHAR(32) NOT NULL DEFAULT
'LIKECORD_DEFAULT'` plus `user_preferences_theme_check`. The authenticated
GET/PATCH projection remains partial, strict and account-owned; missing rows and
defensive unknown reads normalize to the default.

The Web retains `UserPreferencesProvider` as its only canonical preference
owner. Theme writes share its optimistic latest-intent, serialized API queue,
server-response authority, rollback/retry and account-generation cancellation.
The exception-safe `likecord.theme.bootstrap` mirror stores only a validated
theme ID. A deterministic route-aware pre-hydration script reads it only for
protected `/channels` or legacy `/app` routes and applies the registered
`data-theme` root value before normal preference hydration. Public Login,
Register and Invite routes use the default. Logout, definitive auth invalidation
and account changes clear the mirror and reset the root before a new account can
hydrate. No hydration suppression was necessary because the sole registered
theme matches the server-emitted default root identity.

At the TE.1 checkpoint this narrowly consumed only the D04 bootstrap root seam;
complete live root/color-scheme application and rollback presentation remained
for TE.2. No selector, alternate theme, CSS token change, component fork, visual
delta, dependency, Voice/WebRTC/Screen Share/Presence change, publication or
deployment occurred in that slice.

Validation passed with focused API unit (1 suite / 6 tests), focused API E2E (1
suite / 14 tests), focused Web (5 suites / 29 tests), full API unit (23 suites /
216 tests), full API E2E (26 suites / 447 tests) and full Web (50 suites / 655
tests), all with zero snapshots. Shared, database, API and Web typechecks passed;
all four linters completed with zero errors and only the existing warning
baseline. Prisma format, validate and client generation passed. A fresh
disposable PostgreSQL 15 instance applied all 10 migrations; default, existing
row backfill, missing-row preservation and CHECK rejection were proved. The
disposable PostgreSQL/Redis containers were removed afterward.

## 27. TE.2 root/live integration and automated validation — 2026-09-07

TE.2 completes the bounded Web root presentation path. The registry-derived
setter now keeps the explicit `<html data-theme>` identity and inline UA
`color-scheme` synchronized without reload and skips DOM writes when both values
already agree. The server-emitted default root and deterministic pre-hydration
script use the same registry metadata, so bootstrap and live application
converge. The provider remains the only canonical state/write owner and derives
live root presentation from its optimistic, server-confirmed or rolled-back
preference value. PostgreSQL/API authority and the theme-only mirror semantics
are unchanged.

The existing Likecord Default token declaration is now jointly scoped to
`:root` and `[data-theme="likecord-default"]`; no token value, component style,
layout, behavior or accessibility rule changed. `colorScheme: dark` is explicit
in registry, server markup, bootstrap and live application. Appearance retains
Show Send Button and intentionally exposes no theme selector or future-theme
placeholder while only one selectable theme exists. Route changes and Settings
open/close preserve the root node and the mounted AppContent, WebSocket, Voice,
Screen Share, Chat and Composer owners.

Focused Web validation passed 5 suites / 26 tests, zero snapshots. Full Web
validation passed 50 suites / 661 tests, zero snapshots. Web typecheck and lint
passed; lint reported zero errors and the existing 79-warning baseline.
`git diff --check` passed. The required `likecord-ui-review` result is **KEEP**:
the frozen Likecord Default token values, current component tree, product density,
focus/status/selection cues, reduced-motion and forced-colors behavior. No
`WATCH`, `SIMPLIFY` or `SYSTEMIZE` item was created because TE.2 introduces no
visible design change; no browser or Staging claim is made. API, shared, Prisma,
schema and migration validation were not repeated because those surfaces did not
change. TE.3 still owns integrated publication, real-browser/Staging validation
and final acceptance/freeze.

## 28. TE.2 checkpoint documentation impact and status markers

This historical TE.2 checkpoint was reconciled here and in architecture, post-VI,
roadmap and AI navigation owners. API and database contracts did not change. The
frozen Visual Identity, User Settings and Account Security documents remained
untouched.

```text
TE01_D01_ACCEPTED=true
TE01_D02_ACCEPTED=true
TE01_D03_ACCEPTED=true
TE01_D04_ACCEPTED=true
TE01_D05_ACCEPTED=true
TE01_D06_ACCEPTED=true
TE01_D07_ACCEPTED=true
TE01_D08_ACCEPTED=true
TE01_D09_ACCEPTED=true
TE01_D10_ACCEPTED=true
THEME_REGISTRY_SINGLE_OWNER=true
THEME_COMPONENT_TREE_FORKS=false
THEME_BOOTSTRAP_ARCHITECTURE=validated_local_mirror_then_server_reconciliation
THEME_SERVER_PREFERENCE_AUTHORITATIVE=true
THEME_LOCAL_MIRROR_DURABLE_AUTHORITY=false
THEME_LOCAL_MIRROR_THEME_ONLY=true
THEME_LOCAL_MIRROR_OTHER_PREFERENCES=false
NO_THEME_FLASH_NORMAL_REPEAT_LOAD=true
ZERO_TRANSITION_FIRST_DEVICE_GUARANTEED=false
ZERO_TRANSITION_STALE_CACHE_GUARANTEED=false
ZERO_TRANSITION_EXTERNAL_CROSS_DEVICE_CHANGE_GUARANTEED=false
THEME_SELECTOR_VISIBLE_WITH_SINGLE_THEME=false
THEME_SELECTOR_MINIMUM_REGISTERED_THEMES=2
THEME_FUTURE_PLACEHOLDERS_VISIBLE=false
THEME_DEFAULT_ID=LIKECORD_DEFAULT
THEME_DEFAULT_ROOT_ID=likecord-default
THEME_ROOT_ATTRIBUTE=data-theme
LIKECORD_DEFAULT_REDESIGNED=false
VISUAL_IDENTITY_01_REOPENED=false
USER_SETTINGS_01_REOPENED=false
ACCOUNT_SECURITY_01_REOPENED=false
THEME_WIN98_01_STARTED=false
THEME_WINXP_01_STARTED=false
LIGHT_THEME_ADDED=false
SYSTEM_THEME_ADDED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
PRODUCTION_SOURCE_CHANGED=true
TEST_CODE_CHANGED=true
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
RUNTIME_CHANGED=true
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
PERSISTENT_DATABASE_MUTATED=false
REDIS_MUTATED=false
R2_MUTATED=false
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
THEME_ENGINE_01_IMPLEMENTATION_STARTED=true
THEME_ENGINE_01_TE1_STARTED=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE1_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE2_STARTED=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE2_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE3_COMPLETE_AT_TE2_CHECKPOINT=false
THEME_ENGINE_01_IMPLEMENTATION_COMPLETE_AT_TE2_CHECKPOINT=false
THEME_ENGINE_01_COMPLETE_AT_TE2_CHECKPOINT=false
THEME_ENGINE_01_ACCEPTED_AT_TE2_CHECKPOINT=false
THEME_REGISTRY_IMPLEMENTED=true
THEME_ONLY_DEFAULT_REGISTERED=true
THEME_PREFERENCE_SCHEMA_IMPLEMENTED=true
THEME_PREFERENCE_MIGRATION_CREATED=true
THEME_PREFERENCE_DEFAULT=LIKECORD_DEFAULT
THEME_PREFERENCE_DB_CHECK_IMPLEMENTED=true
THEME_LOCAL_MIRROR_IMPLEMENTED=true
THEME_ROOT_LIVE_APPLICATION_IMPLEMENTED=true
THEME_COLOR_SCHEME_EXPLICIT=true
THEME_LIVE_ROLLBACK_IMPLEMENTED=true
THEME_BOOTSTRAP_LIVE_CONVERGENCE_IMPLEMENTED=true
THEME_DEFAULT_TOKEN_SCOPE_IMPLEMENTED=true
LIKECORD_DEFAULT_TOKEN_VALUES_CHANGED=false
ROOT_ROUTE_LIFECYCLE_PRESERVED=true
SETTINGS_LIFECYCLE_PRESERVED=true
PUBLIC_ROUTES_THEME=LIKECORD_DEFAULT
THEME_SELECTOR_IMPLEMENTED=false
TE2_CONTRACT_RECONCILIATION_REQUIRED=false
DOCUMENTATION_UPDATED=docs/product/theme-engine.md,docs/architecture.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=future_THEME_WIN98_01_and_THEME_WINXP_01_public_names_assets_visual_direction
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION_AT_TE2_CHECKPOINT=commission_THEME_ENGINE_01_TE3_integrated_acceptance
```

## 29. TE.3 single-theme acceptance-matrix reconciliation — 2026-09-07

The user explicitly accepted the section 23 classification for TE-M03,
TE-M04, TE-M05, TE-M06 and TE-M10. This documentation-only clarification did not
reopen TE01-D01 through TE01-D10, change implementation evidence, publish or
deploy runtime artifacts, run application tests, create a migration, or start an
alternate-theme owner. Its then-recorded pre-remediation candidate
`live root theme state milestone` is historical only and is superseded
by the accepted final runtime source in section 30.

Documentation impact:

- Updated: this owner, `docs/product/post-vi-product-ux.md`,
  `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
- New accepted decisions: the exact single-theme classifications in section
  23.1 and their mandatory revalidation by the first second-theme owner.
- Proposed/deferred ideas not made authoritative: Win98/XP public names, assets
  and visual direction remain owned later.
- Known stale documentation introduced: none.

```text
THEME_ENGINE_01_CONTRACT_FINALIZED=true
THEME_ENGINE_01_CONTRACT_ACCEPTED=true
THEME_ENGINE_01_CONTRACT_FROZEN=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE3_STARTED=true
THEME_ENGINE_01_TE3_COMPLETE_AT_MATRIX_RECONCILIATION=false
TE3_ACCEPTANCE_MATRIX_RECONCILIATION_REQUIRED=false
TE_M03_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M04_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M05_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M06_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M10_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
THEME_ENGINE_MULTI_THEME_MANUAL_CHECKS_DEFERRED=TE-M03,TE-M04,TE-M05,TE-M06,TE-M10
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_REQUIRED_ON_SECOND_THEME=true
THEME_ONLY_DEFAULT_REGISTERED=true
THEME_SELECTOR_IMPLEMENTED=false
THEME_WIN98_01_STARTED=false
THEME_WINXP_01_STARTED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
STAGING_DEPLOYMENT_PERFORMED=false
DATABASE_MUTATED=false
REDIS_MUTATED=false
R2_MUTATED=false
IMAGE_PUBLISHED=false
LIKECORD_DEFAULT_REDESIGNED=false
VISUAL_IDENTITY_01_REOPENED=false
USER_SETTINGS_01_REOPENED=false
ACCOUNT_SECURITY_01_REOPENED=false
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
THEME_ENGINE_01_RUNTIME_SOURCE_AT_MATRIX_RECONCILIATION=live root theme state milestone
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/theme-engine.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=TE-M03_TE-M04_TE-M05_TE-M06_TE-M10_NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
PROPOSED_OR_DEFERRED_IDEAS=future_THEME_WIN98_01_and_THEME_WINXP_01_public_names_assets_visual_direction
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION_AT_MATRIX_RECONCILIATION=resume_THEME_ENGINE_01_TE3_integrated_acceptance
```

## 30. TE.3 final integrated acceptance and milestone freeze — 2026-09-07

TE.3 is complete, accepted and frozen on runtime source
`Node-compatible theme runtime milestone`. This is the accepted application
runtime source; the later documentation-only closure commit is not runtime
identity. The final immutable API ref is
`ghcr.io/ryezuo/likecord-api@sha256:48c10905c66c16341e75cac19e54e14ec180e92f172e6096b2126f26cec9ce36`
and the final immutable Web ref is
`ghcr.io/ryezuo/likecord-web@sha256:d2953a3cb1e515c56806137a037f6f5b6b0fa95d500a3feae56f6c8aec7601e7`.
Migration `20260907180000_add_theme_preference` is aligned/current.

Publication and release sanity passed. The controlled Staging
`PREPARE -> DEPLOY -> VERIFY` sequence passed at
<https://staging.example.com>: health and public HTTP checks passed, the
migration is aligned/current, non-target services were preserved, and no rollback
was required. Database backup before migration and `prisma migrate deploy` also
passed. No VPS operation is repeated by this closure.

The final matrix in section 23 contains 19 `PASS`, five authoritative
`NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED`, and zero blocked rows.
`BROWSER_RETEST_REQUIRED_IDS=none`. The deferred checks remain TE-M03, TE-M04,
TE-M05, TE-M06 and TE-M10; the first stage registering a second real selectable
theme must revalidate them. The currently expected owner is `THEME_WIN98_01`,
which remains not started.

Accepted browser evidence includes: TE-M01's fresh Account A normal
registration/login entry with `likecord-default`, dark scheme, no bootstrap or
hydration errors and no one-theme selector; TE-M07's Account A logout then
Account B login in the same Chrome context, with default public reset, no Account
A promotion and only the appropriate preference GET; TE-M08 invalid-cache
fallback and cleanup; and TE-M09 blocked preference GET fallback, recovery and
cleanup. TE-M15 preserved active Voice through Settings lifecycle and TE-M16
preserved active Screen Share; capture was stopped afterward in both checks.
Those passes do not fix the separate API-restart stale-state debts.

TE-M18 accepted public Login/Register/Invite default behavior. TE-M20 passed at
100%, 125% and 150% browser zoom (restored to 100%); TE-M21 passed at 1366x600
(viewport restored); TE-M22 confirmed `prefers-reduced-motion: reduce` with
`matchMedia=true`, independent theme behavior and restored emulation; and TE-M24
found no Theme Engine/bootstrap/hydration/root browser errors. Real-browser visual
review is **KEEP**: Likecord Default was not redesigned—colors, typography,
spacing, radii, shadows, layout, geometry, iconography and product density remain
materially unchanged. No alternate theme was introduced.

Two fictitious disposable test accounts, created only through normal product
registration for TE-M01/TE-M07, remain in Staging. They are nonblocking fixture
evidence; credentials are neither exposed nor committed, and the accounts are
not to be removed by direct PostgreSQL/Prisma mutation.

Voice, WebRTC, Screen Share and Presence were unchanged; Redis and R2 were not
mutated. Automatic Voice or Screen Share reset behavior was not introduced. The
known Voice/Screen Share stale-state-after-API-restart debts remain separately
unfixed. Visual Identity, User Settings and Account Security remain frozen and
were not reopened. The next official product stage is `THEME_WIN98_01`; neither
it nor `THEME_WINXP_01` starts through this closure.

Documentation impact:

- Updated: this owner, `docs/product/post-vi-product-ux.md`,
  `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
- New accepted decisions: final TE.3 runtime, publication/Staging acceptance,
  final matrix and milestone freeze.
- Proposed/deferred ideas not made authoritative: future Win98/XP public names,
  assets and visual direction; multi-theme manual revalidation until a second
  selectable theme is registered.
- Known stale documentation introduced: none.

```text
THEME_ENGINE_01_RUNTIME_SOURCE=Node-compatible theme runtime milestone
THEME_ENGINE_01_API_DIGEST=sha256:48c10905c66c16341e75cac19e54e14ec180e92f172e6096b2126f26cec9ce36
THEME_ENGINE_01_WEB_DIGEST=sha256:d2953a3cb1e515c56806137a037f6f5b6b0fa95d500a3feae56f6c8aec7601e7
THEME_PREFERENCE_MIGRATION=20260907180000_add_theme_preference
PUBLICATION_PASS=true
RELEASE_SANITY_PASS=true
DATABASE_BACKUP_BEFORE_MIGRATION_PASS=true
PRISMA_MIGRATE_DEPLOY_PASS=true
STAGING_PREPARE_PASS=true
STAGING_DEPLOY_PASS=true
STAGING_VERIFY_PASS=true
STAGING_DEPLOYMENT_PERFORMED=true
THEME_ENGINE_TE_M_PASS_COUNT=19
THEME_ENGINE_TE_M_NA_COUNT=5
THEME_ENGINE_TE_M_BLOCKED_COUNT=0
TE_M03_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M04_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M05_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M06_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
TE_M10_CLASSIFICATION=NOT_APPLICABLE_UNTIL_SECOND_THEME_REGISTERED
THEME_ENGINE_MULTI_THEME_MANUAL_CHECKS_DEFERRED=TE-M03,TE-M04,TE-M05,TE-M06,TE-M10
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_REQUIRED_ON_SECOND_THEME=true
TE_M01_RESULT=PASS
TE_M07_RESULT=PASS
TE_M15_RESULT=PASS
TE_M16_RESULT=PASS
BROWSER_RETEST_REQUIRED_IDS=none
THEME_ENGINE_CAN_CLOSE=true
TE3_DISPOSABLE_TEST_ACCOUNTS_CREATED=2
TE3_DISPOSABLE_TEST_ACCOUNTS_REMAIN_IN_STAGING=true
LIKECORD_DEFAULT_REDESIGNED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
REDIS_MUTATED=false
R2_MUTATED=false
VOICE_STALE_STATE_FIXED=false
SCREEN_SHARE_STALE_STATE_FIXED=false
SCREEN_SHARE_RESET_AUTOMATIC=false
VOICE_RESET_AUTOMATIC=false
VISUAL_IDENTITY_01_REOPENED=false
USER_SETTINGS_01_REOPENED=false
ACCOUNT_SECURITY_01_REOPENED=false
THEME_ENGINE_01_STARTED=true
THEME_ENGINE_01_PREFLIGHT_COMPLETE=true
THEME_ENGINE_01_CONTRACT_FINALIZED=true
THEME_ENGINE_01_CONTRACT_ACCEPTED=true
THEME_ENGINE_01_CONTRACT_FROZEN=true
THEME_ENGINE_01_IMPLEMENTATION_STARTED=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE1_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE2_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE3_COMPLETE=true
THEME_ENGINE_01_IMPLEMENTATION_COMPLETE=true
THEME_ENGINE_01_COMPLETE=true
THEME_ENGINE_01_ACCEPTED=true
THEME_ENGINE_01_FROZEN=true
THEME_ENGINE_01_USER_DECISIONS_PENDING=false
THEME_WIN98_01_STARTED=false
THEME_WINXP_01_STARTED=false
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_OFFICIAL_PRODUCT_STAGE=THEME_WIN98_01
```
