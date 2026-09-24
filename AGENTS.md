# Repository Agent Governance

This file contains durable working rules for AI and coding agents in this
repository. It governs how work is performed; it is not a source of current
product behavior, architecture, API, database, runtime, stage, or backlog facts.

## Documentation governance

- Keep one clear current source of truth per domain.
- Put facts in the dedicated document that owns them.
- Prefer links to authoritative detail over copying that detail elsewhere.
- Preserve useful history while making superseded material unmistakable.
- Keep process lightweight and proportional to the work.
- Do not add volatile project facts to this file.

## Authority and precedence

When documents disagree, use this precedence order:

1. Current dedicated or versioned domain and feature contracts.
2. The current roadmap for stage order, status, and UX.
3. Broad product baselines.
4. General architecture documentation.
5. Acceptance and audit records as historical evidence.
6. README and `AI_CONTEXT.md` as navigation only.
7. Superseded or historical documents, which never override current contracts.

Specific, current, versioned documentation takes precedence over broad or
duplicated summaries.

`AI_CONTEXT.md` is a navigation and index document. It is not authoritative over
dedicated feature specifications, API contracts, database contracts, the
permissions model, security plans, or operations runbooks.

## Ideas vs accepted decisions

Classify new information before documenting it:

- `PROPOSED`: an idea or option that has not been accepted.
- `DECISION_ACCEPTED`: an explicitly accepted normative decision.
- `IMPLEMENTED`: behavior implemented and validated against its contract.
- `DEFERRED`: accepted work intentionally postponed.
- `HISTORICAL`: evidence or context about a past state.

Do not silently turn brainstorming, suggestions, or alternatives into
requirements. Normally, only accepted decisions, implemented behavior, and
explicitly accepted deferred work update authoritative documentation. When the
classification is unclear, report the possible documentation impact instead of
inventing authority.

## Documentation impact assessment

Before finishing relevant planning or implementation work, determine:

- Did the task create or change a product decision?
- Did observable behavior change?
- Did an API, database, realtime, or permission contract change?
- Did stage, status, or acceptance state change?
- Did an active Markdown statement become stale?
- Is a new dedicated contract needed?
- Is the information merely historical evidence?

If documentation is affected:

- Update only the authoritative documents that own the information.
- Search for directly conflicting duplicated statements.
- Update, subordinate, or supersede conflicting active statements.
- Prefer links over duplicated detailed rules.
- Do not rewrite historical evidence to resemble the newer state.

## Preventing documentation drift

- Do not treat every Markdown file as equal authority.
- Avoid adding the same normative rule to several broad documents.
- When duplication is unavoidable, identify the authority and link to it.
- Keep navigation documents short and non-normative.
- Check nearby active documentation when a contract changes.
- Record supersession explicitly rather than erasing the historical record.
- Never use this file to mirror changing runtime, release, or backlog state.

## Feature and stage workflow

For significant feature or stage work:

1. Identify the authoritative feature or domain contract before implementation.
2. Reconcile documentation first when destructive or architecturally significant
   behavior is not adequately specified.
3. Implement against the accepted contract.
4. Validate the changed surface proportionally to its risk.
5. Reconcile the relevant contract and roadmap or status after implementation.
6. Do not mark work complete while required documentation remains inconsistent.

## Capturing decisions from conversations

Meaningful decisions made in user and agent conversations must persist in the
appropriate project documentation:

- `PROPOSED`: do not make it authoritative.
- `DECISION_ACCEPTED`: record it in the owning authoritative document.
- `DEFERRED`: record it in the appropriate roadmap or backlog only when accepted.
- `IMPLEMENTED`: reconcile documentation after validation.
- `HISTORICAL`: preserve it as evidence without granting current authority.

Do not store detailed feature facts in this file.

## Validation proportionality

Choose validation based on the changed surface, consequences, and uncertainty.
Do not automatically rerun broad security scans, runtime or container audits,
staging deployments, unrelated manual suites, or historical gate checks when the
current change cannot affect them.

Distinguish harness, environment, and tooling failures from implementation
failures before opening remediation work. Explain any validation that could not
run and what remains uncertain.

## Completed-gate discipline

Do not reopen completed security, runtime, or release gates merely for
reassurance. Reopen a completed gate only when:

- A new change materially affects the validated surface.
- New evidence contradicts the accepted result.
- Authoritative acceptance criteria explicitly require revalidation.

Do not mechanically repeat expensive validation unrelated to the change.

## Scope discipline

- Make only changes required by the task and its direct consistency needs.
- Do not duplicate volatile project state in this file.
- Do not turn brainstorming into requirements.
- Do not rewrite historical evidence.
- Do not reopen completed gates without evidence.
- Do not perform broad documentation rewrites unrelated to the task.
- Do not create process ceremony merely for ceremony.

The desired outcome is one current source of truth per domain, minimal
duplication, preserved history, low agent misread risk, and proportional
validation.

## Required completion report

At the end of relevant tasks, include:

Documentation impact:

- Updated: `<files or none>`
- New accepted decisions: `<items or none>`
- Proposed/deferred ideas not made authoritative: `<items or none>`
- Known stale documentation introduced by this task: `<none or list>`

And include these machine-readable markers:

```text
DOCUMENTATION_UPDATED=<files_or_none>
NEW_ACCEPTED_DECISIONS=<items_or_none>
PROPOSED_OR_DEFERRED_IDEAS=<items_or_none>
STALE_DOCUMENTATION_CREATED=<none_or_list>
DOCUMENTATION_CONSISTENT=<true_or_false>
```
## Testing

Use repository package scripts for validation. For Web Jest, use the
package-declared lifecycle command; do not use filtered `pnpm exec jest` as the
canonical runner in this environment.

For the full Web Jest suite, use:

    pnpm --filter @likecord/web run test:ci

For focused Web tests, pass paths after the explicit argument separator:

    pnpm --filter @likecord/web run test:ci -- <test-paths...>

Do not use `npx`, `pnpm dlx`, or a globally installed Jest. If the canonical
command cannot resolve the declared test runner, inspect dependency resolution
and local package state; do not install packages or silently switch runners.
If it cannot be resolved without mutation, report `TEST_HARNESS_UNAVAILABLE`.

If the runner fails before Jest launches, classify it as a harness failure, not
a test failure. Do not hard-code suite, test, or snapshot counts; report the
actual counts and PASS/FAIL result.

Use proportional focused validation during implementation and the full Web
suite when required by the owning task or contract. Before concluding that
tests cannot run, verify that workspace dependencies are installed. If
installation is separately permitted and `node_modules` is missing, run:

    pnpm install --frozen-lockfile

Do not modify tests or source code in response to a missing test-runner binary.

## UI / Visual Design

Likecord should feel intentionally designed, premium and product-focused rather
than generically AI-generated.

> Designed, not decorated.

> Brand expression should be concentrated, not uniformly distributed.

> Simplify accidental repetition, not intentional Likecord design decisions.

### Contract precedence

These principles complement, and do not replace, the current:

- [visual identity contract](docs/product/visual-identity-refresh.md);
- [UI/UX roadmap](docs/product/ui-ux-roadmap.md);
- owning feature or F-stage contract when behavior is involved.

The current owning contract takes precedence over generic visual-review
heuristics. Do not reinterpret accepted surface, token, asset, interaction or
state decisions merely because a generic anti-overdesign rule would prefer a
different treatment. Use the local
[likecord-ui-review skill](.codex/skills/likecord-ui-review/SKILL.md) for the
detailed review workflow; neither this section nor that skill creates a second
design system.

### Principles

Shadows, gradients, borders, radii, cards, animation and other effects are valid
design tools. Use them intentionally rather than habitually, and reuse existing
Likecord tokens and primitives before introducing variants.

Prefer establishing hierarchy primarily through:

1. layout;
2. spacing;
3. typography;
4. color and surface relationships;
5. borders/separators;
6. elevation and decorative effects where they add real value.

Premium does not mean stacking background, border, radius, shadow, gradient,
glow and blur to solve the same hierarchy problem. Use the minimum combination
that preserves clarity, depth, accessibility and identity.

- Respect the documented roles of the existing elevation tokens. Floating or
  layered UI may use elevation; ordinary surfaces follow their owning contract.
- Keep the violet/indigo/blue/cyan gradient scarce and brand-specific. Do not
  infer application-wide glow, blur, glass or gradient treatments from brand
  artwork, which may be richer than product chrome.
- Use cards for meaningful containment, not as the automatic shape of every
  section. Preserve explicit surface decisions such as ordinary chat messages
  remaining rows and legitimate Home or Settings containment remaining intact.
- Preserve useful communication-product density. Clean does not mean sparse;
  routine controls and navigation should not adopt marketing-page spacing.
- Use motion for state, feedback, continuity or spatial relationships. Avoid
  generic decorative loops, widespread hover elevation/scale and `transition: all`.
- Keep focus, selection, speaking and semantic-state indicators distinct from
  decorative elevation.

Visual work must remain visual unless broader behavior is explicitly in scope.
Preserve routing, realtime behavior, permissions, Voice/WebRTC lifecycle,
Screen Share semantics, media ownership, scroll ownership and established
accessibility behavior.
