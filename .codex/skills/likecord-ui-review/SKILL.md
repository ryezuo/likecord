---
name: likecord-ui-review
description: Review or guide Likecord UI creation, substantial frontend styling, visual refactors, redesigns, design-system changes, and new user-facing components for hierarchy, consistency, restrained effects, accessibility, and generic AI-generated UI patterns while preserving the accepted Likecord identity and behavior.
---

# Likecord UI Review

Protect Likecord from accidental visual overdesign without enforcing flatness or
minimalism.

The standard is:

> Designed, not decorated.

> Brand expression should be concentrated, not uniformly distributed.

> Simplify accidental repetition, not intentional Likecord design decisions.

Use this skill for visual review and for substantial user-facing frontend work.
A review may correctly end with no production changes.

## Establish authority first

Before making visual judgments, read the current equivalents of:

- `AGENTS.md`;
- `docs/product/visual-identity-refresh.md`;
- `docs/product/ui-ux-roadmap.md`.

When a surface touches behavior, accessibility, Voice, Screen Share, routing,
realtime, permissions, messaging lifecycle or Settings interaction, also read its
current owning feature or F-stage contract.

Apply this precedence:

1. current dedicated/versioned owning contract;
2. current UI/UX roadmap for stage, status and UX;
3. broad baselines and general heuristics;
4. historical evidence only as evidence.

Specific accepted decisions override this skill. Preserve a surface explicitly
defined as elevated or shadowless, legitimate Home cards, dense Settings panes,
unboxed message rows, and distinct focus/selection/speaking indicators. Do not
reopen a completed stage or turn proposed/deferred guidance into a requirement.

This skill complements the design system; it does not create a second one.

## Inspect the real surface

Review the changed component in context rather than as an isolated screenshot or
grep result. Inspect as relevant:

- its parent layout and sibling surfaces;
- shared primitives, tokens and global styles;
- effective CSS cascade, including later overrides;
- typography, spacing, color, surface depth, borders and radii;
- responsive, overflow, focus and reduced-motion behavior;
- static inline appearance and dynamic inline values;
- rendered states at representative viewports when practical.

Search for patterns involving shadows, gradients, blur, glass, borders, radii,
cards, pills, nested containers, hover elevation, animation, glow and static
inline styles. Counts are leads, not findings: judge repetition, role and context.

Respect the status of reference assets in the visual-identity contract. Reference
boards are evidence, not application layouts or automatically approved production
assets. Do not repair masters, trace or redraw marks, recreate the wordmark with a
substitute font, or crop new production assets from presentation artwork.

## Reuse the existing system

Before adding a color, surface, border, radius, shadow, gradient, duration,
easing, type value or spacing value, look for the existing token or convention.

Likecord already defines the equivalent roles of `--shadow-low` and
`--shadow-elevated`. Do not create local shadow families merely for polish. If a
new elevation role is genuinely needed, treat it as a design-system decision and
explain why existing roles cannot represent it.

Repeated near-equivalents are candidates for `SYSTEMIZE`, not automatic deletion.
Examples include subtly different floating shadows, interchangeable radii,
nearly identical dark surfaces and local motion timings with the same purpose.

## Review visual intent

Shadows, gradients, borders, radii, cards, blur, animation, elevation and
decorative surfaces are allowed. The question is whether each treatment has a
distinct job.

Prefer hierarchy from:

1. layout;
2. spacing;
3. typography;
4. color and surface relationships;
5. separators and borders;
6. elevation and decoration where they add meaning.

When background, border, radius, shadow, gradient, glow or blur are stacked,
identify what each contributes. Simplify only concrete redundancy, and remove the
smallest unnecessary treatment. A valid result may still combine several effects.

### Elevation

Elevation is naturally useful for layering: dialogs, menus, popovers, tooltips,
detached surfaces, overlays and floating interaction. It should not be added to
every static surface, interactive element or card simply to appear premium.

Do not replace focus rings, selected markers, speaking rings or semantic status
indicators with shadow. Inset markers and rings that encode state are not the same
thing as decorative elevation; classify them by function.

### Brand expression

The violet → indigo → blue → cyan gradient is a scarce brand resource. Check the
owning contract before using it. Do not spread it across ordinary cards, routine
buttons, messages, semantic states, every selection or large application
backgrounds. The default CTA need not be gradient.

Do not infer global neon, glow, glassmorphism or backdrop blur from richer brand
artwork. Broad glass/blur usage would require an explicit design-system decision.

### Cards, borders and geometry

Cards are appropriate for semantic grouping, independent entities, interaction
ownership or real containment. Do not turn every section into a rounded,
bordered, elevated island. Consider rows, panes, rails, grouped lists, dividers,
surface changes, typography and spacing.

Review nested rounded containers, ubiquitous pills, repeated outlines and cases
where background + border + shadow communicate the same separation. Preserve
functional borders and intentional special geometry. Do not mechanically
normalize circles, status pills, rail markers or other accepted exceptions.

### Density and motion

Likecord is a real-time communication product. Preserve useful density in the
Server Rail, Channel Sidebar, chat, member list, Voice, Screen Share and Settings.
Avoid marketing-page whitespace, giant routine headings and oversized padding.

Use motion for state change, feedback, continuity or spatial relationship. Watch
for `transition: all`, generic bounce, continuous decorative loops, widespread
hover scale/elevation, competing animations and slow routine navigation. Preserve
existing reduced-motion handling and never change functional Voice, WebRTC,
reconnect or persistence timing during visual work.

## Protect behavior and accessibility

A visual task does not authorize structural or lifecycle refactoring. Unless the
user explicitly expands scope, preserve:

- routes and canonical navigation;
- state and scroll ownership;
- realtime and server-authoritative behavior;
- permission gates and reconciliation;
- Voice/WebRTC and media-sink ownership;
- Screen Share subscriptions and presentation semantics, including `HIDDEN`;
- focus, keyboard and accessibility contracts.

For visual changes, prefer existing tokens, CSS, explicit visual classes and
small bounded markup adjustments. Dynamic positions, persisted role colors,
media geometry and visibility-dependent values may appropriately remain inline.
Repeated static appearance is a candidate for shared classes or tokens.

If the request is review-only, report findings without changing production UI.

## Workflow

1. Identify the requested surface and whether the task authorizes review only or
   implementation.
2. Read the current authorities and record any surface-specific accepted
   decisions before applying heuristics.
3. Inspect component context, primitives, tokens, global styles and effective
   cascade. Search broadly enough to distinguish isolated treatments from
   repeated patterns.
4. Inspect the rendered result when practical and when visual evidence would
   materially improve confidence. Do not claim browser or staging validation that
   did not occur.
5. Classify only meaningful findings:
   - `KEEP`: intentional, coherent and useful;
   - `WATCH`: acceptable now, but repetition or drift deserves attention;
   - `SIMPLIFY`: concrete redundant or purposeless treatment exists;
   - `SYSTEMIZE`: a valid repeated treatment should reuse a shared token/pattern.
6. If implementation is authorized, make the smallest visual change that resolves
   a supported finding. Do not redesign adjacent surfaces or implement deferred
   features.
7. Validate proportionally: inspect the diff and effective styles, run focused
   checks for changed behavior-sensitive surfaces, and visually verify meaningful
   states when practical. Do not repeat completed gates for reassurance.

Do not force every category to appear. Zero `SIMPLIFY` findings is a legitimate
outcome.

## Completion report

For substantial work, report:

- `KEEP`, `WATCH`, `SIMPLIFY` and `SYSTEMIZE` findings that actually exist;
- design tokens and primitives reused;
- any new visual token and its justification;
- deliberate contract-driven exceptions;
- authorities and feature contracts consulted;
- visual, automated and diff validation actually performed;
- whether production UI or behavior changed.

End against this standard:

- designed, not decorated;
- polished, not overproduced;
- clean, not empty;
- expressive, not noisy;
- dense where useful;
- brand-rich where intentional;
- neutral where routine product UI should stay quiet;
- human-made rather than uniformly decorated.
