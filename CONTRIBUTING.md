# Continuing Likecord

Upstream development is frozen. The repository is archived and read-only; issues and pull requests may not be reviewed or accepted. Forks, experiments, modifications and independent maintenance are welcome under the applicable licenses.

Start with [README.md](README.md), [PROJECT_STATUS.md](PROJECT_STATUS.md), [ROADMAP.md](ROADMAP.md), the [architecture index](docs/architecture/README.md), and the relevant dedicated feature contract before changing behavior. Preserve the distinction between implemented behavior, accepted decisions, proposals, deferred work, and historical evidence. Keep new configuration values out of Git and never commit real credentials.

The workspace uses Node 24 and pnpm 9.15.4. Useful package scripts from the root are:

```bash
pnpm --filter @likecord/web run test:ci
pnpm --filter @likecord/web run typecheck
pnpm --filter @likecord/web run lint
pnpm --filter @likecord/web run build
pnpm --filter @likecord/api run test
pnpm --filter @likecord/api run typecheck
pnpm --filter @likecord/api run lint
pnpm --filter @likecord/api run build
```

Use isolated PostgreSQL and Redis when running API end-to-end tests. For Web Jest, use the declared `test:ci` lifecycle command, with test paths after `--` for focused runs. Run validation proportional to the change and document any environment limitation. A fork should choose its own review, release and security response policy.
