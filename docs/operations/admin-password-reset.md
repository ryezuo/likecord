# Administrative password reset — historical proposal

**Classification: HISTORICAL / NOT IMPLEMENTED.** This was an early tooling proposal, not an executable operation or a promised delivery stage. The proposed admin-reset-password.ts script does not exist, and its former nestjs Compose service name is not a valid current service. The earlier command, SQL, temporary-password output and schema assumptions have therefore been retired from this guide.

Current authenticated password changes and session revocation belong to the [Account Security contract](../product/account-security.md). The [first-user bootstrap](staging-first-user-bootstrap.md) initializes an empty deployment; it is not a password-recovery tool. Neither document implements the proposed administrator recovery path.

## Design considerations retained for a future proposal

A future recovery mechanism would need explicit product/security approval and implementation against the actual schema and session lifecycle. Useful review criteria include operator authorization and accountability, verified target identity, atomic credential/session handling, auditing without secrets, and a private, short-lived recovery channel. Temporary credentials must not appear in shell history, logs or shared output. Any forced-change behavior, expiry, notification or API permission model remains a design question, not a current requirement.

The superseded proposal is omitted from this archive. This historical summary is not a working command or evidence that account recovery exists.
