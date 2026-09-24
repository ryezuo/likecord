# Likecord Win98-inspired Theme — THEME_WIN98_01

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> **Status:** `W98.1_IMPLEMENTED / W98.1_AUTOMATED_VALIDATION_PASS / W98.2_IMPLEMENTED / W98.2_AUTOMATED_VALIDATION_PASS / W98.3_COMPLETE / COMPLETE / ACCEPTED / FROZEN`.
>
> **Recorded:** 2026-09-08.
>
> **Classification:** Final W98.3 integrated acceptance and milestone freeze. The frozen W98-D01 through W98-D10 contract is implemented, published from one source, deployed with its controlled migration and accepted in the final Staging runtime. Theme Engine, Likecord Default and Visual Identity remain accepted and frozen.

```text
THEME_WIN98_01_STARTED=true
THEME_WIN98_01_PREFLIGHT_COMPLETE=true
THEME_WIN98_01_CONTRACT_CREATED=true
THEME_WIN98_01_CONTRACT_FINALIZED=true
THEME_WIN98_01_CONTRACT_ACCEPTED=true
THEME_WIN98_01_CONTRACT_FROZEN=true
THEME_WIN98_01_IMPLEMENTATION_READY=true
THEME_WIN98_01_IMPLEMENTATION_STARTED=true
THEME_WIN98_01_W98_1_STARTED=true
THEME_WIN98_01_W98_1_IMPLEMENTED=true
THEME_WIN98_01_W98_1_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_2_STARTED=true
THEME_WIN98_01_W98_2_IMPLEMENTED=true
THEME_WIN98_01_W98_2_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_3_COMPLETE=true
THEME_WIN98_01_IMPLEMENTATION_COMPLETE=true
THEME_WIN98_01_COMPLETE=true
THEME_WIN98_01_ACCEPTED=true
THEME_WIN98_01_FROZEN=true
THEME_WIN98_01_USER_DECISIONS_PENDING=false
MODERN_BRAND_ASSET_PACK_AUDITED=true
LIKECORD_DEFAULT_BRAND_ASSET_SET_REQUIRED=true
LIKECORD_DEFAULT_VISUAL_IDENTITY_CHANGED=false
VISUAL_IDENTITY_01_REOPENED=false
THEME_ASSET_NAMESPACE_STRATEGY=theme_first
LIKECORD_DEFAULT_ASSET_NAMESPACE_FIRST_CLASS=true
LIKECORD_DEFAULT_COMPATIBILITY_ALIAS_RETAINED=true
WIN98_THEME_ID=LIKECORD_RETRO_98
WIN98_PUBLIC_THEME_NAME=Retro 98
WIN98_ROOT_ID=likecord-retro-98
WIN98_ASSET_SLUG=retro-98
WIN98_COLOR_SCHEME=light
THEME_AWARE_BRAND_SCOPE_V1=authenticated_in_product_brand_mark_surfaces
DYNAMIC_BROWSER_THEME_IDENTITY_V1=false
W98_D04_RECONCILED=true
W98_D09_RECONCILED=true
WIN98_ASSET_LICENSE_REVIEW_REQUIRED=false
WIN98_MICROSOFT_DERIVED_REFERENCE_ASSETS_EXCLUDED=true
WIN98_MICROSOFT_DERIVED_ASSETS_ALLOWED_IN_PRODUCTION=false
WIN98_MAY_NOT_REPLACE_DEFAULT_BRAND_ASSETS_GLOBALLY=true
THEME_ENGINE_01_REOPENED=false
LIKECORD_DEFAULT_REDESIGNED=false
THEME_WINXP_01_STARTED=false
THEME_WINXP_01_DEFERRED_BY_USER=true
THEME_WINXP_01_REMOVED=false
W98_2_ASSET_INPUT_MISMATCH=false
PRODUCTION_SOURCE_CHANGED=true
TEST_CODE_CHANGED=true
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
API_SOURCE_CHANGED=false
SHARED_SOURCE_CHANGED=false
DEPENDENCY_CHANGED=false
RUNTIME_CHANGED=true
ASSET_COPIED_TO_REPOSITORY=true
IMAGE_PUBLISHED=true
STAGING_DEPLOYMENT_PERFORMED=true
DATABASE_MUTATED=true
PERSISTENT_LOCAL_DATABASE_MUTATED=false
REDIS_MUTATED=false
R2_MUTATED=false
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_REQUIRED_ON_SECOND_THEME=false
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_COMPLETE=true
CURRENT_SELECTABLE_THEME_COUNT=2
THEME_SELECTOR_IMPLEMENTED=true
THEME_SELECTOR_CONTROL=native_select
THEME_SERVER_PREFERENCE_AUTHORITATIVE=true
THEME_LOCAL_MIRROR_DURABLE_AUTHORITY=false
WIN98_PRESENTATION_IMPLEMENTED=true
WIN98_ASSETS_COPIED=true
DEFAULT_THEME_MARK_PATH=/themes/default/assets/brand/mark.png
RETRO_98_THEME_MARK_PATH=/themes/retro-98/assets/brand/mark.svg
WIN98_BLOCKED_REFERENCE_ASSETS_COPIED=false
WIN98_RASTER_WALLPAPER_COPIED=false
LIKECORD_DEFAULT_TOKEN_VALUES_CHANGED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
LOCAL_W98_1_MIGRATION_RECONCILIATION_COMPLETE=true
LOCAL_MIGRATIONS_APPLIED=11
LOCAL_MIGRATIONS_PENDING=0
STAGING_DATABASE_MUTATED=true
W98_D01_ACCEPTED=true
W98_D02_ACCEPTED=true
W98_D03_ACCEPTED=true
W98_D04_ACCEPTED=true
W98_D05_ACCEPTED=true
W98_D06_ACCEPTED=true
W98_D07_ACCEPTED=true
W98_D08_ACCEPTED=true
W98_D09_ACCEPTED=true
W98_D10_ACCEPTED=true
WIN98_BACKGROUND_POLICY=CSS_TEAL
WIN98_FONT_STRATEGY=SYSTEM_FALLBACK_ONLY
WIN98_CHROME_SCOPE=CONTROLS_AND_LAYERS_ONLY
WIN98_THEME_SELECTOR_CONTROL=NATIVE_SELECT
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=begin_MEDIA_VIEWER_01_preflight
```

## 1. Authority and scope

This is the dedicated current owner for `THEME_WIN98_01` discovery. Authority is the frozen [Theme Engine](./theme-engine.md), the [post-VI contract](./post-vi-product-ux.md), the [roadmap](./ui-ux-roadmap.md), and the frozen [visual identity contract](./visual-identity-refresh.md), in that order.

| Classification | Meaning |
|---|---|
| `CONFIRMED_CURRENT_SOURCE` | Read-only application or engine behavior. |
| `FROZEN_INHERITED_THEME_ENGINE_RULE` | A prior accepted decision Win98 must preserve. |
| `SUPPLIED_ASSET_INPUT` | External product input, not automatically a runtime asset. |
| `DECISION_ACCEPTED` | An explicit user decision frozen by this contract. |
| `FUTURE_IMPLEMENTATION` | Bounded work not authorized by this document. |
| `OUT_OF_SCOPE` | Deliberately excluded work. |

W98.1 changes production source, tests and the database contract through one
normal migration. It adds no dependency or asset and changes no Win98 visual
tokens, deployed service, persistent local/Staging database, Redis, R2 or
`docs/design/` content.

## 2. Confirmed source and frozen extension seam

`THEME_ENGINE_01` is `COMPLETE / ACCEPTED / FROZEN` on runtime source `Node-compatible theme runtime milestone`. Its existing seam safely supports one alternate theme: shared typed IDs; the sole Web registry/parser/root `data-theme`/explicit UA scheme/bootstrap mirror; the sole optimistic serialized provider owner; PostgreSQL-authoritative preference with safe unknown normalization; semantic CSS scopes; and selector activation only at two real selectable themes.

Win98 must extend those owners. It may not add a parallel context, product tree, preference store, `prefers-color-scheme` mode, or lifecycle-owner remount. Login, Register and Invite stay Likecord Default; only authenticated protected routes consume the mirror.

| Audited owner | Future Win98 boundary |
|---|---|
| Root/bootstrap / `ThemeRouteBoundary` | W98.1 registers `likecord-retro-98` with explicit light UA scheme while preserving public/default routes. |
| Shared/API/Prisma preference path | W98.1 widens the existing typed allowlist and named CHECK; the existing routes/service remain owners. |
| `UserSettings` / `SettingsLayer` Appearance | W98.1 adds the accepted native two-option control to existing Appearance; no Settings section. |
| Rail/sidebar/Home/Chat/Composer/members/user panel | Token scope and bounded chrome only; preserve density, routing, rows, scroll and user content. |
| Modals, menus and tooltips | Bevel only for existing containment/layering; never replace focus/selection/state meaning. |
| Voice and Screen Share | Presentation only; no WebRTC, media, `HIDDEN`, subscription or lifecycle change. |
| Auth and Invite | No themed public route or new public asset-routing rule. |

Existing tests were inspected, not run. They cover one-theme selector absence, bootstrap/root fallback, optimistic rollback, and Settings open/close without remounting Chat, Voice or Screen Share.

## 3. Asset audit and license disposition

The external supplied ZIP has SHA-256 `6db650ab77defb3e61e98b3dc3f1cfd6f2c62c6584df9b69bf57834f9ea6fdf7`. It remains external and untracked. It separates `win98/` and `winxp/`; WinXP was checked only for owner separation and remains `NOT_STARTED`.

### 3.1 Excluded Microsoft-derived references

`references/win98-concept-reference.png`, `references/winxp-concept-reference.png` and `references/retro-theme-asset-board-reference.png` are `BLOCKED_LICENSE_OR_ORIGIN`. They include apparent Microsoft-derived Windows branding, Start-button/shell or system artwork. The explicit user disposition is `EXCLUDED_REFERENCE_NON_DISTRIBUTABLE`.

They must never be copied, embedded, shipped, published, cropped, cleaned, traced, regenerated or used as pixel-for-pixel targets. They are historical evidence only. Allowed inspiration is general and non-proprietary: teal canvas, gray surfaces, CSS-created 3D bevels, compact square controls, blue active strips, classic-density menus and pixel-inspired Likecord branding.

### 3.2 Individual Win98 inputs

The classification is an audit finding, not a proof of ownership. No remaining candidate visibly contains a Windows logo, Start-button/system icon, extracted resource, proprietary wallpaper or bundled font.

| Input | Technical observation | Classification | Boundary |
|---|---|---|---|
| `README.md` | 3,353 B text; references font names but ships no font file | `REFERENCE_ONLY` | External guidance only; suggested paths/selectors are not a contract. |
| `theme-tokens.json` | 880 B palette input, no embedded asset | `REFERENCE_ONLY` | Map to current semantics, not a second token system. |
| `win98/theme-win98.css` | 2,205 B broad field/button/focus selectors and unmapped `.lk-*` classes | `REFERENCE_ONLY` | Starting evidence only; do not paste wholesale. |
| `brand/likecord-mark-win98.svg` | 512×512 crisp SVG; no embedded raster/external reference | `PRODUCTION_ELIGIBLE_FOR_W98_2` | Accepted Retro 98 brand source for sparse themed-brand use. |
| `brand/likecord-logo-horizontal-win98.svg` | 1200×300; no external ref, but local DejaVu/Courier font fallback | `NEEDS_REWORK` | Use stable owned outlines or approved PNG; do not depend on a client font. |
| `brand/likecord-logo-horizontal-win98.png` | 1200×300 RGBA; 309,487 transparent, 4,630 partial-alpha, 45,883 opaque pixels | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Bounded high-visibility brand placement only. |
| `icons/likecord-app-16.png` | 16×16 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Only if future favicon/app-icon scope is accepted. |
| `icons/likecord-app-24.png` | 24×24 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-32.png` | 32×32 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-48.png` | 48×48 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-64.png` | 64×64 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-128.png` | 128×128 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-256.png` | 256×256 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Same boundary. |
| `icons/likecord-app-512.png` | 512×512 RGBA, binary alpha | `ACCEPT_AS_PRODUCTION_CANDIDATE` | Source candidate, never an action-icon replacement. |
| `icons/likecord.ico` | 16/24/32/48/64/128/256 px 32-bit frames | `NOT_NEEDED` | Dynamic theme favicon/app metadata is outside V1. |
| `wallpaper/likecord-win98-teal-1920x1080.png` | 1920×1080 RGB, 8,592 B, fully opaque, uniform `#008080` | `NOT_NEEDED` | CSS is identical, responsive and avoids a raster request. |

No Microsoft font, sound, bitmap or system resource is accepted. The supplied brand/icon candidates are Likecord assets, not evidence for changing user content or functional action icons.

### 3.3 Modern Default brand asset reconciliation

The external `Likecord-Modern-Brand-Assets.zip` is a product-supplied input with SHA-256 `151229b59cfdfac7b5ec36f62b09268bb233bd2164692cfe18ec8e1b6e83cb19`. It is not copied into this repository by this preflight. It is the same source family already inspected by the frozen visual-identity owner, so the pack confirms existing provenance but does not supersede that contract's quality findings or reopen `VISUAL_IDENTITY_01`.

| Modern-pack input | Observed audit result | Classification | Default-use boundary |
|---|---|---|---|
| `README.md` | Textual inventory/integration suggestion only | `REFERENCE_ONLY` | External guidance; does not authorize copying or alter the current contract. |
| `original/likecord-brand-showcase.png` | 1448×1086 RGB board; byte-identical to the existing visual reference board | `REFERENCE_ONLY` | Never ship as an application layout or asset. |
| `original/likecord-app-icon-dark.png` | 1254×1254 RGB dark presentation; byte-identical to the visual contract's dimensional presentation | `REFERENCE_ONLY` | Excess framing/glow makes it unsuitable for ordinary UI, favicon or launcher use. |
| `original/likecord-app-icon-transparent.png` | 1254×1254 RGBA; byte-identical to `apps/web/public/brand/likecord-icon.png` | `ACCEPT_AS_DEFAULT_PRODUCTION_CANDIDATE` | It is the current compatible Default mark source; do not recopy it in this task. |
| `original/likecord-logo-horizontal-transparent.png` | 2172×724 RGBA; visible residue around/between lettering in rendered audit | `NEEDS_REWORK` | Do not ship until a clean authorized export is supplied; do not repair, crop, trace or recreate it. |
| `app-icons/likecord-icon-16x16.png` | 16×16 RGBA derivative; central detail remains too compressed | `NEEDS_REWORK` | Requires an authorized simplified small mark; do not label it an accepted favicon. |
| `app-icons/likecord-icon-32x32.png` | 32×32 RGBA derivative; thin gaps/padding need dedicated small-size review | `NEEDS_REWORK` | Not automatically accepted from source resolution alone. |
| `app-icons/likecord-icon-48x48.png` | 48×48 RGBA derivative | `ACCEPT_AS_DEFAULT_PRODUCTION_CANDIDATE` | Candidate only after 1×/2× neutral-surface review. |
| `app-icons/likecord-icon-64x64.png` | 64×64 RGBA derivative | `ACCEPT_AS_DEFAULT_PRODUCTION_CANDIDATE` | Preferred compact candidate, subject to alpha/padding review. |
| `app-icons/likecord-icon-128x128.png` | 128×128 RGBA derivative | `NOT_NEEDED` | No current app-metadata or launcher surface is authorized. |
| `app-icons/likecord-icon-180x180.png` | 180×180 RGBA derivative | `NOT_NEEDED` | Apple-touch metadata is outside this stage. |
| `app-icons/likecord-icon-192x192.png` | 192×192 RGBA derivative | `NOT_NEEDED` | Manifest/PWA metadata is outside this stage. |
| `app-icons/likecord-icon-256x256.png` | 256×256 RGBA derivative | `NOT_NEEDED` | No current consumer. |
| `app-icons/likecord-icon-512x512.png` | 512×512 RGBA derivative | `NOT_NEEDED` | Launcher/PWA scope is not authorized. |
| `app-icons/likecord-icon-1024x1024.png` | 1024×1024 RGBA derivative | `NOT_NEEDED` | No current consumer. |
| `app-icons/likecord.ico` | 16/32/48/64/128/256 px 32-bit frames | `NOT_NEEDED` | Dynamic favicon is not useful V1 scope, and 16 px remains unapproved. |

`apps/web/public/brand/likecord-icon.png` is byte-identical to the transparent source icon. It currently owns three CSS background consumers: the public Auth brand mark, protected loading-screen mark, and Home brand mark. `app/layout.tsx` has title/description metadata only; no favicon, Apple touch icon, manifest, PWA icon declaration or other direct `/brand/` consumer exists. This compatibility file must remain during any future structured-asset migration so those consumers retain their approved Default appearance without a behavior or visual change.

### 3.4 Accepted theme-first asset namespace and brand seam

`LIKECORD_DEFAULT_BRAND_ASSET_SET_REQUIRED=true` means W98.2 makes Default explicit alongside Win98 assets without authorizing a redesign. `THEME_ASSET_NAMESPACE_STRATEGY=theme_first` is accepted:

```text
apps/web/public/
  brand/likecord-icon.png                   # retained byte-identical Default compatibility alias
  themes/
    default/
      assets/
        brand/                             # approved transparent Default mark; clean logo only when supplied
        icons/                             # only individually accepted platform variants
    retro-98/
      assets/
        brand/                             # accepted Retro 98 mark/logo candidates
        icons/                             # only if a real accepted consumer needs them
        # wallpaper/ is absent unless a non-flat accepted production asset exists
    <future-theme-slug>/
      assets/
        ...
```

Static production assets belong under `apps/web/public/themes/<stable-slug>/assets/`. Presentation source/CSS, if later useful, remains separate under `apps/web/src/styles/themes/` or an implementation-equivalent source location; public directories must not contain CSS, documentation or source merely for symmetry. The current flat Win98 teal wallpaper stays `NOT_NEEDED`, so no empty wallpaper directory is created.

The accepted identifier relationship is deliberately non-interchangeable:

| Identifier role | Accepted Win98 value | Purpose |
|---|---|---|
| Durable ThemeId | `LIKECORD_RETRO_98` | Shared/API/database domain value. |
| Root identity | `likecord-retro-98` | `data-theme` value. |
| Static asset slug | `retro-98` | Stable theme-first public path segment. |
| Public label | `Retro 98` | User-facing selector text. |

Public-label changes must never require an asset-path rename. `LIKECORD_DEFAULT`, Retro 98 and future WinXP receive separate owned namespaces; activating Win98 may never overwrite, remove or globally substitute the Default path. `LIKECORD_DEFAULT_ASSET_NAMESPACE_FIRST_CLASS=true`, `LIKECORD_DEFAULT_COMPATIBILITY_ALIAS_RETAINED=true` and `WIN98_MAY_NOT_REPLACE_DEFAULT_BRAND_ASSETS_GLOBALLY=true` are frozen implementation invariants.

`THEME_AWARE_BRAND_SCOPE_V1=authenticated_in_product_brand_mark_surfaces` is the deliberately semantic V1 boundary. It permits the current theme-owned mark on authenticated protected in-product Likecord brand-mark surfaces. The current Home mark is one eligible consumer, not a contractual requirement to add or convert any other component. Public Auth, pre-hydration/loading, favicon, browser metadata icons, Apple touch icons, manifest/PWA icons, action icons, status icons, server/user content and role/user-generated assets remain Default or invariant.

Use one bounded presentation owner—a root-aware brand helper or narrow theme registry metadata—to select the current theme mark. A root-scoped CSS asset variable is sufficient for CSS consumers; if TypeScript metadata is needed, limit it to `inProductMarkSrc` and add `horizontalLogoSrc` only when a real accepted consumer exists. Do not spread theme checks through components, create a component-to-URL map, or fork the React tree. `DYNAMIC_BROWSER_THEME_IDENTITY_V1=false`: browser/app identity remains stable modern Likecord in V1.

## 4. Accepted visual contract

### 4.1 Semantic mapping

| Supplied concept | Existing owner / accepted treatment | Classification |
|---|---|---|
| `desktop` | `--bg-base` / `--bg-app` for protected application canvas | `DECISION_ACCEPTED` |
| `window` | Existing `--bg-primary`, `--bg-secondary`, `--bg-panel` by pane role | `DECISION_ACCEPTED` |
| `buttonFace` | Existing control/surface roles while retaining state roles | `DECISION_ACCEPTED` |
| `buttonHighlight`, `buttonShadow`, `buttonDarkShadow` | Bounded `--theme-chrome-bevel-highlight/shadow/dark` | `DECISION_ACCEPTED` |
| `titleActiveStart`, `titleActiveEnd` | Bounded `--theme-chrome-titlebar-start/end`, only for semantic chrome | `DECISION_ACCEPTED` |
| `text` and `link` | `--text-primary` / existing text hierarchy and `--text-link` | `DECISION_ACCEPTED` |
| brand purple/blue/cyan | Existing brand-family semantics, sparse accepted brand artwork only | `REFERENCE_ONLY` |

Success, warning, danger, info, disabled, dynamic role colors, focus, selection, speaking/live status, text-on-color and media geometry stay semantic/invariant. The brand gradient remains scarce rather than routine window/button/message UI.

### 4.2 Bounded chrome, typography and background

The inspected source supports a CSS-only, root-scoped skin. Under accepted W98-D07, the only justified new variables are bevel-side values, a compact title-strip pair, `--theme-control-radius: 0px`, a scoped scrollbar treatment and a `--font` override. Apply bevels to controls and existing layered containment. Do not add a literal title bar to every pane, message, card or Voice surface; preserve circles, status pills and media geometry where functional.

W98-D06 accepts `"MS Sans Serif", Tahoma, Verdana, Arial, sans-serif` only as local fallback names. No font file or dependency is needed in V1; a separately licensed free alternative is a future choice only if real visual QA proves necessary. W98-D03 accepts `colorScheme: "light"` for Win98's light gray/dark-text chrome. It is explicit registry metadata, not OS mapping; Likecord Default remains `dark`. W98-D05 accepts a root-scoped CSS `#008080` background, not the uniform raster wallpaper.

The theme must retain visible keyboard focus, contrast, semantic status/error distinction, selection, zoom, reduced-height reachability, forced colors and `prefers-reduced-motion`. Bevel is supplemental non-color feedback, never a focus or state substitute. The starter CSS's negative focus offset is not accepted without clipping verification. Compact styling must not reduce hit targets or clip Settings, Composer, Voice or Screen Share controls.

## 5. Selector, migration and safe fallback

At two selectable themes, add a native **Theme** `select` inside **User Settings → Appearance**. It uses accepted public labels, current `ThemeId`, native keyboard behavior and a concise signed-in-workspace description. No thumbnail is needed: two text options are compact and avoid excluded reference art. Reuse the provider's optimistic switching, saving/error status and rollback; failure restores select value, root, UA scheme and mirror together.

During W98.1, create a normal Prisma-owned migration following `20260907180000_add_theme_preference`. The schema keeps the bounded string shape; the migration replaces the named CHECK expression:

```sql
ALTER TABLE "user_preferences"
  DROP CONSTRAINT "user_preferences_theme_check";
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_theme_check"
  CHECK ("theme" IN ('LIKECORD_DEFAULT', 'LIKECORD_RETRO_98'));
```

Coordinate that migration with shared IDs, DTO, API service and Web registry. Do not use `db push`, `migrate resolve` or out-of-band SQL.

| Skew / failure | Required behavior |
|---|---|
| New server, old Web | Old parser normalizes the new API value to `LIKECORD_DEFAULT`. |
| Old server, new Web | Old DTO rejects new ID; optimistic root/UI/mirror roll back. |
| Mirror has Win98 but registry lacks it | Validated bootstrap applies default. |
| Old build receives Win98 | Provider normalizes it to default. |
| Brand asset fails | Semantic UI remains readable; assets are decorative with text/alt fallback where needed. |

Unknown or unavailable values must always resolve to `LIKECORD_DEFAULT`; blank, unscoped or unreadable UI is prohibited.

## 6. Accepted user decision matrix

Every row is `DECISION_ACCEPTED` and frozen for W98.1–W98.3.

| Decision | Accepted disposition | Consequence | Status |
|---|---|---|---|
| W98-D01 durable ID | `LIKECORD_RETRO_98` | Shared union/API/registry/CHECK change without Microsoft naming. | `ACCEPTED` |
| W98-D02 public name | **Retro 98** | Selector label signals inspiration without Microsoft affiliation. | `ACCEPTED` |
| W98-D03 UA scheme | `light` | Explicit native-control scheme in registry; Likecord Default remains `dark`. | `ACCEPTED` |
| W98-D04 production assets | Theme-first Default/Retro separation; retained `/brand/likecord-icon.png` compatibility alias | Default and Retro never overwrite one another. W98.2 copies only the accepted marks; the modern horizontal wordmark remains `NEEDS_REWORK`. | `ACCEPTED` |
| W98-D05 background | CSS teal `#008080` | The supplied uniform raster remains `NOT_NEEDED`. | `ACCEPTED` |
| W98-D06 font | System fallback only: `"MS Sans Serif", Tahoma, Verdana, Arial, sans-serif` | No dependency or proprietary font bundle. | `ACCEPTED` |
| W98-D07 chrome | Controls/layers only | No decorative desktop window/title-bar treatment across ordinary surfaces. | `ACCEPTED` |
| W98-D08 selector | Native select | Two options in User Settings → Appearance; provider-owned optimistic switching and atomic rollback. | `ACCEPTED` |
| W98-D09 brand/icon scope | `authenticated_in_product_brand_mark_surfaces` via one bounded presentation owner | Public/loading/browser identity remains Default; action/status/user/server/role assets remain invariant. | `ACCEPTED` |
| W98-D10 slices | W98.1 / W98.2 / W98.3 | Separates persistence, presentation and integrated risk. | `ACCEPTED` |

## 7. Accepted slices and revalidation

1. **W98.1 — typed registration/persistence/Appearance activation — IMPLEMENTED / AUTOMATED VALIDATION PASS:** `LIKECORD_RETRO_98`, normal CHECK-widening Prisma migration, shared/API validation, Web registry/root metadata, selector, persistence, optimistic switching/rollback and focused/full automated validation. It does not own full retro presentation.

2. **W98.2 — presentation/assets — IMPLEMENTED / AUTOMATED VALIDATION PASS:** structured theme asset placement, Default first-class namespace and compatibility alias preservation, Retro 98 mark integration, semantic token scope, bounded controls/layers chrome, typography, CSS teal background, local visual/accessibility validation and `likecord-ui-review`; no product behavior fork.

3. **W98.3 — integrated acceptance — COMPLETE / PASS:** same-source publication, migration rollout, `PREPARE → DEPLOY → VERIFY`, real Default ↔ Retro 98 switching, cross-browser and logout/login persistence, rollback evidence, visual/accessibility acceptance, Voice/Screen Share/Chat lifecycle and final freeze all passed.

W98.3, as the first alternate-theme owner, revalidated and passed the inherited
Theme Engine obligations:

| Check | Final evidence |
|---|---|
| TE-M03 | Live Default ↔ Win98 without reload/remount. |
| TE-M04 | Persistence after protected-route reload. |
| TE-M05 | PostgreSQL-authoritative result in a second browser/device. |
| TE-M06 | Same-account logout/login persistence with safe local reset. |
| TE-M10 | Failure restores selector, root, UA scheme, mirror and confirmed value. |

The integrated matrix must additionally preserve Default, public/default routes, Settings focus/lifecycle, active Voice, Screen Share, Chat/Composer, contrast, 100%/125%/150% zoom, reduced height, reduced motion, forced colors and clean console/hydration.

## 8. Historical W98.2 Likecord UI review and next action

| Finding | Result |
|---|---|
| `KEEP` | One component tree; frozen Default presentation; unboxed message rows; functional avatar/status/media geometry; dense navigation; semantic focus, selection, speaking/live and error states; two existing shell headers as the only title-strip role. |
| `WATCH` | The system-fallback font and native select rendering vary by platform; W98.3 must revalidate them cross-browser without expanding the CSS fork. |
| `SIMPLIFY` | None. The implementation avoids per-message/per-row bevels, fake window controls, repeated title bars, glow, blur and new decorative elevation. |
| `SYSTEMIZE` | Repeated Retro control/layer treatment uses the bounded bevel, title-strip and control-radius variables under the single Retro root scope. |

At the W98.2 checkpoint, the next action was to commission W98.3 integrated
acceptance. Section 11 records that later acceptance and supersedes this
checkpoint status without rewriting its historical evidence.

## 9. W98.1 implementation and automated validation — 2026-09-07

The shared `ThemeId` owner now contains exactly `LIKECORD_DEFAULT` and
`LIKECORD_RETRO_98`. The existing API DTO and service consume that shared
allowlist, so GET preserves valid Retro 98 and PATCH accepts either current ID
while retaining strict fields, missing-row defaults, partial updates and account
ownership. Migration
`20260907230000_expand_theme_preference_retro_98` drops and recreates
`user_preferences_theme_check` with exactly those two values and performs no
data rewrite.

The sole Web registry maps Retro 98 to public label **Retro 98**, root
`likecord-retro-98` and `colorScheme: light`. The existing bootstrap parser and
`UserPreferencesProvider` therefore handle the second theme without a new
context: selection updates preference/root/UA scheme/mirror optimistically,
serialized PATCH responses remain authoritative, and rejection restores the
last confirmed state together. Login, Register and Invite remain Default.

Appearance reuses the existing Settings section, field styling, focus-visible
rules and mutation loading/error/retry feedback. Its native **Theme** select has
exactly **Likecord Default** and **Retro 98**. No theme assets, visual tokens,
Win98 chrome, Default redesign, public-route theming, component-tree fork or
AppContent/WebSocket/Voice/Screen Share/Chat/Composer lifecycle change was made.

Automated evidence passed: focused Web 5 suites / 36 tests; focused API unit 1
suite / 7 tests; focused API E2E 1 suite / 14 tests; full API unit 23 suites /
217 tests; full API E2E 26 suites / 447 tests; full Web 50 suites / 662 tests;
shared/database/API/Web typechecks; affected owner lint (existing warnings,
zero errors); Prisma format/validate/generate; and the complete 11-migration
chain on fresh disposable PostgreSQL 15. A disposable legacy-row exercise
preserved `LIKECORD_DEFAULT` and `showSendButton=true`, accepted
`LIKECORD_RETRO_98`, rejected `UNKNOWN`, and confirmed the exact named CHECK.
No persistent local or Staging service was accessed or mutated.

## 10. W98.2 presentation, assets and local development QA — 2026-09-07

The two external audited ZIPs were available outside the repository and matched
their frozen SHA-256 values exactly. W98.2 copied only
`/themes/default/assets/brand/mark.png` and
`/themes/retro-98/assets/brand/mark.svg`. The Default mark is byte-identical to
the retained `/brand/likecord-icon.png` compatibility alias. No ZIP, reference
board, Microsoft-derived image, wordmark, icon pack, ICO, wallpaper, font or
sound entered production.

The protected Home mark now consumes one root-scoped
`--brand-in-product-mark` owner. Default resolves the first-class Default mark;
Retro 98 resolves the audited SVG. Auth, Invite, pre-hydration/loading and
browser/app metadata remain modern Default. No component checks the Retro
ThemeId and no React/product-tree fork was introduced.

`apps/web/src/styles/themes/retro-98.css`, loaded after the unchanged Default
globals, owns the complete Retro scope under
`[data-theme="likecord-retro-98"]`. It maps the teal application canvas,
gray/white pane hierarchy, dark readable text and links, explicit semantic
success/warning/danger/info/disabled colors and the accepted system fallback
font onto existing semantic roles. Five bounded chrome variables own bevel
highlight/shadow/dark, the existing-header title strip and square control
geometry. Bevels are limited to real controls, fields, navigation controls and
existing layers; message rows, avatars, status dots, role colors and media
geometry retain their functional presentation. Forced-colors focus behavior and
the global reduced-motion owner remain authoritative.

Local Docker development QA rebuilt/recreated only Web and, after the running
API proved older than W98.1 by rejecting the registered ThemeId, only API. No
migration was run or created and the aligned 11-migration PostgreSQL state was
not mutated. In an existing authenticated Chrome context, Default → Retro 98 →
Default switched without reload and with root/select/UA scheme agreement. Home,
Server Rail, Channel list, Chat, Composer, Member panel, User Panel, Settings,
the native selector, controls, a modal, context menu, tooltip and visible Voice
controls were reviewed. The Retro result retained readable compact density,
clear navigation/state cues, the audited mark and no horizontal overflow. A
live Screen Share control was not rendered without joining Voice, so no
microphone or display capture was initiated; its presentation/lifecycle suites
remain automated evidence for W98.2 and final integrated manual coverage stays
with W98.3.

The browser surface exposed no direct zoom control. The normal 100% state passed,
and proportional 1491×786 and 1243×655 effective layout viewports exercised the
125%/150% layout pressure without clipping or horizontal overflow. A 1366×600
reduced-height pass kept Channel scrolling, Composer, User Panel, Settings close
control and Theme select reachable. Deterministic coverage retains reduced-motion
and forced-colors rules and verifies at least 4.5:1 contrast for the accepted
light text/state pairs. Browser console errors/warnings were empty during the
review.

Automated evidence passed: the initial focused Web run covered 4 suites / 25
tests, the final Retro presentation suite covered 1 suite / 6 tests, and the
full canonical Web run covered 51 suites / 668 tests, all with zero snapshots.
Web typecheck passed. Web lint passed with zero errors and the existing
79-warning baseline. The Docker Web production build compiled and completed its
TypeScript/static-page stages. The final pre-commit `git diff --check` passed.
API/shared/database tests were not repeated because their source owners did not
change.

Documentation impact:

- Updated: this owner, `docs/product/post-vi-product-ux.md`,
  `docs/product/ui-ux-roadmap.md`, `docs/architecture.md` and `AI_CONTEXT.md`.
- New accepted decisions: none; W98.2 implements the frozen W98-D01–W98-D10
  contract.
- Proposed/deferred ideas not made authoritative: none; W98.3 integrated
  acceptance and WinXP remain existing later stages.
- Known stale documentation introduced: none.

```text
DOCUMENTATION_UPDATED=docs/product/theme-win98.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,docs/architecture.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 11. W98.3 final integrated acceptance and milestone freeze — 2026-09-08

W98.3 published API and Web from the exact accepted runtime source
`accepted Win98 theme candidate`. The immutable release refs are:

- API: `ghcr.io/ryezuo/likecord-api@sha256:d9794c98feef9b47adde3da0e037d4adc83035eb2b3561773db2b7ce19afa739`;
- Web: `ghcr.io/ryezuo/likecord-web@sha256:7d0911646ca32f64277cb1f623dc5b7370de6dedbd1aa68755de4f258d7f1aa0`.

Both exact digests pulled as `linux/amd64`, carried the expected source and
revision labels, and exposed BuildKit provenance. Their default commands
started successfully: a disposable API stack reached HTTP 200 after the full
11-migration chain and the Web returned HTTP 200 with zero restarts. The API
contained the runnable Prisma CLI and target migration. The Web contained only
the accepted production marks
`/themes/default/assets/brand/mark.png`,
`/themes/retro-98/assets/brand/mark.svg` and retained
`/brand/likecord-icon.png`; no blocked reference board, Microsoft-derived art,
ZIP, wallpaper, wordmark, ICO pack, proprietary font or sound shipped.

The manual operator completed the canonical Staging `PREPARE -> DEPLOY ->
VERIFY` sequence. PREPARE captured the prior Theme Engine API/Web refs,
container identities and non-target invariants; confirmed the exact target
migration was pending; and created the non-empty PostgreSQL backup in
its historical W98.3 rollout directory, SHA-256
`d68a41099111c872bb8605d0a59165f6bb355222d65e70a7b110342e0d75c5f0`.
The two early wrapper errors were harness/path errors and stopped before any
mutation. The accepted DEPLOY used only `prisma migrate deploy`, applied
`20260907230000_expand_theme_preference_retro_98` exactly once, then replaced
API and Web sequentially by exact digest behind health gates. VERIFY found the
schema current, both public endpoints HTTP 200, both containers healthy with
zero restarts, exact source revision and platform, zero fatal matches in 138
API and 5 Web log lines, and unchanged `caddy`, `postgres`, `redis` and `coturn`
identities. Redis and R2 were not mutated; rollback was neither required nor
performed.

Final Chrome evidence on Staging covered Home, Server Rail, Channel list, Chat,
Composer, Member list/panel, User Panel, Settings, native Theme select, modal,
context menu, tooltip, Voice and Screen Share. The select remained accessibly
labelled and contained exactly **Likecord Default** and **Retro 98**. Default
retained its dark root and accepted modern presentation. Retro used the light
root, CSS teal/gray hierarchy, readable surfaces, restrained bevels, square
control language and the authenticated Retro mark without content
over-windowization or Microsoft-derived imagery.

The agent-observed and operator-supplied final matrix is:

| Check | Result | Evidence |
|---|---|---|
| TE-M03 | PASS | Default and Retro switched live in both directions without route or entered-draft loss. |
| TE-M04 | PASS | A protected channel reload returned with Retro root, light UA scheme and Retro selected; console remained clean. |
| TE-M05 | PASS | The manual operator confirmed the PostgreSQL-authoritative result in the second browser/device. |
| TE-M06 | PASS | The manual operator completed same-account logout/login, safe public Default reset and durable Retro restoration. |
| TE-M10 | PASS | The manual operator completed the exact theme-PATCH failure/recovery scenario and confirmed selector, ThemeId, root, UA scheme, bootstrap mirror and confirmed server value rolled back together before a successful retry. |
| Account/public lifecycle | PASS | The manual operator coordinated Account A and Account B, confirmed independent preferences, and confirmed Login/Register/Invite retain Default identity. |
| Real zoom | PASS | 100% passed at DPR 1; 125% passed at DPR 1.25 in both themes with connected Voice; the operator confirmed 150% in both themes with Voice and Screen Share and restored 100%. |
| Reduced height | PASS | At 1366x600 both themes kept Settings/select, Chat, Composer and User Panel reachable with no horizontal corruption. |
| Reduced motion | PASS | The operator completed the required `prefers-reduced-motion: reduce` run with `matchMedia=true`, switched themes and restored the setting. |
| Forced colors | PASS | The operator completed the frozen forced-colors semantics: focus, selection, status, error, disabled and text cues remained distinguishable; bevels did not replace system cues. |
| Chat/Composer | PASS | Settings and live theme switching preserved Chat/Composer mounting and the intentional unsent draft; send behavior did not change. |
| Voice | PASS | Connected Voice survived Settings and Default/Retro switching. At real 125% Retro retained 56px connection height and unclipped controls. |
| Screen Share | PASS | The operator selected the source, confirmed active sharing through both themes, Settings and real 125%/150% zoom, then stopped capture. Camera was not used. |
| Cleanup/console | PASS | Final observation at DPR 1 found no Voice participant, active Voice owner or Screen Share marker, no overflow and no browser warnings/errors. |

The accepted final tuning resolved exactly as frozen: `.app-layout` gap `6px`
and padding `10px`; User Panel controls and connected Voice `56px` high; Voice
actions `2.4px` (`.15rem`) apart; main content and message list from
`--bg-secondary`; header actions margin-right `8px`; Settings sidebar/main from
`--bg-primary`/`--bg-secondary`; Member Panel from `--bg-elevated`; and User
Panel section padding `0`.

The final `likecord-ui-review` disposition is:

| Finding | Result |
|---|---|
| `KEEP` | Default identity, one component tree, compact communication density, Retro hierarchy/chrome, semantic state cues and all accepted tuning values. |
| `WATCH` | Native select and system-fallback font rendering remain platform-dependent, but cross-browser/operator evidence found no clipping or accessibility failure. |
| `SIMPLIFY` | None; no repeated fake windows, message bevels or decorative effect stack was introduced. |
| `SYSTEMIZE` | Keep the existing root-scoped Retro tokens and bounded bevel/title-strip/control variables as the sole presentation owner. |

No source remediation was required, so the deployed source and immutable images
remain final. `THEME_WIN98_01` is complete, accepted and frozen; the inherited
multi-theme obligation is complete without reopening `THEME_ENGINE_01` or
`VISUAL_IDENTITY_01`. `THEME_WINXP_01` remains not started and is deferred by
explicit user decision. `MEDIA_VIEWER_01` is the next official stage.

Documentation impact:

- Updated: this owner, `docs/product/post-vi-product-ux.md`,
  `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
- New accepted decisions: final W98.3 integrated acceptance and milestone
  freeze; no product or architecture decision changed.
- Proposed/deferred ideas not made authoritative: none; WinXP remains a
  separately commissioned future stage.
- Known stale documentation introduced: none.

```text
DOCUMENTATION_UPDATED=docs/product/theme-win98.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=final_W98_3_integrated_acceptance_and_theme_win98_freeze
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```
