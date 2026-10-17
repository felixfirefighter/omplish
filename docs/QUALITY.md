# Quality and audit contract

No package or release is complete because its happy path was demonstrated once. This document owns
the required evidence for the Local-first Full Release.

## Verification commands

| Loop | Commands | When |
|---|---|---|
| Fast | `pnpm lint && pnpm typecheck` plus owning focused tests | after each coherent edit |
| Module | lint, typecheck, owning unit/component/database tests | before lane handoff |
| Design | `pnpm verify:design` plus affected visual proof | every shared presentation/token/type/spacing/radius/target change |
| Browser | affected Playwright golden path plus `pnpm test:a11y` | after a committed user flow |
| Build | `pnpm build` | after route/env/build/service-worker changes and before handoff |
| Production | migration + web/worker/health/signal/PWA smoke | after schema, worker, Docker, or service-worker changes |
| Full | `pnpm verify` | at every package candidate and final release |

`pnpm verify` must fail on any required lint, type, unit, database, E2E, accessibility, migration,
worker, service-worker, or production-build failure added by the active package. Optional live OpenAI
and Web Push smokes are separately recorded because they require user-supplied configuration and
browser permission; deterministic/provider-degraded tests remain mandatory without those secrets.

Workers run focused checks in isolated worktrees. The integration owner runs shared database,
browser, Docker, worker, service-worker, and full gates centrally and sequentially.

Desktop publication calls canonical CI at the same commit and requires the U10 native-acceptance
gate. That gate deliberately fails while native evidence is unimplemented; build success or a
manual boolean cannot bypass it. Local script/workflow checks do not establish a remote Actions run.
Production CI supplies its freshly built image ID to the Compose smoke, which rejects cached or
different application images even when web and worker happen to match each other.

## Test architecture

### Unit and property tests

Own pure behavior close to its module:

- task state/ranking/parser and schedule/timezone rules;
- recurrence preset validation, bounded expansion, and occurrence identity/effective state;
- habit schedule, quantity, local-day, streak, and heat-map projections;
- Focus transition, accumulated-duration, reconstruction, and summary-window policies;
- reminder eligibility, next-occurrence, idempotency, retry, and stale-job policies;
- deterministic planner scheduling and strict versioned export/proposal contracts.
- deterministic Ameth XP thresholds, source idempotency, user isolation, and companion-data deletion.
- Level-3 Prompt Library unlock denial, same-user tag ownership, analysis no-save behavior, memory-cap eviction,
  local-day daily-mode reset, and provider-disabled companion fallback.

Freeze clocks, timezones, ranges, and ordering. No test may depend on the machine timezone, current
date, random order, live model output, wall-clock timer ticks, or real push delivery.

### Component tests

Use Testing Library at the interaction boundary. Cover semantic names, validation, focus, keyboard,
loading/empty/error/offline/permission/conflict/provider states, optimistic rollback, quick-add
confirmation, recurrence/occurrence actions, habit logs, Focus state controls, install/update state,
reminder permission/capability, and proposal diff editing. Do not assert generated class strings or
large DOM snapshots.

### Database integration tests

Use real PostgreSQL. Cover empty/upgrade migrations, constraints, indexes, transactions, concurrent
writes, and positive-owner/negative-cross-user cases for every user-owned aggregate. Specifically
prove occurrence uniqueness, one habit log per local day, one active Focus session, reminder/job
idempotency, encrypted subscription storage, atomic task/create-schedule/planner apply, and one
consistent authorized export snapshot.

### End-to-end and visual tests

Required projects remain:

- `desktop-chromium`: 1440×900;
- `tablet-chromium`: 1024×768;
- `touch-tablet-chromium`: 1024×768 coarse pointer;
- `mobile-chromium`: 390×844;
- `boundary-768-chromium` and `boundary-320-chromium` for design contracts.

Run each golden path on desktop/mobile when behavior is responsive. Use semantic selectors and
deterministic fixtures. P0 approval captures wait for loaded fonts and keep accessibility focus
evidence separate from presentation-clean comparison captures.

## Golden paths

### G1 — First run and core task loop

1. Enter a fresh isolated workspace through the profile setup dialog; Inbox/preferences exist.
2. Contextually quick-add and inspect a task.
3. Add priority, Markdown, tag, checklist item, subtask, organization, and schedule.
4. Reorder through keyboard-accessible controls; search; complete/undo; cancel/restore.
5. Verify active-use cookie and DB-session renewal. After clearing browser credentials, protected
   data/export remain denied; a new workspace is not recovery of the previous actor. Desktop recovery
   is verified separately in G10.

Forced: invalid input, stale update, atomic create/schedule failure, network/offline write, User B
guessing User A identifiers, failed launch → Retry, missing username with valid session, legacy
bootstrap calls (including zero-byte HTTP bodies), and unreadable optional provider settings.
Ordinary retries preserve existing data. An accepted cookie with a lost bootstrap body must resume
the same actor, restore the local display name, and survive reload. A synthetic unreadable encrypted
credential must remain byte-for-byte unchanged while manual startup succeeds.

### G2 — Plan across time

1. Create all-day and timed tasks in the configured timezone, including editable natural-language
   recognition.
2. See the same records in Today, Upcoming, month, week/day, agenda, and Matrix.
3. Drag/resize one event and edit another with the keyboard/touch form.
4. Open canonical task details from planning surfaces and update priority/schedule.
5. Cross local midnight/change timezone and confirm affected projections refresh.

Forced: DST gap/fold, schedule conflict, range boundary, overlap, empty calendar, and unauthorized
schedule/detail access.

### G3 — Reality-aware plan

1. Paste a brain dump, select owned unscheduled tasks, and set planning constraints.
2. Generate a strict proposal with estimates, rationale, uncertainty, and overflow.
3. Edit/deselect actions and inspect before/after values.
4. Refresh/reopen Review and recover the persisted proposal.
5. Apply explicitly and confirm one atomic idempotent update across projections.

Forced: no key, refusal, timeout, malformed/irrelevant output, unknown/cross-user record, stale
proposal, duplicate apply, and concurrent task change. Every pre-apply failure writes zero domain data.

### G4 — Core portability and release trust

1. Deliberately reset isolated demo twice with authenticated intent/confirmation and no shared state.
   Ordinary bootstrap and repeated legacy calls preserve customized actor data.
2. Export and validate the current versioned document.
3. Lose connectivity in an open page; rendered data stays visible/read-only and writes are disabled.
4. Clear the internal browser session; private routes/export cannot expose the previous actor's data
   without ownership proof. Browser cookie-loss recovery is deferred; creation cannot delete the old
   workspace or be presented as its recovery.
5. Repeat local health, migration, demo, and critical paths in a clean browser.

Forced: export failure, second-user fixture, database unavailable, missing providers, and duplicate
demo reset.

### G5 — Recurring task lifecycle

1. Create all-day and timed series from approved presets with an end condition.
2. See bounded occurrences in Today/Upcoming/Calendar/agenda/Matrix.
3. Complete one occurrence, skip another, undo each, and confirm the series stays open.
4. Edit/end future expansion and confirm past occurrence events remain stable.
5. Export the series and occurrence state.

Forced: invalid preset/range, cap boundary, DST, month-end, leap-day, cutover boundary,
duplicate/concurrent occurrence write, monotonic event `task_version`, stale series version, and
cross-user series/event access.

### G6 — Habit lifecycle

1. Create boolean and numeric habits across all three schedule types.
2. Check in, edit quantity/note, undo, skip, and mark unachieved from Today/detail.
3. Inspect seven-day, streak, and monthly history projections.
4. Archive/restore without losing history and export the data.

Forced: invalid discriminant/quantity, same-day concurrent write, ISO-week/DST boundary,
below-target open versus closed week, post-target edit/undo, offline/conflict, empty history, and
cross-user habit/log access.

### G7 — Authoritative Focus session

1. Start a Pomodoro linked to an owned task/habit; pause, refresh/reconnect, resume, and finish.
2. Run stopwatch and a break; confirm break time is excluded.
3. Inspect totals/history, correct one completed session, and delete another.
4. Export completed history.

Forced: simultaneous start race, hostile client clock, repeated transition, inaccessible link,
offline/reconnect, history-only error, and cross-user session access.

### G8 — Install and remind

1. Validate/install the PWA with original manifest/icons and open standalone.
2. Lose connectivity: an already open screen becomes read-only and a cold navigation reaches the
   content-free offline fallback.
3. From an explicit action, enroll push and set one absolute/relative reminder.
4. Run the worker and observe one privacy-safe logical delivery; click through to the owned task.
5. Reschedule/complete/delete/disable and confirm stale deliveries no-op; revoke subscription.

Forced: cache update/removal, no authenticated content in Cache Storage, unsupported/denied
  permission, no VAPID, known-disabled worker, configured-but-unverified worker liveness, duplicate
  job, invalid absolute recurring reminder, transient retry, permanent subscription failure,
  recurring next occurrence/DST, and cross-user reminder/subscription access.

### G9 — Full local release

1. From a fresh clone, install, start PostgreSQL, migrate, run web and active worker, and enter demo.
2. Complete representative G1–G8 beats with OpenAI/push configured and provider-degraded variants.
3. Export the full versioned data set and validate relationships/secrets exclusion.
4. Exercise production build/Compose health and clean SIGTERM shutdown.
5. Re-run in a clean signed-out browser and prepare only verified screenshots/video claims.

### G10 — Electron desktop release

1. On each supported target, install from a clean machine with no Docker, system Node/PostgreSQL,
   package manager, or internet connection.
2. Start the app twice, verify single-instance behavior, local database initialization, migrations,
   stable auth secret, loopback binding, and data under OS application data.
3. Complete representative manual G1–G4 workflows while offline; verify AI is visibly degraded but
   does not block manual work.
4. Upgrade from a previous fixture database, confirm migrations are applied safely, then close the
   app and verify PostgreSQL/Next child processes terminate cleanly.
5. Inspect the unpacked package for runtime binaries, source/version checksums, license notices,
   signing/notarization metadata, and absence of secrets or development services.
   Verify the packaged Electron entry's complete runtime import graph, including extracted modules;
   a smoke that imports compiled files from the checkout is not package-completeness evidence.
6. Run `pnpm electron:runtime-smoke -- --app-dir <unpacked-app>` in the release environment, then run
   `pnpm electron:smoke -- --app-dir <unpacked-app>` from the interactive native desktop session and
   retain both JSON results. Signed distribution also requires platform signing verification output;
   unsigned test/prerelease evidence must explicitly record unsigned status.
7. Enroll the desktop actor, expire/clear its cookies, change the port, and restart/upgrade; the same
   actor/task IDs must survive through OS-protected proof. Deny forged/foreign/revoked proof and
   untrusted enrollment; legacy profiles with no session or enrolled proof retain data without actor
   guessing. Reset cannot resurrect a deleted actor.
8. Verify fresh and legacy authenticated DB access, scoped migration/runtime roles, wrong/empty
   password and second-OS-user denial, interruption-safe upgrade, and full stopped-fixture restore.
   Test post-ready child failure and quit during startup; confirm owned processes actually exit.

Forced: missing runtime artifact, occupied loopback port, malformed local database, migration failure,
crash during startup/shutdown, second-instance launch, read-only install directory, no OpenAI key,
offline AI request, and attempted remote navigation from the renderer.

### G11 — Conversational planning and controlled execution

1. Start/reopen an owned conversation and request a day plan using current task context. Show
   understood constraints and an exact diff; inferred/bulk work waits for confirmation.
2. Confirm the specific plan; receive a committed receipt and inspect the same records in task/
   Today/Calendar views. Refinement never creates a second task representation.
3. Give an explicit allowed single-task correction. It executes once when reversible and unambiguous;
   inspect its receipt and Undo. Later edits make conflicting Undo fail safely.
4. Refresh/restart or lose the response after commit. Reconcile the original operation and display its
   result without replaying changes. A failed graph checkpoint cannot cause duplicate effects.
   Force provider refusal, timeout, or invalid final narration after a tool commits: the receipt
   remains applied even if the reply fails. A pre-command interpretation failure has no domain effect.
5. Continue with a long synthetic history; verify bounded prompt/results/calls, current-state reload,
   and relevant approved memory. Summary text cannot grant permission or invent current state.
6. Export history/visible receipts and approved memory. Delete the conversation during a pending run;
   derived content/checkpoints are purged and fenced work cannot recreate content or commit afterward.
   Disclose that tasks and separately approved memories remain, but associated receipts and assistant
   Undo become unavailable; deleted-thread Undo is denied. Edit, delete, and FIFO-evict saved memory,
   then resume/recompact: affected context is invalidated and old history cannot silently reactivate
   the removed/replaced saved preference. Retained transcript text has its separately disclosed life.
7. Disable the provider/network and complete the same task workflow manually. No queued/accepted
   instruction or successful effect is implied without a real server outcome.

Forced: ambiguous “yes”, multi-target command split across tool calls, unsupported destructive action,
prompt injection in retrieved text/history/memory/tools, foreign thread/record IDs, altered idempotency
payload, concurrent turns, stale schedule/task state, expired approval, cancellation and delete/commit
races, receipt failure, checkpoint-write-after-delete, provider timeout, quota exhaustion, and export
snapshot races. Exercise current production composition and real PostgreSQL for persistence effects.

Native G11 is required before distributing the conversational desktop package. AIF5 joins AIF4/N01
on the exact candidate and repeats U10's canonical/native artifact gates; an earlier U10 pass is
not certification of changed binaries. Later feature packages follow the same exact-artifact rule.
Live provider quality measurements are reported separately from deterministic/mocked-provider
acceptance. AIF1 freezes shared workloads, model/settings, repeated-run methods, semantic expectations,
and numeric resource/performance budgets before comparison. Deterministic acceptance requires zero
unauthorized writes, duplicate effects, and false success; mocked providers do not prove live quality.

## Package acceptance evidence

| Package | Required evidence |
|---|---|
| AIF1 | frozen authority/deny fixtures, schema and resource decisions, repeatable SDK/harness comparison with preset criteria; no inferred production safety from a spike |
| AIF2 | private command/receipt/Undo core, actual domain writers and real DB, controlled lifecycle-interface tests; no direct-AI activation or claim of real thread/checkpoint safety |
| AIF3 | approved conversational composition with deletion/receipt/Undo disclosure, design/a11y and deterministic browser evidence |
| AIF4 | real production thread/run/checkpoint integration, transactional fencing, history/context/export/delete/replay and post-commit reply failure tests, G11 before direct-AI activation |
| AIF5 | complete product-loop comparison, full web gates, combined AIF/N01 exact-SHA U10 artifact gates and native G11 before desktop sign-off |
| U00–U10 | A01–A09 mapped regressions, real-DB transaction/quota/admission tests, browser renewal, native auth/recovery/lifecycle/upgrade/restore evidence, exact-SHA artifact gates, and `pnpm verify`; browser recovery explicitly deferred |
| N01 | identifier/exception inventory, clean and existing-data migration/restart, identity/export continuity, final naming and artifact checks |
| LF00 | conflict-free contracts + existing-core baseline |
| P0 | reconciled baseline approval, approved changed proofs, current design/a11y/behavior non-regression; no automatic remigration |
| P1 | G1–G4 + atomicity/freshness/origin/provider-degraded tests |
| P2 | G5 + recurrence migration/time/range/ownership suites |
| P3 | G6 + habit migration/log/streak/time/ownership suites |
| P4 | G7 + Focus migration/state/race/clock/ownership suites |
| P5 | install/cache/fallback/privacy/offline-write audit |
| P6 | G8 push half + reminder migration/encryption/idempotency/provider/worker suites |
| P7 | G9 + expanded export/demo/fresh-clone/full audits |
| P8 | G10 + Windows/macOS installer/runtime/signing/offline/upgrade evidence |

## Candidate gates

### Visual-proof gate

P0 preserves the approved Editorial Focus baseline and reconciles App launch, Today, Calendar, task
detail, and populated inferred-plan review evidence. Reuse existing approval for unchanged design;
new/changed proofs require explicit screenshot approval before dependent rollout. Required light
captures are 1440 and 390, with representative dark and 768/320 boundary evidence. Missing current
checks remain open; recaptured screenshots are not implicitly approved. A requested revision is work.

AIF's primary conversation composition separately requires explicit approval of history, direct
command/receipt/Undo, inferred-plan confirmation, deletion, conflict/unknown-outcome, and provider-
absent proofs. Retain the approved foundation; earlier route approval is not approval of this layout.

### Stable submission-candidate gate

A new package may replace the existing fallback only when:

- its migrations/build and all affected golden paths are green;
- desktop 1440 and mobile 390 primary screenshots are approved where visuals changed;
- no blocker/critical defect, authorization/privacy regression, mixed design, dead later control, or
  failed package gate remains;
- the exact candidate commit, local run path, five-minute test, and known limitations agree.

Hosted deployment is optional for this goal. If used for the hackathon, it receives the same clean-
browser health/demo/privacy checks and is evidence, not a substitute for local reproducibility.

## Mandatory release audits

### 1. Scope and truth

- Diff every route/table/dependency/job/claim against `docs/SCOPE.md` and package order.
- Confirm Stage A–D surfaces and dead controls are absent.
- Confirm local-first is not described as offline-first and every optional provider has manual
  fallback/degraded state.

Failure: unapproved behavior, missing acceptance mapping, dormant later code, or misleading claim.

### 2. Architecture and modularity

- Run boundary lint; inspect cross-module imports/public exports and files over size guidance.
- Confirm route/React code has no Drizzle/business rules; domain has no framework/provider; worker
  calls notification application services rather than repositories from another module.

Failure: bypassed layer, ambiguous ownership, duplicate rule, shared feature widget, or catch-all.

### 3. Schema and migrations

- Compare every table/column/index/constraint with `docs/DATA_MODEL.md`; run empty and sequential
  upgrade migrations.
- Confirm no cloned occurrence tasks, stored streak/Focus totals, duplicate date/status, generic
  metadata/EAV, or unapproved JSONB.
- Review recurrence range, habit local-day, Focus active-session, reminder/delivery, and export query
  plans/ownership.

Failure: synonymous fact, missing constraint/index/tenant key, unreviewed migration, or projection
persisted as truth.

### 4. Entry and authorization

- Test local profile bootstrap and cross-user access to identity, all task/occurrence, habit/log,
  Focus, reminder/subscription, proposal, demo, and export surfaces.
- Review internal session cookies, exact origin/CSRF, rate limits, workspace bootstrap cache behavior,
  push enrollment, and existence-safe errors.

Failure: horizontal/vertical access, shared demo/cache leak, cookie-only authorization, or endpoint
existence disclosure.

### 5. Security, privacy, and logging

- Strict Zod/DB bounds; Markdown/XSS; CSP/headers; safe redirects; parameterized SQL; client-bundle
  secret scan.
- Logs/job/export/cache contain no user content, emails, sessions, OpenAI/VAPID keys, push endpoints,
  subscription auth, or provider payloads.
- Run secret, production dependency, font/asset, and license inventory gates.
- Audit bundled Electron/Node/PostgreSQL and image OS packages separately from npm. Desktop runtime
  credentials and recovery proof require native OS-permission/ACL and secret-exposure evidence.

Failure: exploitable input/output, content/secret exposure, unsafe private cache, or applicable
unresolved high/critical advisory/license conflict.

### 6. Time, recurrence, habits, and Focus correctness

- Run UTC, America/New_York, and Asia/Singapore fixtures across DST, midnight, month/year end,
  leap-day, week start, all-day/timed conversion, occurrence cap, habit weekly target, Focus pause/
  reconnect, and exactly-24-hour Matrix boundaries.

Failure: machine-timezone dependency, shifted date, duplicate occurrence/log/session duration,
unbounded expansion, or stored derived counter.

### 7. AI safety and correctness

- Reprove Structured Output/refusal, minimal context/`store:false`, allowed actions, diff/uncertainty/
  overflow, ownership/version/idempotency/atomic execution, and zero unconfirmed inferred/bulk writes.
- Direct commands require authenticated explicit intent, the server allowlist, tested compensation,
  and committed receipts. Retained transcripts/checkpoints cannot grant authority; every resumed
  command rechecks current state. G11 proves unknown-outcome reconciliation and deletion fencing.
- Recurring occurrences may be bounded context but AI cannot create/edit recurrence, habits, Focus, or
  reminders in this release.
- Prove shared deployment/actor admission across all provider operations and processes, including
  rejected-call zero dispatch, actor churn, cancellation, crash/lease expiry, and manual fallback.
  Use database time and bounded attempt/lease policy; distinguish local cancellation from upstream
  work actually stopping and never imply an exact currency budget from call limits.

Failure: autonomous/hidden write, illegal schedule/action, stale overwrite, or content oversharing.

### 8. PWA, reminder, and worker reliability

- Inspect manifest/service-worker scope, cache inventory/update/cleanup/offline fallback, push event/
  click handling, permission gesture, encryption, transactional enqueue, idempotency, retry/revoke,
  stale no-op, recurring next occurrence, cleanup, and worker signal handling.

Failure: private cached data, accepted offline write, stale build trap, double delivery, secret/content
job, reminder corruption, or provider/worker required for core boot.

### 9. Accessibility and responsive visuals

- Axe has no serious/critical issue on every active screen/state.
- Keyboard-only paths cover navigation, add/edit, dialogs, reorder, calendar alternative, proposal,
  occurrence, habit, Focus, install/update, reminder enrollment/revoke, and permission recovery.
- Inspect default/empty/loading/error/offline/permission/provider/conflict at 1440, 1024, 768, 390,
  and 320, plus light/dark/system, coarse pointer, 200% zoom, reduced motion, focus return, and target
  sizes.

Failure: blocked action, drag/gesture/color-only path, hidden focus, overflow, unreadable timer/chart,
serious/critical axe issue, or design-contract mismatch.

### 10. Reliability, reproducibility, and release evidence

- Rehearse DB/OpenAI/VAPID/worker/network unavailable, slow/duplicate/stale mutations, cache upgrade,
  retries, and clean shutdown.
- Follow README from a fresh clone through PostgreSQL, migrations, seed readiness, web, active worker,
  demo, golden paths, export, production build/Compose, and provider-degraded use.
- Verify video/screenshots/README describe the same release commit and expose no secrets/personal data.
- Automatic unsigned prereleases must wait for canonical and declared native gates for the same
  immutable source SHA and tested artifact checksums. Failed, cancelled, skipped, or missing required
  evidence blocks publication. Signed/notarized production distribution keeps its separate gate.

Failure: corruption, duplicate effective write/delivery, hidden setup step, unhealthy process,
unreproducible local demo, or unverified public claim.

## Defect policy

| Severity | Definition | Release rule |
|---|---|---|
| Blocker | data/security/privacy loss, cross-user access, cannot start/build/migrate, or candidate/demo impossible | must fix |
| Critical | active acceptance failure, autonomous/incorrect AI write, duplicate/corrupt reminder/timer/occurrence, or inaccessible primary action | must fix |
| Major | important recovery/responsive/provider-degraded path broken with documented workaround | fix before package integration unless contract declares limitation |
| Minor | cosmetic issue that does not impair action, readability, or trust | may document after required gates pass |

Do not downgrade because time is short. A cut requires the five-part user-authorized scope change.

## Final sign-off

The auditor reports release commit/environment, exact commands/results, U/AIF/LF00 and P0–P8 evidence,
G1–G11 at required widths, visual approvals, migration/worker/PWA/provider smokes, all ten audit
results, dependency/font/asset licenses, and contract-permitted limitations.

Sign-off is denied for any blocker/critical defect, failed required command, unmapped acceptance,
unchecked audit, unapproved P0 evidence, or falsely claimed external live smoke.
