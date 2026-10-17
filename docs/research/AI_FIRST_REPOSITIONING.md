# AI-first repositioning and agent harness research

Research date: 16 October 2026, Asia/Kuching. **Status: product direction selected; framework adoption
gated; implementation not started.** Source baseline: `61f2905`. The user selected direct execution
for explicit reversible instructions, confirmation for inferred/bulk/destructive work, and retained
conversation history with delete/export plus separate durable memory. Canonical authority is now
[SCOPE](../SCOPE.md) and [assistant contract](../modules/assistant.md); the ordered work is
[AIF1–AIF5](../IMPLEMENTATION_PLAN.md). No package, schema, runtime, or UI implementation changed.

## Recommendation

Make conversation the primary place to express intent, clarify ambiguity, and inspect proposed work. Keep tasks and calendar as authoritative, editable views of the resulting state. Add execution receipts tied to actual application results: an assistant saying “done” is not evidence that a change committed.

**Evaluate LangChain TypeScript `createAgent` as the initial narrow harness, backed by LangGraph persistence where required.** Preserve the existing application services and reviewed planner apply. Start with one bounded agent and explicit tools. Adopt custom LangGraph orchestration only when the workflow needs control that the agent loop and small middleware cannot express clearly. Do not adopt Deep Agents by default.

Growing history is a context-design problem as well as a runtime problem. Installing LangChain does
not determine what to retain, retrieve, trust, or forget. Persisted history may grow while the prompt
budget stays bounded; the selected policies need implementation and validation before shipping.

## Product position and first slice

**Recommendation:** an AI personal planning operator that reduces the work of maintaining a planner.
The primary user is an individual managing work/personal commitments, not an enterprise workflow
operator. One conversation expresses intent; existing views expose live state and permit fast direct
correction. Ameth contributes personality/progression without a separate chat history or execution path.

First slice: “Plan tomorrow from these tasks; leave the afternoon clear” → understood constraints and
diff → confirmation → committed receipt/live Calendar → “Move this task to 10” → explicit reversible
command → safe Undo. Initial commands remain create/update/prioritize/schedule. An unsupported
destructive action remains unavailable even if the general policy says destructive actions need
confirmation. No external integrations or background autonomy are added.

A receipt proves effects, not correct interpretation. Show understood intent and assumptions as well
as the before/after change and actual committed result. Creating a task called “send the proposal”
does not mean the proposal was sent. Evaluate reduced interactions/time to a correct plan, correction
rate, duplicate/wrong writes, false success, and provider cost per accepted result.

## Current repository facts

The inspected baseline contract excluded ongoing chat and required a second Apply for every AI
change. The selected direction replaces those restrictions with the controlled execution/history
contract; provider-absent manual operation remains required. This is a product/storage change, not
merely moving the existing chat widget to the homepage.

The current [Responses adapter](../../modules/assistant/infrastructure/openai-responses-provider.ts) validates structured output, disables retries, sets `store: false`, and exposes no tools. [Ameth chat](../../modules/assistant/application/ameth-chat.ts) receives one message, an aggregate summary, and approved memories; it does not recover a durable conversation. [Planner apply](../../modules/assistant/application/apply-planner-proposal.ts) already enforces ownership, versions, expiry, allowed actions, atomic writes, and repeated-apply handling. These are reusable safeguards, not responsibilities to transfer to a model.

Its current result returns an outcome/count; it does not persist edited effective selections and
actual entity/version receipts. AIF must add that evidence atomically with domain changes and return
the original result on retry, including commit-before-checkpoint failure.

## What the framework actually provides

| Option                     | Verified capability                                                                                                  | Fit and tradeoff for Omplish                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Existing direct OpenAI SDK | Repository-owned structured extraction and deterministic apply                                                       | Smallest change; conversation state, tool loop, interruptions, and recovery remain application work. Keep as comparison baseline. |
| LangChain `createAgent`    | A configurable model/tool loop with middleware, built on LangGraph                                                   | Recommended initial harness candidate. Supplies integration points without requiring filesystem tools or multiple agents.         |
| Custom LangGraph workflow  | Explicit orchestration mixing deterministic functions and model-driven steps; supports persistence and interruptions | Prefer when approval, resume, and branching need an explicit state graph. More workflow code to own.                              |
| Deep Agents                | Opinionated harness with planning, context offloading, filesystem tools, subagents, and summarization                | Useful for open-ended research/coding work; unnecessary initial surface for a bounded personal-planning assistant.                |

These distinctions come from the official [LangChain overview](https://docs.langchain.com/oss/javascript/langchain/overview), [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview), and [Deep Agents overview](https://docs.langchain.com/oss/javascript/deepagents/overview). LangGraph can run without using LangChain model abstractions; keeping the existing provider adapter is an available alternative.

Deep Agents' internal `write_todos` planning state must never become a second representation of Omplish tasks. Its virtual filesystem is an agent context mechanism, not a task database. General shell, filesystem, and arbitrary SQL tools are outside the proposed initial product need. This is a fit assessment, not evidence that the library is inherently insecure.

## Memory architecture: separate four concerns

| Concern                 | Proposed owner and policy                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical facts         | Existing task, schedule, preference, and approved-memory services. Reload current facts through authorized application APIs.                                 |
| Conversation continuity | Assistant-owned thread and bounded recent messages. Define retention, deletion, export, and cross-device expectations explicitly.                            |
| Execution continuity    | Checkpoints containing the minimum state needed to resume a run; reference proposal IDs and versions rather than treating old tool results as current truth. |
| Model context           | Budgeted assembly of instructions, recent turns, a clearly marked summary, selected approved memories, and relevant current records.                         |

**Fact:** checkpointers persist thread-scoped graph state; stores persist application-defined information across threads. In-memory implementations lose state on process restart. Neither mechanism automatically limits the prompt or provides a product retention policy. See [persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence) and [long-term memory](https://docs.langchain.com/oss/javascript/langchain/long-term-memory).

**Recommendation:** use recent turns plus a replaceable summary, then retrieve relevant facts on demand. Do not append every historical task, memory card, or conversation to each request. Start with scoped database filters and existing search; add embeddings only after evaluation shows a specific retrieval failure. Summaries may omit or distort details, so they must not establish ownership, consent, task completion, or current scheduling facts.

LangChain exposes `summarizationMiddleware` with trigger and retention controls; its middleware preserves message/tool pairing while compacting older dialogue. This is useful machinery, not guaranteed factual recall. Compaction is another model call with cost and failure modes. See [short-term memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory) and the [summarization API](https://reference.langchain.com/javascript/langchain/index/summarizationMiddleware).

## Approval and execution evidence

Selected flow:

```text
Instruction → authorized bounded context → server execution policy
  → explicit + reversible single-task command → transaction + receipt
  → inferred/bulk plan → concrete diff + exact confirmation → transaction + receipt
  → ambiguous/unsupported → clarify/decline
Receipt → editable task/calendar views + safe Undo
```

Expose scoped task/calendar readers, proposal preparation, and the narrow command gateway. Direct
execution is limited to one owned task per turn and requires a tested version-checked compensating
operation. A model-supplied “explicit” flag is not authority. Confirmation binds exact actions,
targets/versions and expiry; edits invalidate it. Both paths reuse deterministic application rules.

LangChain supports approval middleware; LangGraph `interrupt()` pauses a checkpointed run and resumes it with supplied input. However, interrupted nodes restart from their beginning, so preceding effects can repeat. Framework interruption is not a replacement for the application's authorization, approval, or database transaction. See [human-in-the-loop](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop) and [interrupt semantics](https://docs.langchain.com/oss/javascript/langgraph/interrupts).

On every eventual resume, reauthenticate the actor, authorize the thread, validate the approved proposal and selection, and recheck current versions. Use stable operation identity and domain idempotency: SQL can commit while the later checkpoint or response fails. Reconcile from committed domain state before reporting failure or retrying. Model output alone must never set a successful receipt. Distinguish pending review, running, committed, conflicting, cancelled, and failed outcomes without exposing hidden reasoning.

## PostgreSQL and self-hosting implications

The libraries can execute inside the existing Node server with local PostgreSQL. LangSmith tracing is separately enabled; a hosted LangSmith account or managed Agent Server is not required for the in-process library path. Keep tracing disabled by default and verify outbound behavior. A dependency on LangSmith client code is different from a requirement to send data to its service. See [LangChain tracing configuration](https://docs.langchain.com/oss/javascript/langchain/overview).

**Integration trap:** the official PostgreSQL saver contains framework-owned checkpoint, metadata, and binary payload tables. `setup()` performs DDL and library migrations; `fromConnString()` creates a separate `pg.Pool`. This conflicts with unreviewed startup schema changes and can silently increase connection consumption. See the [saver implementation](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-postgres/src/index.ts) and [migration definitions](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-postgres/src/migrations.ts).

Before adoption, review an explicit operational-persistence exception to [DATA_MODEL](../DATA_MODEL.md): owned schema, versioned serialization, reviewed migrations, compatible upgrades, restricted runtime grants, and a bounded pool budget. Do not call `setup()` in a user request or ordinary application startup. Do not use framework JSON documents as replacement task records.

Checkpointing can retain copies of chat/tool responses after compaction. Conversation deletion must
first fence active runs/approvals, then remove thread content, summaries, linked proposal/command/
receipt/Undo payloads, snapshots/checkpoints/blobs, and derived retrieval copies. Command commit and
deletion are ordered atomically: a committed task change is not undone by deleting its conversation.
The saver deletes its own records without providing application actor
authorization or stopping a later stale write; application fencing remains necessary. Keep only
bounded content-free operation evidence needed to prevent duplicate effects.

Committed tasks and separately approved memories survive conversation deletion with explicit
disclosure. Deleting memory invalidates assembled/resumable context; history does not automatically
recreate it. Export visible conversations/receipts and memory, excluding internal checkpoints/traces
and secrets. Document live-store deletion versus operator backup rotation and already-delivered
provider requests. Every thread operation is authorized; a `thread_id` is not proof of ownership.

## Security, size, and operating limits

Treat task text, retrieved content, summaries, and tool output as untrusted data. Bind actor context on the server; never let model arguments choose ownership. Enforce tool allowlists, input schemas, domain permissions, result limits, cancellation, and global/user provider admission outside prompts. Every model attempt, including summarization and retries, must enter the existing planned U06 admission boundary.

LangGraph documents configurable retry and timeout behavior, but a timed-out graph attempt cannot roll back arbitrary external side effects. Bound total model calls and wall time as well as individual attempts. See [fault tolerance](https://docs.langchain.com/oss/javascript/langgraph/fault-tolerance).

No installer-size, latency, memory-use, or quality improvement has been measured. Additional graph/checkpoint/provider packages increase the dependency surface; inspect the resolved production tree and shipped Electron artifacts rather than quoting package download size. Published versions, compatibility, licenses, and advisories must be checked when choosing pins. Current upstream [LangChain](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain/package.json) and [Deep Agents](https://raw.githubusercontent.com/langchain-ai/deepagentsjs/main/libs/deepagents/package.json) manifests establish dependencies, not Omplish's final bundle size.

## Adoption gate

Run a bounded comparison using the same synthetic histories and task data: direct SDK baseline versus one `createAgent` implementation. Measure correct proposals, correction handling, remembered preferences, irrelevant-memory rejection, token use, latency, retained bytes, restart recovery, and shipped-size delta. Include stale approvals, duplicate submission, commit-before-checkpoint failure, prompt injection, cross-user thread access, provider absence, and deletion tests.

Choose the harness only if these results justify its maintenance cost and implement the selected
authority/history policy. Keep urgent integrity/security repairs on the conversational release path.
No package installation, schema change, performance benchmark, live provider call, or production
implementation was performed for this research.
