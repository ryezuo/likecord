# Operations records in the public archive

Likecord is a frozen public archive. The owner selected one branch, main, containing one parentless root commit, one annotated tag, archive-clean-2026-09-24, and one Release, Likecord — Clean Public Archive 2026-09-24. Main and the tag identify the same root. Earlier Git ancestry is omitted from the active repository history.

The [operations history](../history/operations.md) consolidates the former Voice VA.4, Screen Share SSUX.3, Audio64 and CALL diagnostics packages. Raw scripts, Python tests, operator/validation JSON and checksums removed during cleanup are not distributed in the final archive. Retained dated records describe their historical outcomes rather than promise access to the original receipts.

The [generalized staging runbook](staging-vps.md), [first-user bootstrap](staging-first-user-bootstrap.md) and [Screen audio cardinality diagnostics](screen-audio-cardinality-diagnostics.md) remain available for review by fork maintainers. The [administrative password-reset proposal](admin-password-reset.md) is historical and not implemented.

## Historical evidence limits

Source labels in retained documents are descriptive milestones, not resolvable Git revisions. Obsolete branch names and source commit locators were removed. OCI digests, SHA-256 checksums and upstream RNNoise provenance retain their original meanings; an image digest does not establish current availability or renewed validation.

At archive preparation, the staging hostname was generalized to staging.example.com. The former Screen Share checksum manifests described sanitized public script copies; older validation and release hashes described the original operator artifacts. Neither establishes that differently sanitized bytes were the ones deployed. The owner accepted the original historical identifier exposure.

The former Likecord GHCR Web/API packages were deleted after archival. A fork must build its own images and review its own DNS, secrets, volumes and runtime baseline. Never commit private resolved configuration, passwords, tokens or unredacted operator evidence.

## History and cache boundary

The history rewrite removes previous ancestry from public branches, tags and new clones. It does not certify physical erasure from GitHub storage, cached views, previously downloaded archives or external clones. A previously known object identifier may still resolve outside normal history.

## Cleanup boundary

Archive cleanup and the final history rewrite preserve production application source, runtime media, dependencies and lockfiles. The isolated [Voice/RNNoise research harness](../../tools/spikes/voice-audio/README.md) retains reusable tools and canonical summaries; superseded raw measurements and generators are omitted. The [publication report](../history/publication-readiness-2026-09-23.md) retains the earlier source-archive risk acceptance.
