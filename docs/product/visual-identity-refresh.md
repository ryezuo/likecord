# Likecord Visual Identity Refresh — VISUAL_IDENTITY_01

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

Status: `DISCOVERY_COMPLETE / CONTRACT_FINALIZED / IMPLEMENTATION_COMPLETE /
COMPLETE / ACCEPTED / CONTRACT_FROZEN`;
`VI.1–VI.3R3 IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PASS`;
`VI.4 IMPLEMENTATION_COMPLETE / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PASS / COMPLETE / ACCEPTED`.
`VI.5 IMPLEMENTATION_COMPLETE / AUTOMATED_VALIDATION_PASS /
LOCAL_MANUAL_VALIDATION_PASS / STAGING_VALIDATION_PASS / COMPLETE / ACCEPTED`;
`VI.6 IMPLEMENTATION_COMPLETE / AUTOMATED_VALIDATION_PASS /
LOCAL_MANUAL_VALIDATION_PASS / COMPLETE / ACCEPTED`;
`VI.6A INITIAL_MANUAL_VALIDATION_PASS / R1_IMPLEMENTED /
R1_AUTOMATED_VALIDATION_PASS / R1_MANUAL_VALIDATION_PASS / COMPLETE`;
`VI.6B IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS`;
`VI.5A Voice` and `VI.5B Screen Share IMPLEMENTED / AUTOMATED_VALIDATION_PASS`.
`VI.7 IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS /
FINAL_STAGING_VALIDATION_PASS / COMPLETE / ACCEPTED`.
The first staging checkpoint and foundation/direction through VI.3R2 are accepted
in [section 17.4](#174-vi3r2-first-staging-checkpoint--accepted). VI.3R3 is
formally accepted in [section 18.5](#185-final-vi3r3-acceptance--recorded-2026-09-05).
Discovery / implementation dates: 2026-09-03–2026-09-06. `IMPLEMENTATION_STARTED=true`.
VI.4R and VI.4R2 are implemented and manually validated; VI.5A and VI.5B are
implemented and automatically validated, with the consolidated local and Staging
human checkpoints accepted. VI.4 and VI.5 are formally complete and accepted;
VI.6 implementation is complete and automatically validated: its dedicated
preflight is complete, VI.6A Auth & Entry and its targeted R1 reconciliation
passed their human checkpoints, and VI.6B bootstrap and route-level system
states passed their consolidated local human checkpoint. VI.6 is formally
complete and accepted. VI.7 implementation and automation are complete; final
publication, Web-only Staging rollout and real-browser V01–V10 acceptance remain
pending.
Identity: `VISUAL_IDENTITY_01`; this is not an F-stage. The complete milestone
is formally accepted and frozen in section 34; future product UX work is owned
by the post-VI preflight transition recorded there.

## 1. Authority, classification and scope

This document owns the VI.0 visual discovery evidence, visual implementation
boundaries, foundation design values, VI.1–VI.7 sequence and future acceptance.
VI.0 authorized discovery only; its baseline and closure remain historical
evidence. The subsequent VI.1 task authorized only Web foundation, the exact icon
copy, proportional validation/documentation and one local commit. Section 13
preserves that slice's evidence. The subsequent VI.2 task authorizes only shared
Web primitive styling, proportional validation/documentation and one local
commit. Section 14 preserves that slice's evidence. VI.3 authorizes only the
persistent Web navigation/app-shell presentation, proportional validation and
one local commit. Section 15 preserves that implementation record. VI.3R
authorizes only the bounded shell depth/layout reconciliation in section 16.
VI.3R2 authorizes only the first-checkpoint visual tuning in section 17.
VI.3R3 authorizes only the user-validated shell cleanup in section 18, which
supersedes earlier shell separator, selection-marker and lower-geometry rules.
VI.4 authorizes the three bounded Messaging & Management slices recorded in
sections 19–21. VI.4R authorizes only the user-directed final surface/color
reconciliation recorded in section 22. The earlier immutable VI.4 candidate
passed its complete manual checkpoint; the refined VI.4R source now requires its
own publication, local Web replacement and targeted manual recheck.
None of these slices authorizes publication, staging, deployment or later
surface work. The separately supplied VI.3R2 publication and manual acceptance
evidence is reconciled in section 17.4; this documentation task performs no
publication, deployment or new runtime validation.

- `DECISION_ACCEPTED`: the user-specified dark-first Likecord brand direction,
  reference-master protection, frontend-only scope, frozen behavior, scarce
  gradient, accessibility acceptance and independent debt/gate ownership;
  VI.1 accepts the foundation values and canonical icon destination; VI.2 accepts
  explicit native-control variants; VI.3 accepts the bounded shell styling and
  moderate Home icon placement recorded in section 15; VI.3R accepts the shell
  depth and composition decisions recorded in section 16; VI.3R2 accepts the
  bounded hierarchy, selection and creation-modal tuning recorded in section 17;
  VI.3R3 accepts the explicit user-browser corrections recorded in section 18;
  VI.4 accepts the compact Composer inset and reduced Create Channel containment
  recorded in section 19, the chat/attachment/delete presentation recorded in
  section 20, and the management/settings presentation recorded in section 21;
VI.4R accepts the exact final surface aliases/map, transparent UserPanel
wrapper and borderless shared button base recorded in section 22; VI.4R2
accepts the Invite Administration toolbar tertiary surface and removal of its
redundant bottom border recorded in section 22.1. VI.5 authorizes only the two
bounded Voice and Screen Share presentation slices recorded in sections 25–26.
- `HISTORICAL / SOURCE_OBSERVED`: the source and image inventory below describes
  the exact closure baseline; source inspection is not a fresh runtime test.
- `PROPOSED`: later asset usages remain conditional on accepted assets.
- `DEFERRED`: the user explicitly keeps functional debts outside branding.
  The possible disabled value for future Voice idle remains only a proposal.
- `IMPLEMENTED`: VI.1 foundation, VI.2 shared primitives, VI.3 navigation/app
  shell, VI.3R shell reconciliation, VI.3R2 checkpoint tuning, VI.3R3 cleanup,
  all three bounded VI.4 slices and VI.4R, both accepted VI.5 Voice/Screen Share
  slices, VI.6A Auth & Entry, and VI.6B bootstrap/route states, with automated
  validation, plus the bounded VI.7 final-polish slice. R01–R10 manual staging passed for the immutable checkpoint through
  VI.3R2 (section 17.4). VI.3R3 and VI.5 manual validation passed; VI.6A manual
  validation passed and the consolidated VI.6B/manual acceptance checkpoint is
  accepted in section 31.

Sections 13–17.3 preserve historical slice-closure evidence, including then-pending
staging/publication markers and then-next actions. Section 17.4 supersedes those
statuses only for the accepted VI.1–VI.3R2 artifact; section 18 continues to own
the later VI.3R3 implementation decisions and final manual acceptance.

Contract finalization means discovery is complete and the bounded implementation
can be commissioned. It does not waive asset quality checks or future visual
acceptance. Recommendations must satisfy this contract's accepted constraints;
small measured color adjustments may be recorded here during implementation.
Do not silently broaden product scope to resolve a design issue.

Behavioral authority remains with [F5 Invite / Entry](./f5-invite-server-entry.md),
[F5 Server Settings](./f5-server-settings-invite-admin.md),
[F5 Channel / Category Settings](./f5-channel-category-management.md),
[F6 Voice](./f6-voice-ux.md), [F7 Core User UX](./f7-core-user-ux.md),
[Member/Voice convergence](./member-voice-context-menu-convergence.md),
[F4 deletion](./f4-message-delete-lifecycle.md), and the
[permissions model](./permissions-model.md). The
[roadmap](./ui-ux-roadmap.md#242-ordem-de-produto-e-release) owns formal gate order;
[API](../api-spec.md) and [data](../database.md) contracts remain unchanged.
F5/F6/F7 and Member/Voice convergence remain COMPLETE / FROZEN.

## 2. VI.0 precheck and evidence method — historical

| Check | Verified result |
|---|---|
| Starting branch | `historical member voice context menu convergence work` |
| Starting HEAD | `member voice menu convergence milestone` |
| Latest subject | `docs(ux): close member voice menu convergence` |
| Tracked worktree / index | Clean / clean |
| Untracked state | `docs/design/`; allowed and excluded from staging |
| New discovery branch | `historical visual identity discovery work` |
| HEAD immediately after branching | Same exact closure SHA |
| Local environment restriction | Initial branch write was sandbox-blocked; authorized retry succeeded. No repository defect inferred. |

Evidence is static inspection of tracked Web source, current contracts and four
local reference PNGs. All four were visually opened; dimensions, pixel format,
alpha population and SHA-256 were read without writing image files. Solid-color
contrast calculations were performed locally. There was no running-app visual
review, rendered UI screenshot, small-icon export, image transformation, browser
session, application test or staging visit. Future screenshot acceptance remains
pending. Only the exact `docs/design/likecord-brand-reference/` subtree was read;
other `docs/design/` contents were not inspected.

## 3. Reference asset inventory and promotion matrix

The primary visual evidence is the user-supplied local directory
`docs/design/likecord-brand-reference/`. These paths are provenance strings, not
Markdown image links or runtime dependencies. A clone without these untracked
files can understand this contract. VI.0 modified, staged or copied no reference.
VI.1 subsequently copied only the approved icon, without changing its bytes;
source locations remain untracked/unstaged. See section 13 for current provenance.

| Source file | Format / dimensions / ratio | Alpha | Visual type and observations | Recommended role / VI.1 promotion | Recommended canonical name if promoted |
|---|---|---|---|---|---|
| `ChatGPT Image Sep 1, 2026, 11_44_18 PM (2).png` | PNG RGB, 1254 × 1254, 1:1 | None; fully opaque | Large dimensional dark app-icon presentation; rounded tile, luminous violet/cyan rim, substantial dark margin, symmetric curved sides, two outer dots and three central voice bars | Large brand/social presentation reference only; no default Web shipment. Excess framing and glow make small navigation/favicon use unsuitable | None in VI.1; optional future marketing copy `likecord-app-presentation.png` only if separately needed |
| `likecord-icon.png` | PNG RGBA, 1254 × 1254, 1:1 | Real transparency; 545,936 zero-alpha, 1,024,584 partial-alpha, 1,996 opaque pixels | Cleanest supplied app tile; dark rounded square, stronger symbol occupancy and no external dimensional rim. It is a tile, not an isolated transparent symbol | Promoted byte-identically in VI.1; component placement and small-size acceptance remain later work | `apps/web/public/brand/likecord-icon.png` (VI.1 user-approved name supersedes VI.0's proposed `likecord-app-icon.png`) |
| `likecord-wordmark.png` | PNG RGBA, 2172 × 724, 3:1 | Real transparency; 1,298,864 zero-alpha, 269,207 partial-alpha, 4,457 opaque pixels | Horizontal gradient symbol plus white rounded Likecord lettering. Visible ragged residue/stray patches around and between letters and symbol edges in the supplied export | Intended auth/entry wordmark, but **do not ship this export as-is**. Hold promotion for a clean authorized export preserving the approved geometry; keep current textual Likecord heading meanwhile | Reserved, not created: `apps/web/public/brand/likecord-wordmark.png` |
| `likecord-identity.png` | PNG RGB, 1448 × 1086, 4:3 | None; fully opaque | Brand board: icon, wordmark, palette, communication motifs, phone/desktop/Voice mockups | Brand-language reference only; never bundle or use as an application screenshot/layout specification | None |

Partial alpha is not confined to antialiased edges. Sampling every fourth pixel
found alpha 252/253 dominant among nontransparent icon samples; inspect the icon
on the actual dark surfaces before declaring the compositing clean. The
wordmark's visible residue is a visual finding, not a conclusion inferred solely
from its alpha counts. Do not repair either reference master, trace the mark,
crop a replacement symbol from the board, regenerate branding, or substitute a
font to recreate the wordmark.

SHA-256 inventory, for byte-preservation checks:

| Source | SHA-256 |
|---|---|
| Dimensional presentation | `028f04d6098071b61126fb8316b4b2d7ac46f6985f21096513e8ae0a6484fd2c` |
| Clean icon | `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949` |
| Brand board | `2732b436cd7794192c9b10cf3645dcc530b15b819322ccdaea2477857fa451fb` |
| Wordmark | `193ee0f12e87c5c0fc30ba537d2e397e95ea63060ddb54d84933cc3b95738263` |

### 3.1 Small-size and application asset boundary

No tracked `apps/web/public/` assets, favicon, manifest or app-icon file were found
at baseline. `src/app/layout.tsx` has title/description metadata only. Therefore
`apps/web/public/brand/` was proposed in VI.0 and established in VI.1, rather than
being an existing baseline convention. Public asset URLs are
`/brand/...`; never a path into `docs/design/`. Assets should load only on surfaces
that use them; do not import the board or presentation into every route.

These assessments are geometric/visual inference from originals, not a claim
that exported small variants were tested. No scaling or conversion occurred.

| Target | Assessment / implementation acceptance |
|---|---|
| 16 × 16 | Neither tile is production-approved. The clean icon's central bars occupy roughly one pixel each at this scale and lose separation; the presentation is worse. Require `SIMPLIFIED_MARK_SMALL_SIZE` from an authorized design source preserving recognizable geometry; do not invent it in code. |
| 32 × 32 | Clean icon is a review candidate only; thin gaps, outer dots and transparent padding may collapse. No automatic approval from source resolution. Prefer the small-size variant for favicon consistency. |
| 48 × 48 | Clean icon likely usable, matching current rail control dimensions, but test at 1×/2× density and on neutral backgrounds. Do not shrink the control or add a second tile frame. |
| 64 × 64 | Clean icon is the preferred compact brand candidate; still inspect alpha fringe and padding. Dimensional presentation remains discouraged. |
| 180 / 192 / 512 px launcher sizes | Clean icon has sufficient native resolution for downsampling, with no upscaling. Review platform crop/safe area and compositing; transparent rounded artwork is not automatically maskable. No PWA/service-worker/installability project is introduced. |
| Horizontal branding | Use only a future clean wordmark export, retain 3:1 aspect ratio and native geometry; recommended display width 192–240 CSS px for auth, subject to visual review. Existing plain text is the supported interim choice. |

VI.1 explicitly authorized the exact selected-icon copy into the tracked tree.
It excludes favicon/launcher derivation and metadata plumbing, even if a future
asset becomes available. Those usages require a later authorized scope. Record
dimensions, provenance and actual acceptance of any generated derivatives; do
not label a 16 px favicon complete using a visibly illegible substitute. Missing
clean wordmark/small-mark variants block only those asset usages, not neutral
tokens, focus or the rest of the foundation. Their delivery owner is brand/design.

## 4. VI.0 baseline styling architecture — historical

All paths in this section are relative to `apps/web/` unless explicitly qualified.

| Area | Inspected owners / current behavior | Classification |
|---|---|---|
| Styling entry | `src/app/layout.tsx` imports `src/app/globals.css`; one global stylesheet, approximately 960 lines, with reset, root variables and feature selector sections | Reusable foundation; needs bounded tokenization |
| Styling technology | Plain CSS and React `style` objects; inspected package has Next 16.3.3 / React 19.2.8, no Tailwind, CSS-in-JS theme or external UI component library | Remain on current architecture; no dependency change |
| CSS cascade | Early `.channel-sidebar` is 220 px; later rule makes it 240 px. Early `.message` wraps and has a radius; later rule removes radius, but unoverridden earlier properties still apply. Repeated menu, danger-zone, rail-group and header selectors | Inconsistent; inspect effective cascade before editing; no wholesale cleanup |
| Shell ownership | `src/app/channels/layout.tsx` mounts persistent `AppPage`; `src/app/app/page.tsx` / `AppContent` owns routing orchestration, Voice, occupancy, Member context, settings and creation modals | High-risk to restructure; preserve mounting, ownership and callbacks |
| Layout | `.app-layout` is flex with `100vh`/`100dvh`, hidden root overflow; rail 72 px, channel sidebar 240 px, member panel 240 px; main flexes with `min-width:0; min-height:0` | Remain unchanged; CSS geometry/scroll is behavior-sensitive |
| Nested scrolling | `.channel-scroll`, `.message-list`, `.member-panel-scroll`, `.home-state`, Settings panes and bounded menus own scrolling | Reusable; high-risk if overflow/min-size changes |
| Fonts | System stack in `--font`, inherited by native controls; no downloaded font. Dense 0.55–1.5 rem labels plus Home clamp to 2 rem; sparse explicit line heights | Reusable family; inconsistent scale and small labels need review |
| Icons | `src/components/ui/icons.tsx`: named inline SVGs (`HomeIcon`, `HashIcon`, `SpeakerIcon`, `MicIcon`, `HeadphonesIcon`, Screen Share icons etc.), generally 24-unit viewBox/currentColor; 14/15/16/20 px call sites. Also emoji, Unicode and local SVGs | Reuse existing symbols; do not replace the system or imitate another app |
| Inline styling | Counts of `style={` occurrences: ChatArea 17, PresenterCard 12, ChannelSidebar 11, invite route 8, ServerSettings 6, MemberPanel/UserPanel/ConfirmModal 2 each, ViewerWorkspace/Tooltip/VoiceParticipantPopover 1 each | Tokenize static appearance; preserve dynamic positions, user role colors, media and visibility |
| Media | `ScreenStreamVideo.tsx` attaches stream in an effect, renders a muted visual video; CALL/MIC and Screen Share playback policy are owned elsewhere | Must remain unchanged; no added sink or stream remount |

### 4.1 Existing root token inventory

| Existing token(s) | Baseline value |
|---|---|
| `--bg-app` | `#111214` |
| `--bg-rail`, `--bg-tertiary` | `#1e1f22` |
| `--bg-sidebar`, `--bg-panel`, `--bg-surface`, `--bg-secondary` | `#2b2d31` |
| `--bg-chat`, `--bg-primary` | `#313338` |
| `--bg-elevated` | `#383a40` |
| `--bg-hover`, `--bg-active` | `#35373c`, `#404249` |
| `--border`, `--border-subtle` | `#1f2023` |
| `--text-primary`, `--text-secondary`, `--text-muted` | `#f2f3f5`, `#b5bac1`, `#80848e` |
| `--scrollbar-thumb` | `color-mix(in srgb, var(--text-muted) 62%, transparent)` |
| `--scrollbar-thumb-hover` | `color-mix(in srgb, var(--text-secondary) 76%, transparent)` |
| `--accent`, `--accent-hover` | `#5865f2`, `#4752c4` |
| `--danger`, `--success`, `--warning` | `#da373c`, `#23a559`, `#f0b232` |
| `--radius` | `6px` |
| `--font` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif` |

There are 26 root declarations; no unresolved `var(...)` reference was found in
the inspected production Web source. Background aliases duplicate literals
rather than pointing to one semantic definition. There is no brand gradient,
info, disabled-text, on-fill text, focus, shadow, spacing or motion token family.

### 4.2 Literal values and cascade risks

Counts below are textual CSS declarations at the closure baseline, including
legacy/overridden rules; they are not counts of rendered elements.

| Evidence | Occurrences / exact examples | Direction |
|---|---|---|
| Neutral duplication | `#2b2d31` 4 times, `#1e1f22`/`#313338`/`#1f2023` twice each in root | Alias semantic owners once |
| White on actions | `#fff` 6 CSS occurrences plus ServerSettings, ChannelSidebar, ChatArea, ConfirmModal | Explicit `--text-on-brand` / `--text-on-danger`, according to fill |
| Media black | `#000` 4 CSS uses plus PresenterCard | `--bg-media:#000000`; preserve actual video contrast |
| Role color default | `#99aab5` in ServerSettings initialization/reset | User-editable persisted role-data default, not a theme token; leave unchanged |
| Error tint | `.member-panel-error` uses `rgba(218,55,60,0.15)` | Use semantic danger tint; do not leave an old-red literal after palette migration |
| Radius | `var(--radius)` 43; 4 px 13; 3 px 10; 8 px 5; 6 px 3; 14 px 2; 10/5 px once; 50% 13, 30% 3, 999 px 3 | Normalize corner treatments by role; preserve circles/pills and special rail selection marker |
| Shadows | `0 4px 16px rgba(0,0,0,0.6)` four times: context menu, user menu, participant popover, member feedback; detached `0 8px 24px ... .32`, presenter `0 6px 18px ... .22`; inline presenter viewer-list has its own `0 4px 14px ... .25` | Shared restrained floating elevation; retain speaking/focus/selection rings separately |
| Borders | Mostly 1 px; Add Server uses 2 px dashed; selected settings/permission targets use inset 3 px marker; many permission overrides use `!important` | Separate decorative separators from recognizable controls; migrate specific cascades without global `!important` escalation |
| Spacing | Gaps: .5 rem 32, .75 rem 16, .25 rem 16, .35 rem 14; padding .5 rem 16, 1 rem 11; many .15/.2/.3/.4/.45/.55/.65 rem exceptions | Small reusable spacing scale; preserve dense local geometry until reviewed |
| Type | .8 rem 32, .85 rem 25, .75 rem 23, .7 rem 18, .65 rem 11, .9 rem 10; LIVE as small as .55 rem | Retain system family, improve hierarchy without globally enlarging the shell |
| Motion | Rail 150 ms, message actions 100 ms; `.voice-connected-badge` has `pulse 2s infinite`; no reduced-motion media rule | Remove decorative pulse during its visual slice; add bounded reduced-motion rules |
| Foreground misuse | Auth, modal, edit, confirm and context actions use `color:var(--bg-primary)` on accent/danger | Root-only palette replacement is insufficient; migrate complete foreground/background pairs |
| Structural button styling | `.modal button:first-of-type/last-of-type`, `.settings-content button:first-of-type` and overrides | Replace styling dependence with explicit visual classes in VI.2, keeping DOM action order and handlers |
| Focus | Accent/white outlines, inset rings, background-only Settings nav focus, composer input `outline:none` without container focus | Standardize visible focus; keep existing keyboard behavior |

Token-only changes yield the most benefit in Home cards, shell surfaces,
Settings backgrounds, menu surfaces, attachment containers and auth cards. They
do not fix positional button variants, inline appearance, tiny text, missing
composer focus or asset quality. No percentage of visual completion is claimed.

## 5. Shared components and application surfaces

### 5.1 Shared primitive inventory and migration order

Paths below start at `apps/web/src/components/` unless stated otherwise. A CSS
class is not reported as a reusable React component when none exists.
This discovery inventory guides sequencing; section 14 records the confirmed
VI.2 scope, including why feature-specific cards/badges and functional toggles
did not become new shared abstractions.

| Category | Actual owner(s) | Minimum visual standardization |
|---|---|---|
| Buttons | Native buttons across surfaces; `.sm-btn`, `.danger-button`, `.home-add`, `.context-menu-item`, icon-button families; no generic Button component | Explicit primary/secondary/ghost/danger/icon classes; native disabled and pending remain intact. No component-library rewrite required. |
| Input / Select | Native inputs/selects under `.auth-card`, `.modal`, `.settings-content`, `.edit-form`, composer; no generic Input or Select component | Shared neutral fill, text, border, placeholder and focus rules; preserve native options, validation and label association |
| Checkbox / radio / toggle | `.perm-toggle`, `.role-hoist-toggle`, private-channel controls, Member roles and personal local mute; channel type radios. No custom switch abstraction | Keep native checkbox/radio and actual checked states; tokenized accent/focus. Do not convert permission controls into switches. |
| Tri-state permission | `PermissionOverwriteEditor.tsx`, `.tri-state-control` | Preserve DENY/NEUTRAL/ALLOW labels, symbols, pressed state, grant ceiling and hierarchy; semantic red/neutral/green |
| Range | `voice/VoiceParticipantPopover.tsx` | Native range 0–100 with numeric output, label and local mute; no amplification or reset button |
| Tooltip | `ui/Tooltip.tsx` / `Tooltip`, body portal, focus/hover positioning | Elevated fill/border/type; retain body portal and dynamic geometry to escape sidebar overflow |
| ContextMenu | `ui/ContextMenu.tsx`, `ContextMenuItem`; `ui/contextMenuTrigger.ts` | Shared surface/items/focus/destructive styling; preserve menu roles, checked state, arrow/Home/End/Tab/Escape rules, 8 px clamping and focus return |
| Mixed member/Voice context | `member/MemberContextSurface.tsx` / `MemberContextSurface`; `voice/VoiceParticipantPopover.tsx` | Same visual language as menus but retain mixed dialog/native controls. Do not collapse two accessibility models into one. |
| Dialogs | `ui/ConfirmModal.tsx`, `MessageDeleteModal.tsx`, `AddServerModal.tsx`, `InvitePeopleModal.tsx`, inline management confirmations in app shell/ServerSettings | Shared surface, title, actions and error styling; preserve each existing dismissal/pending/focus contract. ConfirmModal's focus ownership is opt-in, not universally enabled. |
| Settings layer | `settings/SettingsLayer.tsx`, ServerSettings and shell Channel/Category sections | Shared page layer, not a centered modal; independent panes, close control, section scroll reset and mounted workspace preserved |
| Cards / badges | `.home-server-card`, `.att-card`, `.role-card`, `.member-card`, `.invite-admin-card`, `.member-badge`, `.invite-status` | CSS roles suffice; ordinary cards neutral. Status text remains alongside color; user role colors are data. |
| System states | `.loading-screen`, `.home-feedback`, `.empty-state`, `.empty-channel`, `.error-banner`, `.info-banner`, context/persistence status text | Consistent spacing/text/semantic tint; retain real retry, loading and unavailable branches |
| Scrollbars | `.app-layout`, descendants, `.likecord-scrollbar` | Existing thin native scrollbar with 8 px WebKit track/2 px transparent padding; tokenize color only, preserve reachability |

Order: paired color/focus foundation → explicit button and form treatment →
floating surfaces/dialogs → cards/badges → scoped surface adoption. Sharing CSS
does not authorize changing the action model or extracting stateful logic.

### 5.2 Surface inventory and recommended direction

All source paths below start at `apps/web/src/`. Directions are `PROPOSED`;
preservation constraints are `DECISION_ACCEPTED`.

| Surface / source symbols | Current implementation | Implementation-ready visual direction / protection |
|---|---|---|
| App shell — `app/app/page.tsx:AppContent`, `app/channels/layout.tsx:ChannelsLayout` | Persistent flex shell; ScreenShareViewerWorkspace wraps routed Home/chat; single useVoice/useMemberContext ownership | Dark neutral layers, consistent headers. Preserve routes, conditional rendering, keys, media ownership, 100dvh/min-size and scroll boundaries. |
| ServerRail — `components/layout/ServerRail.tsx:ServerRail` | 72 px rail, 48 px initial-based server buttons, HomeIcon, selected 4 × 24 px marker, Add Server; contextual settings/invite/delete/leave | Base background; stable 14 px rounded container, neutral hover, selected background plus retained marker and emphasis. Restrained brand on Home/Add Server. Clean icon may occupy existing Home control after asset review; preserve Home accessible name and target. Do not replace server initials with Likecord branding or add icon upload. |
| ChannelSidebar — `components/layout/ChannelSidebar.tsx:renderChannel`, `renderUncategorizedSection` | 240 px, category collapse, Text/Voice controls, permission-dependent creation, nested Voice participants, UserPanel | Secondary background, categories secondary, item hover distinct from active; active text row gets a small inset marker and weight alongside color. Preserve ordering/collapse and hidden unauthorized entries. No persistent channel unread state exists here; don't add dots/counts merely to complete the design. |
| Headers / MemberPanel — `components/layout/MemberPanel.tsx`, `.chat-header`, `.channel-header`, `.member-panel-header` | 48 px headers; member list groups and status text; panel has local collapse/expand; owner/Voice markers | Align separator/type and restrained selection; retain role/hoist order, actual status labels and context invocation. Do not recolor members into new presence semantics or introduce profile navigation. |
| Home — `components/layout/Home.tsx:Home` | Welcome, Continue from navigation API, independent server/Continue loading and error, server cards, Add a Server, own scroll region | One modest brand identifier, neutral cards, recognizable primary Add CTA, existing Continue emphasis. No marketing hero, fabricated recent history, Friends, DMs or Activity. Keep null Continue and retry semantics. |
| Chat — `components/layout/ChatArea.tsx:ChatArea` | Message list, author/time/avatar rows, inline edit, optimistic/error state, new-message indicator, keyboard/context actions | Clean primary background; rows remain rows, never individual cards. Primary message text, secondary author/meta hierarchy, quiet hover. Reveal existing actions on `:focus-within` as well as hover; retain permissions and delete shortcuts. No sender reconciliation change. |
| Composer — same file, `.composer`, `.composer-inner` | Bottom flex region, 44 px minimum input area, file/paste handling, permission-disabled state; Gift/GIF/Sticker/Emoji placeholders already exist | Elevated neutral fill, 12 px radius, recognizable border and container `:focus-within` ring; readable placeholder. Preserve submit/paste and attachment permission gates. Existing placeholders remain inert; no new picker/feature or functionality implied by restyling. |
| Attachments / deletion — `ChatArea.tsx:renderAttachment`, `components/MessageDeleteModal.tsx` | Image preview/download via existing API path; pending files and errors; bounded deletion preview/content/actions | Understated neutral attachment cards, distinguish file links, wrap long names. Preserve image/download behavior and 400 px delete-dialog cap, viewport constraint, inner scroll, Cancel focus and Shift deletion semantics. No lightbox implementation. |
| Voice — ChannelSidebar, `components/layout/UserPanel.tsx:UserPanel` | Occupancy from visible channels; same-call speaking ring; connected status, mic/deafen/leave, existing share controls | Connected remains green and labeled. Brand detail on speaking ring may use cyan with existing activity labels, without changing detection threshold/attack/release. No equalizer, pulse loop or synthetic activity. Preserve all visibility and permission branches. |
| Member/Voice convergence — `MemberContextSurface`, `VoiceParticipantPopover`, `hooks/useMemberContext.ts` | Shared controller with action-only menu or mixed dialog; identity/roles/personal Voice/server actions/utility | Style existing sections and spacing; retain exact authorization, observer-before-join mix, 0–100%, numeric percentage, local-vs-server mute distinction, self Voice identity-only, Kick/Ban confirmation and invalidation/focus restoration. |
| Screen Share — `components/layout/ScreenShareViewerWorkspace.tsx`, `ScreenSharePresenterCard.tsx`, `ScreenStreamVideo.tsx` | Gallery 1–4 layouts, Focus primary/secondary, CENTRAL/DETACHED/HIDDEN, one detached target, own preview/viewer list, waiting states | Neutral black media bed, restrained selected-control brand detail, clean headers and unchanged LIVE red. Keep `object-fit:contain`, share keys/subscriptions and one visual player per share. Never turn HIDDEN into an audio-preserving new mode. |
| Server Settings — `components/ServerSettings.tsx`, `components/settings/SettingsLayer.tsx` | Overview, Roles, conditional Members, Invites, Audit Log, owner-only Delete; page layer | Brand focus/selected marker and header hierarchy; neutral dense panes and cards. Keep section capabilities, role data, reorder controls, confirmations and deletion emphasis. |
| Channel / Category management — `app/app/page.tsx`, `components/PermissionOverwriteEditor.tsx` | Create dialogs; Overview/Permissions/Delete layers; source state, Sync/Unsync, role/member tri-state matrix | Same shared treatment; CSS/classes only around existing sections. Preserve immutable channel type, category deletion survival, permission source states and all destructive copy/confirmation. |
| Invite administration — `components/InviteAdministration.tsx:deriveInviteStatus`, `InvitePeopleModal.tsx` | Fast invite/copy surface vs administrative inventory, expiration/uses, revoke, copied/manual fallback | Neutral cards and readable status badges; green valid, amber expired/exhausted, red revoked, never a gradient status. Preserve CREATE_INVITE vs MANAGE_SERVER separation and private unavailable copy. |
| Auth / entry — `app/page.tsx:LoginForm`, `app/register/page.tsx:RegisterForm`, `app/invite/[code]/page.tsx:InvitePage`, `components/AddServerModal.tsx` | Login is `/`, not `/login`; register/invite forms use `.auth-card`; invite returnTo and explicit accept; Add Server choose/create/join/preview | Strongest logo opportunity: reviewed icon and existing text heading, later clean wordmark. Dark base with neutral card, restrained brand accent; keep fields, validation, destinations, explicit accept and all unavailable/already-member branches. No new onboarding workflow. |

Other source limitations are recorded, not adopted as features: UserPanel's
connection-quality display uses a fixed 45 ms estimate, its User Settings button
has no handler, and Camera is an inert coming-soon span. Branding must not imply
new telemetry/settings/video functionality. Do not add dummy controls from the
board. Existing placeholder removal or new functionality requires separate scope.

## 6. Accepted VI.1 foundation tokens and later adoption guidance

Use the existing unprefixed `--bg-*`, `--text-*` naming and the same `:root` in
`globals.css`. Do **not** introduce parallel `--lk-*` and legacy theme trees,
a theme provider, new styling dependency or a light-theme project. The table
below evaluates the requested conceptual `--lk-*` roles using current conventions.
Token definitions in this section are now implemented. Surface placements,
type/spacing/radius adoption and primitive consolidation remain VI.2+ work;
section 13 records the bounded compatibility changes and exceptions.

### 6.1 Backgrounds and aliases

The board supports near-black neutral surfaces with localized colored marks.
The foundation is darker than the VI.0 gray baseline, but less saturated than copying
its blue/violet image shadows across the entire product. Exact values are
designed UI values, not claimed eyedropper matches to gradient artwork.

| Token | Implemented value | Role / later surface guidance |
|---|---|---|
| `--bg-base` | `#0B0D12` | Deepest shell / rail / auth backdrop |
| `--bg-primary` | `#11141B` | Main chat/Home/Settings content |
| `--bg-secondary` | `#171B24` | Channel/member/settings sidebars and neutral cards |
| `--bg-tertiary` | `#1E232E` | Recessed controls / secondary surface distinction |
| `--bg-elevated` | `#272D3A` | Composer and floating surfaces |
| `--bg-hover` | `#303747` | Scoped interactive hover |
| `--bg-active` | `#394357` | Selected neutral surface, paired with marker/weight |
| `--bg-media` | `#000000` | Video canvas; neutral media exception |
| `--bg-overlay` | `rgba(0,0,0,0.64)` | Modal backdrop; no blur |

Alias `--bg-app` and `--bg-rail` to base; `--bg-chat` to primary;
`--bg-sidebar` and `--bg-panel` to secondary; `--bg-surface` to tertiary.
Change rail selectors from historical `--bg-tertiary` to `--bg-rail` in the same
foundation change: tertiary now means a surface depth, not rail placement.
VI.6 owns assigning auth backdrop to base and auth card to secondary explicitly;
VI.1 retains their existing selectors (secondary backdrop / primary card). Never change
one variable's meaning without reviewing its consumers and aliases.

### 6.2 Brand, text and semantic states

| Token | Implemented value | Role / pairing |
|---|---|---|
| `--brand-violet` | `#8B5CF6` | Logo-language/gradient stop |
| `--brand-indigo` | `#6366F1` | Gradient stop; not automatically a readable filled button |
| `--brand-blue` | `#3B82F6` | Gradient stop |
| `--brand-cyan` | `#22D3EE` | Gradient stop / sparse detail |
| `--brand-primary` | `#6254CE` | Solid primary fill adjusted for white text |
| `--brand-primary-hover` | `#7162DF` | Hover fill, white text |
| `--brand-secondary` | `var(--brand-violet)` | Secondary decorative accent, not default body ink |
| `--brand-accent` | `var(--brand-cyan)` | Small brand activity accents |
| `--accent`, `--accent-hover` | Aliases to primary / primary-hover | Compatibility for filled-action consumers |
| `--text-primary` | `#F2F3F7` | Body / high-priority content on neutrals |
| `--text-secondary` | `#BCC2CF` | Labels and supporting text |
| `--text-muted` | `#ADB5C5` | Small metadata/placeholder; deliberately lifted for dark active surfaces |
| `--text-disabled` | `#7F899C` | Inactive controls only, never important helper/error text |
| `--text-link` | `#B8ABFF` | Brand-aware link/text on neutral backgrounds |
| `--text-on-brand`, `--text-on-danger` | `#FFFFFF` | Filled primary / destructive action text |
| `--text-on-semantic` | `#0B0D12` | Text on bright success/warning/info badges |
| `--success` | `#4CCB8F` | Connected/valid/allow ink; functional green preserved |
| `--warning` | `#E8B95A` | Warning/expired/Busy-related existing semantics as applicable |
| `--danger` | `#F07881` | Destructive/error/LIVE ink on base through elevated surfaces |
| `--danger-solid` | `#B93243` | Filled destructive action; use on-danger text |
| `--danger-solid-hover` | `#A62B3B` | Destructive hover with on-danger text |
| `--info` | `#79B5F8` | Informational state ink |
| `--bg-success-subtle`, `--bg-warning-subtle`, `--bg-danger-subtle`, `--bg-info-subtle` | `color-mix(in srgb, var(--success/--warning/--danger/--info) 12%, var(--bg-secondary))`, one definition per state | Tinted neutral banners; measure each actual composite before acceptance |

The last row describes four separate definitions; `--success/--warning/...` is
table shorthand, not valid CSS. Prefer primary text plus semantic icon/edge for
long banner copy. Danger ink is not approved as small text on `--bg-active`;
danger-hover items use danger-solid/on-danger instead. Do not use disabled
opacity for live status or meaningful message content.

VI.1 moved legacy accent ink (message authors, file/auth links, server-name hover
and Screen Share labels) to `--text-link`; filled brand controls now use on-brand
text, and filled danger actions use danger-solid/on-danger. The migration includes
static inline consumers. Bright semantic dots/avatars retain their semantic fill;
existing dark avatar initials remain readable, with explicit on-semantic adoption
owned by VI.2+. Role colors/defaults remain user data.

### 6.3 Gradient policy

Implemented `--gradient-brand` (defined once, no application-surface consumer in VI.1):

```css
linear-gradient(135deg, #8B5CF6 0%, #6366F1 35%, #3B82F6 65%, #22D3EE 100%)
```

Retain the recognizable violet → indigo → blue → cyan family from the references.
This CSS gradient does not recolor or reconstruct the supplied logo. Eligible
uses: actual brand art, one small selected brand accent, auth identity decoration,
and restrained Voice detail. A high-priority CTA may use it only after measuring
the entire text footprint; the default CTA is solid primary. White on the cyan
stop is only 1.81:1, so blanket white gradient buttons are rejected.

No gradients on ordinary cards, every button/border, warning/success/destructive
states, text messages or large application backgrounds. No gradients as the only
selected/status cue. No outer brand glow is needed in the initial implementation;
the artwork already supplies brand expression. Consistency takes precedence over
effects and resemblance to another communication product.

### 6.4 Typography, spacing, radii, borders, elevation and focus

| Family | Implemented definitions / later adoption guidance |
|---|---|
| Font | Keep exact existing `--font` system stack. Do not load a new font or try to match raster lettering using a substitute. |
| Type | `--font-size-xs:.75rem`, `--font-size-sm:.8125rem`, `--font-size-body:.9375rem`, `--font-size-title:1.125rem`; Home keeps bounded `clamp(1.4rem,2.5vw,2rem)`. Normal 400, labels 500, actions 600, titles 700. |
| Line height | Body 1.5; compact controls 1.25; headings 1.2. Define tokens first, adopt per surface to avoid changing every row's height at once. Keep numeric mix percentage tabular. |
| Small labels | Move important 0.55–0.7 rem labels toward .75 rem where they fit; maintain dense layout and verify truncation/zoom. No global root font-size change. |
| Spacing | `--space-1:.25rem`, `--space-2:.5rem`, `--space-3:.75rem`, `--space-4:1rem`, `--space-6:1.5rem`, `--space-8:2rem`. Map repeated values when touching a surface; do not round every local measurement mechanically. |
| Radius | `--radius-sm:4px`, `--radius-md:8px`, `--radius-lg:12px`, `--radius-xl:16px`. VI.2 adopts md for shared controls/menu/settings rows, lg for the shared dialog and sm for Tooltip. Legacy `--radius:6px` remains for unmigrated consumers; later surface adoption is not complete. Circles remain 50%, pills 999 px; stable 14 px rail containers and radius-0 message rows remain unchanged. |
| Border | `--border-subtle:#303746` decorative separators; `--border-default:#465168` ordinary outlines; `--border-highlight:#B8ABFF` brand emphasis; `--border-control:#758199` where outline is required to identify an input/control. `--border` aliases default; use 1 px and avoid assigning the stronger control border to every card. |
| Shadows | `--shadow-low:0 2px 8px rgba(0,0,0,.18)` compact floating detail; `--shadow-elevated:0 8px 24px rgba(0,0,0,.28)` menus/dialogs/detached surfaces. Normal cards and main columns have no shadow. Do not replace selected/speaking rings with elevation shadows. |
| Focus | `--focus-ring:var(--text-link)` (`#B8ABFF`), `--focus-gap:var(--bg-base)` (`#0B0D12`), `--focus-width:2px`, `--focus-offset:2px`. Global `:focus-visible` uses ring plus dark separation; dense clipped rows use -4 px inset outline / 2 px inset gap. Selected inset markers are preserved through `--focus-decoration`. Composer input receives this foundation directly; a wrapper `:focus-within` treatment remains VI.4 guidance. Forced colors uses system `Highlight` outline. |
| Stacking | Preserve baseline Settings 90, modal 100, menu/user-menu 200, mixed dialog 210, feedback 220, tooltip 300 and workspace-local layers. Palette work is not a stacking-context redesign; no transforms/filters on ancestors. |

## 7. Accessibility and motion acceptance

Targets for future implementation: at least 4.5:1 for ordinary meaningful text,
3:1 for qualifying large text and essential non-text interactive indicators;
visible focus and non-color cues for status/selection. These are acceptance
targets, not a claim of full WCAG conformance. Disabled controls must remain
recognizable and truly disabled; ordinary explanatory text cannot use their
low-contrast treatment. Brand logos are not evidence that surrounding UI passes.

Local contrast evidence uses sRGB linearization (0.04045 threshold), relative
luminance weights 0.2126/0.7152/0.0722 and `(Llighter+.05)/(Ldarker+.05)`;
values rounded to two decimals. These are opaque color-pair calculations only.

| Pair | Ratio | Interpretation |
|---|---|---|
| Baseline muted `#80848E` / chat `#313338` | 3.38:1 | Below ordinary text target |
| Baseline dark foreground `#313338` / accent `#5865F2` | 2.74:1 | Known pair to replace |
| Baseline primary `#F2F3F5` / accent `#5865F2` | 4.15:1 | Also below ordinary text target |
| Proposed primary / elevated | 12.44:1 | Passes this pair's text target |
| Proposed secondary / elevated | 7.72:1 | Passes this pair's text target |
| Proposed muted `#ADB5C5` / elevated, active | 6.69:1 / 4.82:1 | Lifted muted token supports small text on both |
| White / primary fill, hover fill | 5.71:1 / 4.65:1 | Use explicit on-brand white |
| Link or focus `#B8ABFF` / active | 4.87:1 | Usable on darkest-to-active neutral family |
| Control border `#758199` / elevated | 3.52:1 | Does not approve every adjacent fill; on active it is only 2.53:1 |
| Danger ink / elevated | 5.06:1 | Use constrained pair; do not apply indiscriminately to active surfaces |
| White / danger-solid | 5.83:1 | Filled destructive action pair |
| Success / active | 4.85:1 | Functional connected/allow ink |
| Warning / active; info / active | 5.45:1 / 4.62:1 | Semantic text pairs |

Implementation must measure rendered foreground/background combinations after
hover/selection/focus, `color-mix`, opacity, native form styling and alpha
compositing. Cover timestamps, category labels, placeholder text, menu items,
warning/error banners, tri-state buttons, role badges, selected rail icons,
screen-share LIVE and disabled states. No compliance claim from this small table.

Preserve keyboard invocation (including context-menu key/Shift+F10), menu arrow
navigation, native range/checkbox controls, Escape/outside dismissal, safe
confirmation focus and return to invoker/fallback. Keep mixed Voice dialog vs
action-only menu semantics. Verify existing actions made visible on keyboard
focus, accessible names and checked/pressed/current states. Label associations
missing in current login markup are an accessibility gap for VI.6; associating
existing labels/inputs does not authorize new auth behavior. Broader preexisting
keyboard defects are recorded separately if fixing them needs functional redesign.

At supported desktop viewports and browser zoom 100%, 125%, 150%: preserve shell
and content scrolling, reachable close/destructive controls, long-name wrapping,
tooltip/menu visibility, message deletion preview bounds and media controls.
Suggested review fixtures: 1440 × 900 and 1280 × 800 browser window at each zoom,
plus a reduced-height desktop window; record resulting CSS viewport and browser.
These are review fixtures, not a newly claimed minimum support specification.
Compare with baseline at the same viewport/zoom. Around 390 × 844, the known
compressed desktop navigation remains `UX-RESPONSIVE-01`; do not add drawers,
tablet navigation or new responsive information architecture in this contract.
Preserve existing 720 px permission-editor and 800 px share-gallery adaptations.

Implemented motion foundation: `--duration-fast:120ms`, `--duration-normal:160ms`,
maximum 200 ms, `--ease-out:cubic-bezier(0,0,.2,1)`. Limit transitions to explicit
opacity/background/color properties and rare small transforms on individual
decorative elements. No `transition:all`, bounce, continuous pulse, large scale,
blur or animation loops. Remove connected-dot decorative pulsing while retaining
its static connected indicator. Under `prefers-reduced-motion:reduce`, eliminate
decorative animations/transitions; keep immediate state feedback. Never change
speaking hysteresis, media timing, persistence debounce or reconnect timers as
part of visual motion work.

## 8. Final recommended implementation sequence and risk

VI.0 implemented no slice; VI.1–VI.3R3 are implemented as recorded in
sections 13–18. The first checkpoint through VI.3R2 passed manual staging in
section 17.4, VI.3R3 passed final manual acceptance in section 18.5, and the
bounded post-VI.3R3 / pre-VI.4 UserPanel refinement is complete. VI.4 production
implementation is complete through the three bounded Messaging & Management
slices recorded in sections 19–21. Its pre-refinement immutable candidate passed
the complete manual checkpoint; section 22 records the implemented and accepted
VI.4R/VI.4R2 refinements. VI.5 production presentation is implementation-complete
and accepted through sections 25–27. VI.6 preflight, implementation and formal
acceptance are complete through sections 28–31; VI.7 preflight and implementation
are complete in sections 32–33, and its final publication, browser/Staging
acceptance and milestone closure are recorded in section 34. Changes should
normally be CSS/tokens and explicit visual classes, with asset metadata wiring
only where applicable. VI.3R's bounded structural state integration is recorded
in section 16; no further component state/behavior extraction is authorized here.

| Slice | Exact bounded output / likely files | Risk and reason | Exit evidence |
|---|---|---|---|
| VI.1 — Foundation & Brand Assets | Implemented: `globals.css` definitions/aliases and global foundation; paired accent/danger foregrounds including four inline consumers; exact `public/brand/likecord-icon.png` copy. No favicon, metadata, launcher/PWA derivative or surface redesign. | **HIGH**: root colors reach every surface, CSS cascade and on-fill accessibility. Existing geometry preserved; new typography/radius adoption remains later. | Automated PASS and bounded local visual evidence in section 13; first checkpoint manual staging PASS in section 17.4 |
| VI.2 — Shared UI Primitives | Implemented: explicit native button variants and form appearance; shared Tooltip, ContextMenu, ConfirmModal/dialog foundation, SettingsLayer navigation and generic feedback. Native checkboxes preserved; no new switch/card/badge abstraction or native range redesign. | **HIGH**: shared selectors, destructive intent, focus and native controls have broad impact. DOM action order, handlers and mixed-dialog semantics preserved. | Focused/full Web PASS and bounded local primitive review in section 14; first checkpoint manual staging PASS in section 17.4 |
| VI.3 — Navigation & App Shell | Implemented: ServerRail, ChannelSidebar, MemberPanel, Home and persistent headers; scoped CSS/classes, truncation wrappers and reviewed canonical icon at 56px on Home only. | **MEDIUM**: fixed widths, active marker, overflow and Home/media shell interactions. Routing, layout ownership and navigation/Voice behavior unchanged. | Focused/full Web PASS and populated local shell review in section 15; first checkpoint manual staging PASS in section 17.4 |
| VI.3R — Shell Depth & Layout Reconciliation | Implemented: repeatable Depth 0–4 roles, one shared workspace header, UserPanel below the combined navigation columns, Add Server inside the scrollable server list, hover-only shell scrollbars and fixed channel-icon slots. | **MEDIUM**: shell composition and internal scroll ownership changed while widths, routes and product behavior remain fixed. | Focused/full Web PASS and populated local shell review in section 16; first checkpoint manual staging PASS in section 17.4 |
| VI.4 — Messaging & Management | Implementation complete: the first bounded slice implements the compact Composer and reduced Create Channel containment; the second refines message rows/actions, inline edit, attachments and the existing delete surface; the third completes Server Settings, Roles/Members, Invite People/Administration, Channel/Category Settings and permission-editor presentation; VI.4R applies the accepted final surface map and shared-button base in section 22. | **HIGH**: scroll anchoring/geometry, dialog bounds, hierarchy and destructive controls. CSS/classes only; lifecycle/data remain untouched. | All three slices and VI.4R/VI.4R2 passed proportional automation and their manual checkpoints; VI.4 is complete and accepted in section 23. |
| VI.5 — Voice & Screen Share | Implemented: participant/UserPanel Voice presentation, mixed MemberContextSurface/VoiceParticipantPopover detail, compact Live Streams, Screen Share control states and ViewerWorkspace/PresenterCard chrome; static Screen Share inline appearance and media black use existing tokens. | **HIGH**: media/subscription coupling, observer vs same-call, keyboard and HIDDEN audio. No useVoice/useVoicePersonalMix/useVoiceOccupancy logic, AppContent or ScreenStreamVideo change. | VI.5A and VI.5B focused/full Web automation, immutable publication and local/Staging multi-client Voice + Screen Share checkpoints passed; VI.5 is complete and accepted in section 27. |
| VI.6 — Auth / Entry / System States | Implemented: Login/Register/Invite/Add Server presentation, accessible form associations, bounded entry overflow and shared bootstrap/route-level system states. Clean wordmark remains asset-blocked and was not synthesized. | **MEDIUM**: form/pending/readability/returnTo; no authentication API or onboarding change. | Focused/full Web automation and consolidated local human acceptance passed; exact accepted source/artifact and environment limitations are recorded in section 31. |
| VI.7 — Final Visual Regression / Polish | Implemented: the six preflight-authorized CSS/token and navigation-metadata inconsistencies only | **MEDIUM**: shared CSS and accessibility metadata; routing, layout and media owners remained unchanged | Consolidated automation, final immutable publication and real-browser V01–V10 Staging acceptance passed in sections 33–34; no RC gate auto-completion |

| Slice | CSS reach | Shared-component reach | Layout risk | Accessibility risk | Voice / Share risk | Screenshot requirement / test impact |
|---|---|---|---|---|---|---|
| VI.1 | High | High indirectly | Medium | High | Medium indirectly | Local login and representative CSS fixture; full Web suite passed. First checkpoint PASS in section 17.4; complete V01–V10 review remains pending |
| VI.2 | High | High | Medium | High | Medium | Every primitive family and both context models; full Web suite |
| VI.3 | Medium | Medium | High if widths/overflow change; those changes excluded | Medium | Medium shell persistence | Rail/Home/channel/member at supported desktop/zoom; navigation/layout/Home coverage |
| VI.3R | Medium | Medium | Medium: bounded shell composition and independent overflow owners | Medium | Medium shell persistence | Shared header/toggle, combined navigation footer, internal scroll, long names and pressure viewports; real 100%/125%/150% zoom PASS for VI.3R2 in section 17.4 |
| VI.4 | Medium | High | High | High | Low if persistent shell untouched | Chat long-history/delete and Settings panes; messaging/permission/invite coverage |
| VI.5 | Medium | Medium | High | High | High | Every presentation and viewer/presenter state; Voice/Share/context coverage |
| VI.6 | Medium | Medium | Medium | High | Low | Auth/entry/state branches; auth/invite/Add Server coverage |
| VI.7 | Low, four scoped rules | Low, navigation metadata only | None introduced | Low, additive truthful metadata | None | Focused/full Web automation passed; final V01–V10 browser/Staging evidence pending |

## 9. Future automated validation matrix

Existing Web tests remain authoritative for behavior. Run full Web Jest after
each meaningful completed slice, or one documented consolidation of tightly
related slices before acceptance. Run Web typecheck/lint on that same candidate
and `git diff --check` for each change. Do not repeatedly rerun an unchanged
candidate or use retries to turn an environmental failure into a passing claim.

Commands verified from package scripts, **not executed in VI.0**:

```text
pnpm --filter @likecord/web test -- --runInBand
pnpm --filter @likecord/web typecheck
pnpm --filter @likecord/web lint
git diff --check
```

| Changed surface | Existing regression owners in `apps/web/src/__tests__/` | Meaningful evidence |
|---|---|---|
| Foundation/primitives | `app.test.tsx`, `layout.test.tsx`, `context-menu.test.tsx`, `message-delete.test.tsx`, `server-surfaces.test.tsx` | Variant semantics where changed, visible focus review, unchanged action order/accessibility/state; structural CSS layout assertions may need equivalent selectors but must not be weakened |
| Shell/Home | `navigation.test.tsx`, `home.test.tsx`, `add-server.test.tsx`, `channel-structure.test.tsx`, `member-list-realtime.test.tsx` | Route/Continue branches, readable states, authorized controls, no mount/lifecycle regression |
| Messaging/management | `chat-layout-scroll.test.tsx`, `message-delete.test.tsx`, `attachment-upload.test.ts`, `permission-editor-shell.test.tsx`, `permission-overwrite-editor.test.tsx`, `permission-management.test.tsx`, `server-settings-invite-admin.test.tsx`, `server-settings-invite-composition.test.tsx`, `server-delete-regression.test.tsx` | Scroll/content containment, author/moderator actions, attachment gates, permission-source/hierarchy states, invite copy/revoke and pending behavior |
| Voice/context | `voice.test.tsx`, `voice-speaking.test.ts`, `voice-occupancy.test.tsx`, `voice-personal-mix.test.tsx`, `voice-participant-popover.test.tsx`, `context-menu.test.tsx`, `server-surfaces.test.tsx` | Observer no media, same-call speaking, private mix, mixed dialog vs menu, self/permission gates, confirmation and stale-context closure |
| Screen Share | `screen-share.test.ts`, `screen-share-presentation.test.tsx`, `black-screen.test.tsx` | Gallery/Focus/DETACHED/HIDDEN semantics, muted visual video, no duplicates, no subscription changes on presentation/route changes |
| Auth/entry | `app.test.tsx`, `invite-entry.test.tsx`, `add-server.test.tsx` | Existing validation/returnTo/explicit accept, pending/error and already-member branches |
| Final polish | Full Web suite, typecheck, lint, diff check | One candidate with recorded final results; not API/E2E/security reruns by default |

Add tests only for meaningful visual variants, accessible state/name/label
changes or visibility regressions not already covered. Do not add brittle
pixel/hex snapshots merely to freeze colors. Jest does not prove actual browser
contrast, crop, text wrapping or audio; those require the future review matrix.
Build/publish/deploy/staging actions require the later task's explicit scope.
VI.0 neither executes nor starts them; no API/realtime/WebRTC/schema work means
no automatic backend, migration, security or prior-stage gate rerun.

## 10. Future manual staging matrix — V01–V10

**Designed only; all checks NOT EXECUTED in VI.0.** Later runs use a specifically
authorized staging candidate. Record Web SHA/artifact, browser, zoom and CSS
viewport; keep matched screenshots with state and expected result. Use existing
dedicated behavioral contracts as expected behavior, not the brand board. Do not
repeat historical gates just because a visual screenshot is needed.

| ID | Fixtures and concrete acceptance | Suggested slice evidence |
|---|---|---|
| V01 — Brand/assets | Canonical tracked URLs load without `docs/design/`; icon maintains shape/aspect/clear space and clean alpha at intended size. Inspect approved favicon 16/32/48/64 and launcher sizes only if supplied/implemented; unavailable variants remain explicitly pending. Wordmark residue must not ship. Board/presentation absent from normal app payload. | VI.1, VI.6, final |
| V02 — Auth/Home | Login/register and invite returnTo/explicit accept; Home with zero/many/long-named servers; Continue loading/error/retry/null/valid destination and independent server loading/error. Brand remains modest on Home, stronger in auth; Add Server opens correct existing flow. | VI.3, VI.6 |
| V03 — ServerRail/ChannelSidebar | Home/server selected vs hover vs focus; many servers/channels, long names, empty categories with/without management authority, collapse, Text/Voice creation affordances; no fabricated unread state. Browser Back/Forward and text-channel switching preserve mounted calls/shares. | VI.3 |
| V04 — Chat/composer/attachments | Long history, latest/near-bottom/scrolled-up/new-message indicator, own message and history prepend; inline edit, permission-disabled composer, paste/file pending/upload failure, long filenames and image/file attachments. Message rows stay unboxed. Delete dialog long content keeps Cancel/Delete visible at 125%/150%; shortcut behavior unchanged. | VI.4 |
| V05 — Menus/modals/settings | Keyboard/context trigger at viewport edges; arrows/Tab/Escape/focus return, long role lists, scroll/dismissal, safe pending/errors. Server/Channel/Category Settings sections, owner/hierarchy/grant ceiling, DENY/NEUTRAL/ALLOW, source state, destructive confirmations, Invite People/copy fallback vs administration/revoke. Safe test targets only when later actions are authorized. | VI.2, VI.4 |
| V06 — Member/Voice | Self, ordinary remote, protected owner/higher role, moderator; Member row with/without visible Voice occupancy and remote Voice row. Observer mix before join; 0/100/numeric value/mute separated from Server Mute. Roles/server/utility gates and Kick/Ban confirmation, stale-context closure and focus. Speaking only same call/mic, suppressed on effective mute/deafen; connected stays labeled green. No new presence or Voice-idle behavior. | VI.5 |
| V07 — Screen Share | 1/2/3/4 presenters, viewer opt-in, Gallery/Focus/secondary tiles, explicit detached target, Back to chat, hidden count/reopen, leave/rejoin, own preview/viewer list, waiting streams. Preserve contain/no crop, control reachability and LIVE/danger. HIDDEN silences corresponding local screen audio; CALL/MIC remains independent; presentation/route changes create no extra playback or unintended join/leave. | VI.5 |
| V08 — Accessibility/zoom/viewport | Measure all rendered color/state composites identified in section 7; tab through focus, native form/range controls, accessible labels/pressed/checked states. 100/125/150% at recorded desktop and reduced-height fixtures; overlays remain bounded. Reduced motion removes decorative pulse; forced-colors focus remains visible. Compare known narrow limitation without claiming mobile support. | Each affected slice, final |
| V09 — Functional regressions | Existing auth/invite navigation, visibility/permission reconciliation, edit/delete/attachments, user status command, Voice mute/deafen and share transitions behave as before. Track Presence divergence, sender flicker, UUID and mute-on-join as independent debt; non-reproduction is not FIXED. No additional request/event/schema/state model introduced for branding. | Consolidated after affected slices |
| V10 — Cross-surface consistency | Compare identical button/input/menu/dialog/badge states across Home/chat/settings/auth/Voice; consistent neutral depth, readable metadata, radii, focus and icon scale. Confirm scarce gradient, no glow overload, no message cards, no new unsupported controls. Record final remaining asset limitations and implementation state truthfully. | VI.7 |

## 11. Non-goals, debt separation and release ordering

No DMs, Friends, semantic Mentions, Activity feed, View Profile, new Presence,
mobile drawers/navigation/tablet architecture, Server Deafen administration,
Move to Voice, new server/channel controls, new Voice/Screen Share features,
MINIMIZED audio-preserving state, lightbox, PWA architecture, new typography
service or mark generation. Do not activate existing placeholders for visual
completeness. Do not copy Discord, Teams, Slack or the board's product layout.

`PRESENCE-01` remains confirmed BEFORE-RC work with its own product/realtime owner.
The user's new observations and accepted deferred direction are captured once
in the [owning roadmap section](./ui-ux-roadmap.md#presence-01--deferred--before-rc).
They are user evidence, not a VI.0 reproduction. Branding cannot correct
Online/Offline labels, add heartbeat/session reconciliation or implement Voice
idle. Preserve current status representation and do not claim inactivity fixes.

`UI-MSG-SENDER-FLICKER-01`, Username→UUID regression, Mute/Deafen matrix,
server-mute-on-join, Backup/Restore/VPS Operations, `TEST-HARDEN-01`, `QA-GATE-01`,
security audit/remediation/DAST and RC gates keep their existing owners and
statuses. Non-reproduction in ordinary use is not closure evidence. F7's accepted
W2 deletion-modal fix is preserved, not reopened; W3 remains escalated outside F7.

Brand implementation is intended before final hardening/RC gates to let those
gates evaluate the resulting UI. This planning placement does not introduce an
F-stage, a new formal RC blocker or an alternate gate chain. The roadmap's formal
dependency chain remains unchanged:

```text
TEST-HARDEN-01 -> adoption of QA-GATE-01 -> SEC-APP-AUDIT-01
-> required security remediation -> SEC-DAST-01 -> RC-STABILIZATION
-> RC-SECURITY-GATE -> Release Candidate / Beta Gate
```

## 12. VI.0 closure and then-next action — historical

Preserved VI.0 evidence below. Its unstarted markers and next action describe
discovery closure only; section 14 owns current implementation status.

VI.0 supplies the asset/source/token/component/surface audit, proposed visual
system, risk analysis and future automated/manual acceptance. No application
code/tests or frozen behavioral contracts changed. Documentation-only validation
is `git diff --check`, full documentation-diff review, asset-master hash
comparison, exact path scope and unchanged formal gate-chain verification.
There is no new runtime evidence or reopened completed gate.

The wordmark and tiny-icon quality limits are recorded asset-specific conditions,
not blockers to VI.0 completion or to the foundation's nondependent work.
Final asset visual acceptance and all implementation/manual checks remain future.

Exact next action: when implementation is authorized, create a dedicated VI.1
implementation branch (recommended `historical visual identity foundation work`) from the
VI.0 discovery commit and implement Foundation & Brand Assets against section 8,
starting with paired token migration and the reviewed clean-icon candidate.
Keep the supplied masters unchanged; hold the wordmark and tiny favicon usages
until adequate approved variants exist. No implementation is started here.

```text
VISUAL_IDENTITY_DISCOVERY_STARTED=true
VISUAL_IDENTITY_DISCOVERY_COMPLETE=true
VISUAL_IDENTITY_CONTRACT_CREATED=true
VISUAL_IDENTITY_CONTRACT_FINALIZED=true
VISUAL_IDENTITY_IMPLEMENTATION_READY=true
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=false
VISUAL_IDENTITY_ASSETS_AVAILABLE=true
VISUAL_IDENTITY_FOUNDATION_SLICE=VI_1
VISUAL_IDENTITY_FINAL_SLICE=VI_7
VISUAL_IDENTITY_WEB_ONLY_EXPECTED=true
VISUAL_IDENTITY_API_CHANGE_EXPECTED=false
VISUAL_IDENTITY_REALTIME_CHANGE_EXPECTED=false
VISUAL_IDENTITY_WEBRTC_CHANGE_EXPECTED=false
VISUAL_IDENTITY_SCHEMA_CHANGE_EXPECTED=false
VISUAL_IDENTITY_MIGRATION_EXPECTED=false
F5_REOPENED=false
F6_REOPENED=false
F7_REOPENED=false
MEMBER_VOICE_CONTEXT_MENU_REOPENED=false
DM_IMPLEMENTED=false
FRIENDS_IMPLEMENTED=false
SEMANTIC_MENTIONS_IMPLEMENTED=false
PROFILE_IMPLEMENTED=false
RESPONSIVE_REDESIGN_IMPLEMENTED=false
PRESENCE_IMPLEMENTED=false
PRESENCE_01_ADOPTED_BY_VISUAL_IDENTITY=false
PRESENCE_01_STATUS=confirmed_before_rc_separate_owner
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
PRODUCTION_CODE_CHANGED=false
TEST_CODE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
WEBRTC_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
WEB_VISUAL_IMPLEMENTATION_STARTED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

## 13. VI.1 Foundation & Brand Assets — implemented 2026-09-03

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
This is the historical VI.1 slice-closure record. Its then-next action and
unstarted VI.2 marker are superseded by section 14; its foundation and asset
evidence remain valid. V01–V10 staging acceptance is still pending.

### 13.1 Precheck, accepted scope and source changes

Precheck matched `historical visual identity discovery work`, HEAD
`visual identity refresh milestone`, subject
`docs(brand): define visual identity refresh`, clean tracked worktree/index and
only untracked `docs/design/`. Created `historical visual identity refresh work` from that
exact SHA and verified unchanged HEAD before editing. One local commit is the
authorized delivery; no push, publish, deployment, tag or SSH.

- `src/app/globals.css` in Web: section 6's exact foundation values, compatibility
  aliases, `color-scheme:dark`, inherited document colors, selection, existing
  central scrollbars, global keyboard focus, restrained shared elevation/motion
  and reduced-motion support. Removed the decorative connected-dot pulse while
  retaining its static green indicator; no Voice timing or state changed.
- Paired existing accent fill/foreground and danger fill/foreground consumers,
  including static inline colors in `ConfirmModal`, `ServerSettings`,
  `ChannelSidebar` and `ChatArea`. No DOM structure, handlers, prop contracts,
  state or routing changed.
  Existing selection/speaking semantics are preserved; selected inset navigation
  markers coexist with the focus ring. The gradient is defined once and unused
  by surface styles; no large blue/violet backgrounds or gradient flood.
- Exact icon copy in `apps/web/public/brand/likecord-icon.png`; no runtime component
  placement or metadata change. No external font, dependency, second theme,
  component library, new test structure or layout/responsive architecture.

Background, brand, text, state, border, radius, shadow and focus values are owned
by section 6, not duplicated here. Additional exact type token names are
`--line-height-body:1.5`, `--line-height-control:1.25`,
`--line-height-heading:1.2`, `--font-weight-normal:400`,
`--font-weight-label:500`, `--font-weight-action:600`,
`--font-weight-heading:700`. Font sizes and spacing are defined as listed there;
the existing system family and per-surface metrics remain unchanged.

Compatibility: `--bg-app/--bg-rail` → base; `--bg-chat` → primary;
`--bg-sidebar/--bg-panel` → secondary; `--bg-surface` → tertiary;
`--accent/--accent-hover` → primary/primary-hover brand fill; `--border` → default.
These names resolve within one root token graph. VI.2 owns primitive adoption
and eventual retirement of fill/border aliases after consumers are migrated;
VI.3–VI.6 own surface adoption. Semantic surface aliases may remain useful.
`--radius:6px` is intentionally retained rather than globally switching to 8px.
No undefined `var(...)` references were found in Web source (84 definitions,
including the component focus-decoration custom property).

### 13.2 Canonical asset provenance and remaining asset debt

| Item | Verified result |
|---|---|
| Source | `docs/design/likecord-brand-reference/likecord-icon.png` |
| Destination | `apps/web/public/brand/likecord-icon.png` |
| Format | PNG RGBA, 1254 × 1254; alpha preserved |
| Source SHA-256 | `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949` |
| Destination SHA-256 | `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949` |
| Copy | Byte-identical; no resize, recompression, recoloring, geometry change, alpha stripping or regeneration |
| Source protection | Unmodified, untracked, unstaged and uncommitted; no unrelated design content read/touched |
| Not promoted | Dimensional presentation, brand board and wordmark |
| Wordmark | `clean_export_required`; original residue is not repaired or shipped |
| Favicon / launcher | Unchanged; no generated favicon, PWA size, derivative or metadata wiring |
| Small mark | Dedicated suitable asset still required; brand/design debt, not a VI.1 blocker |

The icon was displayed at 64 CSS px over the actual dark foundation in a local
fixture, with its natural 1254 × 1254 dimensions intact. No obvious rectangular
alpha residue was observed there. This is compositing sanity, not approval of
16/32 px variants, launcher crops or future component placements.

### 13.3 Validation and limits of evidence

| Check | Result |
|---|---|
| Focused tests | No separate run/new tests needed: four inline changes are color-only; full suite covers their existing behavioral contracts |
| Full Web Jest | PASS: 32 suites, 525 tests, zero snapshots; `node node_modules/jest/bin/jest.js --passWithNoTests --runInBand` from `apps/web` |
| Web typecheck | PASS: `node node_modules/typescript/bin/tsc --noEmit` from `apps/web`, including after restoring generated dev-only typing changes |
| Web lint | PASS: zero errors, 87 warnings on preexisting lines; `node ../../node_modules/.pnpm/eslint@8.57.1/node_modules/eslint/bin/eslint.js src/` from `apps/web` |
| Diff / scope | `git diff --check` and complete source/documentation diff review; only five Web source files, the canonical PNG and three owning documents |
| Untouched domains | API source, realtime hooks/contracts, WebRTC/media ownership, Prisma schema/migrations and frozen F5/F6/F7/Member–Voice contracts |

Local pnpm invocation failed to locate `next` and rejected the Jest argument;
installed package entry points executed the same project configs successfully.
An initial guessed hoisted ESLint path was absent; the installed 8.57.1 package
entry point passed. These are harness/path failures, not implementation failures.
Next dev generated two agent files and changed `next-env.d.ts`; those run-created
artifacts were removed/restored, not included. No package or lockfile changed.

Local Browser sanity covered the real unauthenticated login at 1280 × 720 and a
temporary HTML fixture using the real `globals.css` and canonical PNG at the
browser's default 950 × 912 viewport. Fixture markup represents existing classes,
not a mounted authenticated app. It showed readable messages/metadata, neutral
layers, semantic banners, menus, disabled controls, tri-state glyphs and the
icon. Shell columns measured 72 / 240 / 398 / 240 px with no horizontal document
overflow. There were zero gradient backgrounds in the fixture. No dimensions,
overflow ownership, stacking or layout declarations changed in production.

Keyboard focus was visible on the real Sign In button and fixture menu, selected
navigation and composer input: 2 px violet outline with dark separation; clipped
rows used the inset ring. The selected navigation marker remained present.
Reduced-motion zero-duration/no-animation rules and forced-colors system outline
were reviewed in source, not emulated as browser acceptance. Existing disabled
opacity, tiny labels, auth label associations and later surface composites still
need their owning slices; no total WCAG compliance is claimed.

The local API hostname `api` did not resolve outside the container network;
login settled unauthenticated. No credentials were entered or authenticated
flows claimed. No staging, multi-client playback, full surface matrix, zoom
matrix or responsive acceptance ran. Both temporary servers/tabs were closed.

Measured sRGB ratios from final rendered root colors and representative computed
styles use section 7's luminance formula, rounded to two decimals:

| Pair | Contrast |
|---|---|
| Primary / primary background | 16.62:1 |
| Secondary / primary background | 10.31:1 |
| Muted / primary background | 8.94:1 |
| Disabled token / primary background (before component opacity) | 5.23:1 |
| Muted / elevated; active | 6.69:1; 4.82:1 |
| Focus or link / base; elevated; active | 9.54:1; 6.77:1; 4.87:1 |
| White / brand primary; hover | 5.71:1; 4.65:1 |
| White / danger-solid; danger-solid-hover | 5.83:1; 6.93:1 |
| Dark focus gap / primary brand fill | 3.40:1 |
| Danger ink / elevated | 5.06:1 |
| Success; warning; info / active | 4.85:1; 5.45:1; 4.62:1 |
| Control border / elevated | 3.52:1 |
| Selected DENY / ALLOW glyph against existing 25% mixed fill | 3.83:1 / 4.56:1; DENY is indicator evidence only, not ordinary-text approval |

### 13.4 Status, documentation impact and next action

Only this owning contract, the roadmap visual-identity section and AI_CONTEXT
navigation/status are reconciled. No frozen contract, formal gate order or debt
owner changed. PRESENCE-01 stays `confirmed_before_rc_separate_owner`; no Presence,
Voice idle, messaging/Username/UUID/Mute–Deafen fixes or unsupported feature work.

Accepted and implemented: existing CSS-variable foundation, section 6 values,
bounded compatibility migration and exact canonical icon promotion. Later
surface guidance remains proposed; accepted wordmark/small-mark asset work and
functional debts remain deferred with their existing owners. No known stale
documentation is introduced. There is no implementation blocker for VI.1;
manual staging acceptance and complete visual acceptance remain pending.

Exact next action: **VI.2 Shared UI Primitives after reviewing VI.1 foundation
evidence**, in a subsequent authorized task. Do not start VI.2 in this delivery.

```text
VISUAL_IDENTITY_DISCOVERY_COMPLETE=true
VISUAL_IDENTITY_CONTRACT_FINALIZED=true
VISUAL_IDENTITY_IMPLEMENTATION_READY=true
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=true
VI_1_STARTED=true
VI_1_IMPLEMENTED=true
VI_1_AUTOMATED_VALIDATION_PASS=true
VI_1_MANUAL_STAGING_PENDING=true
VI_2_STARTED=false
VISUAL_IDENTITY_COMPLETE=false
VI_1_WEB_ONLY=true
VI_1_API_CHANGED=false
VI_1_REALTIME_CHANGED=false
VI_1_WEBRTC_CHANGED=false
VI_1_SCHEMA_CHANGED=false
VI_1_MIGRATION_REQUIRED=false
LIKECORD_PRODUCT_ICON_PROMOTED=true
LIKECORD_PRODUCT_ICON_BYTE_IDENTICAL=true
LIKECORD_WORDMARK_PROMOTED=false
LIKECORD_WORDMARK_STATUS=clean_export_required
LIKECORD_FAVICON_CHANGED=false
LIKECORD_SMALL_MARK_ASSET_REQUIRED=true
VI_1_GLOBAL_GRADIENT_OVERUSE=false
VI_1_SURFACE_REDESIGN_STARTED=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
NEXT_ACTION=VI.2 Shared UI Primitives after reviewing VI.1 foundation evidence
```

## 14. VI.2 Shared UI Primitives — implemented 2026-09-03

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
This is the historical VI.2 slice-closure record. Its then-next action and
unstarted VI.3 marker are superseded by section 15; its primitive evidence
remains valid. VI.1 and VI.2 manual staging acceptance remains pending.

### 14.1 Precheck, inventory and implementation scope

Precheck matched branch `historical visual identity refresh work`, HEAD
`visual identity foundation milestone`, subject
`feat(brand): establish visual identity foundation`, clean tracked worktree/index
and only untracked `docs/design/`. Work stayed on that branch. No content under
`docs/design/` was read, modified, staged or committed during VI.2.

Consumers and existing regression tests were inspected before implementation.
The repository has native controls with scoped CSS, not generic React Button,
Input or Select components. The implementation keeps that architecture and
section 6's root tokens; no dependency, font, asset or component-library change.

| Confirmed family | Implemented scope / compatibility |
|---|---|
| Native buttons | `.btn` with explicit `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger` and combinable `.btn-icon`. Solid brand primary, neutral secondary/ghost, semantic red danger; hover/active/disabled use tokens and existing global focus. Primary/danger use explicit on-fill text. |
| Existing button consumers | Removed first/last-button appearance rules in modal/settings scopes, adding only visual classes without reordering DOM/actions. `.sm-btn`, `.danger-button` and `.auth-card button` retain compatibility styling; no replacement React wrapper. Icon-close buttons use the existing 2rem control scale. |
| Input / textarea / select | Neutral fill, control border, md radius, readable placeholder, hover, existing native/ARIA invalid state and opaque disabled text in `.auth-card`, `.modal`, `.settings-content`; `.form-control` is available for explicit adoption. No production textarea exists; its shared styling was checked locally without inventing a feature. Native options/types/validation/autocomplete/submit ownership are unchanged. Composer, inline editing and native range/radio/file/color appearance remain local. |
| Checkbox / toggle | Existing native checkbox uses brand accent plus its check glyph; disabled semantics and keyboard behavior remain native, explanatory labels readable. Permission, private-channel, role and local-mute controls keep actual checked state. No reusable switch abstraction exists: separate toggle system is `not_applicable`; no Voice local-mute behavior changed. |
| Tooltip | Existing primitive gets elevated neutral fill, restrained border, sm radius and low shadow. Font size, padding, portal, trigger, placement, timing and accessibility source remain unchanged. |
| ContextMenu | Neutral hover/focus/active rows, semantic red destructive focus/hover, readable opaque disabled rows, subtle dividers and existing inset keyboard ring. Mixed Member/Voice rows reuse these styles; a legacy popover disabled-opacity selector now excludes shared menu items. Neither context model's source/interaction ownership changed. |
| ConfirmModal / dialog foundation | Elevated neutral dialog, lg radius, border/shadow and shared body class; explicit confirm/danger vs cancel variants replace inline appearance. MessageDeleteModal only receives action classes; preview bounds, scrolling and safe focus remain unchanged. |
| SettingsLayer | Existing shared frame tokens retained; navigation adopts md radius, neutral states, selected inset marker, semantic danger and readable close control. No pane widths, scroll ownership, mounting, stacking or feature-specific settings layout changed. |
| Cards / badges | Inventory found feature-specific Home/role/member/invite cards and badges, not genuine generic shared components. Both new systems are `not_applicable`; no arbitrary wrappers or message cards. Their later surface styling stays in VI.3–VI.6. |
| Generic feedback / scrollbar | Existing `.error-banner` / `.info-banner` use semantic subtle backgrounds, semantic borders and primary text; messages/lifecycles unchanged. VI.1's central scrollbar presentation remains unchanged. |

Exact Web source delta: `src/app/globals.css`, `src/app/app/page.tsx`,
`src/components/{AddServerModal,InviteAdministration,InvitePeopleModal,MessageDeleteModal,ServerSettings}.tsx`
and `src/components/ui/ConfirmModal.tsx`. The seven TSX files only change visual
classes/remove three inline appearance objects; props, handlers, data, action
availability, native attributes and DOM order remain unchanged. Tooltip,
ContextMenu and SettingsLayer implementation files remain unchanged.
Legacy fill/border aliases and `--radius:6px` remain for later consumers; this is
bounded adoption, not completion of every surface's token migration.

### 14.2 Behavior, accessibility and local visual evidence

Existing global 2px focus outline/dark gap, clipped-row inset ring, selected
marker composition and forced-colors fallback remain intact. Pending/disabled
controls remain truly disabled; opaque disabled styling avoids multiplying
already-muted text by legacy opacity. Native check glyphs, navigation markers
and focus outlines provide cues beyond color. Transitions use the VI.1 120ms
token; its reduced-motion rule still neutralizes nonessential motion. Reduced
motion and forced colors were inspected in source, not browser-emulated.
The brand gradient remains defined once and unused by application styles.

Bounded local Browser review mounted the **actual** Tooltip, ContextMenu,
ConfirmModal, MessageDeleteModal and SettingsLayer in a temporary Next route,
alongside representative native controls. Observed CSS viewports were
1280 × 720 and the Browser default 950 × 912; no horizontal document overflow
or gradient backgrounds were observed. Controls, danger hierarchy, borders,
disabled labels, textarea focus, native checkbox change and select keyboard
selection were readable/usable.

- ContextMenu: Shift+F10 opened with first enabled item focused; End skipped
  disabled entries to the destructive action; Escape returned focus to trigger.
  Menu bottom was 712px in a 720px viewport, preserving the 8px edge gap.
- ConfirmModal: Cancel had initial focus; Tab wrapped within the dialog. Pending
  disabled both actions and focused the dialog; a simulated local error restored
  Cancel focus. Escape returned focus through the existing opt-in return target.
- MessageDeleteModal: 100-line preview and long filename stayed in the internal
  scroller (517px client height / 2524px scroll height); dialog bounds were
  16–704px in the 720px viewport, with both actions visible. Cancel and Escape
  behavior remained intact.
- SettingsLayer: close control received focus, existing 34% navigation split
  and independent panes remained; selected navigation retained its marker.
  Tooltip retained its original 0.7rem metrics and visible right-placement
  example. Its preexisting placement algorithm was not replaced or given new
  viewport clamping; edge/zoom acceptance remains with the manual matrix.

This fixture used local state only, with no authenticated product mutations.
The local `api` proxy hostname was unavailable outside the container network;
no authenticated/backend acceptance is inferred. The temporary route, dev-only
agent files and generated typing changes were removed/restored; its server/tab
were closed. No fixture is shipped. No staging, multi-client/media playback,
full-surface/zoom matrix or application-wide WCAG certification is claimed.

Representative final computed-style contrast, using section 7's sRGB formula:

| Pair | Contrast |
|---|---|
| White / primary; primary hover | 5.71:1; 4.65:1 |
| White / danger; danger hover | 5.83:1; 6.93:1 |
| Primary text / secondary control; tertiary button; elevated overlay | 15.54:1; 14.19:1; 12.44:1 |
| Secondary text / hover | 6.67:1 |
| Placeholder / secondary control | 8.36:1 |
| Disabled text / secondary control (opacity 1) | 4.89:1 |
| Disabled menu label / elevated (opacity 1) | 6.69:1 |
| Control border / secondary; elevated | 4.40:1; 3.52:1 |
| Focus ring / active neutral | 4.87:1 |
| Primary text / computed error; info subtle fill | 13.05:1; 12.45:1 |

### 14.3 Automated validation and scope preservation

Focused Jest ran first: **12 suites / 202 tests PASS**, zero snapshots.
Exact suites under `apps/web/src/__tests__/` and test counts:

| Suite | Tests |
|---|---:|
| `context-menu.test.tsx` | 11 |
| `message-delete.test.tsx` | 28 |
| `voice-participant-popover.test.tsx` | 38 |
| `server-surfaces.test.tsx` | 22 |
| `server-settings-invite-admin.test.tsx` | 12 |
| `channel-structure.test.tsx` | 9 |
| `permission-editor-shell.test.tsx` | 10 |
| `add-server.test.tsx` | 24 |
| `invite-entry.test.tsx` | 7 |
| `server-delete-regression.test.tsx` | 7 |
| `permission-management.test.tsx` | 24 |
| `app.test.tsx` | 10 |

The final Web candidate then passed **32 suites / 525 tests**, zero snapshots,
Web typecheck, lint with **zero errors / 87 preexisting warnings**,
`git diff --check` and complete source/documentation diff review. Installed Node
entry points from section 13.3 used the existing project configurations; focused
Jest added `--runTestsByPath` for the exact suites above. No tests were changed
or added: CSS/class-only edits introduced no new behavior, and existing suites
cover keyboard/menu dismissal/focus return, mixed context, pending/error,
confirmation, containment, settings/permissions and entry branches.

Exact-path review confirms no API source, realtime hooks/events, WebRTC/media
ownership, Prisma schema/migration, package/lockfile, asset, frozen F5/F6/F7 or
Member/Voice contract changes. Roadmap section 24.2's formal gate chain remains
unchanged. No completed gate was reopened, and no publish/push/deploy/tag/SSH or
staging access occurred. Only one local VI.2 commit is authorized.

### 14.4 Documentation impact, deferred work and next action

Updated only this contract, the roadmap's visual-identity status and AI_CONTEXT
navigation. Accepted/implemented: explicit shared visual variants and bounded
native-control/overlay styling using VI.1 tokens. No new functional product,
API, permissions or persistence decision. No known stale documentation introduced.

VI.3–VI.7 surface styling remains unstarted; feature-specific cards/badges,
composer, role/permission detail, Voice/Share detail and auth composition remain
with their owning slices. Clean wordmark and small-mark assets retain their
existing debt; the canonical icon and favicon state did not change. PRESENCE-01
remains `confirmed_before_rc_separate_owner`; Voice idle, Mute/Deafen,
Username/UUID, sender flicker and other functional debts retain separate owners.
No implementation blocker remains for VI.2. Manual visual acceptance is pending.

Exact next action: **VI.3 Navigation & App Shell, then the first substantial
visual staging checkpoint** with Foundation + Primitives + App Shell, under
subsequent explicit authorization. VI.3 is not started by this delivery.

```text
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=true
VI_1_IMPLEMENTED=true
VI_1_AUTOMATED_VALIDATION_PASS=true
VI_1_MANUAL_STAGING_PENDING=true
VI_2_STARTED=true
VI_2_IMPLEMENTED=true
VI_2_AUTOMATED_VALIDATION_PASS=true
VI_2_MANUAL_STAGING_PENDING=true
VI_3_STARTED=false
VISUAL_IDENTITY_COMPLETE=false
VI_2_TOGGLE_SYSTEM_IMPLEMENTED=not_applicable
VI_2_CARD_SYSTEM_IMPLEMENTED=not_applicable
VI_2_BADGE_SYSTEM_IMPLEMENTED=not_applicable
VI_2_WEB_ONLY=true
VI_2_SURFACE_REDESIGN_STARTED=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
NEXT_ACTION=VI.3 Navigation & App Shell, then first substantial visual staging checkpoint
```

## 15. VI.3 Navigation & App Shell — implemented 2026-09-03

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
VI.1–VI.3 now form the first substantial branding candidate; its future staging
checkpoint is ready but was not executed. Section 16 supersedes this section's
shell topology and then-next action with the bounded VI.3R reconciliation; this
VI.3 evidence remains historical and valid. VI.4–VI.7 remain unstarted.

### 15.1 Precheck, inventory and implementation

Precheck matched `historical visual identity refresh work`, HEAD
`shared ui primitives milestone`, subject
`feat(brand): refresh shared ui primitives`, clean tracked worktree/index and
only untracked `docs/design/`. Work stayed on the same branch. Brand-reference
sources were not needed or read; `docs/design/` remained untouched and excluded.

Existing consumers and tests confirmed stable owners in
`components/layout/{ServerRail,ChannelSidebar,MemberPanel,Home}.tsx`, while the
persistent channel header remains in `ChatArea` and is styled through existing
classes. The implementation changes only those four source files:

- `globals.css`: one VI.3 shell section adopts VI.1 tokens for rail/sidebar/panel
  depth, persistent headers, normal/hover/selected/focus states, semantic Voice
  connection, member/status presentation, Home cards and bounded motion.
- `ChannelSidebar.tsx`: presentation-only spans allow server, category and channel
  names to truncate without changing labels, order, handlers or context triggers.
- `Home.tsx`: a decorative 56px canonical icon location and VI.2 button classes
  for existing Add/Retry actions. Copy, heading association, loading/error,
  Continue and server navigation remain unchanged.
- `MemberPanel.tsx`: semantic status classes and VI.2 icon-button classes; dynamic
  role colors remain persisted user data. The owner avatar's warning treatment
  moves from an inline visual object to a class. Group outputs and status labels
  are unchanged.

ServerRail keeps its 72px width and current Home SVG at 48px because the tracked
1254px tile includes framing that is better suited to a moderate location. Normal
server entries use tertiary neutral fill; hover uses the lighter neutral; selected
uses active neutral plus a 4×28px brand-primary edge marker and stronger text.
Add Server has a small brand tint/border and solid brand hover, without gradient.
No unread/mention state was invented.

ChannelSidebar remains 240px with independent scroll. Its header uses primary
depth and a subtle separator/shadow. Categories remain compact/muted. Channel
rows retain native buttons and gain md radius, truncation, neutral hover and an
active-neutral selected state reinforced by weight and an inset focus-colored
marker. Voice-connected rows retain success green with a success marker; denied
connect remains a readable native disabled state. Nested participant rows receive
only spacing, neutral avatar/border, hover and inset focus polish. Speaking,
mute/deafen, occupancy and context semantics are untouched.

MemberPanel remains 240px and the hidden toggle remains 40px. The header aligns
with persistent shell depth; compact group headings use semantic status colors.
Member rows remain unboxed, with neutral hover, truncation, textual status and a
small semantic status dot on a neutral avatar. Owner keeps the crown and a warning
inset cue. No Presence value, grouping rule, role/hoist rule or context action changed.

Home remains a functional application surface. The canonical tracked
`/brand/likecord-icon.png` appears once at 56px beside the existing welcome text;
it was visually legible there and is not used in every navigation item. Continue
uses a neutral card with an inset brand marker; server cards use neutral fill,
restrained border/radius and distinct hover/active states. Existing long-name
wrapping, independent loading/error states, empty state and explicit navigation
are preserved. No wordmark, favicon, derivative or small mark was created.

The chat/channel/member persistent headers share primary depth, subtle borders
and low elevation. Existing title/action content and permissions remain intact.
No rail/sidebar/panel width, flex ownership, route, stacking, body scroll or
responsive architecture changed. Chat messages, composer, management content,
Voice controls/dialogs, Screen Share, auth and invite composition remain VI.4+.
The full gradient remains defined once and unused by shell application styles.

### 15.2 Validation and local visual evidence

Focused Jest ran first and passed **10 suites / 218 tests**, zero snapshots:
`layout`, `navigation`, `home`, `server-surfaces`, `channel-structure`,
`member-list-realtime`, `voice-occupancy`, `voice-participant-popover`,
`context-menu` and `voice`. No test was changed: existing assertions cover Home
explicit navigation/invalidation, rail selection, category/channel behavior,
context keyboard access, member grouping/staleness and Voice occupancy/speaking.

The final candidate passed full Web Jest (**32 suites / 525 tests**, zero
snapshots), Web typecheck, Web lint (**zero errors / 87 preexisting warnings**),
`git diff --check` and complete diff review. No undefined CSS variable or root
token change was introduced.

A temporary local Next route mounted the actual ServerRail, ChannelSidebar,
MemberPanel and Home with populated/long-name fixture props, connected Voice and
all current status labels. A temporary same-origin Continue response exposed the
real Home Continue branch. Both temporary files, generated dev-agent files and
Next typing edits were removed/restored; server and Browser tab were closed.

At 1280×720, document scroll width equaled client width (1280); rail/sidebar/member
measured exactly 72/240/240px. Channel scroll measured 579px client / 715px content
with `overflow-y:auto`; MemberPanel retained its own scroll owner. Normal channel
was transparent with secondary text; hover computed `#303747/#BCC2CF`; selected
computed `#394357/#F2F3F7` plus the `#B8ABFF` inset marker. Shift+F10 focused the
first menu item with the standard focus color; Escape returned focus to the
channel. There were zero rendered gradient backgrounds.

Home showed the canonical 56px icon, Continue and three neutral server cards.
Equivalent layout-pressure checks used CSS viewports 1024×576 and 853×480,
corresponding to the available width pressure of 125% and 150% review. Both had
zero horizontal document overflow; the smaller shell preserved widths, a 301px
main column, internal channel scroll and truncated 429px channel title into 195px.
The Browser did not expose a reliable actual zoom-level control, so these are
viewport-pressure evidence rather than claims of completed 125%/150% zoom acceptance.
Actual zoom and V01–V10 remain for staging.

Representative opaque contrast ratios: secondary/tertiary 8.81:1,
primary/active 8.96:1, muted/secondary 8.36:1, success/active 4.85:1,
focus/active 4.87:1, white/brand-primary 5.71:1, warning/secondary 9.45:1 and
danger/secondary 6.33:1. This is bounded shell evidence, not WCAG certification.

Exact-path review confirms API, realtime, WebRTC/media ownership, Prisma
schema/migrations, packages/lockfiles, canonical asset bytes and frozen
F5/F6/F7/Member–Voice contracts are unchanged. PRESENCE-01 stays
`confirmed_before_rc_separate_owner`; no heartbeat, Online/Offline/Away,
session/Voice-idle or functional debt changed. Formal pre-RC order is unchanged.

### 15.3 Status, documentation impact and next action

Updated only this contract, the visual-identity roadmap status and AI_CONTEXT
navigation. Accepted and implemented: the bounded VI.3 shell direction and
moderate canonical-icon placement on Home. No new functional product, API,
permissions, persistence or responsive decision. No known stale documentation.

VI.1/VI.2/VI.3 manual staging remains pending. The first substantial branding
checkpoint is ready because implementation, automated validation and local sanity
passed. Exact next action: under subsequent explicit authorization, build/publish
a Web-only artifact containing VI.1+VI.2+VI.3 and perform that staging checkpoint.
Do not start VI.4 or mark V01–V10 accepted in this delivery.

```text
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=true
VI_1_MANUAL_STAGING_PENDING=true
VI_2_MANUAL_STAGING_PENDING=true
VI_3_STARTED=true
VI_3_IMPLEMENTED=true
VI_3_AUTOMATED_VALIDATION_PASS=true
VI_3_MANUAL_STAGING_PENDING=true
VI_4_STARTED=false
VISUAL_IDENTITY_FIRST_STAGING_CHECKPOINT_READY=true
VISUAL_IDENTITY_COMPLETE=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
NEXT_ACTION=build/publish Web-only artifact containing VI.1+VI.2+VI.3 and perform first substantial visual staging checkpoint
```

## 16. VI.3R Shell Depth & Layout Reconciliation — implemented 2026-09-04

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
VI.3R is the bounded remediation of the first visual checkpoint, performed before
manual VI.1–VI.3 acceptance and before VI.4. It supersedes section 15 only for
the current shell topology and depth assignments. It does not reopen VI.1–VI.3,
complete V01–V10 or start VI.4.

### 16.1 Precheck and accepted implementation

Precheck matched `historical visual identity refresh work`, HEAD
`visual design governance milestone`, clean tracked worktree/index and
only untracked `docs/design/`. That HEAD already contained the separate visual
governance commit in `AGENTS.md` and `.codex/skills/likecord-ui-review/SKILL.md`;
neither governance file is part of this visual delta. The reference directory
remained untracked and untouched.

The following decisions are accepted and implemented for VI.3R:

- **R1 — repeatable shell depth:** existing VI.1 tokens now map shell roles to
  Depth 0 app/rail `#0B0D12`, Depth 1 persistent navigation/member panels
  `#171B24`, Depth 2 chat canvas `#11141B`, Depth 3 shared header/composer/user
  panel `#1E232E` and Depth 4 menus/dialogs `#272D3A`. No new token graph,
  gradient use or application-wide glow was introduced.
- **R2 — shared workspace header:** `AppShellHeader` spans the main content and
  MemberPanel columns, retains channel/server title and WebSocket status content,
  and owns an accessible pressed-state member toggle. The app renders ChatArea
  and MemberPanel without their former structural headers. Hiding the panel
  unmounts its column, expands main content and retains toggle focus.
- **R3 — combined navigation footer:** the 72px ServerRail and 240px
  ChannelSidebar remain separate navigation columns inside a 312px navigation
  frame. The existing UserPanel is rendered once across their combined base,
  uses the persistent Depth 3 treatment shared with the composer, and keeps its
  Voice, menu and user actions.
- **R4 — Add Server in server flow:** Home remains fixed at the rail top. The
  internal server list owns vertical overflow and now contains Add Server directly
  after the last server. Existing navigation, context-menu and Add Server handlers
  are unchanged.
- **R5 — bounded overflow and icon stability:** ChannelSidebar, MemberPanel and
  the rail's inner list reuse one hover-only scrollbar class. Its thumb stays
  transparent at rest and becomes visible on container hover only when native
  overflow exists. Chat scrolling is unchanged. Channel icons use a local fixed
  16px nonshrinking slot while channel/category/role labels truncate without
  horizontal document overflow.

Selected channels retain their inset focus-color marker and active-neutral fill;
selected hover adds only a slight neutral nuance. Voice-connected selection keeps
its success treatment. Existing select, checkbox, secondary-button and focus
styles remain unchanged. Long server, category, channel, username and role values
remain bounded by the owning shell column.

Exact production source delta:

- `apps/web/src/app/{app/page.tsx,globals.css}`;
- `apps/web/src/components/layout/{AppShellHeader,ServerRail,ChannelSidebar,ChatArea,MemberPanel}.tsx`.

`Home.tsx`, UserPanel implementation, API/realtime/WebRTC code, schema/migrations,
packages, lockfiles and frozen F5/F6/F7/Member–Voice contracts are unchanged.
The two Web test files changed only to cover the new DOM ownership, accessible
member toggle/persistence and Add Server placement.

### 16.2 Validation, visual sanity and governance review

Focused Web Jest passed **10 suites / 219 tests**, zero snapshots: `layout`,
`navigation`, `server-surfaces`, `channel-structure`, `chat-layout-scroll`,
`member-list-realtime`, `voice-occupancy`, `voice-participant-popover`,
`context-menu` and `voice`. The final candidate passed full Web Jest
(**32 suites / 527 tests**, zero snapshots), Web typecheck, Web lint
(**zero errors / 87 preexisting warnings**) and `git diff --check`.

A temporary local Next route exercised the actual shell components with many and
long server/channel/member/role values, Voice occupancy and the real Home surface.
The route and all generated development files were removed after review; the
local server and browser tab were closed. At 1280×720 the document had no
horizontal overflow; navigation/rail/sidebar/member measured 312/72/240/240px,
all five depth roles matched their accepted opaque colors, and no rendered
gradient was present. The rail, channel and member regions each overflowed and
scrolled independently; idle thumbs were transparent and hover exposed them.
Channel icons remained 16px while long labels truncated.

The member toggle expanded main content from 728px to 968px and back while
retaining visible keyboard focus. Server context menu and Add Server modal used
Depth 4, remained viewport-bounded and preserved their focus behavior. The
relocated UserPanel menu opened above the combined footer without clipping. Home
retained a rail-only 72px navigation state, the accepted 56px icon, existing
actions and no horizontal overflow.

Viewport-pressure checks at 1024×576 and 853×480 retained zero horizontal
document overflow, bounded labels and independent internal scrolling; the latter
left a 301px main column. The local browser did not expose a reliable actual
125%/150% zoom control, so real zoom and complete V01–V10 acceptance remain
pending for staging.

The required `likecord-ui-review` result is:

- **KEEP:** the established 72/240/240 density, unboxed message/member rows,
  functional focus/selection/speaking/status indicators, Home/icon and
  modal/control treatments, and existing Voice/Screen Share ownership.
- **SYSTEMIZE:** the existing Depth 0–4 tokens by shell role, one shared header,
  one persistent Depth 3 band language, hover-only shell scrollbar treatment and
  fixed channel-icon slots.
- **WATCH:** actual 125%/150% zoom and the intentionally compressed 301px main
  column under narrow desktop pressure during the consolidated staging review.

These findings describe this task's accepted work and pending staging evidence;
they create no separate backlog or new product requirement.

### 16.3 Scope, documentation and next action

This contract, the owning roadmap status and AI_CONTEXT navigation are the only
documentation updated. No product, routing, API, realtime, WebRTC, permissions,
schema, migration, Presence, Voice/Screen Share lifecycle, composer-behavior,
responsive/mobile or theme-architecture contract changed. No new accepted
decision exists outside the five VI.3R items above, and no known stale active
documentation was introduced.

VI.1, VI.2, VI.3 and VI.3R remain manual-staging-pending. A Web-only immutable
VI.3R artifact was subsequently published from source
`shell depth and layout milestone` as
`historical WEB image: shell depth and layout milestone`, remote index digest
`sha256:67e6e291d6dc66d514e17cd69bf09ebff61a0f07a464ac64121de2bda98962b2`
and application-manifest digest
`sha256:c5c7073f430ffa864babfe602160d970f8525621a98e3a28f3f89edd6dc8d7cb`.
It was not deployed or used for staging and becomes historical evidence after
VI.3R2. Section 17 supersedes this section's next action.

```text
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=true
VI_1_IMPLEMENTED=true
VI_2_IMPLEMENTED=true
VI_3_IMPLEMENTED=true
VI_3R_STARTED=true
VI_3R_IMPLEMENTED=true
VI_3R_AUTOMATED_VALIDATION_PASS=true
VI_1_MANUAL_STAGING_PENDING=true
VI_2_MANUAL_STAGING_PENDING=true
VI_3_MANUAL_STAGING_PENDING=true
VI_3R_MANUAL_STAGING_PENDING=true
VI_4_STARTED=false
VISUAL_IDENTITY_FIRST_STAGING_CHECKPOINT_READY=true
VISUAL_IDENTITY_COMPLETE=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
STAGING_ACCESSED=false
STAGING_DEPLOY_PERFORMED=false
WEB_IMAGE_PUBLISHED=true
NEXT_ACTION=superseded_by_VI.3R2_section_17
```

## 17. VI.3R2 First Checkpoint Visual Tuning — implemented 2026-09-04

Historical implementation evidence: section 18 supersedes T3–T5 for UserPanel
radius and channel markers, the header spacing mechanism and the next action.
Other accepted VI.3R2 styling remains current. The measurements below describe
the VI.3R2 runtime, not the subsequent cleanup.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
VI.3R2 applies the bounded visual corrections requested after review of the first
checkpoint. It refines the existing VI.1–VI.3R system without changing shell
geometry, routes, product behavior, interaction ownership or the VI.4+ surface
scope. The VI.3R image recorded in section 16 predates these changes and is not
the staging candidate.

### 17.1 Precheck and accepted implementation

Precheck matched `historical visual identity refresh work`, HEAD
`shell depth and layout milestone` (`feat(brand): reconcile shell depth
and layout`), clean tracked worktree/index and only untracked `docs/design/`.
The local `likecord-ui-review` skill governed the review. The reference directory
remained untracked and untouched.

The following decisions are accepted and implemented for VI.3R2:

- **T1 — navigation/main hierarchy:** ServerRail, ChannelSidebar and its header
  use `--bg-primary`; the dominant workspace, shared chat header and MemberPanel
  use `--bg-secondary`.
- **T2 — persistent action band:** UserPanel and composer use `--bg-elevated`,
  making them a restrained persistent band rather than extending navigation
  depth into the workspace.
- **T3 — cleaner joins:** redundant top separators were removed from UserPanel
  and the Voice connection row. UserPanel uses the existing 16px large radius.
- **T4 — selected-channel marker:** active text emphasis and neutral fill remain;
  decorative shadow was removed and a 3px brand marker now communicates
  selection. Voice-connected selection uses the existing success color.
- **T5 — selected hover:** active hover uses the ordinary hover surface while
  retaining active text emphasis and the brand or Voice-success marker.
- **T6 — stable channel density:** existing fixed 16px nonshrinking icon slots,
  label truncation and row density are preserved.
- **T7 — Add Server affordance:** the resting control is a muted 2px dashed
  invitation; hover becomes a 1px brand-highlight border while keyboard focus
  retains the stronger shared focus ring.
- **T8 — creation-modal hierarchy:** the existing elevated modal shadow remains,
  while the modal surface uses `--bg-primary` with one subtle border.
- **T9 — form and option surfaces:** creation-modal inputs, textarea and select
  use `--bg-tertiary` with subtle 1px borders; channel-type rows stay transparent
  at rest, gain the shared hover surface, and use tertiary plus the existing
  accent border when selected. The private preset uses tertiary with its existing
  default border.
- **T10 — scoped actions:** direct primary/secondary actions in shell creation
  modals use transparent borders. The rule is scoped to those modals and does not
  alter close buttons or other modal families.

No token, gradient, glow, dependency, behavior handler or `!important`
declaration was introduced. Chat-header height and 16px left padding remain
unchanged. Existing disabled, invalid, hover and keyboard-focus states continue
to use the shared primitive system.

Exact production source delta:

- `apps/web/src/app/globals.css`;
- `apps/web/src/app/app/page.tsx` (two scoped creation-modal class hooks only).

No test file, product logic, API, realtime, WebRTC, database/schema, migration,
Presence, Voice/Screen Share lifecycle or frozen F5/F6/F7/Member–Voice contract
changed.

### 17.2 Validation, visual sanity and governance review

Focused Web Jest passed **6 suites / 163 tests**, zero snapshots: `layout`,
`navigation`, `server-surfaces`, `permission-editor-shell`, `channel-structure`
and `voice`. Full Web Jest passed **32 suites / 527 tests**, zero snapshots.
Web typecheck passed. Web lint passed with **zero errors / 87 preexisting
warnings**. `git diff --check` passed. Two earlier command-shape failures occurred
before Jest started (`pnpm exec jest` could not resolve Jest and pnpm consumed
`--runInBand`); they were harness invocation errors, not implementation failures.

A temporary local route exercised the tuned shell and creation modal at
1280×720. It was removed with all generated development files; the server and
browser tab were closed. The document had no horizontal overflow. Computed
surfaces matched T1–T3, the shared header retained 16px left padding and 57px
height, and UserPanel rendered with 16px radius and no top border. Active channel
and Voice markers measured 3px, active hover preserved their semantics, and Add
Server focus was stronger than hover.

The creation modal remained bounded at 460×588, used the requested opaque
surface hierarchy, and preserved visible keyboard focus. Channel/member regions
overflowed independently; idle scrollbars became visible on hover without a
width shift. Long channel labels truncated beside fixed 16px icon slots. The
production rail-scroll CSS was unchanged from VI.3R; actual consolidated staging
with real content and 125%/150% zoom remains pending.

The required `likecord-ui-review` result is:

- **KEEP:** existing tokens, shared focus-visible treatment, hover-only shell
  scrollbars, fixed icon slots, unboxed rows, semantic Voice success and the
  modal's purposeful elevated shadow.
- **SYSTEMIZE:** the refined shell-role mapping, selected-row marker language,
  modal field/option surface roles and scoped creation-modal action treatment.
- **SIMPLIFY:** redundant UserPanel/Voice separators and the decorative active
  channel shadow were removed.
- **WATCH:** real populated staging, real 125%/150% zoom and rail overflow in the
  consolidated checkpoint. These are pending evidence, not a new backlog.

### 17.3 Scope, documentation and next action

This contract, the owning roadmap status and AI_CONTEXT navigation are the only
documentation updated. VI.1, VI.2, VI.3, VI.3R and VI.3R2 remain
manual-staging-pending. VI.4 remains not started. The previously published VI.3R
image is immutable historical evidence and is not suitable for VI.3R2 staging.

The exact next action, under separate authorization, is to publish a new
immutable Web artifact from the resulting VI.3R2 commit and execute the
consolidated VI.1–VI.3R2 manual staging checkpoint over the preserved API. Only
after that acceptance should VI.4 begin.

```text
VISUAL_IDENTITY_IMPLEMENTATION_STARTED=true
VI_1_IMPLEMENTED=true
VI_2_IMPLEMENTED=true
VI_3_IMPLEMENTED=true
VI_3R_IMPLEMENTED=true
VI_3R2_STARTED=true
VI_3R2_IMPLEMENTED=true
VI_3R2_AUTOMATED_VALIDATION_PASS=true
VI_1_MANUAL_STAGING_PENDING=true
VI_2_MANUAL_STAGING_PENDING=true
VI_3_MANUAL_STAGING_PENDING=true
VI_3R_MANUAL_STAGING_PENDING=true
VI_3R2_MANUAL_STAGING_PENDING=true
VI_4_STARTED=false
VISUAL_IDENTITY_FIRST_STAGING_CHECKPOINT_READY=true
VISUAL_IDENTITY_COMPLETE=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
STAGING_ACCESSED=false
STAGING_DEPLOY_PERFORMED=false
VI_3R2_WEB_IMAGE_PUBLISHED=false
NEXT_ACTION=superseded_by_VI.3R3_section_18
```

### 17.4 VI.3R2 first staging checkpoint — accepted

`DECISION_ACCEPTED / MANUAL_STAGING_PASS` for **VI.1, VI.2, VI.3, VI.3R and
VI.3R2 only**. The first staging checkpoint and its foundation/direction are
formally accepted. This is a historical acceptance reconciliation based on the
user-supplied publication, icon-verification and manual staging results; no new
registry, browser or runtime validation was performed by this documentation task.

The accepted source is an ancestor of reconciliation starting HEAD
`manual visual tuning milestone` on
`historical visual identity refresh work`. Later commits `user-validated shell cleanup milestone` (User-Validated Shell
Cleanup) and `manual visual tuning milestone` (manual visual tuning) remain later work. Recording this
earlier artifact's acceptance now does not accept those commits, VI.3R3, or the
current user-owned uncommitted CSS. Section 18's later decisions remain current;
in particular, the R03 radius acceptance below describes the VI.3R2 artifact.

#### Immutable publication and preserved API evidence

| Identity | Accepted evidence |
|---|---|
| VI.3R2 source milestone | `first visual checkpoint milestone` |
| Immutable Web artifact | `ghcr.io/ryezuo/likecord-web@sha256:67b998dccd0f407d232b43454cb4607d43a9fe6e33031364e7868ea614ac351b` |
| Remote OCI index | `sha256:67b998dccd0f407d232b43454cb4607d43a9fe6e33031364e7868ea614ac351b` |
| Application manifest | `sha256:a75a744f3e96967ec8e3b2c73a58bc49457752ea5c753f320700152d8493a6e9` |
| Source milestone | `first visual checkpoint milestone` |
| Platform | `linux/amd64` |
| Verified canonical Likecord icon SHA-256 | `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949` |
| Preserved API artifact | `ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e` |
| Preserved API source | `durable continue navigation milestone` |

#### Consolidated manual staging results

All results below are **PASS** for the immutable VI.3R2 artifact above.

| Check | Accepted manual evidence |
|---|---|
| R01 — Depth / colors | ServerRail deepest layer coherent; ChannelSidebar/Header coherent; Chat/MemberPanel dominant surface pleasant; Composer/UserPanel visually elevated; dark modal clearly elevated; overall depth coherent without fragmentation. |
| R02 — Shared header | ChatHeader spans Chat + Member area; Member toggle works; hidden MemberPanel expands Chat; visible panel fits without a redundant second header; no height misalignment. |
| R03 — UserPanel | Spans ServerRail + ChannelSidebar; radius-xl visually accepted; natural Composer alignment; mute/deafen/settings/status/logout work; redundant separator removal improves the result. |
| R04 — Add Server | Follows the final server; dashed normal and solid hover states accepted; focus more evident than hover; accessible with many servers. |
| R05 — Channel rows | Normal, hover, active without decorative shadow and unmistakably selected active:hover pass; selected Voice retains semantic success indication. |
| R06 — Creation modals | bg-primary modal, border-subtle, tertiary inputs/selects; channel type transparent normal, hover and selected states pass; Channel and Category modal borderless buttons pass; secondary/cancel hierarchy clear. |
| R07 — Scrollbars | No relevant scrollbar without overflow; thumb hidden while idle with overflow and visible on hover, including MemberPanel; wheel scrolling works while thumb is hidden; no layout shift. |
| R08 — Long names | Text Channel icon remains 16px; Voice Channel icon intact; long category, username and role pass; no horizontal overflow. |
| R09 — Real browser zoom | 100%, 125% and 150% pass for shared header, MemberPanel, UserPanel + Composer, modals, menus, Add Server and scrolling; no overlap at any tested level. |
| R10 — Functional smoke | Login; Home / Continue; servers/channels; send message; MemberPanel toggle; Member context menu; Join/Leave Voice; local volume/mute; Screen Share start/watch/stop; Server Settings; Channel Settings; Add Server; Logout. |

The prior `VI.3R2_publication_status_pending_staging_reconciliation` gap is
resolved. Historical publication/pending markers in section 17.3 describe its
implementation closure, not the accepted artifact's current status. Complete
visual identity acceptance, VI.3R3 staging and unrelated release gates are not
concluded by this checkpoint. VI.4 remains not started. At reconciliation time,
uncommitted `globals.css` work was outside this acceptance and unclassified;
section 18.4 subsequently incorporates its intent into VI.3R3 only.

```text
VI_1_IMPLEMENTED=true
VI_2_IMPLEMENTED=true
VI_3_IMPLEMENTED=true
VI_3R_IMPLEMENTED=true
VI_3R2_IMPLEMENTED=true
VI_1_MANUAL_STAGING_PENDING=false
VI_1_MANUAL_STAGING_PASS=true
VI_2_MANUAL_STAGING_PENDING=false
VI_2_MANUAL_STAGING_PASS=true
VI_3_MANUAL_STAGING_PENDING=false
VI_3_MANUAL_STAGING_PASS=true
VI_3R_MANUAL_STAGING_PENDING=false
VI_3R_MANUAL_STAGING_PASS=true
VI_3R2_MANUAL_STAGING_PENDING=false
VI_3R2_MANUAL_STAGING_PASS=true
VI_3R2_WEB_IMAGE_PUBLISHED=true
VISUAL_IDENTITY_FIRST_STAGING_CHECKPOINT_PASS=true
VISUAL_IDENTITY_FOUNDATION_DIRECTION_ACCEPTED=true
VI_3R3_ACCEPTED_BY_THIS_TASK=false
VI_4_STARTED=false
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
```

## 18. VI.3R3 User-Validated Shell Cleanup — implemented 2026-09-04

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
These bounded corrections implement the user's direct browser comparisons;
they are accepted requirements, not optional review proposals or a new slice.

### 18.1 Precheck and current visual decisions

Precheck matched branch `historical visual identity refresh work`, HEAD
`first visual checkpoint milestone` (`feat(brand): tune first visual
checkpoint`), clean tracked worktree/index and only untracked `docs/design/`.
That directory was not read, modified, staged or cleaned.

- **Sidebar:** remove both legacy right-border declarations and their later
  color override. No replacement edge, pseudo-element, shadow or separator.
- **Shared chat header:** only `padding-left: var(--space-4)` (16px); top,
  right and bottom padding remain zero. The current Chat/workspace header and
  ChannelSidebarHeader have **48px effective border-box height**, with their
  bottom separators on the same horizontal line. Commit `manual visual tuning milestone` changed the
  chat minimum to 48px; section 18.4 makes the shared effective row height fixed
  and nonshrinking. Channel/WS information and the shared member toggle remain.
  The earlier 57px measurement is historical evidence, not the current target.
- **Text selection:** active background/text weight and existing state/focus
  treatment remain, with no `::before`, decorative shadow or replacement edge.
  Active text hover retains `--bg-hover`.
- **Voice selection:** `box-shadow: inset 3px 0 var(--success)` replaces the
  pseudo-element; no purple selection edge. Existing `--focus-decoration`
  composes the success inset with the shared keyboard-focus ring. The redundant
  `voice-connected-badge` dot and its unused CSS are removed. Voice callbacks,
  functional status, speaking/mute/deafen and media ownership are unchanged.
- **Lower background ownership:** `.app-layout` remains the opaque shell base
  using `--bg-secondary`. `.app-navigation` is explicitly transparent and
  `.app-navigation-columns` remains transparent by default. The current
  `.user-panel-section` uses **`--bg-primary`**, continuing the navigation
  surface around the elevated UserPanel (section 18.4 supersedes its original
  transparency). AuthWrapper/providers add no background-owning DOM layer.
  `html/body` remain `--bg-app` (`--bg-base`) outside the full-height shell.
  No blanket ancestor reset is used.
- **Lower geometry:** the existing UserPanel is rendered once in a layout-only
  `.user-panel-section` div with `padding: 0 var(--space-4) var(--space-3)`
  (0 16px 12px), nonshrinking flex sizing and no card treatment. UserPanel and
  `.composer-inner` share `--radius-lg` (12px) and `--bg-elevated`; no new
  UserPanel border. Composer minimum height is 48px, with its previous outer
  spacing and natural expansion preserved. Heights are not runtime-coupled.

VI.3R2's primary navigation/ChannelHeader surfaces, secondary MainContent/
MemberPanel/ChatHeader surfaces, elevated UserPanel/Composer, modal primary
surface/subtle border, tertiary modal fields, scoped borderless creation actions,
channel-type states, Add Server borders, hover-only scrollbars and fixed icon
slots remain intact. No new token or `!important` declaration was introduced.

### 18.2 Validation and Likecord UI review

Historical validation of the original `user-validated shell cleanup milestone` implementation follows. Its
57px geometry measurements predate `manual visual tuning milestone` and the final 48px contract. They
are preserved as evidence only; section 18.4 owns final validation.

Focused Web Jest: **6 suites / 162 tests**, zero snapshots (`layout`,
`navigation`, `voice`, `chat-layout-scroll`, `channel-structure`, `server-surfaces`).
These exercise shell/header/rail/sidebar/navigation, Voice and the embedded
UserPanel controls, and Composer/scroll behavior. Existing tests needed no markup
adaptation; no test or snapshot was added. Full Web Jest passed **32 suites /
527 tests**, zero snapshots. Web typecheck passed; lint passed with **0 errors /
87 preexisting warnings**. `git diff --check` passed.

A temporary local Next route rendered the actual ServerRail, ChannelSidebar,
AppShellHeader, UserPanel, ChatArea and MemberPanel with local fixture props.
At 1280×720, UserPanel and Composer both measured 48px when disconnected,
top 660px / bottom 708px; wrapper padding was 0 16px 12px, both radii 12px.
Connected Voice expanded UserPanel naturally to approximately 91.19px while
both bottoms stayed 708px. At 1024×640 both bottoms were 628px. Both viewports
had no horizontal document overflow. Screenshots confirmed the clean footer,
preserved density and deliberate alignment.

Computed styles confirmed zero Sidebar right border, no Sidebar replacement
pseudo-element, header height 57px/title offset 16px, text shadow/before absent,
Voice success inset/before absent, badge count zero and all requested footer
surfaces. Voice keyboard focus retained its distinct ring plus success inset.
The UserPanel menu opened above the footer without clipping; member toggle
hid/restored the column. The final isolated fixture had **0 console errors**.

The first attempt encountered the known local `api` hostname/proxy failure and
a browser navigation timeout; the page subsequently rendered. For visual-only
sanity the fixture temporarily omitted the auth provider, then restored the
root layout exactly. No authenticated or real WebRTC/staging acceptance is
claimed. The temporary route, generated agent files and development declaration
changes were removed/restored; the local server/tab were closed.

Authorities consulted: AGENTS.md, this contract, the UI/UX roadmap, the committed
`likecord-ui-review` skill and frozen F6/F7 behavior boundaries.

- **KEEP:** accepted depth, dense rows, existing focus/semantic Voice inset,
  fixed icon slots, hover-only scrollbars and VI.3R2 modal/Add Server treatments.
- **SIMPLIFY:** redundant Sidebar boundary, channel pseudo-elements, connected
  dot and independently painted navigation footer removed as explicitly requested.
- **SYSTEMIZE:** reuse `--space-4`, `--space-3`, `--radius-lg`, surface tokens
  and the existing focus composition; no new primitive/token family is needed.
- **WATCH:** real populated staging and 125%/150% zoom remain pending evidence;
  this observation creates no authoritative backlog item.

### 18.3 Scope, documentation and next action

Only three production files changed: `apps/web/src/app/globals.css`,
`apps/web/src/app/app/page.tsx` (layout wrapper only), and
`apps/web/src/components/layout/ChannelSidebar.tsx` (badge removal only).
This contract, UI/UX roadmap and AI_CONTEXT are the only documentation changes.
No API, realtime, WebRTC, Presence, schema/migration, routing, permission, auth,
Voice/Screen Share lifecycle or Composer behavior change. F5/F6/F7 and
Member/Voice remain frozen; VI.4 remains not started. Superpowers and subagent
review were not used. No publication, push, deployment, tag or SSH occurred.

The historical first checkpoint through VI.3R2 is accepted in section 17.4.
VI.3R3 remains manual-staging-pending and is outside that acceptance. Section
18.4 incorporates the subsequently authorized local CSS intent and owns final
automated/local validation. Next, under separate authorization, publish a new
immutable Web artifact from the finalized VI.3R3 commit, deploy it over the
preserved accepted API and execute the focused VI.3R3 manual staging checkpoint
before VI.4. This task performs no publication or staging operation.

```text
VI_1_IMPLEMENTED=true
VI_2_IMPLEMENTED=true
VI_3_IMPLEMENTED=true
VI_3R_IMPLEMENTED=true
VI_3R2_IMPLEMENTED=true
VI_3R3_STARTED=true
VI_3R3_IMPLEMENTED=true
VI_3R3_AUTOMATED_VALIDATION_PASS=true
VI_3R3_MANUAL_STAGING_PENDING=true
VI_1_MANUAL_STAGING_PENDING=false
VI_2_MANUAL_STAGING_PENDING=false
VI_3_MANUAL_STAGING_PENDING=false
VI_3R_MANUAL_STAGING_PENDING=false
VI_3R2_MANUAL_STAGING_PENDING=false
VI_4_STARTED=false
CHANNEL_SIDEBAR_RIGHT_SEPARATOR=false
CHAT_HEADER_LEFT_PADDING_16=true
TEXT_CHANNEL_ACTIVE_BEFORE=false
TEXT_CHANNEL_ACTIVE_DECORATIVE_SHADOW=false
VOICE_CHANNEL_ACTIVE_SUCCESS_INSET=true
VOICE_CHANNEL_ACTIVE_BEFORE=false
VOICE_CONNECTED_BADGE_PRESENT=false
USER_PANEL_WRAPPER_IMPLEMENTED=true
USER_PANEL_WRAPPER_BACKGROUND=var(--bg-primary)
USER_PANEL_RADIUS=var(--radius-lg)
COMPOSER_MIN_HEIGHT=48px
COMPOSER_RADIUS=var(--radius-lg)
NEW_IMPORTANT_DECLARATIONS=0
VI_3R3_API_CHANGED=false
VI_3R3_REALTIME_CHANGED=false
VI_3R3_WEBRTC_CHANGED=false
VI_3R3_SCHEMA_CHANGED=false
VI_3R3_MIGRATION_REQUIRED=false
PRESENCE_IMPLEMENTED=false
F5_REOPENED=false
F6_REOPENED=false
F7_REOPENED=false
MEMBER_VOICE_CONTEXT_MENU_REOPENED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
NEXT_ACTION=publish a new immutable Web artifact from the finalized VI.3R3 commit, deploy it over the preserved accepted API, and execute the focused VI.3R3 manual staging checkpoint before VI.4
```

### 18.4 Final VI.3R3 user refinements — implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
Starting branch `historical visual identity refresh work`, HEAD
`first visual staging acceptance milestone`; the intentional user CSS input had
SHA-256 `1697d0cf1156ce31f024a473fd972ded79d62dc7a5b0ca38e29c3254b1dca9f3`.
Only `globals.css` and the three authorized documentation files change.
No component, test or snapshot change is needed for this CSS-only refinement.

Final decisions:

- **Aligned headers:** the existing shared `.channel-header, .app-shell-header`
  rule sets `height: 48px; flex: 0 0 auto`. Existing 48px minimums and global
  border-box sizing remain; flex neither grows nor shrinks the 48px outer row.
  The 1px bottom borders are included, not added to the height. No overflow clip
  is added to headers, and metadata/member toggle remain intact.
- **Readable modal titles:** `.modal h3` uses `min-width: 0` and
  `overflow-wrap: anywhere` instead of generic `overflow: hidden`. Long spaced
  and unbroken titles remain readable beside close controls. No ellipsis,
  component abstraction or normal-title font change is introduced.
- **Navigation footer:** the user's `--bg-primary` wrapper is incorporated.
  UserPanel retains `--bg-elevated`, existing geometry and `--radius-lg` (12px),
  matching Composer. The task's reference to preserving radius-xl does not
  change the already implemented VI.3R3 12px radius back to historical VI.3R2.
- **Scoped action borders:** retain the shared `1px solid --border-control`
  base. Only direct primary/secondary `.btn` actions in `.shell-creation-modal`
  keep transparent borders, including active and disabled states. The scoped
  state selector matches the shared active specificity and follows it, avoiding
  `!important`. Border width remains 1px for stable geometry; close icons,
  Add Server choices, danger actions, Home, Settings, Auth and unrelated modal
  actions retain existing policies. Hover/active fills, opaque disabled styling,
  global focus and forced-colors focus fallback remain intact.

Validation of the final source:

| Check | Result |
|---|---|
| Focused Web Jest | **7 suites / 205 tests PASS**, zero snapshots: layout, navigation, server-surfaces, channel-structure, add-server, message-delete, voice |
| Full Web Jest | **32 suites / 527 tests PASS**, zero snapshots |
| Web typecheck | PASS |
| Web lint | PASS: **0 errors / 87 preexisting warnings** |
| `git diff --check` | PASS |
| New `!important` | **0** |

The first pnpm shorthand invocation rejected Jest flags before Jest started;
the explicit `run test` invocation passed. The local fixture initially omitted
Voice fixture data and was corrected in the temporary harness only. Neither
was a production failure or justification for unrelated remediation.

An isolated loopback fixture used the production CSS and server-rendered actual
AppShellHeader, ChannelSidebar and UserPanel, with representative shell/composer
and creation-modal markup. It made no API or authenticated runtime calls.
At **1280×720, 1024×640 and 853×480**, both headers measured **48px** from top
0 to bottom 48, with no header or document overflow. UserPanel and Composer
bottoms aligned at 708, 628 and 468 respectively. Wrapper color measured
`rgb(17,20,27)`; UserPanel `rgb(39,45,58)`, radius 12px and no bottom border.
The member toggle remained an accessible 32px control inside the header;
production interaction coverage comes from Jest, not fixture event handlers.

Normal, long spaced and long unbroken modal titles were inspected; long titles
wrapped without horizontal overflow, clipping or overlap with the 32px close
control. Channel and Category actions retained transparent 1px borders and
approximately 34.98px height across inspected normal, hover, active, keyboard
focus and disabled states. Primary/secondary/disabled fills remained distinct;
Cancel focus showed the existing 2px focus ring and 2px offset. Screenshots
confirmed the shell alignment and restrained navigation/footer depth.

The available browser exposes viewport control, not a documented real-zoom or
forced-colors emulator. The pressure viewports above are **not** evidence of
125%/150% browser zoom. Real zoom and forced-colors rendering remain manual
checks; forced-colors CSS was inspected and preserved. No staging, WebRTC or
final visual acceptance is claimed. Temporary fixture tooling is removed after
inspection and does not ship.

Likecord UI review:

- **KEEP:** dark primary navigation, elevated UserPanel, existing radii/density,
  shared focus, semantic danger/Voice and accepted VI.3R2 history.
- **SYSTEMIZE:** one shared effective 48px header rule, safe shared title wrap,
  explicit state-stable creation-action border policy using existing hooks.
- **WATCH:** real zoom, forced colors and populated VI.3R3 staging; these are
  remaining validation evidence, not new independent backlog items.

```text
VI_3R3_DECISION_ACCEPTED=true
VI_3R3_IMPLEMENTED=true
VI_3R3_AUTOMATED_VALIDATION_PASS=true
VI_3R3_MANUAL_STAGING_PENDING=true
VI_3R3_ACCEPTED=false
VI_3R3_HEADER_HEIGHT=48px
CHAT_HEADER_EFFECTIVE_HEIGHT=48px
CHANNEL_SIDEBAR_HEADER_EFFECTIVE_HEIGHT=48px
CHAT_HEADER_MATCHES_CHANNEL_SIDEBAR_HEADER=true
VI_3R2_57PX_HEADER_EVIDENCE_PRESERVED_AS_HISTORICAL=true
VI_3R3_CONTRACT_57PX_CURRENT_REFERENCE_REMOVED=true
USER_GLOBALS_CSS_INCORPORATED=true
MODAL_TITLE_SAFE_WRAP=true
USER_PANEL_SECTION_BG_PRIMARY=true
MODAL_BORDER_POLICY_SCOPED=true
SHARED_BUTTON_BASE_POLICY_PRESERVED=true
NEW_IMPORTANT_DECLARATIONS=0
VI_4_STARTED=false
STAGING_ACCESSED=false
STAGING_DEPLOY_PERFORMED=false
IMAGE_PUBLISHED=false
```

### 18.5 Final VI.3R3 acceptance — recorded 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PASS`.
The finalized VI.3R3 artifact was published and validated in the existing local
Docker Compose runtime. This record closes VI.3R3 without implying a remote
staging VPS, SSH deployment or remote browser validation.

Accepted evidence:

- Source: `vi3r3 visual refinements milestone`,
  `feat(brand): finalize vi3r3 visual refinements`.
- Web image: `ghcr.io/ryezuo/likecord-web@sha256:92800f6be5913b6a3306e364774a9761d6874266dbe608535a04ae60ecab19a4`;
  application manifest `sha256:45c3599d8bb2e25c8480705241c51efd42c652570fe850b17b9124656ecb7d2e`,
  `linux/amd64`, OCI revision matching the source SHA. BuildKit attestation:
  `sha256:6f5b6db6deca95bfdd2806f89a31823baee70dcc3bc2457ce32355f036930e97`.
- Canonical icon hash: `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949`.
- Local Web runtime returned HTTP 200, remained ready on Next.js 16.3.3,
  had zero restarts and no startup, asset or crash-loop failure.
- The pre-existing local API runtime was preserved exactly: container
  `6a5a9fd70c18d5dcf1d211e9040f5bc28e5b043cab73aeaa5005d34e119c91d1`, image
  `sha256:4ab9494b4fec2986827b0028de88c5fc198b5c7f089f5995af5ae07cc1d78645`,
  unchanged start time and zero restarts. No API recreation or change occurred.
- V3R3-01 headers, V3R3-02 modal titles, V3R3-03 modal buttons,
  V3R3-04 UserPanel, V3R3-05 real zoom at 100%/125%/150% and V3R3-06
  regression smoke all passed. The accepted header height is 48px and the
  accepted UserPanel radius is 12px.

The manual validation environment is `local_docker_compose`; `REMOTE_STAGING_EXISTS=false`
and `SSH_DEPLOYMENT_REQUIRED=false`. Forced-colors was not executed and is
non-blocking. The local Caddy PartialChain observation is unrelated and
non-blocking. The user's post-checkpoint `globals.css` changes were outside the
published artifact and this acceptance; they remain user-owned and unclassified.

```text
VI_3R3_MANUAL_STAGING_PENDING=false
VI_3R3_MANUAL_STAGING_PASS=true
VI_3R3_ACCEPTED=true
VI_3R3_CHECKPOINT_COMPLETE=true
VI_3R3_LOCAL_VALIDATION_RUNTIME_READY=true
VI_3R3_MANUAL_VALIDATION_ENVIRONMENT=local_docker_compose
REMOTE_STAGING_EXISTS=false
SSH_DEPLOYMENT_REQUIRED=false
LOCAL_API_IMMUTABLE_DIGEST_REQUIRED=false
LOCAL_API_PRESERVATION_MODE=exact_existing_runtime
API_RECREATED=false
API_CHANGED=false
V3R3_01_HEADERS_PASS=true
V3R3_02_MODAL_TITLES_PASS=true
V3R3_03_MODAL_BUTTONS_PASS=true
V3R3_04_USER_PANEL_PASS=true
V3R3_05_REAL_ZOOM_PASS=true
V3R3_06_REGRESSION_SMOKE_PASS=true
FORCED_COLORS_MANUAL_VALIDATION=not_executed_nonblocking
LOCAL_CADDY_PARTIALCHAIN=observed_nonblocking_unrelated
VISUAL_IDENTITY_FOUNDATION_SHELL_COMPLETE=true
VI_4_STARTED=false
VI_4_READY_TO_START=true
POST_VI3R3_USER_GLOBALS_CSS_DIRTY=true
POST_VI3R3_USER_GLOBALS_CSS_INTENTIONAL=true
POST_VI3R3_USER_GLOBALS_CSS_INCLUDED_IN_ACCEPTANCE=false
POST_VI3R3_USER_GLOBALS_CSS_MODIFIED_BY_TASK=false
POST_VI3R3_USER_GLOBALS_CSS_CLASSIFIED=false
```

### 18.6 Bounded post-VI.3R3 pre-VI.4 shell refinement — implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED`. This is one bounded post-checkpoint shell
stabilization; it does not reopen, amend, or replace the VI.3R3 acceptance
evidence in section 18.5.

- `.user-panel-section` now uses `padding: 0 var(--space-2) var(--space-2)`.
  It retains the accepted primary wrapper background, elevated UserPanel,
  12px UserPanel radius, shell depth, controls, Voice ownership and scrollbar
  behavior. No new literals, border, shadow, color, radius or `!important`
  declaration was introduced.
- The scoped shell/navigation/member-panel checks passed (3 suites, 47 tests),
  as did Web typecheck and lint with only the repository's pre-existing lint
  warnings. Real-browser 100%/125%/150% coverage belongs to the later VI.4
  visual checkpoint; this refinement does not create a separate publication or
  manual-acceptance checkpoint.
- The intentional `.composer`, `.channel-type-options label`, and
  `.private-channel-preset` working-tree changes remain uncommitted VI.4 input.
  The later channel-type slice must remove its stale checked-state
  `border-color` while preserving selected fill and native radio state.

```text
VI_3R3_ACCEPTED=true
VI_3R3_REOPENED=false
PRE_VI4_SHELL_REFINEMENT_IMPLEMENTED=true
PRE_VI4_USER_PANEL_INSET=var(--space-2)
VISUAL_IDENTITY_FOUNDATION_SHELL_COMPLETE=true
POST_VI3R3_COMPOSER_CHANGE_PENDING_VI4=true
POST_VI3R3_CHANNEL_TYPE_CHANGE_PENDING_VI4=true
POST_VI3R3_PRIVATE_PRESET_CHANGE_PENDING_VI4=true
VI_4_STARTED=false
VI_4_READY_TO_START=true
```

## 19. VI.4 Messaging & Management — first bounded slice implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. VI.4 formally starts with this bounded visual slice;
the broader Messaging & Management phase is not complete or accepted.

- `.composer` now uses `padding: 0 var(--space-2) var(--space-2)`, consuming the
  approved compact outer-inset input while leaving Composer internals, sending,
  paste/file handling, disabled behavior and scroll ownership unchanged.
- `.channel-type-options label` is genuinely borderless. The selected
  `var(--bg-tertiary)` fill, hover fill, native checked radio, label association
  and global `:focus-visible` foundation remain intact. The checked-state
  `border-color` that became inert after border removal was deleted; no shadow,
  glow, gradient or replacement outline was added.
- `.private-channel-preset` retains its tertiary surface, radius, spacing,
  checkbox hierarchy and conditional target fieldset while removing the
  redundant outer border. No replacement shadow or gradient was added.
- Source/cascade sanity confirmed no new horizontal-overflow owner, no component
  or modal-structure change, stable label padding/gap geometry without a
  state-dependent border, preserved modal foundation, and zero new `!important`
  declarations. Real-browser VI.4 validation remains pending.
- Focused Web Jest passed **13 suites / 161 tests**, zero snapshots. Full Web
  Jest passed **32 suites / 527 tests**, zero snapshots. Web typecheck passed;
  lint passed with zero errors and 87 pre-existing warnings; `git diff --check`
  passed.
- Only `apps/web/src/app/globals.css` and the three authorized status documents
  changed. API, realtime, WebRTC, Presence, schema and migrations are unchanged;
  `docs/design/` remained untracked and untouched. No image publication, runtime
  change or deployment occurred.

```text
VI_3R3_ACCEPTED=true
VI_3R3_CHECKPOINT_COMPLETE=true
VI_3R3_REOPENED=false
VI_4_STARTED=true
VI_4_IMPLEMENTATION_IN_PROGRESS=true
VI_4_COMPLETE=false
VI_4_ACCEPTED=false
VI_4_FIRST_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_FIRST_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI_4_MANUAL_VALIDATION_PENDING=true
VI4_COMPOSER_COMPACT_INSET=true
VI4_CHANNEL_TYPE_OUTLINE_REMOVED=true
VI4_CHANNEL_TYPE_STALE_BORDER_COLOR_REMOVED=true
VI4_PRIVATE_PRESET_OUTLINE_REMOVED=true
POST_VI3R3_COMPOSER_CHANGE_PENDING_VI4=false
POST_VI3R3_CHANNEL_TYPE_CHANGE_PENDING_VI4=false
POST_VI3R3_PRIVATE_PRESET_CHANGE_PENDING_VI4=false
NEW_IMPORTANT_DECLARATIONS=0
```

## 20. VI.4 Messaging & Management — second bounded slice implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. This second bounded slice owns only existing message
rows/actions, inline edit, attachments and `MessageDeleteModal` presentation.
Server Settings, Roles, Invites, permissions and Channel/Category management
polish remain unstarted in this task; VI.4 remains incomplete and unaccepted.

- Message rows remain dense, borderless timeline rows on `--bg-chat`. Existing
  horizontal geometry is retained, list padding is concentrated vertically, and
  the restrained tertiary hover treatment also applies during `:focus-within`
  without changing dimensions. Author weight/size leads primary message content;
  timestamp and edited metadata use the muted small-text role. Multiline and long
  content now preserve line breaks and wrap within the row.
- Existing Edit/Delete actions remain real buttons with unchanged permission,
  pending and Shift+Delete behavior. Semantic visual hooks keep them quiet at
  rest, reveal them on hover and keyboard focus-within, and give focused/hovered
  Delete a restrained danger treatment. Inline edit retains Enter/Escape behavior
  while using the accepted primary/secondary button hierarchy and a shrink-safe
  tokenized input.
- Existing file attachments keep the same authorized download URL and native
  download link. Filename and size metadata now have explicit hooks, long names
  wrap safely in a `minmax(0, 1fr)` layout, and the neutral attachment surface is
  bounded by existing tokens. Image attachments remain image-first and now use
  `object-fit: contain` so the preview is not cropped; no lightbox or new media
  behavior was introduced.
- Pending files use a shrink-safe grid with accessible named removal buttons.
  Existing upload error text is now an alert with a named dismissal control;
  upload, paste, removal and failure state ownership are unchanged.
- The Message Delete surface reuses the accepted primary modal, subtle boundary,
  elevated shadow, danger button and global focus foundation. Its warning,
  preview hierarchy, long content and attachment list were refined with existing
  tokens. The authoritative approximately 400px cap, viewport max-height, inner
  content scrolling, reachable footer actions, focus trap/return and lifecycle
  are unchanged. `UI-F4-DELETE-MODAL-SIZING-01` was not reopened or marked fixed.
- Focused Web Jest passed **5 suites / 68 tests**, zero snapshots. Full Web Jest
  passed **32 suites / 530 tests**, zero snapshots. Web typecheck passed; lint
  passed with zero errors and 87 pre-existing warnings; `git diff --check` passed.
  Three focused assertions protect the existing download path/filename hooks,
  accessible pending/error controls and inline-edit keyboard/action hierarchy.
- No usable local Web runtime was already available at `127.0.0.1:3000`, and the
  runtime was not started or mutated. `REAL_BROWSER_VALIDATION=not_executed_pending`;
  real 100%/125%/150% checks remain for the later VI.4 manual checkpoint.
- Production changes are limited to `apps/web/src/app/globals.css` and
  `apps/web/src/components/layout/ChatArea.tsx`; the focused test file is
  `apps/web/src/__tests__/message-delete.test.tsx`. API, realtime, sender state,
  WebRTC, Presence, schema, migrations and attachment/delete lifecycle are
  unchanged. `docs/design/` remains untracked and untouched; no image publication,
  runtime change or deployment occurred.

```text
VI_3R3_ACCEPTED=true
VI_3R3_REOPENED=false
VI_4_STARTED=true
VI_4_IMPLEMENTATION_IN_PROGRESS=true
VI_4_COMPLETE=false
VI_4_ACCEPTED=false
VI_4_FIRST_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_FIRST_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI_4_SECOND_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_SECOND_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI_4_MANUAL_VALIDATION_PENDING=true
VI4_MESSAGE_ROWS_REFINED=true
VI4_MESSAGE_ACTIONS_REFINED=true
VI4_MESSAGE_ACTIONS_FOCUS_ACCESSIBLE=true
VI4_INLINE_EDIT_VISUAL_REFINED=true
VI4_ATTACHMENTS_REFINED=true
VI4_LONG_FILENAME_CONTAINMENT_PASS=true
VI4_IMAGE_ATTACHMENT_BEHAVIOR_PRESERVED=true
VI4_ATTACHMENT_LIFECYCLE_CHANGED=false
VI4_DELETE_SURFACE_REFINED=true
VI4_DELETE_LIFECYCLE_CHANGED=false
VI4_COMPOSER_COMPACT_INSET=true
VI4_COMPOSER_BEHAVIOR_CHANGED=false
CHAT_SCROLL_OWNERSHIP_CHANGED=false
MESSAGE_STATE_OWNERSHIP_CHANGED=false
UI_MSG_SENDER_FLICKER_REMEDIATED=false
UI_F4_DELETE_MODAL_SIZING_DEBT_REOPENED=false
NEW_IMPORTANT_DECLARATIONS=0
REAL_BROWSER_VALIDATION=not_executed_pending
```

## 21. VI.4 Messaging & Management — third bounded slice implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. This third bounded slice completes the production
implementation described by the current VI.4 contract. Publication, immutable
candidate verification and the real-browser checkpoint remain required, so VI.4
is not yet complete or accepted.

- The shared Settings Layer keeps its accepted full-workspace ownership,
  capability-aware navigation, close/focus behavior, section scroll reset and
  independent sidebar/content scrolling. Feature content now has a consistent
  heading rhythm, compact form spacing, shrink-safe feedback and the same
  restrained selected marker already established by VI.2.
- Server Overview, Roles, conditional Member Moderation, Invites, Audit Log and
  owner-only Delete retain their existing fields, gates and actions. Ordinary
  Role, Member, Invite and Audit entries are dense separator rows without card
  borders or elevation. Persisted Role colors remain dynamic inline data;
  protected Roles now also carry visible text, and destructive emphasis stays on
  the relevant action or bounded danger section.
- Invite People remains the fast `CREATE_INVITE` copy surface. Invite
  Administration remains the denser `MANAGE_SERVER` inventory with compact
  policy grouping, long-link/code containment, visible Active/Expired/Exhausted/
  Revoked text and success/warning/danger semantics. Copy fallback, lifecycle,
  ordering, usage/expiration truth and confirmed revoke behavior are unchanged.
- Channel and Category Overview/Permissions/Delete sections retain immutable
  Channel type, rename/move behavior, Category child survival, capability gates
  and source transitions. Existing source information is presented as a quiet
  neutral inset rather than another nested card; Sync/Unsync confirmation and
  backend-owned transitions are unchanged.
- `PermissionOverwriteEditor` keeps Role/Member ordering, protected targets,
  grant ceiling and raw `DENY / NEUTRAL / ALLOW` semantics. Target and picker-tab
  selection now expose `aria-pressed`; the tri-state choices remain native
  buttons with symbols, accessible names, pressed state, keyboard/focus behavior
  and distinct danger/neutral/success outlines. The legacy management cascade
  workarounds were replaced by scoped semantic selectors: zero new `!important`
  declarations were added and the stylesheet total fell from 30 to 4. No new
  gradient consumer was introduced.
- Static inline cleanup was limited to the three Server Settings feedback-dismiss
  controls and the Role Delete color; dynamic persisted Role color remains inline.
  Long resource/Role/member/invite/permission names use bounded wrapping or
  truncation without changing any scroll owner.
- Focused Web Jest passed **10 suites / 125 tests**, zero snapshots. Full Web Jest
  passed **32 suites / 530 tests**, zero snapshots. Web typecheck passed; lint
  passed with zero errors and the unchanged 87 warnings; `git diff --check`
  passed.
- No usable authenticated Web runtime was already available at
  `127.0.0.1:3000`; no runtime was started or mutated.
  `REAL_BROWSER_VALIDATION=not_executed_pending`. The 100%/125%/150% browser
  checkpoint remains part of the consolidated candidate acceptance.
- Final Likecord UI review: **KEEP** the dense neutral rows, localized semantic
  emphasis, explicit hierarchy text and symbol-plus-pressed tri-state controls;
  **WATCH** long names/URLs and dense permission matrices at real browser zoom
  during the manual checkpoint, without creating a new backlog item;
  **SYSTEMIZE** none, because existing VI.2 tokens/primitives cover the result.
- Coverage reconciliation found no current contract-owned VI.4 production surface
  remaining after slices 1–3. API, realtime, permission calculations, Role
  hierarchy, invite/channel/category lifecycle, WebRTC, Voice, Screen Share,
  Presence, schema and migrations are unchanged. F5/F6/F7 and Member/Voice remain
  frozen. `docs/design/` remains untracked and untouched; no publication,
  deployment or image/runtime change occurred.

```text
VI_3R3_ACCEPTED=true
VI_3R3_REOPENED=false
VI_4_STARTED=true
VI_4_IMPLEMENTATION_IN_PROGRESS=true
VI_4_FIRST_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_FIRST_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI_4_SECOND_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_SECOND_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI_4_THIRD_BOUNDED_SLICE_IMPLEMENTED=true
VI_4_THIRD_BOUNDED_SLICE_AUTOMATED_VALIDATION_PASS=true
VI4_SERVER_SETTINGS_REFINED=true
VI4_ROLES_REFINED=true
VI4_MEMBERS_MANAGEMENT_REFINED=true
VI4_INVITE_PEOPLE_REFINED=true
VI4_INVITE_ADMIN_REFINED=true
VI4_CHANNEL_SETTINGS_REFINED=true
VI4_CATEGORY_SETTINGS_REFINED=true
VI4_PERMISSION_EDITOR_REFINED=true
VI4_TRI_STATE_SEMANTICS_PRESERVED=true
VI4_REMAINING_IMPLEMENTATION_SCOPE=none
VI_4_IMPLEMENTATION_COMPLETE=true
VI_4_AUTOMATED_VALIDATION_PASS=true
VI_4_MANUAL_VALIDATION_PENDING=true
VI_4_COMPLETE=false
VI_4_ACCEPTED=false
NEW_IMPORTANT_DECLARATIONS=0
NEW_GRADIENT_USAGE=0
REAL_BROWSER_VALIDATION=not_executed_pending
```

## 22. VI.4R — User-Directed Final Surface Reconciliation — implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. The immutable pre-refinement VI.4 candidate at source
`web jest execution milestone` and OCI index
`sha256:88c147465be25967434f7f2390595f39d100e255b8013c21677275cb116b089a`
passed V4-01 through V4-12, real zoom at 100%/125%/150% and the V4-14 functional
smoke. That PASS remains valid historical evidence for that candidate. It is not
reclassified as a failure and does not accept the subsequently refined source.

After that checkpoint, the user accepted one exact final surface composition:

- `--bg-rail` aliases `--bg-secondary`; `.server-rail` retains semantic
  ownership through `var(--bg-rail)`.
- `--bg-chat` aliases `--bg-tertiary`; `.message-list` retains semantic ownership
  through `var(--bg-chat)`.
- Channel Sidebar, Channel Header and Settings Layer Sidebar use
  `var(--bg-secondary)`.
- App Shell Header, Chat Header, Main Content, Member Panel and Settings Layer
  Main use `var(--bg-tertiary)`.
- `.user-panel-section` is transparent, superseding the earlier accepted primary
  wrapper paint while preserving its compact inset, the elevated 12px UserPanel
  and shell/Voice ownership.
- The shared `.btn` / `.sm-btn` / `.danger-button` / auth-button base uses
  `border: 0`; intentionally scoped control borders remain independent. The
  global tokenized `:focus-visible` outline and forced-colors fallback remain
  unchanged.

The change adds no background literal, gradient, shadow, visual token or
`!important`. Header height remains 48px; no width, padding, flex/grid, overflow,
scroll owner, route or component structure changed. Focused Web Jest passed
**11 suites / 152 tests**, zero snapshots. Full Web Jest passed **32 suites / 530
tests**, zero snapshots. Web typecheck passed; lint passed with zero errors and
the unchanged 87 warnings; `git diff --check` passed.

Static source/cascade inspection found no unexpected overriding selector. The
Likecord UI review keeps the deliberate secondary/tertiary depth split, semantic
aliases, transparent wrapper over the accepted navigation composition, localized
variant borders and existing focus foundation. The final published candidate
still requires a targeted real-browser review for depth transitions, transparent
footer composition and borderless buttons; this `WATCH` is pending evidence, not
a new backlog item. `SYSTEMIZE` is the use of the existing semantic surface and
focus tokens; no new token or primitive is justified.

No image was built or published and no Docker, Compose, API or Web runtime was
changed. API, realtime, Voice/WebRTC, Screen Share, Presence, permissions, schema
and migrations remain unchanged. F5/F6/F7, Member/Voice convergence and VI.3R3
remain frozen. The next action is to publish exactly one immutable VI.4R Web
candidate from the resulting commit, replace only the local Web runtime by
digest, and perform the targeted final manual visual recheck before formal VI.4
acceptance.

```text
VI_4_PRE_REFINEMENT_MANUAL_CHECKPOINT_PASS=true
VI_4R_STARTED=true
VI_4R_IMPLEMENTED=true
VI_4R_AUTOMATED_VALIDATION_PASS=true
BG_RAIL_ALIAS=var(--bg-secondary)
BG_CHAT_ALIAS=var(--bg-tertiary)
USER_PANEL_SECTION_BACKGROUND=transparent
USER_PANEL_SECTION_BACKGROUND_SUPERSEDED_BY_USER=true
SHARED_BUTTON_GENERIC_BORDER_REMOVED=true
FOCUS_VISIBLE_PRESERVED=true
HEADER_GEOMETRY_CHANGED=false
SCROLL_OWNERSHIP_CHANGED=false
NEW_BACKGROUND_LITERAL_COLORS=0
NEW_GRADIENT_USAGE=0
NEW_SHADOW_USAGE=0
NEW_IMPORTANT_DECLARATIONS=0
VI_4_IMPLEMENTATION_COMPLETE=true
VI_4_AUTOMATED_VALIDATION_PASS=true
REAL_BROWSER_VALIDATION_FOR_VI4R=not_executed_pending
VI_4_MANUAL_VALIDATION_PENDING=true
VI_4_COMPLETE=false
VI_4_ACCEPTED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
```

## 22.1 VI.4R2 — Invite Administration toolbar micro-refinement — implemented 2026-09-05

`DECISION_ACCEPTED / IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PASS`. Após o recheck manual direcionado completo de VI.4R,
o usuário solicitou uma única micro-refinação na superfície de administração de
convites: `.invite-admin-toolbar` agora usa `var(--bg-tertiary)` e não possui mais
`border-bottom: 1px solid var(--border-subtle)`. A geometria, espaçamento,
hierarquia funcional, lifecycle de convites, permissões e scroll permanecem
inalterados; nenhum literal, gradiente, sombra ou `!important` foi adicionado.

As suítes focadas de Invite Administration e composição passaram (2 suítes / 14
testes, zero snapshots). A revisão Likecord UI mantém a integração da superfície
terciária (`KEEP`), não identifica `SYSTEMIZE`; a confirmação visual do artefato
passou em 100%/125%/150%, após publicação e troca local somente do Web. VI.4 está
completo e aceito.

```text
VI_4R2_STARTED=true
VI_4R2_IMPLEMENTED=true
VI_4R2_AUTOMATED_VALIDATION_PASS=true
INVITE_ADMIN_TOOLBAR_BACKGROUND=var(--bg-tertiary)
INVITE_ADMIN_TOOLBAR_BOTTOM_BORDER_REMOVED=true
TOOLBAR_GEOMETRY_CHANGED=false
VI_4_MANUAL_VALIDATION_PENDING=false
VI_4_MANUAL_VALIDATION_PASS=true
VI_4_COMPLETE=true
VI_4_ACCEPTED=true
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
```

## 23. VI.4 formal acceptance — recorded 2026-09-05

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS / COMPLETE /
ACCEPTED`. O candidato Web imutável VI.4R2 foi publicado, implantado no runtime
local Docker Compose e validado no navegador pela toolbar de Invite Administration
em zoom real de 100%, 125% e 150%, sem observações. A API local foi preservada
exatamente (`API_RECREATED=false`, `API_CHANGED=false`); não houve ação de
produção, runtime, Prisma, migração ou banco nesta etapa de aceite.

```text
VI_4_IMPLEMENTATION_IN_PROGRESS=false
VI_4_IMPLEMENTATION_COMPLETE=true
VI_4_AUTOMATED_VALIDATION_PASS=true
VI_4_MANUAL_VALIDATION_PENDING=false
VI_4_MANUAL_VALIDATION_PASS=true
VI_4_COMPLETE=true
VI_4_ACCEPTED=true
VI_4_ACCEPTED_SOURCE_MILESTONE=invite admin toolbar surface milestone
VI_4_ACCEPTED_OCI_INDEX=sha256:93bc6fb5c360f4e5c3491aab581e3910ad0a00a309dfbe73b561e2c32233f8ec
VI_4_ACCEPTED_APPLICATION_MANIFEST=sha256:ff93501d58d294d478b08d2435f94fc049b35065149c07fbc2574d5837ccf4ee
VI_4_ACCEPTED_ATTESTATION_MANIFEST=sha256:295ccfaf799d3722f8b602bf4539c210cc1420a24921c446a708722f43d6a883
VI_4_ACCEPTED_PLATFORM=linux/amd64
VI_4_ACCEPTED_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:93bc6fb5c360f4e5c3491aab581e3910ad0a00a309dfbe73b561e2c32233f8ec
VI_4R_MANUAL_RECHECK_PASS=true
VI_4R2_MANUAL_VALIDATION_PASS=true
VI4_REMAINING_IMPLEMENTATION_SCOPE=none
UI_MSG_SENDER_FLICKER_REMEDIATED=false
UI_F4_DELETE_MODAL_SIZING_DEBT_REOPENED=false
VI_5_STARTED=false
VI_5_READY_TO_START=true
PRODUCTION_SOURCE_CHANGED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
```

The marker block above is the immutable VI.4 acceptance snapshot; its
`VI_5_STARTED=false` value records that earlier gate and is superseded for
current VI.5 status by section 25.

O aceite não reabre VI.4 para polish adicional: somente regressão material
reprodutível, evidência que invalide o aceite ou novo requisito explícito pode
reabrir este trabalho. Preferências visuais futuras pertencem à fase própria ou
a um novo refinamento versionado. F5, F6, F7, Member/Voice e VI.3R3 permanecem
congelados; `UI-MSG-SENDER-FLICKER-01` e `UI-F4-DELETE-MODAL-SIZING-01` continuam
como dívidas separadas. À data desse aceite, VI.5 — Voice & Screen Share era a
próxima fase e ainda não havia iniciado.

## 24. VI.5 Voice & Screen Share preflight — completed 2026-09-05

`PREFLIGHT_COMPLETE / CAN_START_IMPLEMENTATION / PRODUCTION_NOT_STARTED`.
This read-only production audit reconciles the executable VI.5 plan. It does
not implement a visual slice, run tests, open a browser, publish an image or
change runtime. VI.4 remains accepted and frozen at source
`invite admin toolbar surface milestone` and OCI index
`sha256:93bc6fb5c360f4e5c3491aab581e3910ad0a00a309dfbe73b561e2c32233f8ec`.

The accepted boundary is presentation-only. `useVoice`,
`useVoiceOccupancy`, `useVoicePersonalMix`, `useMemberContext`, WebRTC,
signaling, permissions, Presence, participant synchronization, Screen Share
subscriptions and media/audio lifecycle remain frozen functional owners. The
exact visual treatment inside each slice remains subject to implementation
review; this preflight does not convert optional mockup ideas into requirements.

- `DECISION_ACCEPTED`: the user-specified frozen functional, media, Presence,
  responsive, milestone and runtime boundaries recorded in this task.
- `PROPOSED_EXECUTION_PLAN`: the two bounded slices and their candidate visual
  refinements below. They are implementation-ready sequencing, not accepted
  production appearance or new product behavior.
- `IMPLEMENTED`: documentation reconciliation only; no VI.5 production slice.

### 24.1 Authorities and actual production ownership

Current authorities inspected: this contract, the UI/UX roadmap, `AI_CONTEXT.md`,
the frozen F6 Voice contract, the frozen Member/Voice convergence contract, the
permission model and the observational Screen Share audio cardinality runbook.
Actual production source was inspected directly; historical component names were
not assumed.

| Surface / owner | Actual production path | State classification | VI.5 boundary |
|---|---|---|---|
| Persistent composition | `apps/web/src/app/app/page.tsx` (`AppContent`) and `apps/web/src/app/channels/layout.tsx` | `DOMAIN_STATE`, `REALTIME_STATE`, `WEBRTC_MEDIA_STATE` composition | Preserve one mounted Voice owner, route keys, share mapping and MemberPanel/workspace composition. Mark any required restructuring `STOP_BOUNDARY`. |
| Voice/media orchestrator | `apps/web/src/hooks/useVoice.ts` | `REALTIME_STATE`, `WEBRTC_MEDIA_STATE`, `SERVER_AUTHORITY` acknowledgements | Read-only dependency. No VI.5 logic, sink, track, peer, negotiation, join/leave, mute/deafen, subscription or cleanup edits. |
| Observer occupancy | `apps/web/src/hooks/useVoiceOccupancy.ts` | `REALTIME_STATE`, `SERVER_AUTHORITY` | Read-only dependency. Preserve filtered snapshots, invalidation and observer/no-media behavior. |
| Personal mix | `apps/web/src/hooks/useVoicePersonalMix.ts` | `DOMAIN_STATE`, `SERVER_AUTHORITY` persistence | Read-only dependency. Preserve one 0–100 account-pair owner and CALL/MIC-only application. |
| Shared member context | `apps/web/src/hooks/useMemberContext.ts`, `apps/web/src/lib/memberContextActions.ts` | `UI_INTERACTION`, `DOMAIN_STATE`, `REALTIME_STATE`, `SERVER_AUTHORITY` | Preserve action order, eligibility, stale-state closure, IDs and confirmations. |
| Voice Channel and participant rows; Live Streams list | `apps/web/src/components/layout/ChannelSidebar.tsx` | `UI_INTERACTION` plus rendered `DOMAIN_STATE`/`REALTIME_STATE` | Styling/classes and bounded presentation markup only. Collapse, join/leave, observer rows, speaking gates, context invocation and stream callbacks stay unchanged. |
| Connected/local controls | `apps/web/src/components/layout/UserPanel.tsx` | local menu `UI_INTERACTION`; Voice props are `DOMAIN_STATE`/`WEBRTC_MEDIA_STATE` | Style existing connected, mute, deafen, leave and start/stop/pending share states. Do not change callbacks, status semantics or the Presence menu. |
| Member entry to conditional Voice controls | `apps/web/src/components/layout/MemberPanel.tsx` | `UI_INTERACTION`, rendered `DOMAIN_STATE`/Presence state | Shared owner/trigger only. Do not restyle or reinterpret Presence groups in VI.5. |
| Mixed Member/Voice surface | `apps/web/src/components/member/MemberContextSurface.tsx`, `apps/web/src/components/voice/VoiceParticipantPopover.tsx` | `UI_INTERACTION`, `DOMAIN_STATE`, `SERVER_AUTHORITY` status | Refine existing visual hierarchy, native range/checkbox, statuses and actions. Preserve specialized dialog semantics, positioning/focus, eligibility and no-reset boundary. |
| Viewer presentation | `apps/web/src/components/layout/ScreenShareViewerWorkspace.tsx` | presentation maps/modes are `VISUAL_LOCAL` and `UI_INTERACTION`; streams are `WEBRTC_MEDIA_STATE` | Style existing Gallery/Focus/CENTRAL/DETACHED/HIDDEN presentation. `onPresentationChange` controls HIDDEN audio policy, so mode logic is frozen. |
| Presenter preview | `apps/web/src/components/layout/ScreenSharePresenterCard.tsx` | visual disclosure `UI_INTERACTION`; stream/viewers are `WEBRTC_MEDIA_STATE`/`REALTIME_STATE` | Systemize static appearance only; preserve one preview, stream prop and authoritative viewer projection. |
| Visual player | `apps/web/src/components/layout/ScreenStreamVideo.tsx` | `WEBRTC_MEDIA_STATE` | `LEAVE_AS_IS`: preserve `srcObject` effect, cleanup, `autoPlay`, `playsInline` and `muted`. |
| Shared primitives | `apps/web/src/components/ui/Tooltip.tsx`, `ContextMenu.tsx`, `ConfirmModal.tsx`, `icons.tsx` | `UI_INTERACTION`, `VISUAL_LOCAL` | Reuse current VI.2 primitives/icons. No generic primitive rewrite is justified. |
| Styling | `apps/web/src/app/globals.css` | `VISUAL_LOCAL` | Primary VI.5 implementation owner; scoped selectors and existing tokens only. Preserve layout/overflow owners. |

### 24.2 Current Voice inventory and visual targets

Only states present in current source are in scope. `VoiceState.status` has
`disconnected`, `connecting`, `connected` and `failed`, and `error` exists in
the hook, but ordinary UI renders only absence/presence of the connected panel;
connecting/failed/error are not normal production visual surfaces. VI.5 must not
invent them. The debug-only status panel remains outside visual production scope.

| Existing state/surface | Current presentation and semantics | Target |
|---|---|---|
| Disconnected / channel available | No connection row; Voice Channel remains a compact navigation/action row | `KEEP`; no new disconnected card or status model |
| CONNECT denied | Native disabled Voice Channel button, explicit accessible label and title | `KEEP`; permission behavior remains authoritative |
| Connected Channel | Active row uses success text/inset; UserPanel shows channel name and `Voice Connected` | `KEEP` success; `REFINE` density/hierarchy without changing detection |
| Quality/status | Three-bar icon uses a simulated `45ms` value and semantic color | `OUT_OF_SCOPE` functionally; VI.5 must not claim real telemetry |
| Observer participant | Metadata-only row with identity and mute/deafen icons; no speaking/media | `KEEP`; preserve privacy and no-media semantics |
| Same-call participant | Same row plus static speaking ring; accessible label distinguishes states | `KEEP` state model; `REFINE` ring/token consistency only, never timing |
| Local mute / server mute | Mic-off icon and `.active` color; row has non-color icon/label | `REFINE` control clarity; preserve local/server distinction and callbacks |
| Local deafen | Headphones-off icon and `.active` color | `REFINE` visual clarity only; preserve state machine |
| Leave Voice | Compact icon action with danger color/hover | `REFINE` accessible name and danger treatment; callback unchanged |
| Participant interaction | Focusable row opens specialized mixed dialog by mouse/keyboard | `KEEP` interaction; `REFINE` hierarchy and focus visibility |
| Personal volume/local mute | Native range/output/checkbox with loading/saving/error/Retry | `KEEP` semantics; `REFINE` tokens, spacing and status readability |
| Roles/server/utility actions | Shared context rows and ConfirmModal, authority-gated | `KEEP`; visual alignment only |
| Voice errors/device feedback/empty/pending | No ordinary visual surface currently rendered | `OUT_OF_SCOPE`; do not invent states or device selection |

Current Voice selectors include `.voice-channel-btn`,
`.voice-channel-members`, `.voice-channel-member`, `.voice-member-avatar`,
`.voice-member-icons-sm`, `.voice-participant-popover`,
`.voice-participant-mix`, `.voice-participant-volume-heading`,
`.voice-participant-local-mute`, `.user-panel*` and `.voice-connection*`.
The old `.voice-panel`, `.voice-status*`, `.voice-members`, `.voice-btn` family
has no current production component consumer and is not a VI.5 cleanup target.

### 24.3 Current Screen Share inventory and visual targets

| Existing state/surface | Current presentation and semantics | Target |
|---|---|---|
| Start control | UserPanel icon action while in Voice | `REFINE` existing control only; no new control model |
| Starting/stopping | Disabled control with state-specific accessible label and icon | `KEEP` behavior; `REFINE` pending affordance only |
| Active local share / stop | Danger-tinted `LIVE` control invokes existing stop callback | `REFINE` semantic clarity; no new lifecycle |
| Live Streams discovery | Sidebar lists all shares; remote toggles Join/Leave; own shows viewers | `REFINE` inline appearance into classes; preserve opt-in/callbacks |
| Stream notice | Restrained `role=status` viewer join/leave text | `KEEP`; tokenize static appearance only |
| Local preview | Absolute top-right card with `Your screen`, LIVE, muted preview and viewer disclosure | `REFINE` compact chrome/depth; no collapse/promote behavior |
| Remote central viewer | Workspace replaces children; muted visual player or waiting copy | `REFINE` chrome/media framing; preserve mount and one player/share |
| Gallery | Existing one-to-four grid | `KEEP` organization; do not alter layout ownership |
| Focus | Primary plus scrollable 16:9 secondary rail; double-click focuses | `KEEP` behavior; `REFINE` selected/control hierarchy |
| DETACHED | One absolute bottom-right target, fixed media height and Leave | `REFINE` with existing elevation token; no drag/resize/fullscreen |
| HIDDEN | Hidden count/summary and reopen; controls local screen-audio policy | `KEEP`; high-risk functional boundary, not a cosmetic new mode |
| Multiple presenters | Independent shares/subscriptions/viewers/target switching | `KEEP`; no grouping or lifecycle redesign |
| Track waiting/disappearance | Waiting text; effects clean stale presentation state | `KEEP`; cleanup logic untouched |
| Shared-audio controls/state | Internal state exists; no production controls rendered | `OUT_OF_SCOPE`; do not expose volume/mute UI |
| Fullscreen/expanded mode | Not implemented | `OUT_OF_SCOPE`; optional roadmap idea is not a requirement |
| STREAM-denied UI / explicit errors | No distinct production surface currently rendered | `OUT_OF_SCOPE` for these slices; do not invent missing states |

Current selectors are the `.screen-share-*` and `.screen-stream-video` families.
There is no gradient or neon treatment in these owners.

### 24.4 Media/layout ownership and STOP boundaries

`AppContent` owns one persistent `ScreenShareViewerWorkspace` around Home/chat;
`.app-layout`, `.app-workspace`, `.app-workspace-body` and `.main-content` own the
100dvh/flex/min-size/root-overflow chain. The workspace owns hidden overflow;
its central grid/gallery own the remaining workspace. Focus owns a flex primary
plus a `clamp(220px, 28%, 340px)` secondary rail; only secondary media declares
`aspect-ratio:16/9`. The 800px query stacks gallery/focus but is not authority
for broad mobile information architecture.

Every visual `<video>` owns `width/height:100%`, `object-fit:contain`, a black
media bed and muted playback. DETACHED owns an absolute bottom-right card,
`width:min(320px, calc(100% - 2rem))` and 180px media height. Self preview owns
an absolute top-right slot, `width:min(230px, calc(100% - 2rem))`, and 120px
minimum media height. No fullscreen owner exists.

The following are `STOP_BOUNDARY`: changing `ScreenStreamVideo` effect/muted;
adding/removing/remounting visual or audio sinks; changing `object-fit:contain`;
changing share keys/subscriptions; altering CENTRAL/DETACHED/HIDDEN transitions
or audio semantics; changing AppContent/workspace mounting or root/workspace
scroll ownership; inventing fullscreen, MINIMIZED, self-preview behavior,
drag/resize/snap, new responsive IA, or any peer/track/sender/receiver lifecycle.
A reproducible functional regression also stops visual implementation.

### 24.5 Controls, accessibility, inline style and CSS/token audit

| Control | Classification | Finding |
|---|---|---|
| Voice Channel row | `PRIMARY_ACTION` within navigation | Native button/denied state are sound; preserve callbacks. |
| Participant row | `MENU_ACTION` | Keyboard/context accessible; specialized dialog is intentional. |
| UserPanel mute/deafen | `TOGGLE` + `ICON_ACTION` | Icon changes are non-color state; add direct accessible names and pressed state. |
| UserPanel leave | `DESTRUCTIVE_ACTION` + `ICON_ACTION` | Add its own accessible name; lifecycle unchanged. |
| Screen start/stop | `PRIMARY_ACTION` / `DESTRUCTIVE_ACTION` + `ICON_ACTION` | Existing labels/pending state are good; preserve one callback owner. |
| User Volume / local mute | `RANGE` / `TOGGLE` | Keep native 0–100 range, numeric output and checked checkbox. |
| Context actions | `MENU_ACTION` / `DESTRUCTIVE_ACTION` | Existing ContextMenu/ConfirmModal and authority are correct. |
| Join/Leave Stream | `PRIMARY_ACTION` / `DESTRUCTIVE_ACTION` | Native buttons; current semantic appearance is inline. |
| Grid/Focus/detach/minimize/reopen/switch | `SECONDARY_ACTION` / `ICON_ACTION` | Names/titles/focus mostly exist; no toolbar abstraction needed. |
| Viewer disclosure | `MENU_ACTION` (`details/summary`) | Keep native disclosure; verify keyboard/focus and long lists manually. |

`VISUAL_ACCESSIBILITY_REFINEMENT`: preserve native elements; use existing
focus/forced-colors/reduced-motion foundation; add direct accessible names and
`aria-pressed` where icon-only mute/deafen need it; keep non-color icons/text for
mute, deafen, speaking, connected and LIVE; verify range/checkbox/media controls
at real zoom. Tooltip text alone is not a programmatic name. These bounded
attributes need no lifecycle restructuring. A requested focus trap, different
keyboard model, new dialog/menu role or new media control is a
`FUNCTIONAL_ACCESSIBILITY_CHANGE` and stops the visual slice.

Static inline appearance classified `SAFE_TO_SYSTEMIZE_IN_VI5`:

- `ChannelSidebar`: Live Streams container/label/card/header, presenter/LIVE
  type, Join/Leave variants, viewer copy and stream notice;
- `UserPanel`: Leave danger color; the non-interactive camera placeholder is
  `LEAVE_AS_IS` and does not become a feature;
- `ScreenShareViewerWorkspace`: static `position:relative`;
- `ScreenSharePresenterCard`: card/header/viewer disclosure/list/media/waiting
  appearance.

`DYNAMIC_DATA_REQUIRED`: conditional classes for own/remote, subscribed,
live/pending and viewer data; state remains in React. `DYNAMIC_MEDIA_REQUIRED`
and `LEAVE_AS_IS`: popover `left/top`, Tooltip coordinates/transform, role colors,
media streams/srcObject and runtime state/geometry.

Material CSS candidates are limited to VI.5 selectors:

- replace repeated `#000` with `--bg-media`;
- map VI.5 4/5/6/8/10px one-off radii to `--radius-sm/md/lg` where roles match;
- use `--shadow-elevated` for DETACHED and `--shadow-low` for presenter preview;
  speaking/focus rings remain state, not decorative elevation;
- reuse existing background/border/text/semantic/spacing/type/focus/motion
  tokens; add no color, gradient, glow or control system;
- preserve dense unboxed Voice rows and avoid card-per-participant styling;
- no VI.5 selector owns `!important`; global reduced-motion declarations and
  unrelated permission selectors are not cleanup targets.

Current ContextMenu, ConfirmModal, Tooltip, native controls and icons are
sufficient. Local compact media controls may retain scoped classes with shared
tokens; forcing a new general primitive would add risk without a demonstrated gap.

### 24.6 Existing test map — not executed in preflight

Future implementation uses the package-declared harness only:
`pnpm --filter @likecord/web run test:ci -- <test-paths...>` focused and
`pnpm --filter @likecord/web run test:ci` full. No test ran in this planning task.
All suite names below are exact files under `apps/web/src/__tests__/`.

Voice coverage owners:

- `voice.test.tsx`: join/leave/permissions/mute; participant/speaking UI; Live
  Streams; start/stop/pending, preview and viewer list;
- `voice-speaking.test.ts`: threshold/attack/release, effective mute, identity,
  replacement and cleanup;
- `voice-occupancy.test.tsx`: observer/no-media, invalidation, permissions,
  reconnect and stale snapshot guards;
- `voice-personal-mix.test.tsx`: hydration/defaults/durability/failure/retry,
  serialization and account isolation;
- `voice-participant-popover.test.tsx`: mouse/keyboard, 0/intermediate/100,
  local mute, status/Retry, self, bounds/focus/stale lifecycle and authority;
- `context-menu.test.tsx`, `permission-management.test.tsx`,
  `member-list-realtime.test.tsx`, `layout.test.tsx`, `channel-structure.test.tsx`
  and `navigation.test.tsx`: shared actions/focus, authority, shell and persistence.

Screen Share coverage owners:

- `voice.test.tsx`: streams/opt-in/own-share, local lifecycle, viewer state and UI;
- `screen-share-presentation.test.tsx`: 1–4 Gallery, Focus, CENTRAL/DETACHED/HIDDEN,
  restore/switch, contain, one player, no subscription change and route persistence;
- `screen-share.test.ts`: classification, cancellation/error cleanup, senders and
  repeated start/stop;
- `black-screen.test.tsx`: remote video, one-sink ownership, HIDDEN, deafen,
  Leave/rejoin, selective transport, lifecycle and multi-presenter duplication;
- `chat-layout-scroll.test.tsx`, `navigation.test.tsx`, `layout.test.tsx`: return,
  persistent mounting and shell/layout boundary;
- `voice-diagnostics.test.ts`: observational cardinality only if a media
  regression appears, not a routine visual gate.

### 24.7 Likecord UI review

The repository UI-review skill was applied statically; no browser evidence is
claimed.

- `KEEP`: compact Voice rows; success connected state; static speaking ring;
  native mix controls; specialized mixed dialog; black contain media bed;
  Gallery/Focus/DETACHED/HIDDEN organization; scarce brand use; shared focus/
  reduced-motion; one player/sink ownership.
- `WATCH`: icon controls rely on tooltip text for names; mute/deafen use success
  color for a closed/disabled meaning; simulated quality looks authoritative;
  Live Streams/presenter preview have many inline one-offs; media headers/actions
  may pressure long names at 125–150%; radii/shadows can drift. These findings
  are not automatic backlog items.
- `SYSTEMIZE`: static Live Streams/presenter-card inline appearance, media black,
  radii/shadows and focus/spacing/type should reuse current tokens/scoped classes.
  No new token or general control system is justified.

### 24.8 Bounded implementation slices and validation

`PROPOSED_EXECUTION_PLAN`: exactly two sequential slices. Shared files are
genuine coupling, but work divides by surface; a third production slice would
add symmetry rather than independent shared value.

| Slice | Exact likely production files / surface | Untouched behavior | Focused tests and manual checkpoint | Risks / stop |
|---|---|---|---|---|
| `VI.5A — Voice presentation` | `ChannelSidebar.tsx` Voice rows; `UserPanel.tsx` connected/mute/deafen/leave; `MemberContextSurface.tsx`; `VoiceParticipantPopover.tsx`; scoped `globals.css` | Voice/occupancy/mix/member-context hooks; callbacks; speaking; authority; Presence; Screen Share surfaces | Focused: voice, speaking, occupancy, personal-mix, popover, context-menu, permission-management, member-list-realtime and layout suites. Manual: disconnected/denied/join/connected; observer/multiple users/speaking; mute/deafen; 0/intermediate/100/local mute; authority/leave/focus/keyboard/long content at 100/125/150%. | Shared cascade, local/server mute, observer/same-call, focus/bounds. Stop on logic/state refactor, Presence meaning, media/timing change or functional regression. |
| `VI.5B — Screen Share presentation and VI.5 reconciliation` | `ChannelSidebar.tsx` Live Streams; `UserPanel.tsx` share control; `ScreenShareViewerWorkspace.tsx`; `ScreenSharePresenterCard.tsx`; scoped `globals.css`. `AppContent`/`ScreenStreamVideo` stay read-only. | capture/signaling/permissions; tracks/senders/receivers; subscriptions/opt-in; cleanup; CENTRAL/DETACHED/HIDDEN audio; muted video; routes/scroll | Focused: voice, presentation, screen-share, black-screen, chat-layout-scroll, navigation and layout suites. Then one full Web Jest, typecheck, lint and diff check on final candidate. Manual: idle/start/pending/live/stop; preview/viewers; opt-in/Leave/rejoin/waiting/cleanup; 1/2/3/4, Gallery/Focus/DETACHED/HIDDEN; routes, long names, reachability and contain/no-crop at 100/125/150%. | Cardinality, HIDDEN audio, remount/subscription and overflow. Stop on AppContent/ScreenStreamVideo, new mode/control, object-fit/scroll owner or media regression. |

`VI5_SHARED_FINAL_SLICE_REQUIRED=false`. Slice B owns final reconciliation only
because it is already the second surface slice. The human checkpoint uses at
least two accounts/browsers where observer/presenter/viewer distinctions require
them. Broad mobile acceptance is not required; `UX-RESPONSIVE-01` remains separate.

### 24.9 Preserved functional debts and start decision

| Evidence/debt | Disposition |
|---|---|
| Full mute/deafen matrix | `PRESERVED_SEPARATE`; not fixed visually |
| Simulated quality, peer recovery, intermittent ICE auth | `PRESERVED_SEPARATE`; no telemetry/recovery claim |
| Username/UUID and server-mute-on-join | `PRESERVED_SEPARATE`; no masking or fix |
| Presence divergence / Voice idle | `PRESERVED_SEPARATE`; `PRESENCE_CHANGED=false` |
| Same-user multi-tab Voice | `OUT_OF_SCOPE`; no lifecycle redesign |
| Screen Share echo/duplication | `NOT_CURRENTLY_REPRODUCED`; current roadmap records real multi-device no-echo validation and diagnostics remain observational. Recurrence stops VI.5 as separate functional debt; this preflight does not newly mark it fixed. |
| Fullscreen/drag/resize/volume/mute/MINIMIZED/self-preview ideas | `OUT_OF_SCOPE`; proposals only |
| Responsive/mobile navigation | `OUT_OF_SCOPE`; desktop must not regress |

No material blocker was found. Scope, owners, boundaries, media/layout, tests,
manual checkpoint and two slices are clear. Thus
`VI_5_CAN_START_IMPLEMENTATION=true` while `VI_5_STARTED=false` at preflight
closure. Section 25 supersedes this historical start status after VI.5A.

Exact next action: implement only `VI.5A — Voice presentation`, beginning with
scoped class/token/accessibility refinement in the four listed presentation
components and `globals.css`; do not edit Voice hooks, WebRTC, Presence or Screen
Share presentation in that slice.

The following marker block is the immutable preflight snapshot. Current VI.5
implementation status and next action are owned by section 26; section 25
preserves the intermediate VI.5A closure.

```text
VI_4_COMPLETE=true
VI_4_ACCEPTED=true
VI_4_REOPENED=false
VI_5_STARTED=false
VI_5_PREFLIGHT_COMPLETE=true
VI_5_CAN_START_IMPLEMENTATION=true
VI5_VOICE_OWNERS_IDENTIFIED=true
VI5_SCREEN_SHARE_OWNERS_IDENTIFIED=true
VI5_VISUAL_FUNCTIONAL_BOUNDARY_CLEAR=true
VI5_MEDIA_LAYOUT_OWNERSHIP_CLEAR=true
VI5_TEST_MAP_COMPLETE=true
VI5_MANUAL_VALIDATION_PLAN_COMPLETE=true
VI5_PROPOSED_SLICE_COUNT=2
VI5_SHARED_FINAL_SLICE_REQUIRED=false
PRESENCE_CHANGED=false
VOICE_TRANSPORT_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_LIFECYCLE_CHANGED=false
PRODUCTION_SOURCE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
F5_REOPENED=false
F6_REOPENED=false
F7_REOPENED=false
MEMBER_VOICE_CONTEXT_MENU_REOPENED=false
VI_3R3_REOPENED=false
LIKECORD_UI_REVIEW_SKILL_APPLIED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATE_REQUIRED=true
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
NEXT_ACTION=implement_VI.5A_Voice_presentation_only
```

## 25. VI.5A Voice presentation — implemented 2026-09-05

This section preserves the VI.5A slice-closure snapshot. Section 26 supersedes
its then-current VI.5B status and next action.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PENDING`.
VI.5 has started, but is neither complete nor accepted. VI.4 remains frozen and
accepted. VI.5B Screen Share presentation has not started.

The production change is presentation-only:

- `ChannelSidebar.tsx` keeps the existing Voice Channel/occupancy projection and
  static success speaking ring, adds the existing Speaker icon as a non-color
  speaking cue, reserves a stable status-icon slot, and strengthens dense row,
  focus and long-name presentation without adding participant cards;
- `UserPanel.tsx` preserves the accepted VI.4 shell geometry and every callback,
  gives mute/deafen stable accessible names and `aria-pressed`, separates their
  neutral active treatment from success, gives Leave Voice an explicit name and
  scoped danger treatment, and visually de-emphasizes the unchanged simulated
  `45ms` value instead of presenting it as graded telemetry;
- the existing `VoiceParticipantPopover` markup, anchoring, focus and native
  range/checkbox remain unchanged while scoped `globals.css` rules align its
  hierarchy, spacing, typography, borders, overflow and Retry/status presentation
  to existing VI.1–VI.4 tokens; the Voice sections supplied by
  `MemberContextSurface` inherit that scoped refinement;
- `MemberPanel.tsx` was not materially involved and remains unchanged.

No Voice hook/action module changed: `useVoice`, `useVoiceOccupancy`,
`useVoicePersonalMix`, `useMemberContext` and `memberContextActions` remain the
frozen behavioral owners. Join/leave callbacks, mute/deafen state, speaking
detection, occupancy, personal-mix calculation/persistence, permissions,
Presence, realtime, WebRTC/media, root/layout/scroll ownership and Screen Share
presentation/lifecycle remain unchanged. Live Streams, the UserPanel Screen Share
control, `AppContent`, `ScreenShareViewerWorkspace`, `ScreenSharePresenterCard`
and `ScreenStreamVideo` were not restyled or edited.

The implementation adds no theme token, background literal, gradient, shadow or
`!important`. It reuses `--bg-*`, `--text-*`, `--border-*`, semantic colors,
spacing/type/radius/focus/motion tokens and the existing elevated popover shadow.
Static Leave color moved from inline style to the scoped
`.voice-leave-button`; runtime/dynamic styles remain untouched.

Automated evidence from the package-declared harness:

- focused command: `pnpm --filter @likecord/web run test:ci --
  src/__tests__/voice.test.tsx src/__tests__/voice-speaking.test.ts
  src/__tests__/voice-occupancy.test.tsx
  src/__tests__/voice-personal-mix.test.tsx
  src/__tests__/voice-participant-popover.test.tsx
  src/__tests__/context-menu.test.tsx
  src/__tests__/permission-management.test.tsx
  src/__tests__/member-list-realtime.test.tsx src/__tests__/layout.test.tsx
  src/__tests__/channel-structure.test.tsx src/__tests__/navigation.test.tsx`:
  **11 suites / 230 tests / 0 snapshots PASS**;
- full `pnpm --filter @likecord/web run test:ci`:
  **32 suites / 531 tests / 0 snapshots PASS**;
- Web typecheck PASS; Web lint PASS with **0 errors / 87 unchanged warnings**;
  `git diff --check` PASS.

No authenticated local Web listener was already available on the normal local
ports, so real-browser validation was not executed. This is the planned pending
manual checkpoint, not an automated-validation failure. The consolidated human
checkpoint remains after VI.5B on an immutable Web candidate.

Final Likecord UI review:

- `KEEP`: compact unboxed Voice rows, restrained connected success, static
  speaking ring, native personal-mix controls, specialized mixed dialog,
  accepted UserPanel shell depth and shared focus/reduced-motion foundation;
- `WATCH`: simulated `45ms` data remains product debt despite visual
  de-emphasis; the noninteractive camera placeholder and non-Voice User Settings
  naming remain outside this slice; 125–150% real-browser containment remains
  part of the consolidated manual checkpoint. These are not new backlog items;
- `SYSTEMIZE`: completed for Voice-owned static spacing/type/radius/focus and
  Leave styling through existing tokens/scoped classes. Live Streams and Screen
  Share card/media systemization remains owned by VI.5B.

Preserved separate debts remain the full mute/deafen validation matrix,
simulated quality/ICE recovery, Username/UUID, server-mute-on-join, Presence,
multi-tab Voice and Screen Share audio/optional features. This visual evidence
does not close or remediate them.

At VI.5A closure, the exact next action was to implement only `VI.5B — Screen Share presentation and VI.5
reconciliation` from section 24.8, preserving `AppContent`, `ScreenStreamVideo`,
media transport, subscriptions and CENTRAL/DETACHED/HIDDEN lifecycle semantics.

```text
VI_5_PREFLIGHT_COMPLETE=true
VI_5_STARTED=true
VI_5_IMPLEMENTATION_IN_PROGRESS=true
VI_5A_IMPLEMENTED=true
VI_5A_AUTOMATED_VALIDATION_PASS=true
VI_5B_STARTED=false
VI_5_MANUAL_VALIDATION_PENDING=true
VI_5_COMPLETE=false
VI_5_ACCEPTED=false
VOICE_STATE_OWNERSHIP_CHANGED=false
VOICE_TRANSPORT_CHANGED=false
VOICE_CALLBACKS_CHANGED=false
VOICE_SPEAKING_DETECTION_CHANGED=false
VOICE_PERSONAL_MIX_BEHAVIOR_CHANGED=false
VOICE_QUALITY_DATA_CHANGED=false
SCREEN_SHARE_PRESENTATION_CHANGED=false
SCREEN_SHARE_LIFECYCLE_CHANGED=false
PRESENCE_CHANGED=false
REALTIME_CHANGED=false
WEBRTC_CHANGED=false
ROOT_LAYOUT_OWNERSHIP_CHANGED=false
SCROLL_OWNERSHIP_CHANGED=false
REAL_BROWSER_VALIDATION=not_executed_pending
```

## 26. VI.5B Screen Share presentation and implementation coverage — implemented 2026-09-05

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PENDING`.
The two planned slices now cover all current authoritative VI.5 production
presentation scope, so `VI_5_IMPLEMENTATION_COMPLETE=true` and
`VI5_REMAINING_IMPLEMENTATION_SCOPE=none`. VI.5 remains neither complete nor
accepted until the consolidated immutable publication and human checkpoint pass.
VI.4 remains frozen, complete and accepted; VI.5A remains implemented and
automated-valid.

The production change is presentation-only:

- `ChannelSidebar.tsx` retains Live Streams position, ordering, identities,
  viewer data and Join/Leave callbacks while replacing eight static inline-style
  sites with compact scoped rows, clear own/subscribed states, contained names
  and token-native focus/status treatment;
- `UserPanel.tsx` retains the accepted shell geometry and exact start/stop
  callbacks while adding existing-state `pending` presentation and truthful
  `aria-busy`; active sharing remains an explicit danger-tinted `LIVE`/Stop
  state, not a success or network-health signal;
- `ScreenShareViewerWorkspace.tsx` retains the persistent CENTRAL, DETACHED and
  HIDDEN state machine, gallery/focus selection and all callbacks while adding
  static presenter/toolbar/waiting hooks, long-name containment and tokenized
  media/header/control/depth presentation; the existing one-to-four gallery
  algorithm and compact focus rail are unchanged;
- `ScreenSharePresenterCard.tsx` retains its stream lookup and viewer data while
  moving twelve static inline-style sites into scoped presenter header, media,
  waiting and floating viewer-disclosure styles; media remains dominant and the
  local preview keeps its existing placement/lifecycle;
- `globals.css` replaces Screen Share literal black with existing `--bg-media`,
  maps owned spacing/type/radius/focus values to existing tokens and replaces
  the three pre-existing literal shadow roles with `--shadow-low` or
  `--shadow-elevated`. No new elevation role, token, literal background,
  gradient or `!important` was introduced.

`ScreenStreamVideo.tsx` and `AppContent` are unchanged. `object-fit: contain`,
`srcObject`, muted/inline media behavior, media elements/sinks, presenter/viewer
keys, capture, transport, WebRTC, realtime, subscriptions and explicit viewer
opt-in, local-preview ownership, multi-presenter lifecycle, cleanup, permissions,
Presence, root layout and scroll ownership are unchanged. No failed/denied UI or
other absent Screen Share state was invented. Screen Share audio
duplication/echo remains separate and was not remediated.

Automated evidence from the package-declared harness:

- focused command: `pnpm --filter @likecord/web run test:ci --
  src/__tests__/voice.test.tsx
  src/__tests__/screen-share-presentation.test.tsx
  src/__tests__/screen-share.test.ts src/__tests__/black-screen.test.tsx
  src/__tests__/chat-layout-scroll.test.tsx src/__tests__/navigation.test.tsx
  src/__tests__/layout.test.tsx`: **7 suites / 247 tests / 0 snapshots PASS**;
- full `pnpm --filter @likecord/web run test:ci`:
  **32 suites / 531 tests / 0 snapshots PASS**;
- Web typecheck PASS; Web lint PASS with **0 errors / 87 unchanged warnings**;
  `git diff --check` PASS.

No authenticated local Web listener was already available on the normal local
ports, so real-browser validation was not executed. The consolidated manual
checkpoint remains: Voice disconnected/permission/join/connected, multiple
participants, speaking, mute, deafen, personal mix, leave, keyboard/focus and
long names; Screen Share idle/start/pending/local preview/live, explicit
Join/Leave viewer opt-in, subscribed, one/two/three/four presenters,
gallery/focus, detached, hidden/reopen, stop/cleanup, waiting, keyboard/focus,
long names and contain/no-crop; all at 100%, 125% and 150% zoom with at least two
accounts/browsers where roles require them.

Final Likecord UI review:

- `KEEP`: media-first black presentation, compact non-elevated Live Streams,
  clear presenter/viewer and LIVE labels, the existing one-to-four gallery,
  focused primary/secondary hierarchy, explicit viewer opt-in and accepted
  VI.4/VI.5A shell/Voice presentation;
- `WATCH`: real-browser containment, focus reachability and media no-crop at
  100–150% zoom remain manual evidence; audio echo/cardinality and other Voice
  reliability debts remain separate. These are not new backlog items;
- `SYSTEMIZE`: completed for owned static Live Streams, workspace, detached,
  hidden, presenter-card, viewer-disclosure, waiting and media-black appearance
  through existing tokens and scoped classes.

Exact next action: publish one consolidated immutable VI.5 Web candidate from
the final VI.5B HEAD, deploy it Web-only into the local validation runtime
preserving the exact existing API, then execute the consolidated human Voice +
Screen Share checkpoint.

```text
VI_4_COMPLETE=true
VI_4_ACCEPTED=true
VI_4_REOPENED=false
VI_5_PREFLIGHT_COMPLETE=true
VI_5_STARTED=true
VI_5_IMPLEMENTATION_IN_PROGRESS=true
VI_5A_IMPLEMENTED=true
VI_5A_AUTOMATED_VALIDATION_PASS=true
VI_5B_STARTED=true
VI_5B_IMPLEMENTED=true
VI_5B_AUTOMATED_VALIDATION_PASS=true
VI5_REMAINING_IMPLEMENTATION_SCOPE=none
VI_5_IMPLEMENTATION_COMPLETE=true
VI_5_AUTOMATED_VALIDATION_PASS=true
VI_5_MANUAL_VALIDATION_PENDING=true
VI_5_COMPLETE=false
VI_5_ACCEPTED=false
SCREEN_STREAM_VIDEO_CHANGED=false
APP_CONTENT_CHANGED=false
SCREEN_SHARE_OBJECT_FIT_CHANGED=false
SCREEN_SHARE_LIFECYCLE_CHANGED=false
SCREEN_SHARE_SUBSCRIPTION_CHANGED=false
SCREEN_SHARE_TRANSPORT_CHANGED=false
SCREEN_SHARE_CENTRAL_DETACHED_HIDDEN_SEMANTICS_CHANGED=false
SCREEN_SHARE_AUDIO_TRANSPORT_REMEDIATED=false
VI_5A_PRESENTATION_CHANGED_BY_VI5B=false
PRESENCE_CHANGED=false
REALTIME_CHANGED=false
WEBRTC_CHANGED=false
ROOT_LAYOUT_OWNERSHIP_CHANGED=false
SCROLL_OWNERSHIP_CHANGED=false
NEW_THEME_TOKENS=0
NEW_BACKGROUND_LITERAL_COLORS=0
NEW_GRADIENT_USAGE=0
NEW_SHADOW_USAGE=0
NEW_IMPORTANT_DECLARATIONS=0
REAL_BROWSER_VALIDATION=not_executed_pending
LIKECORD_UI_REVIEW_SKILL_APPLIED=true
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
```

## 27. VI.5 formal acceptance and milestone closure — recorded 2026-09-05

VI.5 is formally accepted and closed. The accepted scope is exactly the two
implementation slices in sections 25–26: VI.5A Voice presentation and VI.5B
Screen Share presentation. `VI5_REMAINING_IMPLEMENTATION_SCOPE=none` and no
third implementation slice is required.

Automated evidence is accepted as supplied: VI.5A focused Web Jest 11 suites /
230 tests PASS; VI.5B focused Web Jest 7 suites / 247 tests PASS; consolidated
Web Jest 32 suites / 531 tests PASS; typecheck PASS; lint PASS with 0 errors and
87 pre-existing warnings. The exact immutable candidate is accepted at source
`screen share presentation milestone`, OCI index
`sha256:aefb93fc5ebe274777369644b64ab68ed9932708a3b67150abe4112b7af8496b`,
application manifest
`sha256:b67e87f28904cc82b7832fb2db67b9ce4dc042ec0486b7bbfd604193b3899e51`,
attestation manifest
`sha256:51a890d3b00e067db3f4603adacfef7f48aeb2db7d2ea33231cccd9c0ad421d8`,
platform `linux/amd64`.

The local Web-only deployment preserved the exact API runtime and returned Web
HTTP 200 and API HTTP 200. Local human checkpoints V5-01–V5-15, V5-18–V5-22,
100%/125%/150% zoom and V5-26 passed; V5-16 and V5-17 were not reproducible in
the local environment and were subsequently validated in Staging, not treated
as failures. Staging used the same immutable artifact Web-only; Web/API HTTP
200 and exact preservation of API, Caddy, coturn, PostgreSQL and Redis passed.
Staging checkpoints S5-01–S5-10 all passed with no blocking observations and no
rollback, Prisma execution, migration or database mutation.

The following remain deferred future UX capabilities, outside VI.5 scope and not
acceptance blockers: product-level fullscreen, stream volume, product-level
Picture-in-Picture, manual player resize, draggable/resizable/minimized preview,
free Detached repositioning and broader movable/floating workspace behavior.
Existing unrelated Voice, Presence, Username → UUID, Mute/Deafen, TURN-TLS,
echo/cardinality and other reliability debts remain unchanged and are not marked
fixed by this milestone.

```text
VI_5_IMPLEMENTATION_IN_PROGRESS=false
VI_5_IMPLEMENTATION_COMPLETE=true
VI_5_AUTOMATED_VALIDATION_PASS=true
VI_5_LOCAL_MANUAL_VALIDATION_PASS=true
VI_5_STAGING_VALIDATION_PASS=true
VI_5_MANUAL_VALIDATION_PENDING=false
VI_5_MANUAL_VALIDATION_PASS=true
VI_5_COMPLETE=true
VI_5_ACCEPTED=true
VI5_REMAINING_IMPLEMENTATION_SCOPE=none
VI_5_ACCEPTED_SOURCE_MILESTONE=screen share presentation milestone
VI_5_ACCEPTED_OCI_INDEX=sha256:aefb93fc5ebe274777369644b64ab68ed9932708a3b67150abe4112b7af8496b
VI_5_ACCEPTED_APPLICATION_MANIFEST=sha256:b67e87f28904cc82b7832fb2db67b9ce4dc042ec0486b7bbfd604193b3899e51
VI_5_ACCEPTED_ATTESTATION_MANIFEST=sha256:51a890d3b00e067db3f4603adacfef7f48aeb2db7d2ea33231cccd9c0ad421d8
VI_5_ACCEPTED_PLATFORM=linux/amd64
VI_5_ACCEPTED_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:aefb93fc5ebe274777369644b64ab68ed9932708a3b67150abe4112b7af8496b
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI5_BLOCKER=false
VI_6_STARTED=false
VI_6_READY_TO_START=true
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
```

Historical next action at VI.5 closure: perform the dedicated VI.6 Auth / Entry /
System States preflight. Section 28 completes that action. Do not reopen accepted
VI.5 absent a material reproducible regression, invalidating evidence or an
explicit new product requirement.

## 28. VI.6 Auth / Entry / System States preflight — completed 2026-09-05

This documentation-only preflight identifies the current production surfaces,
separates presentation from behavior, and authorizes no implementation by
itself. Source and contract inspection was static. No browser, Jest, typecheck,
lint, build, runtime, Docker, Staging, Prisma, migration, database or publication
action was performed. VI.3, VI.4 and VI.5 remain accepted and frozen.

### 28.1 Precheck, authority and evidence boundary

| Check | Verified result |
|---|---|
| Branch | `historical visual identity refresh work` |
| Starting HEAD | `vi5 voice and screen share milestone` |
| Starting subject | `docs(brand): accept vi5 voice and screen share milestone` |
| Starting parent | `screen share presentation milestone` |
| Tracked worktree / index | Clean / clean |
| Allowed untracked state | Four existing files under `docs/design/likecord-brand-reference/`; neither inspected as design input nor modified, staged, moved or deleted |
| Canonical product icon | `apps/web/public/brand/likecord-icon.png`; verified SHA-256 `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949` |

Authority inspected: repository `AGENTS.md`, this contract, the current
[UI/UX roadmap](./ui-ux-roadmap.md), `AI_CONTEXT.md`, the frozen
[F.5 Invite / Server Entry contract](./f5-invite-server-entry.md), relevant
[API authentication and invite contracts](../api-spec.md), and the current data
contract in [database.md](../database.md). Production evidence came from the Web
App Router tree, `useAuth`, the Web API/navigation helpers, current Auth/Entry
components, route-state branches, shared CSS, focused Web tests, and the existing
API Auth/Invite controllers and services solely to identify frozen behavioral
owners. The API and data source were read, not changed.

No authority contradiction was found. The current F.5 contract is specific,
complete and frozen: registration remains invite-gated, authentication returns
to the invite without accepting it, membership changes only after explicit
Accept/Join, unavailable public copy remains generic, and canonical navigation
resolves through `/channels/{serverId}`. VI.6 can therefore remain a visual Web
stage without changing Auth, invite, API or persistence contracts.

### 28.2 Current entry-route inventory

All current production routes relevant to entry are below. `Public` means the
route can render without a user; the invite preview optionally consumes an
authenticated session. `Protected` means `AuthGate` redirects an unauthenticated
viewer to `/` with a safe `returnTo`.

| Route | Owner and access | Purpose and main container | Current loading / error / responsive behavior | Shared presentation and VI.6 ownership |
|---|---|---|---|---|
| `/` | `apps/web/src/app/page.tsx` — `LoginPage` / `LoginForm`; public | Canonical login, not `/login`; centered `.auth-page > .auth-card` | `loading-screen` during auth bootstrap, Suspense, and the post-login redirect window; inline `.error-banner` on failure. No route-specific responsive rule; it inherits fixed body overflow and `100vh` entry geometry. | Native scoped inputs/buttons, global focus, error banner. **VI.6A owns presentation.** |
| `/register` | `apps/web/src/app/register/page.tsx` — `RegisterPage` / `RegisterForm`; public but account creation is invite-gated | Invite code, email, username and password form in the same auth container | Suspense uses `loading-screen`; query-code validation shows `.info-banner`; unavailable validation and registration failures show `.error-banner`; submit is disabled while pending. Same responsive boundary as login. | Native scoped form controls, banners and shared focus. **VI.6A owns presentation.** |
| `/invite/[code]` | `apps/web/src/app/invite/[code]/page.tsx` — `InvitePage`; public with optional session | Safe server-name preview, Sign In/Register, explicit Accept, or Open Server in `.auth-page > .auth-card` | Auth plus preview use an auth-card `Loading invite...`; operational load failure and generic unavailable both remain on the route, with distinct accepted copy; accept failure remains visible; action disables while pending. No route-specific responsive rule. | Auth container, banners and button foundation, but eight static inline style objects. **VI.6A owns presentation.** |
| `/app` | `apps/web/src/app/app/layout.tsx`, `components/AuthGate.tsx`, `app/app/page.tsx:AppPage`; protected legacy route | Compatibility redirect only; canonical destination is `/channels/@me` | `loading-screen` while protected bootstrap/redirect and while `AppPage` replaces the route; no visible route error. | Shared loading state. **VI.6B owns only the visible transition; redirect behavior stays frozen.** |
| `/channels/@me` | `apps/web/src/app/channels/layout.tsx` plus `app/app/page.tsx:AppContent` and `components/layout/Home.tsx`; protected | Canonical authenticated Home in the persistent app shell | `AuthGate` covers bootstrap; Home independently shows Continue/server loading, errors/retries and zero-server state. Current shell compression is the existing responsive boundary. | VI.6B may style only shared bootstrap. Home is **`VI6_OUT_OF_SCOPE_PRIOR_ACCEPTED_SURFACE`** under VI.3. |
| `/channels/[serverId]` | same persistent layout and `AppContent`; protected; leaf `channels/[serverId]/page.tsx` renders `null` | Server entry resolves the canonical accessible Text Channel or the no-accessible-channel state | Full workspace `Loading server…`, then redirect, `No accessible text channels`, or generic unavailable state. | **VI.6B owns route-state presentation only.** Server/channel resolution and shell mounting remain frozen. |
| `/channels/[serverId]/[channelId]` | same persistent layout and `AppContent`; protected; leaf page renders `null` | Validated Text Channel entry inside the already mounted shell | New-server entry shows `Loading server…`; same-server transition shows `Loading channel…` without remounting Rail, member panel or Screen Share; inaccessible/failed validation becomes generic unavailable. | **VI.6B owns route-state presentation only.** Same-server persistence is a hard boundary. |

Current absent routes/boundaries are not VI.6 requirements: `/login`, OAuth
entry/callback UI, dedicated onboarding, custom App Router `loading.tsx`,
`error.tsx`, `not-found.tsx`, unauthorized or forbidden pages, and a custom route
transition UI. Unknown URLs therefore have only the framework fallback, not a
Likecord-owned 404 surface. VI.6 must not create any of these absent routes.

### 28.3 Auth, invite and bootstrap ownership

| Presentation owner | Current inputs/actions/states | Presentation responsibility | Behavioral owner that VI.6 must not change |
|---|---|---|---|
| `app/page.tsx:LoginForm` | `user`, `loading`, `login`; email/password; submit error/pending; safe `returnTo` / legacy `redirect` | Login hierarchy, labels, existing controls, error and loading/redirect copy | `hooks/useAuth.tsx`, `lib/api.ts:authApi`, `lib/navigation.ts:safeInternalReturnTo`, router destination; API `AuthController` / `AuthService` login and cookie issuance |
| `app/register/page.tsx:RegisterForm` | invite validation, invite code/email/username/password, error/checking/submitting; `register`; safe return | Registration hierarchy and existing validation/pending/error presentation | Invite eligibility, username/email/password rules, `useAuth.register`, Auth API transaction/session creation, and explicit-accept separation |
| `app/invite/[code]/page.tsx:InvitePage` | route code, optional `user`, auth/preview loading, safe preview union, error/accepting; validate, Accept, Open, Sign In/Register | Public/optional-session preview, generic unavailable and operational error presentation, existing action hierarchy | `inviteApi`, `InviteController` / `InviteService`, preview allowlist, membership status, explicit acceptance, bans/use consumption, canonical navigation |
| `components/AddServerModal.tsx` | choice/create/join/preview, input normalization, pending/error, unavailable/already-member; close/back/create/validate/join/open | Existing entry-dialog hierarchy, controls, preview and feedback | server provisioning, invite normalization and API calls, explicit join/open distinction, `onComplete` reconciliation/navigation, dismissal/pending behavior |
| `components/AuthGate.tsx` | `user`, `loading`, pathname and local redirecting flag | One visible bootstrap/redirect state | protected-route test, `returnTo` calculation and `router.replace` destination |
| `app/auth-wrapper.tsx` and `hooks/useAuth.tsx:AuthProvider` | first `/users/@me`, refresh, retry `/users/@me`, login/register/logout/profile state | No direct visual markup; supplies truth to the owners above | Session restoration order, refresh rotation, user state and logout semantics |
| `app/app/page.tsx:AppPage` / `AppContent` | legacy `/app` redirect; `routeStatus` `home/loading/channel-loading/channel/empty/unavailable` | Existing route-level loading, empty and unavailable copy within the mounted workspace | canonical resolver/validation calls, fallback destinations, loaded-shell persistence, WebSocket/Voice/Screen Share ownership |

There is no password-visibility control, logout-specific transition component,
OAuth UI, or standalone auth-required/permission-denied component. Logout awaits
the current request in `useAuth`, clears the shared user, and then reaches
`AuthGate`; the existing app shell may remain visible while the request is in
flight. VI.6 may not change that timing or lifecycle merely to improve the visual
transition.

### 28.4 System-state and empty-state classification

Classification: **A** VI.6-owned; **B** adequately owned by an accepted prior
surface; **C** functional/domain-specific outside VI.6; **D** absent; **E** would
require a new authority decision.

| Actual state | Owner / presentation | Class and boundary |
|---|---|---|
| Auth/session bootstrap, Suspense, protected redirect and legacy `/app` redirect | `.loading-screen` from Login, Register, `AuthGate` and `AppPage` | **A** — VI.6B visual/accessibility presentation; no timing, request or redirect change |
| Invite preview loading, validation, unavailable, operational error, accept pending/failure, already-member and success navigation | `InvitePage` | **A** — VI.6A; preserve every discriminated branch and generic public copy |
| Login/register submit pending, native validation and server/API error | `LoginForm`, `RegisterForm` | **A** — VI.6A; preserve actions and field constraints |
| Add Server choice/create/join/preview pending, error and unavailable/already-member | `AddServerModal` | **A** — VI.6A; preserve the accepted F.5 workflow |
| Loading server/channel, unavailable server/channel, no accessible Text Channel and Select a channel | `AppContent` `.empty-state` branches | **A** — VI.6B presentation only; preserve mounted shell/share wrapper and resolver behavior |
| Home Continue/server loading, retry, error, no durable destination and no servers | `Home.tsx` | **B** — `VI6_OUT_OF_SCOPE_PRIOR_ACCEPTED_SURFACE`; VI.3 owns it |
| No messages, history loading, optimistic send failure, attachment/delete error/pending | `ChatArea` / message hooks | **B/C** — accepted VI.4 Messaging presentation and domain behavior |
| No members / member-context loading, error and retry | `MemberPanel`, `MemberContextSurface` | **B/C** — accepted VI.3/VI.5 surfaces; Presence semantics remain separate |
| No invites, invite-list loading/error, create/revoke/copy pending/success/failure | `InviteAdministration`, `InvitePeopleModal` | **B** — accepted VI.4/F.5 management surfaces |
| Permission configuration loading/error; no overrides/eligible targets | `PermissionOverwriteEditor` and management views | **B/C** — accepted VI.4 and permission-domain owned |
| Voice connect/failure/access-revoked and personal-mix loading/save/retry | `useVoice`, `MemberContextSurface`, `VoiceParticipantPopover`, `UserPanel` | **B/C** — accepted VI.5 and functional Voice owners |
| Screen Share waiting stream, no viewers and hidden/detached/focus states | Viewer/Presenter components | **B** — accepted VI.5; media controls remain deferred |
| WebSocket ON/OFF indicator | `AppShellHeader` | **C** — connection-domain presentation; no new reconnect semantics |
| Global no-results/search state | no current search product | **D** |
| Custom 404/not-found, full-page 401/403, generic permission-denied or global success screen | no production owner | **D** — do not create in VI.6 |
| A new cross-application reusable React `SystemState` abstraction | none exists | **E** — not required; approve only if a later implementation proves concrete reuse without reopening accepted surfaces |

Empty-state result: `No accessible text channels` and `Select a channel` are the
only current systemic route-level empty/selection states assigned to VI.6B.
`No servers`, `No messages`, `No members`, `No invites`, no permission targets,
no audit entries, no viewers and Screen Share waiting states retain their prior
feature owners. There is no current no-results state and no dedicated no-streams
route state.

Denied-state result: authentication-required handling is redirect-only through
`AuthGate`; there is no visible 401 page. Missing permissions normally hide or
disable feature actions and backend reauthorization remains authoritative; there
is no generic 403 page. Invalid/unavailable invite is a full entry page inside
the auth container. Inaccessible or missing server/channel is deliberately
coalesced into a generic full-workspace unavailable state. Unknown application
routes have no custom Likecord not-found owner. VI.6 must not reveal whether an
unavailable resource exists or invent new permission semantics.

### 28.5 Brand, primitives, CSS and accessibility findings

Brand inventory:

- Auth and invite pages currently show only the text heading `Likecord`; the
  canonical icon is not used there. The verified icon is currently used only by
  Home at 56 px.
- The supplied wordmark remains untracked, visibly unclean and unapproved for
  production. VI.6 is not blocked by it and must retain text rather than recreate,
  trace, crop or substitute the wordmark.
- Current entry pages are dark-first and contain no gradient, glow, blur,
  glassmorphism, neon or auth-specific shadow. Their centered 400 px bordered
  card is functional but visually generic; future work should keep it compact
  and avoid a marketing hero or oversized SaaS card.
- The invite preview uses a house emoji as its only preview mark. No server icon
  is present in the accepted preview contract, so VI.6 may refine the existing
  neutral presentation but may not add server icon data.

Existing reusable foundation:

- native buttons plus `.btn` variants and the legacy scoped `.auth-card button`;
- native inputs under the shared auth/modal form-control selectors;
- `.error-banner`, `.info-banner`, global focus tokens and reduced-motion rules;
- `.modal`, `.add-server-*`, and explicit `.btn` classes in Add Server;
- accepted semantic background/text/border/radius/spacing/type tokens;
- `.loading-screen` and `.empty-state` CSS roles, which are selectors rather than
  reusable React components.

VI.6 must not create a second design system. The auth action links currently
duplicate button-like styling through `.auth-action-link`; future convergence may
reuse the existing visual convention without changing links into buttons.
Checkboxes, selects and modal confirmation primitives are not part of the three
route auth forms; Add Server already consumes the accepted modal/button system.

Exact legacy/style findings on VI.6 candidates:

- `InvitePage` contains eight static `style={{...}}` objects: Back-to-home layout,
  preview container, emoji size, server-name type, preview supporting text, both
  full-width action buttons and the stacked anonymous-action wrapper. These are
  presentation-only candidates for scoped classes.
- `.auth-page`, `.auth-card`, `.auth-card h1/h2/label/input/button`,
  `.auth-action-link`, `.auth-footer`, `.loading-screen` and `.empty-state` are
  compact legacy one-line rules. Auth still uses hardcoded `2rem`, `400px`,
  `8px`, `1.5rem`, `1rem`, `0.8rem`, `0.9rem` and legacy `var(--radius)` rather
  than consistently consuming the accepted scale.
- Add Server uses shared modal elevation correctly, but `.add-server-modal` has a
  local 440 px maximum, choice/preview cards use legacy border/radius aliases,
  and the choice hover introduces an accent border. These are review points, not
  authorization to restructure the accepted dialog.
- No candidate production component contains a literal hex/RGB color,
  `!important`, new gradient, blur, glow or one-off shadow. Root token literals
  are the accepted VI.1 foundation and are not VI.6 debt.
- `html, body` use `overflow:hidden`; auth uses `min-height:100vh` without its own
  vertical scroll or `100dvh`, route padding, or auth-specific media rule. Login
  is short, but Register and invite content risk reduced-height/150% zoom
  clipping. This is a manual-validation risk; VI.6 may add only local owned
  overflow/clipping protection, not a global responsive architecture.
- The bootstrap background inherits `--bg-app`, then auth changes to
  `--bg-secondary`; all bootstrap/redirect states are unbranded text `Loading...`.
  This can produce a background shift and an indistinguishable loading versus
  redirect state. There is no spinner, stale-shell overlay or duplicated visual
  indicator in these owners; runtime behavior was not exercised.

Accessibility inventory:

- Login's `Email` and `Password` labels have neither `htmlFor` nor matching input
  IDs. Register and Add Server labels are correctly associated. Correcting login
  associations is `PRESENTATION_ONLY` and was already identified by section 7.
- Password inputs correctly use `type="password"`; no visibility control exists
  and VI.6 must not invent one. Current auth inputs do not declare autocomplete.
  Adding autocomplete changes browser input behavior and is not automatically
  authorized as visual presentation.
- Auth/Invite errors and invite-validation/loading text lack `role="alert"` or
  `role="status"`, input error association, `aria-invalid`, `aria-describedby`,
  and truthful busy metadata. Scoped role/status/busy/description metadata tied
  to existing truth is `PRESENTATION_ONLY`.
- Submit/join/create actions use real `disabled` states while pending. The fields
  generally remain editable. VI.6 must not change disabling, duplicate-submit or
  focus behavior without behavioral authority.
- No auth owner moves focus to an error. Add Server provides `autoFocus` on child
  inputs and Escape/backdrop/close behavior, but it has no general focus trap or
  explicit invoker restoration in this component. Focus movement/trapping and
  restoration can alter interaction behavior and are not authorized by default.
- Global `:focus-visible`, reduced-motion and forced-colors rules already cover
  links, buttons and inputs. Contrast must still be checked in a real browser for
  entry surfaces, banners, disabled text, focus and hover composites.
- The route-level `Loading server/channel`, unavailable, no-channel and selection
  branches have no `role=status/alert` or live-region semantics. Truthful scoped
  metadata is `PRESENTATION_ONLY`; changing when branches mount is not.

### 28.6 Existing test inventory — not executed in this preflight

| Suite | Current protection | Future VI.6 focused use |
|---|---|---|
| `apps/web/src/__tests__/app.test.tsx` | `AuthProvider` bootstrap result, login API invocation, cookie/CSRF helper and logout clearing user | VI.6A/B behavioral guard if auth-owner markup changes; do not rewrite the hook tests for styling |
| `apps/web/src/__tests__/invite-entry.test.tsx` | anonymous allowlisted preview, safe auth links, explicit Accept/pending, already-member Open Server, generic unavailable privacy, operational error distinction, accept failure retention, registration return without acceptance | Primary VI.6A suite; add only meaningful presentation/accessibility assertions |
| `apps/web/src/__tests__/add-server.test.tsx` | input normalization, dialog choice/dismissal/Back, labels, validation/error retention, pending, explicit Join, already-member Open and unavailable/network branches | Primary VI.6A Add Server suite |
| `apps/web/src/__tests__/navigation.test.tsx` | safe login `returnTo`, rejected external destination, legacy `/app` redirect, persistent route transitions, route loading shell preservation, unavailable/no-channel fallback and Home integration | Primary VI.6B route-state suite and VI.6A login-navigation guard |
| `apps/web/src/__tests__/home.test.tsx` | independent Continue/server loading/error/retry/null/empty branches and keyboard actions | Regression guard only because Home is a frozen VI.3 surface |
| `apps/web/src/__tests__/layout.test.tsx` | shell components and Chat loading presentation | Regression guard only; its domain states are not VI.6 scope |

No test directly renders `AuthGate`, asserts login label association, exercises
login invalid-credential presentation, checks register's invalid-invite status
semantics, or verifies accessible roles/busy/description metadata on the owned
route states. A future slice may add focused assertions for those exact gaps.
Visual layout, contrast, clipping and real browser zoom remain manual evidence;
pixel/hex snapshots are not proposed.

### 28.7 Exact scope, hard boundaries and implementation slices

`DECISION_ACCEPTED`: VI.6 implementation scope is presentation-only Web work for
the existing Auth/Entry owners and current shared bootstrap/route-state branches.
It may use the canonical icon in entry branding at a reviewed supported size,
replace static inline appearance with scoped classes, consume existing tokens,
improve compact hierarchy and add truthful presentation-only accessibility
metadata. It may locally prevent clipping/overflow on owned entry/state surfaces.

Explicit non-scope: new routes or onboarding; password reset/forgot password,
email verification, magic link, MFA, OAuth, password visibility, server icons or
member counts; Auth protocol or validation changes; API, WebSocket, Redis,
Prisma/database or permissions changes; invite validation/consumption/privacy
changes; new redirects; app-shell architecture; Home/Messaging/Management/Voice/
Screen Share redesign; Presence semantics; broad responsive navigation; favicon,
small mark or unapproved wordmark work.

Hard boundaries for both slices:

- preserve `AuthProvider`, `useAuth`, `authApi`, cookie/JWT/session/refresh/logout
  behavior and all Auth API service/controller/data owners;
- preserve invite-gated registration, preview allowlist, generic unavailable
  copy, explicit Accept/Join, already-member, ban, use-count and transaction rules;
- preserve `safeInternalReturnTo`, `/channels/@me`, server/channel resolver,
  `AuthGate` destinations and canonical navigation semantics;
- preserve `AppContent` as the persistent workspace owner, route-status timing,
  loaded-shell identity, nested scrolling, WebSocket lifecycle, permissions,
  Voice, Screen Share, media sinks, subscriptions and CENTRAL/DETACHED/HIDDEN;
- preserve all prior accepted VI.3/VI.4/VI.5 presentation not explicitly listed
  as a VI.6-owned state;
- stop if an intended result needs an API/schema/Auth-contract change, a new
  route/state semantic, a broad breakpoint rewrite, or material reopening of an
  accepted surface.

The smallest coherent sequence is two slices:

1. **VI.6A — Auth & Entry presentation.** Owners:
   `app/page.tsx`, `app/register/page.tsx`, `app/invite/[code]/page.tsx`,
   `components/AddServerModal.tsx` and strictly scoped `globals.css`. Goals:
   intentional compact dark-first entry hierarchy; reviewed canonical icon plus
   text branding; tokenized auth/invite styles; removal of InvitePage's eight
   static inline appearance objects; coherent existing loading/error/pending/
   unavailable/already-member states; safe local zoom/overflow; login label and
   truthful error/status/busy metadata. Allowed changes are CSS/classes, bounded
   presentation markup and presentation-only metadata. Tests: focused
   `invite-entry.test.tsx`, `add-server.test.tsx`, relevant login navigation tests,
   and only relevant `app.test.tsx` guards, using the repository canonical runner.
   Manual checkpoint: logged-out login normal/pending/invalid credentials;
   registration normal/native validation/invite validating/invalid and server
   error; valid anonymous invite, authenticated not-member, already-member,
   unavailable, operational load failure and accept failure; Add Server all four
   views; keyboard/focus and real 100/125/150% zoom at desktop plus reduced
   height. It requires a valid invite, an invalid/expired token where safely
   reproducible, and two accounts for not-member/already-member branches. Stop on
   any Auth/invite/navigation semantic delta or need for an unapproved asset.

2. **VI.6B — Bootstrap & route-level system states.** Owners:
   `components/AuthGate.tsx`, `app/app/page.tsx` only at existing visible state
   markup, and strictly scoped `globals.css`; Login/Register Suspense/loading may
   consume the same visual state convention without changing their logic. Goals:
   distinguish truthful initializing/redirecting copy using existing state only,
   provide a stable branded neutral background, and make current loading,
   unavailable, no-accessible-channel and selection states coherent and
   accessible without card proliferation. Allowed changes are bounded classes,
   text presentation when it reflects already-known state, and status/alert/busy
   metadata. Tests: focused `navigation.test.tsx`, direct `AuthGate` presentation
   coverage if markup changes, plus relevant `app.test.tsx`; `home.test.tsx` and
   `layout.test.tsx` are regression guards only when the changed CSS can reach
   them. Manual checkpoint: cold logged-out load, valid-session restoration,
   expired-session refresh success/failure, protected deep-link return, `/app`
   compatibility redirect, server-first and same-server channel loading,
   inaccessible server/channel, no accessible Text Channel, Select a channel,
   shell persistence with an active Voice/Screen Share fixture, keyboard/focus,
   100/125/150% zoom and reduced height. Stop on timing/fetch/redirect changes,
   shell/media remount, new disclosure, or a request to redesign a prior feature
   state.

Two slices are justified because Auth/Invite forms have high accessibility and
accepted workflow risk, while route-level states touch persistent shell and
media ownership. Splitting them creates one meaningful behavior boundary without
micro-slicing shared CSS. VI.6A should be implemented first; VI.6B may reuse its
scoped presentation convention.

### 28.8 Readiness, runtime and preserved deferrals

Discovery is complete and no authority blocker exists. Expected implementation
runtime is `web_only`; no API, database or Auth-contract change is required. If a
later implementation discovers otherwise, it must stop and reclassify the need
outside Visual Identity rather than broaden VI.6.

Dedicated onboarding, forgot/reset password, email verification, magic link,
MFA and OAuth UI are absent. The database's administrative
`passwordChangeRequired` field does not establish a Web password-reset flow and
is not VI.6 scope. A custom 404/401/403 and global search/no-results surface are
also absent.

Fullscreen, stream-specific volume, Picture-in-Picture, manual resize,
draggable/resizable preview and movable Detached workspace remain deferred from
VI.5 and outside VI.6. Presence remains separately owned before RC.

```text
VI_5_COMPLETE=true
VI_5_ACCEPTED=true
VI5_REMAINING_IMPLEMENTATION_SCOPE=none
VI_6_PREFLIGHT_COMPLETE=true
VI_6_CAN_START_IMPLEMENTATION=true
VI_6_STARTED=false
VI_6_IMPLEMENTATION_IN_PROGRESS=false
VI_6_COMPLETE=false
VI_6_ACCEPTED=false
VI6_PROPOSED_SLICE_COUNT=2
VI6_EXPECTED_RUNTIME_SCOPE=web_only
VI6_API_CHANGE_REQUIRED=false
VI6_DATABASE_CHANGE_REQUIRED=false
VI6_AUTH_CONTRACT_CHANGE_REQUIRED=false
DEDICATED_ONBOARDING_FLOW=absent
PASSWORD_RESET_FLOW=absent
EMAIL_VERIFICATION_FLOW=absent
MAGIC_LINK_FLOW=absent
MFA_FLOW=absent
OAUTH_UI_FLOW=absent
CUSTOM_NOT_FOUND_ROUTE=absent
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI6_SCOPE=false
PRESENCE_CHANGED=false
RUNTIME_CHANGED=false
IMAGE_PUBLISHED=false
DATABASE_MUTATED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
LIKECORD_UI_REVIEW_SKILL_APPLIED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

Historical next action at preflight closure: implement only VI.6A Auth & Entry
presentation under the current visual governance, beginning from the preflight
commit. The implementation record below supersedes this action.

## 29. VI.6A Auth & Entry presentation — implemented 2026-09-05

Classification: `IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. This is a candidate implementation record, not VI.6
acceptance. VI.6B remains unstarted.

The existing `LoginForm`, `RegisterForm`, `InvitePage` and `AddServerModal`
presentation owners now use a compact dark-first hierarchy, the canonical
`/brand/likecord-icon.png` on public entry surfaces, shared `.btn` variants,
existing form-control/focus foundations and scoped semantic tokens. The invite
summary and Add Server preview use separators rather than extra elevated cards.
No gradient, new theme color, shadow, blur, glow or parallel component/token
system was introduced.

Login labels are associated with their controls. Existing errors are exposed as
alerts and describe the affected controls where truthful; existing invite
validation/loading is exposed as status; current submit, accept and modal
pending regions expose `aria-busy`. This metadata does not move focus, change
keyboard behavior, add validation, enable autocomplete or alter workflow timing.
All eight static InvitePage appearance objects were replaced by scoped classes.
`.auth-page` owns an internal viewport-height scroll boundary with reduced-width
padding and safe top alignment at reduced height; `AddServerModal` owns bounded
viewport height and wrapping actions. These selectors do not change app-shell
responsive behavior.

Behavioral diff review found no changes to Auth API calls/payloads, session or
refresh behavior, safe-return routing, redirects, invite validation/acceptance/
consumption/privacy, registration rules, permissions, or server create/join
semantics. `AuthGate`, `AppContent`, bootstrap/loading presentation, route-level
system states, Voice, Presence, Screen Share and media ownership were untouched.

Automated evidence:

- focused Web Jest:
  `pnpm --filter @likecord/web run test:ci -- src/__tests__/app.test.tsx src/__tests__/invite-entry.test.tsx src/__tests__/add-server.test.tsx src/__tests__/navigation.test.tsx`
  passed 4 suites / 69 tests / 0 snapshots;
- full Web Jest passed 32 suites / 533 tests / 0 snapshots;
- Web typecheck passed;
- Web lint passed with 0 errors and the unchanged 87-warning baseline;
- `git diff --check` passed before documentation reconciliation and remains a
  required final precommit check.

The required human checkpoint remains pending for login, registration, every
current invite branch and all four Add Server views, including keyboard/focus,
real 100%/125%/150% zoom and reduced-height coverage. No publication,
deployment, runtime, API, database or Prisma action occurred in this slice.

```text
VI_6_STARTED=true
VI_6_IMPLEMENTATION_IN_PROGRESS=true
VI_6A_IMPLEMENTED=true
VI_6A_AUTOMATED_VALIDATION_PASS=true
VI_6A_MANUAL_VALIDATION_PENDING=true
VI_6B_STARTED=false
VI_6_COMPLETE=false
VI_6_ACCEPTED=false
VI6_EXPECTED_RUNTIME_SCOPE=web_only
VI6_API_CHANGE_REQUIRED=false
VI6_DATABASE_CHANGE_REQUIRED=false
VI6_AUTH_CONTRACT_CHANGE_REQUIRED=false
LIKECORD_UI_REVIEW_SKILL_APPLIED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
DATABASE_MUTATED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

Exact next action: exercise the VI.6A human checkpoint against this exact
candidate, publishing/deploying it only if the authoritative staged-validation
strategy requires an immutable runtime; reconcile that evidence before starting
VI.6B.

### 29.1 VI.6A targeted visual reconciliation — implemented 2026-09-05

Classification: `IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. The complete initial VI.6A human checkpoint passed
at 100%, 125% and 150%. The resulting single observation was reconciled without
reopening any passed behavior: shared `.auth-card` now uses
`background: var(--bg-secondary)` instead of `var(--bg-primary)`.

The shared selector owns Login, Register and Invite entry states only; Add
Server uses its separate `.add-server-modal` owner and is unchanged. No JSX/TSX,
dimensions, padding, radius, border, typography, layout, overflow, responsive
behavior, navigation, Auth/API, invite or accessibility behavior changed. No
new literal color, gradient, shadow, blur, glow, `!important` or inline style
was introduced.

Focused Web Jest protects login, registration and invite behavior through
`app.test.tsx` and `invite-entry.test.tsx`; `git diff --check` also passed. The
only remaining validation is a targeted human recheck of Login, Register and
Invite at 100%, 125% and 150%, covering card depth/readability, border
separation and clipping/layout.

```text
VI_6A_INITIAL_MANUAL_VALIDATION_PASS=true
VI_6A_R1_IMPLEMENTED=true
VI_6A_R1_AUTOMATED_VALIDATION_PASS=true
VI_6A_R1_MANUAL_VALIDATION_PENDING=true
VI_6A_MANUAL_VALIDATION_PENDING=true
VI_6B_STARTED=false
VI_6_COMPLETE=false
VI_6_ACCEPTED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

Exact next action: publish the exact VI.6A R1 source as a new immutable Web
candidate, deploy Web-only locally and recheck only Login, Register and Invite
at 100%, 125% and 150%; if that targeted checkpoint passes, close VI.6A
validation before starting VI.6B.

### 29.2 VI.6A manual validation closure — recorded 2026-09-05

The user-supplied targeted R1 recheck passed for Login, Register and Invite at
100%, 125% and 150%, with no observations. Together with the already passed
initial checkpoint, this closes VI.6A manual validation. The accepted R1 decision
remains exactly `.auth-card { background: var(--bg-secondary); }`; Add Server and
all Auth/Invite behavior remain unchanged. This record supersedes the pending
validation and next-action status in the historical VI.6A implementation entries
above without rewriting their evidence.

```text
VI_6A_COMPLETE=true
VI_6A_MANUAL_VALIDATION_PASS=true
VI_6A_MANUAL_VALIDATION_PENDING=false
VI_6A_R1_MANUAL_VALIDATION_PASS=true
VI_6A_R1_MANUAL_VALIDATION_PENDING=false
```

## 30. VI.6B Bootstrap & route-level system states — implemented 2026-09-05

Classification: `IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
MANUAL_VALIDATION_PENDING`. Together with completed VI.6A, this exhausts the
accepted VI.6 implementation scope. It does not complete or accept VI.6 before
the consolidated human checkpoint.

Precheck matched the required source exactly: branch
`historical visual identity refresh work`, starting HEAD
`auth entry card alignment milestone`, parent
`auth and entry surfaces milestone`, subject
`feat(brand): align auth entry card surface`, clean tracked worktree and index,
and only the allowed untracked `docs/design/` directory. That directory was not
modified, staged, cleaned, moved or deleted. The canonical icon remained
byte-identical at SHA-256
`c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949`.

Production owners and implementation:

- `components/AuthGate.tsx` retains its exact loading/user/redirect conditions
  and destination logic. Its existing transition now distinguishes the already
  known initializing and redirecting cases with `Starting Likecord…` and
  `Opening sign in…`, exposed as a polite busy status.
- `app/app/page.tsx:AppPage` retains the legacy `/app` replacement and presents
  `Opening Likecord…` as a polite busy status while it runs.
- `app/app/page.tsx:AppContent` retains the exact `routeStatus` branches and adds
  only route-scoped presentation classes, concise support text and truthful
  `status`/`aria-live`/`aria-busy` metadata. Server and channel loading remain
  busy; unavailable, `No accessible text channels`, and `Select a channel`
  remain non-busy neutral states. Generic unavailable copy still discloses no
  resource or permission detail.
- `app/globals.css` refines the existing `.loading-screen` into a compact,
  dark-first branded transition using the canonical icon and accepted base/text/
  spacing/type tokens. `.route-system-state` scopes compact centered hierarchy,
  bounded wrapping, local padding and overflow to VI.6B-owned workspace states.
  It adds no card, border, elevation or decorative animation and does not alter
  the generic `.empty-state` selector used by prior domains.

The system-state composition uses `--bg-base`, `--bg-tertiary`, text hierarchy,
spacing, type and line-height tokens. No new token was needed. The canonical icon
is concentrated on full-screen bootstrap only; route states remain quiet and
neutral. The local `100dvh`, scroll, wrapping, maximum text width, safe centering
and narrow-width padding rules prevent state-content clipping without changing
the app-shell responsive or root-scroll architecture.

Automated evidence:

- focused Web Jest:
  `pnpm --filter @likecord/web run test:ci -- src/__tests__/auth-gate.test.tsx src/__tests__/navigation.test.tsx src/__tests__/app.test.tsx`
  passed 3 suites / 41 tests / 0 snapshots;
- full Web Jest passed 33 suites / 537 tests / 0 snapshots;
- Web typecheck passed;
- Web lint passed with 0 errors and the unchanged 87-warning baseline;
- `git diff --check` passed.

`auth-gate.test.tsx` directly covers the resolving status, protected deep-link
redirect and unchanged authenticated child rendering. `navigation.test.tsx`
adds semantic assertions for `/app`, server/channel resolving and fallback states
while retaining its loaded-shell, Voice and Screen Share workspace identity
guards. `app.test.tsx` remains the bootstrap request/session behavioral guard.
Home/layout suites were exercised by the required full run; no shared route-state
selector was applied to their frozen presentation.

Behavioral boundary audit: the diff changes no bootstrap request, request order,
refresh/session/cookie/token behavior, error handling or Auth destination; no
route resolution, protected route, default channel, authorization, navigation
history or fallback behavior; no `AppContent` mount/ownership, workspace or
scroll structure; no WebSocket or Presence code; and no Voice, Screen Share,
WebRTC, media element, stream, subscription or cleanup code. Active media
persistence remains a required manual checkpoint, not a browser-validation claim.
No API, database, Prisma, migration, build, publication, deployment or runtime
action occurred.

Static visual audit found zero new literal theme colors, gradients, one-off
shadows, blur/glow, `!important`, static inline presentation styles or global
empty-state reach. The approved asset URL is the only image reference added.
The Likecord UI review classified the compact branded bootstrap, quiet route
hierarchy and lack of arbitrary containment as `KEEP`; the shared loading role
as `SYSTEMIZE`; the previous raw oversized loading text and under-specified route
hierarchy as `SIMPLIFY`; and real-browser clipping/contrast/media persistence as
`WATCH` until the human checkpoint. The result is designed rather than decorated,
brand-rich only at bootstrap, and neutral in routine workspace states.

Proposed exact human checkpoint against the future consolidated immutable VI.6
candidate:

- B1 cold unauthenticated protected load: compact branded AuthGate bootstrap;
- B2 valid and refresh-restored authenticated bootstrap where reproducible;
- B3 unauthenticated protected deep link: unchanged safe sign-in return;
- B4 legacy `/app`: unchanged replacement to `/channels/@me`;
- B5 `/channels/@me`: shared bootstrap followed by the unchanged accepted Home;
- B6 new-server resolver loading; B7 generic server/channel unavailable;
- B8 `No accessible text channels`; B9 same-server channel resolver loading;
- B10 channel unavailable; B11 `Select a channel` where naturally present;
- B13 real browser zoom at 100%, 125% and 150%; B14 reduced-height and narrow-
  width state-content safety; B15 active Voice persistence; B16 active Screen
  Share persistence while navigating the relevant existing states.

B12 is omitted because the implemented VI.6B states contain no action or focusable
control; no artificial action was introduced. Existing shell controls should
retain their normal keyboard/focus behavior wherever the shell is mounted. Do not
fabricate unavailable fixtures merely to force a checkpoint branch.

```text
VI_5_COMPLETE=true
VI_5_ACCEPTED=true
VI_6_PREFLIGHT_COMPLETE=true
VI_6A_COMPLETE=true
VI_6A_MANUAL_VALIDATION_PASS=true
VI_6A_MANUAL_VALIDATION_PENDING=false
VI_6A_R1_MANUAL_VALIDATION_PASS=true
VI_6A_R1_MANUAL_VALIDATION_PENDING=false
VI_6B_STARTED=true
VI_6B_IMPLEMENTED=true
VI_6B_AUTOMATED_VALIDATION_PASS=true
VI_6B_MANUAL_VALIDATION_PENDING=true
VI_6_IMPLEMENTATION_COMPLETE=true
VI_6_AUTOMATED_VALIDATION_PASS=true
VI_6_MANUAL_VALIDATION_PENDING=true
VI_6_COMPLETE=false
VI_6_ACCEPTED=false
VI6_REMAINING_IMPLEMENTATION_SCOPE=none
VI6_EXPECTED_RUNTIME_SCOPE=web_only
VI6_API_CHANGE_REQUIRED=false
VI6_DATABASE_CHANGE_REQUIRED=false
VI6_AUTH_CONTRACT_CHANGE_REQUIRED=false
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI6_SCOPE=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
LIKECORD_UI_REVIEW_USED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

Exact next action: publish one consolidated immutable VI.6 Web candidate from
the final implementation HEAD, deploy it Web-only to the local validation
runtime while preserving the API exactly, and perform the VI.6B human checkpoint
before formal VI.6 acceptance.

## 31. VI.6 formal acceptance and milestone closure — recorded 2026-09-06

This section supersedes the pending VI.6 status in sections 28–30 without
rewriting their historical implementation evidence. VI.6 consisted of exactly
VI.6A Auth & Entry, the bounded VI.6A R1 `.auth-card` surface reconciliation,
and VI.6B Bootstrap & route-level system states. There is no remaining VI.6
implementation scope. VI.5 remains accepted and frozen.

VI.6A automated evidence remained accepted at 4 suites / 69 tests and 32
suites / 533 tests, with typecheck and diff-check passing and lint at 0 errors /
87 existing warnings. The R1 focused validation passed 2 suites / 18 tests.
The initial VI.6A human checkpoint passed all V6A-01–V6A-15 checks and zoom at
100%/125%/150%; the R1 Login, Register and Invite recheck passed at all three
zoom levels with no observations.

VI.6B automated evidence passed focused Web Jest at 3 suites / 41 tests and
full Web Jest at 33 suites / 537 tests, both with zero snapshots. Typecheck,
lint (0 errors / 87 existing warnings) and diff-check passed. Behavioral audits
covered Auth bootstrap, routing, AppContent lifecycle, Voice persistence,
Screen Share persistence and the Presence boundary. Static visual audit found
zero new literal theme colors, gradients, one-off shadows, blur/glow,
`!important` or static inline presentation styles.

The consolidated local VI.6B human checkpoint passed B1–B6, B9, B11, B13 at
100%/125%/150%, B14–B16 and the VI.6A regression smoke. B7 server unavailable,
B8 no accessible Text Channels and B10 channel unavailable are explicitly
`NOT_TESTED_ENVIRONMENT_LIMITATION`; they are nonblocking and must not be
promoted to PASS or reproduced with destructive fixtures.

Local validation is sufficient for acceptance because VI.6 is Web-only, with
no API, database, Auth contract, networking protocol or TURN/WebRTC change.
Staging validation is therefore not required for VI.6 acceptance, while the
Staging VPS remains present and any later rollout is a separate operational
task.

The accepted implementation source and exact published Web artifact are:

```text
VI_6_ACCEPTED_SOURCE_MILESTONE=bootstrap and route system states milestone
VI_6_ACCEPTED_OCI_INDEX=sha256:ce0c8af17701225f58dc6736f44c760ad75912488daab827d7d0f1a7e6b12c23
VI_6_ACCEPTED_APPLICATION_MANIFEST=sha256:6d713905241c94832eedf88bf9b89f55e18b24d5e6e48b2ea6b92d889caa5ad9
VI_6_ACCEPTED_ATTESTATION_MANIFEST=sha256:cf34bda450e8de28edba1ede718f8029f7faf7fe8f435a0dcd48faf0cef1709d
VI_6_ACCEPTED_PLATFORM=linux/amd64
VI_6_ACCEPTED_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:ce0c8af17701225f58dc6736f44c760ad75912488daab827d7d0f1a7e6b12c23
```

The unrelated `.voice-connection` bottom-border observation remains a
deferred micro-polish: `UI_VOICE_CONNECTION_BORDER_POLISH=deferred`, it is not
a VI.6 blocker, and it does not reopen VI.5. Existing Presence,
Username→UUID, Mute/Deafen, multi-tab Voice, Voice reliability, Screen Share
history, TURN-TLS-01 and other functional debts retain their existing owners.
Screen Share media controls remain deferred and outside VI.6.

```text
VI_5_COMPLETE=true
VI_5_ACCEPTED=true
VI_6_IMPLEMENTATION_IN_PROGRESS=false
VI_6_IMPLEMENTATION_COMPLETE=true
VI_6_AUTOMATED_VALIDATION_PASS=true
VI_6A_COMPLETE=true
VI_6A_MANUAL_VALIDATION_PASS=true
VI_6B_IMPLEMENTED=true
VI_6B_AUTOMATED_VALIDATION_PASS=true
VI_6B_MANUAL_VALIDATION_PENDING=false
VI_6B_MANUAL_VALIDATION_PASS=true
VI_6_LOCAL_MANUAL_VALIDATION_PASS=true
VI_6_MANUAL_VALIDATION_PENDING=false
VI_6_MANUAL_VALIDATION_PASS=true
VI6_MANUAL_ENVIRONMENT_LIMITATIONS_NONBLOCKING=true
B7_SERVER_UNAVAILABLE=NOT_TESTED_ENVIRONMENT_LIMITATION
B8_NO_ACCESSIBLE_TEXT_CHANNELS=NOT_TESTED_ENVIRONMENT_LIMITATION
B10_CHANNEL_UNAVAILABLE=NOT_TESTED_ENVIRONMENT_LIMITATION
VI_6_STAGING_VALIDATION_REQUIRED_FOR_ACCEPTANCE=false
VI_6_COMPLETE=true
VI_6_ACCEPTED=true
VI6_REMAINING_IMPLEMENTATION_SCOPE=none
UI_VOICE_CONNECTION_BORDER_POLISH=deferred
UI_VOICE_CONNECTION_BORDER_POLISH_VI6_BLOCKER=false
UI_VOICE_CONNECTION_BORDER_POLISH_VI5_REOPEN_REQUIRED=false
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI6_SCOPE=false
VI_7_STARTED=false
VI_7_READY_TO_START=true
STAGING_VPS_EXISTS=true
STAGING_DEPLOYMENT_PERFORMED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

The next action is a separate VI.7 preflight/reconciliation, followed by its
own implementation decision. The accepted VI.6 artifact may be rolled out to
Staging separately; that operational action is not part of this closure.

## 32. VI.7 Final Visual Regression / Polish preflight — completed 2026-09-06

`READ_ONLY_DISCOVERY / RECONCILIATION / IMPLEMENTATION_READY`. This preflight
inspected the accepted production Web source at HEAD without changing production
source, CSS or tests and without running tests, typecheck, lint, a build, a
browser, local runtime or Staging. It does not start VI.7 or reopen VI.3–VI.6.

### 32.1 Precheck, authority and frozen state

The required precheck passed on branch `historical visual identity refresh work`, HEAD
`vi6 auth entry and system states milestone`, parent
`bootstrap and route system states milestone`, subject
`docs(brand): accept vi6 auth entry and system states milestone`. Tracked worktree
and index were clean; only the allowed untracked `docs/design/` remained, and it
was not read, modified, staged, moved, cleaned or deleted by this task.

Authorities inspected were this contract, the current UI/UX roadmap,
`AI_CONTEXT.md`, repository `AGENTS.md`, and the current dedicated F.4, F.5
Invite/Entry, F.5 Server Settings/Invite Administration, F.5 Channel/Category,
F.6 Voice, F.7, Member/Voice convergence and permissions contracts where their
behavioral boundaries were relevant. The repository `likecord-ui-review` skill
was consulted only as a static audit rubric. It did not create scope, override
an accepted decision or authorize implementation. No Superpowers workflow or
subagent review was used.

VI.3, VI.3R, VI.3R2, VI.3R3, VI.4, VI.4R, VI.4R2, VI.5 and VI.6 remain complete,
accepted and frozen. VI.6 remains accepted from source
`bootstrap and route system states milestone` at OCI index
`sha256:ce0c8af17701225f58dc6736f44c760ad75912488daab827d7d0f1a7e6b12c23`
and immutable Web reference
`ghcr.io/ryezuo/likecord-web@sha256:ce0c8af17701225f58dc6736f44c760ad75912488daab827d7d0f1a7e6b12c23`.
No accepted source or artifact identity changed.

### 32.2 V01–V10 findings

| Matrix item | Static preflight finding | Disposition |
|---|---|---|
| V01 — Brand/assets | The tracked canonical icon exists at the accepted path and its SHA-256 remains `c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949`; production uses only `/brand/likecord-icon.png`. The board and presentation are not production dependencies. The supplied wordmark still requires a clean export, the small mark is still required, and favicon is unchanged. | `NO_ISSUE` for the accepted icon; explicit `ASSET_DEPENDENCY` for unavailable derivatives, nonblocking to VI.7. |
| V02 — Auth/Home | Accepted VI.6 Auth/Entry depth, fields, actions, banners, icon use and local overflow are internally consistent with the VI.2 controls; accepted Home containment and modest 56px icon remain deliberate. No source evidence justifies reopening either surface. | `NO_ISSUE`; reuse accepted VI.3/VI.6 evidence and run final visual regression only. |
| V03 — ServerRail/ChannelSidebar | Depth, separators, radii, selected markers, disabled rows, truncation and Add Server geometry remain coherent. The active server buttons and active Text Channel lack the truthful `aria-current="page"` already used by Home and Settings, and the `+` Add Server rail action lacks its direct accessible name despite Tooltip text not being a programmatic name. | One bounded `TRUE_VI7_POLISH_CANDIDATE`; routing, selection and callbacks stay frozen. |
| V04 — Chat/Composer/Attachments | Message rows remain unboxed; Composer, attachments, delete dialog and semantic failure states retain the accepted hierarchy. The floating `.new-message-indicator` alone keeps a literal one-off shadow and `filter:brightness()` hover instead of the existing `--shadow-low` and brand-hover roles. | One bounded `TRUE_VI7_POLISH_CANDIDATE`; scroll anchoring/counting/action stays frozen. |
| V05 — Menus/Modals/Settings | Context menus, modals, Settings rows, dense administrative separators, controls and destructive states use the accepted depth/token model. Ordinary `.user-menu-item:hover` is the remaining accent-filled menu hover and the only production `#fff` theme literal, diverging from neutral ordinary ContextMenu rows. Danger hover remains intentionally filled. | One bounded `TRUE_VI7_POLISH_CANDIDATE`; Presence/status command and menu interaction stay frozen. |
| V06 — Member/Voice | Member/Voice rows, connected/speaking/non-color cues, mix controls and popovers remain coherent. `.member-panel-error` retains the pre-foundation old-red RGBA instead of `--bg-danger-subtle`. The observed `.voice-connection` bottom separator redundantly divides two rows already contained by the elevated UserPanel and conflicts with the accepted quiet footer composition. | Two bounded `TRUE_VI7_POLISH_CANDIDATE` items; VI.5 and Voice behavior remain frozen. |
| V07 — Screen Share | Current Gallery/Focus/DETACHED/HIDDEN, presenter/viewer chrome, contain/no-crop media bed, LIVE/danger, local preview and elevation assignments remain deliberate and token-based. The 800px media-layout adaptation is local specialization, not mobile architecture. | `NO_ISSUE`; optional media/fullscreen/drag/resize/MINIMIZED work remains outside VI.7. |
| V08 — Accessibility/zoom/viewport | Global focus-visible, reduced-motion and forced-colors foundations remain present. The bounded navigation names/current metadata above can be corrected without behavior. The pointer-only UserPanel status opener/menu model and any broader creation-dialog focus/Escape model require interaction ownership, not visual metadata alone. No runtime contrast, zoom, clipping or forced-colors claim is made by static inspection. | Bounded navigation metadata is `TRUE_VI7_POLISH_CANDIDATE`; interaction-model work is `FUNCTIONAL_OWNER_REQUIRED`; final browser evidence remains mandatory. |
| V09 — Functional regressions | Static inspection found no new API, realtime, schema, Auth, messaging, Voice/WebRTC, Screen Share, permission or lifecycle change. This preflight did not reproduce or clear any functional debt. | `NO_ISSUE` for VI.7 scope; a material reproduction during implementation/validation is a STOP and routes to its owner. |
| V10 — Cross-surface consistency | Background/depth roles, border hierarchy, radius roles, typography, spacing, shared actions/inputs, modal/menu elevation, status cues, focus and scarce gradient policy are otherwise coherent. The exact cross-surface deltas are the menu hover, member error tint, floating new-message control, Voice separator and navigation semantics above. | `VI7_IMPLEMENTATION_REQUIRED=true`; one coherent final-polish slice, no generic cleanup. |

### 32.3 Classification and exact implementation decision

`TRUE_VI7_POLISH_CANDIDATE` is limited to the following six bounded deltas:

1. In `apps/web/src/app/globals.css`, remove only the
   `.voice-connection` `border-bottom`; keep padding, density, connected copy,
   success cue, actions, Voice ownership and the accepted elevated UserPanel.
2. In the same stylesheet, make ordinary `.user-menu-item:hover` use
   `var(--bg-hover)` and `var(--text-primary)`; keep status dots, current-row
   styling, danger hover and all Presence/status behavior unchanged.
3. In the same stylesheet, replace `.member-panel-error`'s legacy
   `rgba(218, 55, 60, 0.15)` background with `var(--bg-danger-subtle)`; keep
   text, retry behavior, geometry and MemberPanel lifecycle unchanged.
4. In the same stylesheet, give `.new-message-indicator` the existing
   `var(--shadow-low)` and token-native `var(--accent-hover)` hover instead of
   the literal shadow plus `filter:brightness()`; keep pill geometry, count,
   scroll ownership and click behavior unchanged.
5. In `apps/web/src/components/layout/ServerRail.tsx`, add the direct
   `Add Server` accessible name and expose `aria-current="page"` only on the
   active server, matching the already accepted Home current-page semantics.
6. In `apps/web/src/components/layout/ChannelSidebar.tsx`, expose
   `aria-current="page"` only on the active Text Channel. Voice Channel
   join/leave state is not reinterpreted as page navigation.

These are one shared CSS/navigation/accessibility slice:
`VI7_PROPOSED_SLICE_COUNT=1`. Exact production owners are only
`apps/web/src/app/globals.css`, `apps/web/src/components/layout/ServerRail.tsx`
and `apps/web/src/components/layout/ChannelSidebar.tsx`. No new token, primitive,
component abstraction or source owner is justified.

`INTENTIONAL_DOMAIN_SPECIALIZATION` includes: the accepted secondary/tertiary
shell depth split; elevated menus/dialogs/popovers/DETACHED and low header/
presenter elevation; functional input/control outlines; dense Settings row
separators; unboxed chat/Voice/member rows; avatar/status circles, the floating
new-message pill and ServerRail geometry; semantic success/warning/danger/info
differences; dynamic persisted role colors; dynamic Tooltip/popover position;
media geometry and `object-fit:contain`; and the local Screen Share adaptation.

Static inline appearance in debug-only diagnostics and noninteractive Composer/
camera placeholders is `DEFERRED_EXISTING_DEBT` or `LEAVE_AS_IS`, not sufficient
VI.7 scope. Dynamic role colors, coordinates and media state are required.
Legacy duplicate/dead selectors, literal-equivalent radii and cleanup without a
current visual inconsistency are not implementation reasons. The defined brand
gradient has no application-surface consumer; no blur/glow, broad gradient,
`transition:all` or card proliferation was found. The four remaining
`!important` sites are the accepted reduced-motion reset plus the existing
private-toggle cascade and are not a VI.7 cleanup target.

`FUNCTIONAL_OWNER_REQUIRED` remains separate for the pointer-only UserPanel
status opener/menu keyboard model, the inert User Settings placeholder control,
and any broader creation-dialog focus/Escape/trap redesign. VI.7 must not add a
new focus/menu/dialog model or imply that these behaviors were fixed.

The `.voice-connection` classification is therefore
`UI_VOICE_CONNECTION_BORDER_POLISH=vi7_candidate`. It is a bounded final
cross-surface polish delta, not a VI.6 blocker and not a reason to reopen VI.5.

### 32.4 Preserved debts, assets and responsive boundary

The clean canonical icon remains accepted. Wordmark is
`clean_export_required`; the small mark is `required`; favicon is `unchanged`.
No reference asset was transformed or regenerated, and
`ASSET_DEBTS_BLOCK_VI7=false`. Final acceptance must record these limitations
rather than fabricating derivatives.

Screen Share fullscreen, stream volume/mute or other media controls, PiP-like
controls, DETACHED drag/move/resize, MINIMIZED, Media Viewer/Lightbox, message
layout ideas, permission-aware future controls and responsive/mobile information
architecture are `OUTSIDE_VISUAL_IDENTITY_FINAL_ACCEPTANCE`. None was promoted.

`UX-RESPONSIVE-01` remains `PREEXISTING_PRODUCT_LIMITATION` and unimplemented.
VI.7 may validate current desktop behavior at 100%/125%/150%, representative
desktop windows and reduced height, including local wrapping/clipping. It may not
create ServerRail/ChannelSidebar drawers, tablet IA or a broad breakpoint redesign.

`PRESENCE-01`, `UI-MSG-SENDER-FLICKER-01`, Username→UUID, the Mute/Deafen matrix,
server-mute-on-join, multi-tab Voice, Voice reliability/ICE, `TURN-TLS-01`,
Backup/Restore/VPS Operations, `TEST-HARDEN-01`, `QA-GATE-01`,
`SEC-APP-AUDIT-01`, `SEC-DAST-01`, `RC-STABILIZATION` and
`RC-SECURITY-GATE` keep their separate owners and current statuses. A visual
smoke or non-reproduction does not mark any fixed.

### 32.5 Exact later validation and STOP boundary

No tests ran in this preflight. The later implementation slice should use the
canonical focused command with exactly these existing owners:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/layout.test.tsx src/__tests__/navigation.test.tsx src/__tests__/channel-structure.test.tsx src/__tests__/chat-layout-scroll.test.tsx src/__tests__/member-list-realtime.test.tsx src/__tests__/voice.test.tsx
```

Then run the full package-declared Web Jest suite, Web typecheck, Web lint and
`git diff --check`. Tests may add only assertions for direct Add Server naming,
active server/Text Channel current-page metadata and the bounded stylesheet
rules; existing behavior tests remain the regression boundary.

Implementation must stop on a required edit outside the three production owners,
new state/handler/request/event/schema, route or scroll change, Voice/WebRTC or
Screen Share lifecycle/media change, Presence behavior, responsive IA, new
focus/menu/dialog interaction, or a newly reproduced material functional
regression. Such evidence routes to its functional owner.

Final human acceptance remains the existing V01–V10 matrix, not a parallel
checklist. The minimum new visual evidence is:

- real browser at 100%, 125% and 150% using 1440×900 and 1280×800 windows plus
  a recorded reduced-height desktop fixture; compare equivalent normal/hover/
  active/focus/disabled/destructive states and long/wrapping content;
- V01 canonical asset delivery/shape at implemented sizes and explicit recording
  of unavailable wordmark/small-mark/favicon derivatives;
- V02 Auth/Invite/Add Server/Home regression, V03 Rail/Sidebar active/focus/
  disabled/long-list states, V04 new-message/Composer/attachment/delete surfaces,
  V05 user/context menus, dialogs and representative Settings rows, and V06 the
  connected Voice footer/member error plus representative participant/mix states;
- V07 one-to-four presenter Gallery/Focus/DETACHED/HIDDEN visual reachability and
  contain/no-crop, reusing accepted lifecycle evidence rather than rerunning a
  diagnostic battery without cause;
- V08 keyboard focus, names/current states, native controls, reduced motion,
  forced-colors focus and bounded overlays; V09 a representative non-destructive
  functional smoke; V10 side-by-side equivalent-control/state consistency and a
  final static token/literal/effect audit.

Historical VI.3–VI.6 and frozen feature-contract evidence may be reused for
already accepted routing, permission, messaging, Voice and Screen Share
lifecycle behavior. Local automation/static inspection is sufficient for the
exact source rules and semantic attributes. Real asset delivery/cache, public
Auth/Invite, multi-account permission surfaces and real Voice/Screen Share media
require the final Staging checkpoint where representative states are available;
destructive/unavailable fixtures are not manufactured merely to repeat B7/B8/B10.

`VI_7_FINAL_STAGING_VALIDATION_REQUIRED=true`. Because implementation is
required and the accepted VI.6 artifact has not been rolled out to Staging, do
not deploy VI.6 merely to replace it. Implement and validate the single VI.7
slice, publish one consolidated final Visual Identity Web candidate, deploy that
immutable Web candidate to Staging while preserving the API/infrastructure, then
execute and record V01–V10. This preflight performs none of those operations.

### 32.6 Documentation reconciliation and readiness

The section 8 sentence saying VI.6 implementation had not started and its active
VI.4–VI.6 exit summaries were `STALE_ACTIVE_SUMMARY`; they are reconciled above.
Sections 28–30 are `HISTORICAL_AND_CORRECT`, and section 31 makes their supersession
clear. The former roadmap/AI next-action wording became stale when this preflight
completed and is reconciled in its owning navigation documents. No historical
acceptance record was rewritten as current evidence.

```text
VI_6_COMPLETE=true
VI_6_ACCEPTED=true
VI_7_PREFLIGHT_COMPLETE=true
VI7_IMPLEMENTATION_REQUIRED=true
VI_7_CAN_START_IMPLEMENTATION=true
VI_7_READY_FOR_FINAL_VALIDATION=false
VI_7_STARTED=false
VI_7_COMPLETE=false
VI_7_ACCEPTED=false
VI7_PROPOSED_SLICE_COUNT=1
VI_7_FINAL_STAGING_VALIDATION_REQUIRED=true
UI_VOICE_CONNECTION_BORDER_POLISH=vi7_candidate
UI_VOICE_CONNECTION_BORDER_POLISH_VI6_BLOCKER=false
UI_VOICE_CONNECTION_BORDER_POLISH_VI5_REOPEN_REQUIRED=false
ASSET_DEBTS_BLOCK_VI7=false
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI7_SCOPE=false
UX_RESPONSIVE_01_IMPLEMENTED=false
PRESENCE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
WEBRTC_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
RUNTIME_CHANGED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
LIKECORD_UI_REVIEW_SKILL_CONSULTED_AS_AUDIT_RUBRIC=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/visual-identity-refresh.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=VI7_one_bounded_Web_only_polish_slice,VI7_final_Staging_validation_required,skip_intermediate_VI6_Staging_rollout
PROPOSED_OR_DEFERRED_IDEAS=existing_asset_derivatives,optional_product_presentation_and_functional_debts_preserved_outside_VI7
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=implement_the_single_bounded_VI7_Web_polish_slice_in_globals.css_ServerRail.tsx_and_ChannelSidebar.tsx_without_behavior_or_runtime_changes
```

## 33. VI.7 Final Visual Regression / Polish — implemented 2026-09-06

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PENDING /
FINAL_STAGING_VALIDATION_PENDING`. This section supersedes only section 32's
historical `VI_7_STARTED=false` readiness snapshot. It does not mark VI.7 or
`VISUAL_IDENTITY_01` complete or accepted.

### 33.1 Precheck and exact implementation

The precheck matched branch `historical visual identity refresh work`, HEAD
`vi7 final visual regression and polish milestone`, parent
`vi6 auth entry and system states milestone` and subject
`docs(brand): plan vi7 final visual regression and polish`. Tracked worktree and
index were clean; only the allowed untracked `docs/design/` remained, and it was
not read, modified, staged, moved, cleaned or deleted.

The single authorized slice changed only these production owners:

1. `.voice-connection` no longer has the redundant bottom separator; all other
   geometry, connected presentation, controls and Voice ownership remain intact.
2. Ordinary `.user-menu-item:hover` now uses `--bg-hover` and `--text-primary`;
   its literal white is removed and the existing danger hover is unchanged.
3. `.member-panel-error` now uses `--bg-danger-subtle` for its background only.
4. `.new-message-indicator` now uses `--shadow-low`, and its existing hover
   selector uses `--accent-hover` instead of a brightness filter.
5. The existing Add Server button has the direct accessible name `Add a Server`;
   only an active server outside Home exposes `aria-current="page"`.
6. Only an active Text Channel exposes `aria-current="page"`; Voice Channels,
   inactive channels and categories do not.

`apps/web/src/__tests__/layout.test.tsx` adds focused semantic assertions for the
Add Server name, mutually truthful Home/server current-page metadata and active
Text Channel metadata, including absence on inactive and Voice Channel controls.
No CSS property snapshot was added.

### 33.2 Automated evidence and boundary audits

The exact focused command from section 32.5 passed 6/6 suites and 144/144 tests
with zero snapshots. The full package-declared Web suite passed 33/33 suites and
537/537 tests with zero snapshots. Web typecheck passed. Web lint passed with
0 errors and the unchanged 87 warnings; the existing TypeScript parser-version
notice remains a harness warning, not a VI.7 failure. `git diff --check` passed.

The final diff preserves every event handler and existing active-state source.
No router call, canonical URL, route state, server/channel ordering, Home/Add
Server callback, context menu, category collapse, Voice Channel permission or
occupancy behavior changed. The new-message indicator trigger, count, click,
scroll-to-latest and anchoring are unchanged. Member loading/error/retry,
Presence and grouping are unchanged. Voice join/leave, connected state,
mute/deafen, transport and WebRTC are unchanged. No additional production owner
was required.

The static visual audit found exactly the six authorized changes: the scoped old
red RGBA, literal menu white, one-off indicator shadow, brightness filter and
Voice separator are absent from their target rules, while current-page metadata
has the intended Text/Server-only reach. The diff adds zero literal theme colors,
gradients, one-off shadows, blur/glow, `!important`, static inline presentation
styles or theme tokens. It changes no layout geometry and introduces no seventh
polish item.

The repository `likecord-ui-review` result for this slice is:

- `KEEP`: accepted shell depth, compact navigation/member/Voice rows, danger
  hover, focus/selection styling, geometry and all frozen behavior;
- `SIMPLIFY`: only the redundant Voice connection bottom separator;
- `SYSTEMIZE`: ordinary menu hover, MemberPanel error tint and new-message
  elevation/hover with existing tokens, plus truthful existing navigation
  metadata without a new interaction model;
- `WATCH`: the final real-browser V01–V10 comparison at 100%/125%/150% and
  reduced height. No browser or Staging PASS is claimed here.

### 33.3 Remaining acceptance and documentation impact

`VI7_REMAINING_IMPLEMENTATION_SCOPE=none`. The implementation candidate is ready
for exactly one consolidated immutable Web publication, followed by a Web-only
Staging rollout that preserves API and infrastructure, then the existing V01–V10
real-browser acceptance. Until that evidence is recorded,
`VI_7_COMPLETE=false`, `VI_7_ACCEPTED=false` and
`VISUAL_IDENTITY_COMPLETE=false`.

The canonical icon and its accepted SHA-256 are unchanged. The clean wordmark,
small mark and favicon limitations remain respectively `clean_export_required`,
required and unchanged. Screen Share media controls, `UX-RESPONSIVE-01`,
Presence, messaging/Voice reliability, operations, QA, security and RC debts
retain their separate owners and statuses. No build, image publication, runtime,
Staging, Prisma, migration or database action occurred.

```text
VI_6_COMPLETE=true
VI_6_ACCEPTED=true
VI_7_PREFLIGHT_COMPLETE=true
VI7_IMPLEMENTATION_REQUIRED=true
VI_7_STARTED=true
VI_7_IMPLEMENTED=true
VI_7_AUTOMATED_VALIDATION_PASS=true
VOICE_CONNECTION_BOTTOM_BORDER_REMOVED=true
USER_MENU_ORDINARY_HOVER_NEUTRALIZED=true
USER_MENU_LITERAL_WHITE_REMOVED=true
MEMBER_PANEL_ERROR_USES_DANGER_SUBTLE=true
NEW_MESSAGE_INDICATOR_SHADOW_TOKENIZED=true
NEW_MESSAGE_INDICATOR_BRIGHTNESS_FILTER_REMOVED=true
ADD_SERVER_DIRECT_ACCESSIBLE_NAME=true
ACTIVE_SERVER_ARIA_CURRENT_PAGE=true
ACTIVE_TEXT_CHANNEL_ARIA_CURRENT_PAGE=true
VI7_REMAINING_IMPLEMENTATION_SCOPE=none
VI_7_MANUAL_VALIDATION_PENDING=true
VI_7_FINAL_STAGING_VALIDATION_PENDING=true
VI_7_COMPLETE=false
VI_7_ACCEPTED=false
VISUAL_IDENTITY_IMPLEMENTATION_COMPLETE=true
VISUAL_IDENTITY_COMPLETE=false
FINAL_VISUAL_IDENTITY_WEB_CANDIDATE_READY_FOR_PUBLICATION=true
SCREEN_SHARE_MEDIA_CONTROLS_DEFERRED=true
SCREEN_SHARE_MEDIA_CONTROLS_VI7_SCOPE=false
UX_RESPONSIVE_01_IMPLEMENTED=false
PRESENCE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
WEBRTC_CHANGED=false
SCHEMA_CHANGED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
LIKECORD_UI_REVIEW_USED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/visual-identity-refresh.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=existing_asset_derivatives_and_optional_product_functional_debts_remain_outside_VI7
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=publish_exactly_one_final_consolidated_immutable_Visual_Identity_Web_candidate_from_the_resulting_HEAD_without_intermediate_publication_or_deployment
```

## 34. VI.7 final acceptance and VISUAL_IDENTITY_01 closure — recorded 2026-09-06

This section supersedes the pending acceptance markers in section 33. The
complete `VISUAL_IDENTITY_01` milestone is formally accepted and frozen based
on the user-supplied final publication, Staging and browser evidence below.

### 34.1 Final implementation and automated evidence

VI.7 is the single bounded Web-only six-delta polish slice from source
`visual regression polish milestone`, with no remaining implementation
scope. The six authorized deltas and the unchanged functional boundaries are
recorded in section 33. Focused Web Jest passed 6 suites/144 tests and the full
Web suite passed 33 suites/537 tests, both with zero snapshots. Web typecheck
passed; lint passed with 0 errors and 87 unchanged warnings; `git diff --check`
passed. Static audit values were all zero for new literal theme colors,
gradients, one-off shadows, blur/glow, `!important`, static inline presentation
styles and theme tokens.

### 34.2 Final immutable artifact and Staging evidence

The accepted Web publication is exactly:

| Identity | Value |
|---|---|
| Source | `visual regression polish milestone` |
| Historical publication | `historical WEB image: visual regression polish milestone` |
| OCI index | `sha256:e6032fe6f213d228f906c70e06fe43723bf79209a74eed1494392c4bb5fb6647` |
| linux/amd64 application manifest | `sha256:5dc107683d37723b890dc0f8eb6151f9b5d497369d4ef6588b8ce3f82d96b392` |
| Provenance/attestation manifest | `sha256:a016e1cf6dc403f8b6e7e90b718792a05401be20f0770d2c0debe12fc5d52ae7` |
| Immutable deployment reference | `ghcr.io/ryezuo/likecord-web@sha256:e6032fe6f213d228f906c70e06fe43723bf79209a74eed1494392c4bb5fb6647` |

The exact immutable Web artifact was deployed to the existing Staging
environment through the manual-operator workflow. The Web was healthy with
restart count 0; public Web and API health returned HTTP 200. API, Caddy,
coturn, PostgreSQL and Redis were exactly preserved by container ID, image ID,
configured image reference, `StartedAt`, restart count, running state and
configured health state. No rollback was required and no API image was deployed
by this Web-only acceptance.

### 34.3 Final human acceptance and closure markers

The final user-supplied acceptance matrix passed:

```text
V01=PASS
V02=PASS
V03=PASS
V04=PASS
V05=PASS
V06=PASS
V07=PASS
V08=PASS
V09=PASS
V10=PASS
ZOOM_100=PASS
ZOOM_125=PASS
ZOOM_150=PASS
REDUCED_HEIGHT=PASS
VOICE_MULTI_CLIENT=PASS
SCREEN_SHARE_MULTI_CLIENT=PASS
SCREEN_SHARE_3_PRESENTERS=PASS
SCREEN_SHARE_4_PRESENTERS=PASS
OBSERVATIONS=none
```

The canonical product icon remains byte-identical. `LIKECORD_WORDMARK_STATUS` is
`clean_export_required`, `LIKECORD_SMALL_MARK_ASSET_REQUIRED=true`, and
`LIKECORD_FAVICON_CHANGED=false`; these limitations do not block completion.
Functional debts, deferred capabilities and the formal pre-RC gate order retain
their existing owners and are not marked fixed by this acceptance.

```text
VI_7_STARTED=true
VI_7_IMPLEMENTED=true
VI_7_AUTOMATED_VALIDATION_PASS=true
VI7_REMAINING_IMPLEMENTATION_SCOPE=none
VI_7_MANUAL_VALIDATION_PENDING=false
VI_7_MANUAL_VALIDATION_PASS=true
VI_7_FINAL_STAGING_VALIDATION_PENDING=false
VI_7_FINAL_STAGING_VALIDATION_PASS=true
VI_7_COMPLETE=true
VI_7_ACCEPTED=true
VISUAL_IDENTITY_IMPLEMENTATION_COMPLETE=true
VISUAL_IDENTITY_COMPLETE=true
VISUAL_IDENTITY_ACCEPTED=true
VISUAL_IDENTITY_CONTRACT_FROZEN=true
VISUAL_IDENTITY_FINAL_SOURCE_MILESTONE=visual regression polish milestone
VISUAL_IDENTITY_FINAL_OCI_INDEX=sha256:e6032fe6f213d228f906c70e06fe43723bf79209a74eed1494392c4bb5fb6647
VISUAL_IDENTITY_FINAL_APPLICATION_MANIFEST=sha256:5dc107683d37723b890dc0f8eb6151f9b5d497369d4ef6588b8ce3f82d96b392
VISUAL_IDENTITY_FINAL_ATTESTATION_MANIFEST=sha256:a016e1cf6dc403f8b6e7e90b718792a05401be20f0770d2c0debe12fc5d52ae7
VISUAL_IDENTITY_FINAL_PLATFORM=linux/amd64
VISUAL_IDENTITY_FINAL_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:e6032fe6f213d228f906c70e06fe43723bf79209a74eed1494392c4bb5fb6647
FINAL_VISUAL_IDENTITY_STAGING_DEPLOYMENT_PASS=true
ALL_NON_WEB_SERVICES_EXACTLY_PRESERVED=true
WEB_ROLLBACK_PERFORMED=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
POST_VI_PRODUCT_UX_01_STARTED=false
POST_VI_PRODUCT_UX_01_READY_TO_START=true
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
IMAGE_PUBLISHED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
PRISMA_EXECUTED=false
MIGRATION_EXECUTED=false
DATABASE_MUTATED=false
DOCUMENTATION_UPDATED=docs/product/visual-identity-refresh.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEXT_ACTION=perform_the_dedicated_POST_VI_PRODUCT_UX_01_read_only_preflight_without_reopening_VISUAL_IDENTITY_01
```

`VISUAL_IDENTITY_01` is now frozen. Reopening requires a material reproducible
regression, evidence invalidating this accepted result, or an explicit contract
change. The next product transition is a dedicated read-only
`POST_VI_PRODUCT_UX_01` preflight to classify all current FUTURE, OPTIONAL and
DEFERRED UI/UX work before RC; it is ready to start but not started.
