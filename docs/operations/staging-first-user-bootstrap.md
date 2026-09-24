# Secure first-user bootstrap for Likecord staging

This is a manually executed, one-shot CLI command for an **empty staging database**. It has no HTTP route, is not part of API startup, does not run during migration/deployment, and never runs the development seed.

## Bootstrap model

The command creates exactly one `User` record:

| Entity | Created? | Why |
|---|---:|---|
| User | Yes | Required to log in and make the first authenticated request. |
| Server | No | The existing authenticated `POST /api/v1/servers` workflow creates it normally. |
| Membership | No | Created by the normal server-creation workflow. |
| Role | No | The normal workflow creates its `@everyone` role. The server owner receives owner semantics directly. |
| Invite | No | The first user creates a server and then an ordinary invite using the existing invite workflow. |
| Other entity | No | There is no global administrator model or bootstrap marker in the current schema. |

This is the minimum valid model: a user with no server can authenticate and call the normal server-creation endpoint. That existing service transaction creates the server, owner membership, default role, and default channels. The owner can then create an ordinary invite. Creating any of those records in the bootstrap would duplicate normal domain behavior and add unnecessary persistent data.

## Security properties

- The password is read from hidden interactive input in a TTY; it is not accepted through `BOOTSTRAP_PASSWORD`.
- Email and username may be passed using `BOOTSTRAP_EMAIL` and `BOOTSTRAP_USERNAME`, or entered interactively.
- The command prints neither password nor input values. Success output is generic.
- Password hashing uses the same shared Argon2id settings as normal registration.
- A transaction-scoped PostgreSQL advisory lock serializes competing bootstrap attempts.
- The transaction refuses existing email/username conflicts and refuses any database that already contains a user.
- No HTTP controller, Nest module registration, API route, Compose command, migration hook, or startup hook is added.

## Prerequisites

1. Build and deploy a new immutable API image that includes this change.
2. Verify `https://staging.example.com/api/v1/health` is healthy.
3. Confirm the staging database is intentionally empty of users. Do not use this command to add another administrator later.
4. Use an authorized VPS SSH session; do not run it from Docker Manager logs or as a Compose startup command.

The API Dockerfile needs **no change**. Nest compiles `apps/api/src/**/*` to `apps/api/dist/**/*`, and the runner stage already copies the complete `apps/api` directory. The production command therefore uses Node and compiled JavaScript; it does not rely on pnpm, ts-node, or source TypeScript being available at runtime.

## Exact operator procedure

Do not run the following as part of repository preparation. Run it once only after the new image is deployed.

1. Find the running API container for the `likecord-staging` Docker Compose project:

   ```bash
   docker ps --filter label=com.docker.compose.project=likecord-staging \
     --filter label=com.docker.compose.service=api --format '{{.ID}}'
   ```

2. Read the non-secret identity values without putting them in shell history:

   ```bash
   read -r -p 'Bootstrap email: ' BOOTSTRAP_EMAIL
   read -r -p 'Bootstrap username: ' BOOTSTRAP_USERNAME
   ```

3. Run the compiled command, substituting the container ID. It prompts once for the password without echoing it:

   ```bash
   docker exec -it -e BOOTSTRAP_EMAIL -e BOOTSTRAP_USERNAME <api-container-id> \
     node apps/api/dist/bootstrap/first-user-bootstrap.cli.js
   unset BOOTSTRAP_EMAIL BOOTSTRAP_USERNAME
   ```

4. Expect only `First-user bootstrap completed.`. Do not copy a password into an environment variable, command argument, Compose file, or shell history.

5. Log in at the public staging hostname using the new account. Create the first server through the ordinary UI, then create an ordinary invite for the second tester.

If the command reports that bootstrap is already complete or that email/username conflicts, stop. Do not delete data, do not run the development seed, and do not retry with an alternate account without an authorized data-recovery decision.

## Controlled non-TTY use

For an isolated test/automation environment only, the CLI can receive one password line through standard input when no TTY is attached. This enables automated verification without ever supporting a password environment variable. It is not the staging operator procedure.
