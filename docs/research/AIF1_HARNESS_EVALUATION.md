# AIF1 harness evaluation: direct SDK versus LangChain

Evaluation date: 17 October 2026, Asia/Kuching. Repository baseline: `9ef760cba8d41029131e5928a4c0224ac2c5304e`.
**Status: isolated technical comparison complete; direct SDK selected for the first bounded AIF
implementation. The broader AIF1 interface/schema/limit freeze remains open.**
No repository dependencies, lockfile, runtime, schema, or product behavior changed in this experiment.

**Recommendation: retain the direct SDK for the first bounded AIF implementation. Reconsider
`createAgent` only after its persistence and provider-admission integration passes the contract.** The
framework successfully exercised useful tool-loop, interruption, and recovery mechanisms. Its default
checkpoint representation and its model-call counter do not satisfy the selected privacy/budget
contract on their own. This is an integration gap, not evidence that the framework cannot satisfy it.
The direct baseline also lacks production conversation persistence; it is not a completed AIF solution.

## Method declared before execution

The protocol was saved in the isolated experiment directory before installing or executing either
candidate. Both used the same synthetic task, scripted OpenAI Responses-compatible loopback server,
fixture credential, expected read/write results, and fake application gateway. Client fetch rejected
all destinations except `127.0.0.1`; final runs explicitly disabled LangSmith/LangChain tracing.
No real provider calls, real keys, user content, or production database were used.

Required transport/control-flow checks: `store: false` on recorded calls; no provider-managed
`previous_response_id`; explicit output caps; zero hidden retries on HTTP 503; interruption before
reviewed effects; rejection without effects; duplicate-effect prevention through the gateway;
unknown tools not dispatched; bounded model loops, timeout/cancellation, and deletion of checkpoint
content. Diagnostics separately inspect retained raw provider data and compaction behavior.

Experiment bounds were six main-loop model calls, two-second HTTP timeout, no retries, output caps
of 1,024 for narration and 2,048 for compaction, and a 40-message synthetic history. These are test
settings, not the application's final run/retention limits. Timings used five warmups followed by
30 sequential samples per candidate, interleaving candidate order. Each timing sample constructed
the client/agent and performed two loopback requests plus one read tool, without checkpointing.

The scripted server does not interpret user instructions and is not a complete OpenAI emulator.
Results therefore do not establish model accuracy, semantic authorization, prompt-injection
resistance, real token/cost differences, or live provider compatibility.

## Exact evaluated dependency trees

Registry metadata was retrieved with `npm view`; isolated installs used exact top-level pins,
`--ignore-scripts`, and generated separate npm lockfiles. Node was `24.14.1`, npm `11.11.0`, and the
host was macOS/Darwin arm64 on Apple M4 Pro. The repository's pinned package manager was unchanged.

| Candidate | Explicit pins | Declared licenses |
| --- | --- | --- |
| Direct baseline | `openai@6.48.0`, `zod@4.4.3` | Apache-2.0, MIT |
| Framework | `langchain@1.5.18`, `@langchain/core@1.2.18`, `@langchain/langgraph@1.5.1`, `@langchain/openai@1.6.2`, `@langchain/langgraph-checkpoint-postgres@1.1.0`, `zod@4.4.3` | MIT for these direct packages |

The framework lock resolved `openai@7.36.0`, `pg@8.23.1`,
`@langchain/langgraph-checkpoint@1.2.0`, `@langchain/langgraph-sdk@1.12.5`, and `langsmith@0.11.0`.
Resolved license identifiers across that tree were MIT, Apache-2.0, and ISC. Package declarations were
checked; this is not a legal opinion or approval to upgrade the application's SDK/database driver.
Adding the candidate to Omplish may retain both SDK major versions rather than replace the existing
one, so the isolated size is not the incremental production size.

`npm audit --omit=dev --json` reported **zero advisories in each isolated tree** on the evaluation
date. This does not clear the existing repository audit or prove absence of reachable vulnerabilities.
Registry release provenance/integrities and complete resolved trees are in the experiment archive.
Primary package references: [LangChain 1.5.18](https://www.npmjs.com/package/langchain/v/1.5.18),
[LangGraph 1.5.1](https://www.npmjs.com/package/@langchain/langgraph/v/1.5.1),
[OpenAI integration 1.6.2](https://www.npmjs.com/package/@langchain/openai/v/1.6.2), and
[PostgreSQL saver 1.1.0](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres/v/1.1.0).

## Results

The final correctness/diagnostic run recorded **22 passing assertions and zero failures**. Diagnostic
success means an observed behavior was reproduced; it does not convert a privacy failure into approval.

| Fixture | Direct SDK | `createAgent` |
| --- | --- | --- |
| Read tool followed by final response | Two requests; expected result | Two requests; expected result |
| Streaming text | Expected text | Expected text from structured text blocks |
| HTTP 503 | One request, then failure | One request, then failure |
| Timeout and explicit abort | Bounded failure, one request each | Bounded failure, one request each |
| Unsupported `execute_sql` tool | Rejects immediately; zero effects | Supplies tool error to model; one additional request; zero effects |
| Repeated read-tool loop | Stops after six model requests | Stops after six model requests |
| Reviewed command approval/rejection | Handwritten suspended fixture; zero effects before approval | Actual approval middleware interruption; zero effects before approval |
| Duplicate replay after simulated committed-result loss | One fixture effect; changed-input reuse rejected | Same, using the same application gateway |
| Compaction | Two requests; reduced final model input | Two requests; reduced final model input |
| Checkpoint failure after committed fixture effect | Not implemented in direct baseline | Injected saver failure, then same-thread resume: one total effect |
| Checkpoint deletion | Not applicable: no baseline saver | Thread lookup absent and measured stored payload zero after deletion |

All 48 recorded HTTP requests in the main correctness run passed wire assertions. Streaming,
tool continuation, and compaction used `store: false`, explicit output caps, and no
`previous_response_id`. The OpenAI integration was explicitly configured with `useResponsesApi`,
`modelKwargs: { store: false }`, zero retries, timeout, and strict tool schemas; defaults alone were
not relied upon. See the [official integration](https://docs.langchain.com/oss/javascript/integrations/chat/openai).

The first run's streaming assertion failed because the fixture consumer concatenated structured
content as a string. The consumer was corrected and the complete suite rerun. A strict TypeScript
6.0.3 API-surface check passed with `skipLibCheck` after explicitly annotating the tool callback from
its Zod schema; the initial implicit destructuring selected an unsuitable overload. This is a small
signature check, not Omplish's application typecheck or a complete dependency declaration audit.

## Two adoption blockers reproduced

**Default checkpoints retain prohibited provider detail.** The read-tool fixture created ten
MemorySaver snapshots containing 42,247 measured bytes of serialized payloads and keys. An injected
raw provider metadata marker appeared in stored state through `AIMessage.response_metadata`; the
fixture API credential did not. A real adapter must sanitize before the framework persists any model
state, including intermediate writes, rather than sanitize only the final response. Confirm that
removing provider fields preserves required tool/reasoning protocol continuity. No such adapter was
implemented or validated here.

Compacting the 27,691-byte history reduced final model input to **2,855 bytes direct / 2,988 bytes
framework**. The framework still retained the oldest synthetic history marker in **202,095 bytes**
of checkpoint payloads/keys. These counts are neither PostgreSQL disk use nor JavaScript heap use;
they sum serialized byte buffers and UTF-8 keys/strings. Context reduction does not delete retained
history or old checkpoints. Retention, provenance, deletion fencing, and memory invalidation remain
application requirements. See [checkpoint persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence).

**The main-loop counter does not bound every model call.** A separate regression configured
`modelCallLimitMiddleware({ runLimit: 1 })` together with summarization. It made **two actual HTTP
requests**: one summary call and one main model call; the reported main-loop count was one. Therefore
U06 must admit/count every provider attempt, including separate summarizer instances. The library's
loop limiter is useful additional containment, not the deployment/user budget authority. The pinned
middleware source hashes and request captures accompany the report.

## Resource measurements and their limits

| Measurement | Direct | Framework |
| --- | ---: | ---: |
| Installed package directories in isolated lock | 2 | 40 |
| Installed regular-file logical bytes | 16,562,513 | 83,422,330 |
| Two-request fixture median | 0.595 ms | 2.930 ms |
| Two-request fixture p95 | 0.797 ms | 3.729 ms |
| Cold adapter import median, five fresh processes | 26.462 ms | 174.442 ms |
| Process RSS after import, median | 68,042,752 bytes | 197,804,032 bytes |

The framework install includes the PostgreSQL saver even though this run used MemorySaver.
Import measurements include each experiment adapter's imports and Node overhead, not an optimized
Next bundle. Filesystem and OS caches were not flushed; unrelated host activity was not controlled.
Do not extrapolate these numbers to production throughput, provider latency, browser transfer,
Electron installer size, or user-visible speed. They establish additional local overhead to budget,
not that a few milliseconds outweigh the framework's orchestration value.

## PostgreSQL saver review

The installed `1.1.0` implementation was inspected and hashed. It accepts a supplied pool;
`fromConnString()` creates another pool. `setup()` creates schema/tables and applies its own migration
list. Checkpoints include JSONB and binary payloads. `deleteThread()` removes its own checkpoint,
blob, and pending-write rows transactionally, but does not authorize an actor, delete application
conversation/receipt data, or fence a concurrent later write. See the primary
[saver source](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-postgres/src/index.ts)
and [migration source](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-postgres/src/migrations.ts);
the archived hashes identify the exact installed version reviewed because upstream branches move.

No PostgreSQL saver connection, DDL, migration, restart, contention, pool utilization, or grant test
was performed. Adoption still requires the exact [data-model exception](../DATA_MODEL.md), managed
migration path, pool ownership/budget, versioned serialization, deletion fencing, and restricted
runtime grants. A framework checkpoint is not atomic with the application's domain transaction.

## Decision and remaining evidence

The technical comparison is complete and supports retaining the existing direct SDK for the first
bounded AIF implementation. The evaluated framework configuration fails current privacy/admission
criteria; no new runtime package is approved. A future framework proposal must first demonstrate
**sanitized checkpoint persistence plus shared admission**, followed by actual PostgreSQL
interruption/restart/deletion tests. Application-owned command policy, receipts, idempotency, and
Undo remain necessary with either harness.

Still unproved: semantic instruction matching and corrections, real provider quality/cost, production
authorization and one-task-per-turn policy, exact approval binding, SQL/receipt atomicity, real
process recovery, concurrent turns, deletion versus commit races, memory invalidation/recompaction,
export, provider-absent UI, and actual build/desktop size. No production-readiness or AIF1 closure is
claimed. [AIF1.1](../IMPLEMENTATION_PLAN.md) must still freeze the interfaces/schema/limits with these
observations; the technical choice does not close the larger work package.

The remaining contract review must decide exact instruction/target/field and confirmation-revision
binding with deny fixtures; typed command/change and conversation/run dictionaries; cancellation,
lease and deletion transitions; logical expiry versus guaranteed purge; enforceable byte/call/time/
storage limits; memory invalidation of retained context; and the export version. Proposed token
numbers are targets until an actual counting/enforcement mechanism is validated. These are planning
decisions; production SQL race/migration evidence belongs to AIF2/AIF4, with combined native artifact
evidence in AIF5. They do not block U00/U01.

Planning estimate for the selected direct path:

| Remaining package | Engineering hours |
| --- | ---: |
| AIF2: commands, receipts, safe Undo | 32–56 |
| AIF3: conversational interaction proof and revisions | 16–28 |
| AIF4: history, bounded context and lifecycle integration | 48–80 |
| AIF5: integrated verification and release review | 20–36 |
| Total | 116–200 |

This estimate excludes unfinished AIF1 review, urgent repairs, N01, approval/device waiting, and
other release features. Re-estimate after the exact contract freeze; no delivery date is implied.

## Reproduction artifact

The [experiment archive](artifacts/aif1-harness-2026-10-17.tar.gz) contains the predeclared
protocol, readable fixture source, both manifests/lockfiles, registry metadata, audits, request
captures, measurement samples, source hashes, and final/initial diagnostics. It excludes
`node_modules`, symlinks, and macOS metadata and contains only synthetic content and public package
metadata. No real credentials or user data are included. The archive is a research artifact, not a
runtime dependency or production fixture.

SHA-256: `daa86f04f67a7c814b12ce7b20aa1dd0e4b5c430a43762101e46d20a930012f4`.

Run from the repository root; extraction uses a fresh temporary directory:

```sh
aif1_extract_dir="$(mktemp -d /tmp/omplish-aif1-reproduce.XXXXXX)"
tar -xzf docs/research/artifacts/aif1-harness-2026-10-17.tar.gz -C "$aif1_extract_dir"
cd "$aif1_extract_dir/aif1-harness-2026-10-17/direct"
npm ci --ignore-scripts --no-audit --no-fund
cd ../framework
npm ci --ignore-scripts --no-audit --no-fund
cd ..
./run.sh
```

The fixture requires permission to bind loopback. No live API key is needed. Audit results are
time-sensitive; refresh `npm audit --omit=dev --json` in both isolated directories before adoption.
