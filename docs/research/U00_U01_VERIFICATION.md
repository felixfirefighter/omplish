# U00/U01 implementation and verification

Review date: 17 October 2026, Asia/Kuching. This records local checkpoint evidence, not release
approval. The working-tree patch is uncommitted; no push, deployment, or publication was performed.

## Baseline and isolation

| Item | Recorded baseline |
| --- | --- |
| Source | `9ef760cba8d41029131e5928a4c0224ac2c5304e`, branch `dev`, clean working tree |
| Lockfile SHA-256 | `8152a6e3c9db1d292e83a2799bb10b7ecadfc6337d5692f01ee82dfdc2d21312` |
| Runtime manifest SHA-256 | `82f2305b3a2569e29be7f372b9974cc92ea7a9f160a7aa4971a3dd22fe9672e7` |
| Host | macOS arm64, Node `24.14.1`, pnpm `11.14.0` |
| Baseline quick gate | 144 unit-test files, 692 tests passed; no baseline full-release pass claimed |
| Native access | macOS arm64 host only; no installer acceptance on any target |

The lockfile and committed runtime manifest remain unchanged. Tests used synthetic profiles and a
disposable PostgreSQL container/database. Compose used an isolated project with its own volume.
External AI was disabled. No real provider credential or user dataset was used.

## Repairs and regression evidence

| Finding | Countermeasure | Evidence |
| --- | --- | --- |
| Desktop publication bypassed canonical prerequisites | Reuse same-SHA verification, restrict write permission to publication, and explicitly fail the missing U10 native gate | `tests/scripts/desktop-release-workflow.test.ts` and static workflow review |
| CI built a different tag from Compose | Build `omplish:local`; capture its image ID; require both services to run that ID after `--no-build` | Exact-image local Compose smoke; remote clean-runner proof remains open |
| Staging containment/pins were unsafe | Native relative-path checks, canonical source/output overlap checks, symlink/junction-ancestor rejection, reviewed archive/hash/metadata checks before deletion, immutable manifest | CLI sentinel-preservation regressions plus POSIX/Windows/UNC path matrix; 34 script tests |
| Ordinary bootstrap could delete a personalized demo actor | Ensure/resume any valid session; keep explicit authenticated reset separate; legacy empty requests become nondestructive | `tests/db/workspace-continuity.test.ts`, existing atomic-reset/cross-user tests, browser retry/export comparisons |
| Allocation limits blocked existing users | Resolve the valid session before charging fresh allocation | Real-DB exhausted-limiter regression |
| Optional provider settings blocked startup | Bounded optional read and explicit manual fallback; never rewrite the stored credential during launch | Real unreadable-credential browser fixture, unchanged stored bytes, successful manual check-in/task view |
| Accepted cookie/lost body or missing display name disrupted resumption | Retry authoritative reads, retain the entered name, and resume completed onboarding rather than first-run key setup | Red/green component regression and browser storage/reload/same-actor assertions |
| Empty HTTP streams differed from direct Request fixtures | Opt in to bounded zero-byte JSON compatibility only on `/demo`; reject malformed/nonempty input | Shared HTTP tests and actual production HTTP requests |

The destructive retry and release/staging regressions were demonstrated before their fixes. The
missing-name UI transition was also reproduced in both the production browser and a failing
component test before repair. Visual inspection then caught a mobile notice/header overlap; a
failing bounding-box assertion reproduced it before moving the notice inside the existing flow.
No schema, runtime pin, package, CSS, or token change was required.

Test-harness repairs preserve the current behavior contract: expect export schema v2, scope catalog
index assertions to the fixture schema, avoid a seeded tag-name collision, initialize browser
timezone before preference-save tests, select dark theme explicitly, and use visible route/font
readiness instead of unbounded network-idle waits. Reorder fixtures use an owned two-task list
instead of assuming the seeded Inbox is empty. The Calendar accessibility test still reports
its genuine failure; no axe rule was disabled.
Keyboard drag tests wait for the pickup announcement before movement, matching the installed
sensor's deferred key-listener attachment. Design measurements tolerate only 0.001 CSS px of
floating point noise; semantic target sizes remain unchanged.

## Verification

| Check | Result |
| --- | --- |
| Format, lint, boundaries, TypeScript, design static checks, secret scan | Passed |
| Unit suite | 147 files, 734 tests passed; final missing-name assertion also rerun separately |
| Real PostgreSQL suite/migrations | 31 files, 91 tests passed |
| Worker smoke and production route build | Passed; worker registered zero jobs |
| Final Docker build and exact-image Compose | Passed; health/security headers, shared image, Node PID 1, zero-job worker, graceful stop |
| License inventory | Passed: 367 production packages and two vendored OFL fonts |
| U01 browser cases | 32 passed across 1440, 1024, touch 1024, and 390 px; changed-flow axe/overflow checks and final notice non-overlap assertions passed |
| Affected G1 task/recovery and G4 export | 10 task/recovery cases and 3 export/recovery cases passed after fixture corrections |
| Responsive design contracts | 17 applicable cases passed across six configured widths/pointer targets after the measurement correction; final 1440/1024/390 notice captures inspected |
| Broader accessibility audit | 12 applicable cases passed; 1 failed in the unchanged empty mobile Week calendar |
| Required production dependency audit | Failed: 3 critical, 15 high, 22 moderate, 4 low advisories |
| Full release gate | Not green; no release/candidate sign-off |

Final local image ID:
`sha256:6d3e00b135372aa837c499c5ece41c22cfa4d8e6d01d97fa31db18a8022c6697`.
The image was built from the runtime changes under review, not a committed remote candidate.

The broader mobile audit found `scrollable-region-focusable` in the empty Week calendar frame.
That unchanged presentation surface needs keyboard access; its open repair is recorded in P0.2.
It is distinct from the changed launch-flow accessibility checks. The dependency audit remains U02.
`pnpm verify` did not complete in one uninterrupted passing run: earlier fixture failures were
repaired; its last run stopped at browser startup because an interrupted test left port 3107 occupied.
The leftover test process was removed and affected browser checks were rerun separately.
The larger final browser run also captured stale tag/count/measurement failures; the corrected
task-loop/design cases and keyboard drag were rerun independently. Counts above describe applicable
unique cases across those runs, not a single green full-suite invocation. Configured project-specific
exclusions are retained in the raw results. No required platform gate is represented as passed by a skip.

Raw local logs, baseline metadata, screenshots, and structured audit results are under the ignored
`artifacts/u00-u01/` directory. The repository regression tests are the repeatable evidence; local
logs do not establish remote CI or native platform success.

## Remaining boundaries

- U00.3 still needs clean-runner execution evidence; U10 must implement same-artifact native gates
  before the explicit publication block can be replaced. No existing executable is certified.
- Browser cookie-loss recovery remains deferred. A new actor after loss of the entire anonymous
  first response does not recover the earlier actor; the earlier records remain intact.
- Cookie renewal and OS-protected desktop recovery remain U05/U09. Port continuity here is a
  real-DB application test with an existing cookie, not packaged native recovery evidence.
- The independent [AIF1 comparison](AIF1_HARNESS_EVALUATION.md) selects the existing SDK and approves
  no new framework dependency. AIF1's exact interface/schema/limit freeze remains open.
