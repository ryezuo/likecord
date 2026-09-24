# Likecord public archive preparation — completed historical report

**Task:** `LIKECORD_PUBLIC_ARCHIVE_01`
**Freeze date:** 2026-09-23
**Preparation milestone:** public archive preparation
**Classification:** HISTORICAL. Preparation findings below describe their original checks; publication was subsequently authorized and completed. The repository became public, the release was published and the repository was archived. The final archive subsequently adopted the single-root history policy described below.

## Starting state and selected baseline

The historical CALL diagnostics candidate included product, media, security, UX and handoff work absent from the earlier main baseline. It was selected as the archive source. Final publication established that application baseline on main; subsequent text cleanup retained the same production source.

The starting index/tracked worktree was clean. Four untracked images in `docs/design/likecord-brand-reference/` were pre-existing user work and were left untouched/uncommitted. At baseline there were 60 local branches, 46 remote-tracking branches and 17 tags. The connected GitHub repository metadata confirmed `ryezuo/likecord` was **private**, default branch `main`, and **not archived**. GitHub search returned no open PRs or issues. The signed-in GitHub Actions page displayed the initial “Get started with GitHub Actions” state, with no configured workflows or run/artifact list. No `.github/workflows` path exists in any locally reachable Git object. The old diagnostic candidate's image publication in GHCR was a manual registry operation, not a GitHub Actions workflow.

## Security and identifier review

The scan covered every reachable object from local and fetched remote refs and tags: 4,238 objects and 2,237 text blobs under 4 MiB. Ten larger text blobs were voice measurement process JSON files and were separately checked for credential and host patterns; six binary blobs were not text-scanned. Current tracked files, examples, test fixtures, Compose, shell scripts and documentation were also searched for credential formats, private-key headers, bearer tokens, credential assignments and URL passwords. This is a bounded heuristic scan, not a formal guarantee against every possible secret format.

The only key-like finding was `apps/api/src/link-preview/fixtures/localhost-test.key`, introduced in `secure fetch foundation milestone`; its adjacent README documents it as a disposable TLS test fixture for an isolated test host, not a service credential. The ignored local `.env` is **not tracked** and was not opened or committed. No real repository credential was identified, so that audit did not call for credential rotation or a security-driven history rewrite. The later owner-authorized archive rewrite is a separate lifecycle decision.

The owner's actual staging hostname was present in source/test examples and historic operational scripts/docs. It was generalized to `staging.example.com` in the current tree. An older hypothetical `branded-domain.example` deployment example was generalized to `example.com` in docs. The three Screen Share `SHA256SUMS` manifests in the original archive snapshot covered sanitized public script copies; [operations archive context](../operations/PUBLIC_ARCHIVE.md) explains the original evidence boundary. At that preparation checkpoint, older history still contained the hostname; **the owner explicitly accepted that historical identifier exposure**. That ancestry is no longer part of the active archive history. The preparation scan reported no personal SSH key path, workstation home directory, live token or VPS credential in the then-current tracked files. A later hygiene review identified a workstation path in a Voice spike generator, illustrating the identifier scan’s limits; it did not establish a credential exposure. The later Voice harness cleanup removed that workstation path. Historical source milestones and immutable image digests retain the relevant provenance without old Git locators.

## License, configuration and automation

The owner confirmed `ryezuo` as the MIT copyright holder. The root MIT license applies to Likecord-owned material. The bundled Jitsi/RNNoise component retains its Apache/MIT/Xiph notices in its existing notice file, linked from [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md). No bundled font or audio file was found; brand artwork provenance is recorded in the visual identity contract. An installed-package metadata pass read 1,066 unique package/version manifests: most reported MIT, Apache-2.0, ISC or BSD; it also found reciprocal or attribution licenses in installed dependencies (for example, Sharp's Windows package and `caniuse-lite`) and six manifests without a string license field. These packages are not relicensed by the root MIT file. The `pnpm licenses list --json` helper could not read one local package index file, so package metadata was inspected directly; any future binary/image redistribution by a fork still needs its own notice review. The former Likecord GHCR packages were subsequently deleted.

`.env.example` was narrowed to current application variables, marked local-only, and keeps the known development PostgreSQL value only for local Compose. `.env.staging.example` now includes the required dedicated link-preview cache secret placeholder. [Environment reference](../architecture/environment.md) distinguishes API runtime, Compose interpolation, Web build-time and one-shot bootstrap variables. Neither tracked template contains a live credential. The local development Compose still contains the intentionally known database password and must never be presented as production-safe. No GitHub Actions workflow exists to disable or remove; there is no automatic deploy, scheduled job, registry publication, or `pull_request_target` workflow.

## Validation and supply-chain snapshot

- Web canonical full suite: **PASS**, 70 suites / 931 tests / 0 failures / 0 snapshots. Jest emitted a `.next/standalone` haste-map name warning but ran successfully.
- Web typecheck: **PASS**. Web lint: **PASS**, 0 errors / 92 warnings. Web production build: **PASS**, 5 static pages.
- API default parallel unit suite: **FAIL under concurrent Web load**, 1 avatar-storage test exceeded its 5-second timeout; 31 suites / 459 tests passed. That focused test subsequently passed alone (14/14 tests), and the full API package lifecycle with `--runInBand` passed **32 suites / 460 tests**. This is a real test-reliability note, not evidence of a product regression.
- API typecheck and build: **PASS**. API lint: **PASS**, 0 errors / 161 warnings.
- Local and staging `docker compose ... config --quiet`: **PASS**. Docker warned that the sandbox could not read the user's Docker config file; configuration resolution still succeeded. No container deployment occurred.
- At the 2026-09-23 snapshot, `pnpm audit --prod` found **0 critical, 19 high, 8 moderate, 2 low** advisory records. The full dependency graph had **0 critical, 31 high, 11 moderate, 5 low**. The 19 high production records were untriaged at that point; none was fixed. `pnpm outdated -r` found 48 packages behind the registry's latest version. See [dependency snapshot](../security/public-archive-dependency-snapshot.md).
- Follow-up on 2026-09-24: a fresh production JSON audit repeated the counts and normalized the 19 high records to 16 unique GHSAs. [Bounded static triage](../security/public-archive-dependency-triage.md) found no demonstrated HTTP-to-affected-function path in the reviewed source, identified eight build/tool advisories, and recorded a separate raw upload body-size review concern. No dependency was fixed; owner risk acceptance was still pending at the time of that triage.

## Readiness matrix

| Category | Result | Notes |
|---|---|---|
| `GIT_HISTORY_SECRET_SCAN` | **PASS_WITH_NOTES** | Full reachable-ref heuristic scan; disposable TLS fixture and separately scanned large measurement JSON. |
| `CURRENT_TREE_SECRET_SCAN` | **PASS** | No live credential identified in tracked source/examples. |
| `ACTIONS_LOG_RISK` | **PASS** | No configured workflows, runs or artifacts exposed in the signed-in Actions page. |
| `INFRA_IDENTIFIER_AUDIT` | **PASS_WITH_NOTES** | Current staging hostname generalized; owner accepts historical exposure. |
| `LICENSE_AUDIT` | **PASS** | MIT with owner-approved `ryezuo` attribution. |
| `THIRD_PARTY_LICENSE_AUDIT` | **PASS_WITH_NOTES** | RNNoise/Jitsi notices retained; package licenses remain independent. |
| `ENV_TEMPLATE_AUDIT` | **PASS_WITH_NOTES** | Required link-preview placeholder added; local Compose remains development-only. |
| `README_COMPLETE` | **PASS** | Public entry, frozen state, self-hosting, defects and 100% Vibe Coded provenance. |
| `PROJECT_STATUS_COMPLETE` | **PASS** | Detailed current freeze snapshot. |
| `ROADMAP_COMPLETE` | **PASS** | Frozen status map and proposal/deferred distinctions. |
| `ARCHITECTURE_DOCS_COMPLETE` | **PASS_WITH_NOTES** | New index/config/self-hosting guides; old plans explicitly labeled historical. |
| `SECURITY_POLICY_COMPLETE` | **PASS** | No upstream update or response guarantee. |
| `CONTRIBUTING_COMPLETE` | **PASS** | Fork guidance without PR-review promise. |
| `OPERATIONS_DOCS_SANITIZED` | **PASS_WITH_NOTES** | Current hostname generalized, historical script sums regenerated and caveated. |
| `WORKFLOWS_SAFE_FOR_PUBLIC` | **PASS** | No repository workflows or Actions runs. |
| `DEPENDENCY_SNAPSHOT` | **OWNER_ACCEPTED_FOR_SOURCE_ARCHIVAL** | 19 high registry records / 16 unique advisories triaged; owner accepted the documented residual risk specifically for publication of frozen historical source. No advisory was fixed or deployment cleared. |
| `FULL_TEST_VALIDATION` | **PASS_WITH_NOTES** | Web full pass; API full pass in-band after concurrent-run timeout. API E2E/staging were not run. |
| `BUILD_VALIDATION` | **PASS** | Web/API production builds and Compose config passed. |
| `PUBLICATION_OUTCOME` | **COMPLETED_PUBLIC_ARCHIVE** | The owner accepted source-archival risk and subsequently authorized publication. Publication, release and archival completed; Internet-facing deployment remains outside that acceptance. |

**Owner decision — 2026-09-23 (America/Sao_Paulo):** `DEPENDENCY_RISK_OWNER_ACCEPTANCE=ACCEPTED_FOR_SOURCE_ARCHIVAL_PUBLICATION`. The owner accepted the residual risks in the [bounded dependency triage](../security/public-archive-dependency-triage.md) only for making frozen Likecord source public as a historical archive, study material, and base for forks. This includes awareness of the production snapshot (0 critical, 19 high, 8 moderate, 2 low; 16 unique high GHSAs), the bounded static reachability result, the prior heuristic secret scan with six binary blobs not textually scanned, and the previously accepted historical staging hostname exposure. The acceptance does not claim that exploitation is impossible, that advisories were fixed, that tests certify security, or that another environment or fork has the same risk.

**Completed publication decision:** the owner authorized publication of the frozen source, creation of the archive tag/release, public visibility and repository archival. The [README security notice](../../README.md), 100% Vibe Coded disclosure, MIT license, third-party notices, dependency reports, known defects and frozen/proposed roadmap boundaries remain applicable. `INTERNET_FACING_DEPLOYMENT_RECOMMENDATION=NOT_RECOMMENDED_WITHOUT_REMEDIATION` and `PRODUCTION_SECURITY_CERTIFIED=false`; source-publication acceptance did not assess or accept risk for a running VPS.

## Completed publication and preservation

The owner accepted a final archive containing one root commit on main, one annotated tag and one Release: [Likecord — Clean Public Archive 2026-09-24](https://github.com/ryezuo/likecord/releases/tag/archive-clean-2026-09-24). The tag and main identify the same root. Previous Git ancestry and raw operational packages are omitted; production application source, dependencies and runtime assets are unchanged by this history rewrite. Historical findings in this report and the feature contracts remain bounded to their original validation scopes. These archive changes do not reopen security or application acceptance gates. See [archive policy](../operations/PUBLIC_ARCHIVE.md) for the cache limitation and [operations history](operations.md) for retained lessons.