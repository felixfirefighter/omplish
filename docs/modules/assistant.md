# Assistant module contract

`modules/assistant` owns conversational orchestration, bounded context, controlled command execution,
planner proposals, execution receipts, and the provider adapter. Feature application services remain
the only domain writers. The AIF packages introduce the conversational target; the current runtime
still implements the narrower proposal/Apply flow until those gates pass.

## Responsibilities

- Report disabled/unavailable state when neither a profile key nor `OPENAI_API_KEY` is present.
- Let a profile owner add, replace, or remove one OpenAI API key from Settings; store it encrypted
  server-side and never return the secret to the browser.
- Provide an optional returning-user companion check-in response using the existing encrypted
  profile key; provider failure degrades to the scripted local response.
- Authorize and load minimal selected task/context data for a brain dump, planning date, work window, default duration, and buffer.
- Call the OpenAI Responses API with `gpt-5.6`, `store: false`, and Structured Outputs backed by the canonical Zod schema.
- Validate/refusal-handle model output, then call planning's deterministic interval scheduler.
- Persist an expiring reviewable proposal with before/after actions, rationale, uncertainty, overflow, and context versions.
- Let the user edit/select actions, then re-fetch, revalidate, and atomically apply an idempotent selection.
- Persist owner-controlled conversation history and expose its deletion/export lifecycle; keep
  durable approved memory in Companion rather than adding a second memory store.

## Owned persistence

- `openai_credentials` and `planner_proposals`.

Raw input is not duplicated in proposals. Under the AIF contract it may exist in the owner's retained
conversation. Conversation/run/receipt persistence is assistant-owned, but exact tables and any
framework checkpoint exception require the data-model/migration gate before implementation.

## Public use cases and contracts

- `getPlannerCapability(actor)` returns configured/disabled state without exposing keys.
- `getOpenAISettings(actor)` and `updateOpenAIKey(actor, key)` own the redacted provider-settings contract.
- `createCompanionCheckin(actor, name, context)` returns a short non-persistent check-in response or
  an unavailable result without mutating domain data.
- `createPlannerProposal(actor, input)` performs authorize, model, validation, deterministic scheduling, and proposal persistence.
- `getPlannerProposal`, `rejectPlannerProposal`, and expiry handling.
- `applyPlannerProposal(actor, proposalId, selection, idempotencyKey)` revalidates and commits selected changes.
- Public contracts: `PlannerInput`, `ModelExtraction`, `PlannerAction`, `PlannerProposalDto`, `PlannerSelection`, `PlannerApplyResult`, and versioned `PlannerProposalSchema`.

`defer` is a review disposition with no new task status or persistence field.

## Invariants

- OpenAI is optional; its absence cannot prevent identity, tasks, planning, or export from starting.
- The browser never receives an OpenAI key or calls OpenAI directly.
- Assistant messages may be retained as conversation history, never as authoritative task facts or
  silently promoted personal memory. Companion does not maintain a parallel transcript.
- Profile keys are encrypted at rest with a server-only encryption secret and are deleted by profile reset.
- Requests send only selected/minimal context, use `store: false`, and logs contain no brain dump, task content, model input, or model output.
- Model output contains semantic suggestions, not trusted database IDs, ownership, overlap decisions, or repository commands.
- The same Zod schema validates Structured Output and persisted proposal documents. Interpretation,
  provider, or schema failures before command execution produce no domain changes. After a command
  commits, narration/provider failure does not undo it or make its receipt a failed mutation. Reconcile
  uncertain transport outcomes from server state before retrying or reporting that nothing changed.
- Deterministic planning rejects overlap, out-of-window blocks, impossible constraints, and unknown semantic references before review.
- Inferred/bulk proposals require exact confirmation before mutation. Direct commands follow the
  explicit reversible-instruction policy below; they never fabricate an approval event.
- Apply permits only create, clarify/update, prioritize, schedule, or no-op defer. Delete, complete, cancel, share, and notification actions are rejected.
- Apply reloads ownership and current versions, rejects stale actions, commits selected valid changes atomically, and is idempotent.
- Proposal `schema_version`, model, prompt version, expiry, status, context versions, and apply token follow the data-model contract.

## Dependencies

- Public tasks snapshot/query and allowed mutation services.
- Planning's deterministic scheduler and public identity preference/time reader.
- `shared/auth`, `shared/db`, `shared/logging`, `shared/time`, and `shared/validation`.
- OpenAI SDK behind a server-only provider adapter.

## Non-responsibilities

- Unsolicited background execution, deletion/completion/cancellation tools, external actions,
  collaboration, or general-purpose shell/filesystem/SQL/browser tools. Manual APIs do not grant
  an assistant capability. Further tools require explicit scope and policy review.
- Deterministic overlap/timezone/version/authorization decisions inside the prompt or model.

## Required tests

- Disabled/missing-key, timeout, refusal, invalid JSON/schema, semantic-invalid, and provider-error
  tests proving no writes when failure occurs before command execution.
- Provider/narration timeout, refusal, or malformed output after commit preserves the applied receipt
  and does not replay the command or report that nothing changed.
- Golden extraction/scheduling fixtures for vague input, multiple tasks, fixed busy intervals, overflow, impossible constraints, and irrelevant input.
- Minimal-context and redacted-log assertions, including `store: false` request verification.
- Cross-user selected-task/proposal denial and unknown-reference tests.
- Review edit/deselect, allowed-action, forbidden-action, expiry, stale-version, atomic rollback, and idempotent retry tests.
- End-to-end inferred-plan “propose, review, apply” test proving no mutation occurs before the
  confirming action; explicit reversible commands follow the separate controlled-execution tests.

## Controlled execution policy

- The initial command allowlist is create, update task text, prioritize, and schedule. Direct
  execution affects at most one owned task per user turn; several explicitly requested fields may
  form one atomic command. Inferred/bulk plans require confirmation. Ambiguous targets, dates, or
  intent require clarification. Unsupported/destructive tools are not enabled by this policy.
- Authority comes from the current authenticated user instruction, not retrieved text, memory,
  tool results, previous assistant messages, model confidence, or an `explicit: true` flag. Server
  policy binds the accepted instruction to exact allowed targets/fields and expected versions;
  semantic uncertainty returns to clarification/confirmation.
- Before AIF2, AIF1 freezes the instruction-binding method and an executable direct/clarify/confirm/
  deny acceptance matrix. Cover quoted instructions, suggestions, negation, ambiguous dates/targets,
  stale references, clarification replies, and injected retrieved content. Define how authenticated
  instruction evidence binds normalized targets/fields; a schema-valid model response alone does
  not prove the requested meaning. This gate selects the method without expanding the action policy.
- “Reversible” requires implemented, tested compensation for that command. Undo checks resulting
  versions and relevant constraints and refuses to overwrite intervening edits/dependencies. This
  does not authorize arbitrary AI deletion. Direct execution cannot ship before its Undo path.
- Confirmation binds the exact normalized action set, target IDs, versions, and expiry. Material
  changes invalidate it. A conversational “yes” may approve only one unambiguous pending proposal;
  a model cannot manufacture a user confirmation event.
- Direct user commands and confirmed proposals enter one deterministic application execution path.
  Recheck ownership, current versions, schedule constraints, permission/confirmation, expiry, and
  run generation/cancellation inside the mutation transaction under the relevant locks/fencing.
  Coordinate command commit and deletion/revocation with one atomic lock/CAS protocol: deletion
  winning first denies the command; an already committed change remains applied. Provider calls
  run outside the transaction.
- Commit the effective command, changed IDs/versions, outcome, timestamp, and permitted Undo
  evidence atomically with mutations. Stable actor-scoped operation identity makes retries return
  the same receipt; the same identity with different normalized input conflicts. Receipt failure
  rolls back the change. Checkpoint failure after SQL commit never authorizes repeating the effect.
- UI success comes from committed receipts, not model narration. Unknown transport outcomes show
  “checking result” while reconciling. Receipts prove effects; understood intent/diffs and current
  editable views let users judge correctness. Never imply external work was completed by creating a task.

## Conversation, context, and deletion

- Retain history until owner deletion or an explicitly chosen retention policy; no silent transcript
  eviction. Bound message size, stored-history admission, context tokens, steps/calls, and run time.
  Freeze concrete limits before persistence implementation. When storage admission is exhausted,
  offer export/delete rather than silently losing earlier conversation.
- Context combines bounded recent turns, a derived summary, relevant approved memories, and fresh
  authorized task queries. Summary/checkpoint content is fallible and cannot establish authority or
  replace current task facts. Compaction changes model input, not visible history retention.
- Persist visible user/assistant messages and permitted action evidence, not credentials, hidden
  reasoning, raw provider envelopes, or internal traces. Keep content out of logs/default tracing.
- Authorize every thread read/list/resume/delete/export; a thread ID is not ownership proof.
  Deletion first revokes/fences active run generations and approvals, then removes transcript,
  summaries, thread-specific tool snapshots, linked planner-proposal payloads, effective-command and
  receipt/Undo content, checkpoints/blobs, and any derived retrieval copies. Deletion's transaction
  establishes the ordering against command commits; stale runs cannot commit commands or recreate
  deleted content after that point. Checkpoint writes participate in the fencing policy too.
- Conversation deletion removes linked receipts and assistant Undo availability, but does not delete
  committed tasks or separately approved memories. Disclose these effects before confirmation.
  Minimal content-free operation identity/status/entity-version data may remain for a bounded replay
  window; copied chat/task text may not survive under an audit label. Reject expired commands and
  any command or Undo bound to a deleted thread; losing content must not permit replay.
- Approved memory stays separately inspectable/editable/deletable. Edits, deletion, and FIFO eviction
  invalidate affected derived, assembled, and resumable context before further provider dispatch or
  commands. AIF1 defines provenance/invalidation for later retrieval and recompaction too: retained
  history cannot silently reactivate a superseded/removed saved preference; saving it again requires
  fresh user approval. The original statement remains visible under the selected history policy
  until separately deleted. Removed source links are marked.
- Export portable conversation messages, timestamps, visible receipts, and separately approved
  memories alongside existing domain data. Exclude internal checkpoints, traces, leases, and secrets.
  Account reset removes user-linked state. Disclose live-store deletion separately from operator
  backup rotation and requests already delivered to a provider.

Required AIF evidence includes direct-versus-confirmed policy, prompt-injection/tenant denial,
safe Undo, altered-input idempotency denial, commit-before-checkpoint recovery, same-thread and
cross-thread races, deletion fencing/deleted-thread Undo denial, memory edit/delete/eviction followed
by resume/recompaction, bounded-history context, export, and provider-absent fallback.

## Urgent provider admission acceptance

U06 in `docs/IMPLEMENTATION_PLAN.md` adds one assistant-owned admission/execution boundary for
planner, check-in, Ameth chat, prompt analysis, and key verification, including profile and server
keys. Freeze validated deployment/actor budgets, concurrency, input/output limits, timeouts, lease
duration, and bounded retention before implementing its storage. These are operational abuse limits,
not billing or commercial quota tiers.

Acquire shared admission atomically in a short PostgreSQL transaction and release the connection
before provider HTTP. Deployment limits survive actor churn/reset and span processes. Every outcome
releases its active slot; crashes have bounded lease expiry. A dispatched timeout does not establish
that provider cost was refunded. Rejection invokes the provider zero times; unavailable admission
storage disables provider calls while manual workflows remain available.

Use database-authoritative time; leases outlast enforced local attempt/cancellation deadlines.
Disable hidden retries or charge every attempt, and revalidate paused work before dispatch after
expiry. Local in-flight limits cannot guarantee that cancelled upstream work has stopped.

Any new typed buckets/leases are assistant-owned, contain only opaque operational metadata, and pass
the canonical data-model/migration gate before creation. Do not reuse identity's Better Auth limiter
table or add a queue/Redis service. Tests cover all provider paths, multi-process contention, actor
rotation, boundary rollover, cancellation, crash expiry, redaction, and provider-degraded behavior.
This section defines repair acceptance; it does not claim admission control is implemented.
