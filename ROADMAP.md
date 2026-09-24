# Frozen public roadmap

`PROJECT_DEVELOPMENT_FROZEN=true`
Freeze date: **2026-09-23**. This is a status map for readers, not a commitment to resume upstream development. [PROJECT_STATUS.md](PROJECT_STATUS.md) owns the detailed freeze snapshot; the [UI/UX roadmap](docs/product/ui-ux-roadmap.md) and dedicated feature contracts retain their historical stage decisions and acceptance evidence.

| Area | Freeze status | Next consideration for a fork |
|---|---|---|
| Core accounts, servers, messaging, permissions, moderation, user settings, visual identity, themes and avatar work | **DONE** at their accepted feature boundaries | Revalidate in the fork's deployment. |
| Voice and audio settings | **PARTIAL** as a product-wide reliability claim | Resolve mute/deafen matrix and stale Voice state after API restart. |
| Screen Share UX | **PARTIAL / KNOWN ISSUE** | Diagnose CALL crackling and complete SSUX.3 operator/browser rows. |
| Screen stereo | **DEFERRED** | Revisit only with explicit product need and controlled capture/receiver evidence. |
| Voice Connection Quality | **NOT STARTED** | Was a before-RC candidate after Screen Share closure. |
| Screen Share Capture Quality | **PROPOSED / NOT STARTED** | Define a new contract before implementation. |
| SFU architecture evaluation | **PROPOSED / NOT IMPLEMENTED** | Compare LiveKit and mediasoup after measuring mesh limits. |
| Test reliability, authenticated security review, backup/restore and release gates | **NOT STARTED or incomplete at freeze** | Do not infer a release candidate from prior feature acceptance. |
| Upstream development | **FROZEN** | Forks may continue independently; no upstream schedule is promised. |

The older [docs/roadmap.md](docs/roadmap.md) is an initial MVP plan, not a current completion checklist. Its unchecked boxes and time estimates do not override this freeze status or the dedicated contracts. The accepted post-visual-identity order and proposal distinctions are preserved in [docs/product/post-vi-product-ux.md](docs/product/post-vi-product-ux.md).
