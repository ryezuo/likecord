# Security policy for the frozen archive

Likecord upstream development is frozen as of 2026-09-23. The GitHub repository is archived and read-only. **No security update, vulnerability triage, private response channel, or response time is guaranteed.** Do not send exploit details to a private email address inferred from Git history.

Before exposing a fork to the Internet, review the current code and configuration, run an independent security assessment, generate distinct high-entropy secrets, and rotate any copied example values. Protect `.env`, Compose environment files, database backups, object-storage credentials, JWT and TURN secrets, and registry credentials. Review Caddy/TLS, firewall, database/Redis exposure, coturn relay policy, session handling, file uploads, link previews, and dependency/container advisories. Test restore and incident procedures. The local Compose and development seed are **not** production configuration.

The [bounded archive dependency triage](docs/security/public-archive-dependency-triage.md) documents known affected versions and reviewed reachability. It supports an owner decision about publishing historical source; it does not accept risk or certify any Internet-facing instance.

The [public status snapshot](PROJECT_STATUS.md) lists unfinished security/reliability gates and known defects. Historical successful audits and feature acceptance apply to their exact candidates and do not certify a new deployment. Fork operators are responsible for security fixes and hardening. If the repository remains open for GitHub issues, a public issue is not an appropriate place to post live credentials or exploit details.
