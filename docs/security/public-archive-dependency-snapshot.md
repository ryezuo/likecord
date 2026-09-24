# Public archive dependency snapshot — 2026-09-23

This is a bounded registry-advisory snapshot against the frozen pnpm lockfile, not exploitability analysis or a claim that a running deployment is safe.

**Follow-up:** The [2026-09-24 bounded triage](public-archive-dependency-triage.md) verifies the production counts, normalizes 19 high records to 16 unique advisories, reviews their Likecord paths, and separates source archival from Internet-facing deployment. The counts below remain the historical 2026-09-23 snapshot.

| Command | Scope | Result |
|---|---|---|
| `pnpm audit --prod --audit-level moderate --json` | 533 production dependencies reported by pnpm | 0 critical, **19 high**, 8 moderate, 2 low advisories; nonzero exit. |
| `pnpm audit --audit-level moderate --json` | 1,138 dependencies reported by pnpm | 0 critical, **31 high**, 11 moderate, 5 low advisories; nonzero exit. |
| `pnpm outdated -r --format json` | Workspace package comparison with registry | 48 packages with a newer `latest` than the locked version; no packages were changed. |

High-severity production advisories include `multer` (multiple denial-of-service reports), `js-yaml`, `brace-expansion`, `browserslist` and `nanoid`. The registry result also lists moderate/low findings in packages such as `@nestjs/core`, `file-type`, `qs` and `body-parser`. A package in the production dependency graph is **not automatically a reachable application vulnerability**; each finding needs route/build/runtime reachability, version, mitigation and fix review. Conversely, prior feature-stage acceptance does not dismiss these current advisories.

No dependency mass upgrade was performed during archive preparation. At the time of this snapshot, the high-severity production findings still needed reachability triage; the [follow-up report](public-archive-dependency-triage.md) now records that bounded review. Neither document describes this source as production-ready. Current source publication can still serve inspection and research; the [README](../../README.md) and [security policy](../../SECURITY.md) explicitly warn self-hosters to review and harden it.

The lockfile and manifests identify the actual versions. At freeze, the root requires Node `>=24.20.0 <25`, and pnpm `9.15.4` is declared. The package manager run emitted a Node `url.parse()` deprecation warning; the Web build and API build themselves completed. This snapshot does not imply a future advisory count.
