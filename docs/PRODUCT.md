# Product contract

## Product definition

Omplish is an AI-first personal planning workspace: tell it what needs to happen, inspect what it
changed, and correct the result through conversation or direct editing. Conversation is the primary
interaction surface; tasks, Today, and Calendar expose canonical state and execution evidence.
Manual workflows remain available when the provider is unavailable. This is the target product
contract; the conversational execution capabilities are not yet implemented.

Omplish is the approved product name. N01 in `docs/IMPLEMENTATION_PLAN.md` owns naming consistency
and compatibility for existing data and identities; the naming decision does not establish trademark
clearance.

## Problem

Maintaining a task system creates its own work: capturing intentions, finding the right records,
updating dates, and repairing a plan when priorities change. Omplish reduces that administration
while making every supported change inspectable. Self-hosting and portable data preserve user
control; growing the feature catalog is secondary to making this loop reliable.

## Audience

Primary: a busy individual managing work and personal commitments who wants to express priorities
in ordinary language and spend less time maintaining a planner.

Secondary: privacy-conscious and open-source users who want to self-host and retain portable data.

Not the first target: enterprise project portfolios, regulated team workflow, field-service dispatch, or large-scale issue tracking.

## Value proposition

1. Express intent once; clarify only material ambiguity.
2. Execute explicit reversible instructions and confirm consequential/inferred plans.
3. Inspect the understood intent, exact changes, and server-confirmed results in editable views.
4. Keep conversation, memory, and task data portable and under the user's control.

## Product principles

- **Reduce administration.** Measure effort to reach a correct plan; retain fast direct controls for small edits.
- **Plan reality, not aspiration.** Scheduling respects existing commitments, work windows, duration, and buffer.
- **Progressive disclosure.** Everyday actions remain visible; advanced settings live in the inspector.
- **User authority.** Explicit reversible instructions may execute under the server allowlist;
  inferred plans, bulk changes, and destructive actions require confirmation. Unsolicited background
  execution and unsupported actions remain excluded.
- **Evidence before claims.** Show understood intent and changes; report execution only from a
  committed application receipt. Creating “send the proposal” is not evidence a proposal was sent.
- **One conversation.** Ameth supplies personality/progression without becoming a second AI silo or
  gating the assistant behind XP. Assistant owns conversation and execution orchestration.
- **Open core means complete core.** There is no artificial list, task, or calendar limit in the application.
- **Portable by default.** Users can export their data in a documented versioned format.
- **Bounded context.** Persist history with delete/export controls, but send only relevant current
  facts, bounded recent turns, summaries, and approved memories. Durable memory is separately saved
  and managed; a conversation is not automatically a permanent personal profile.
- **Privacy by minimization.** No advertising analytics, content logs, hidden-reasoning archive, or
  default external tracing. Local storage and provider disclosure are separate controls.
- **Original expression.** Competitor behavior can inform requirements, but assets, copy, trademarks, and exact trade dress do not enter the product.

## Primary product loop

The first complete workflow is “plan tomorrow, then correct it”:

1. The user describes an outcome and constraints; the assistant reads authorized current task state.
2. The assistant clarifies ambiguity and shows the understood constraints and proposed day plan.
3. The user confirms this inferred/bulk plan; deterministic application code validates and commits it.
4. A server-issued receipt links the changes to live tasks and Calendar.
5. “Move the proposal task to 10 tomorrow” can execute directly when it resolves to one allowed,
   reversible command; a conflict or ambiguity returns to clarification. Undo cannot overwrite later edits.

The initial assistant action set is create, update text, prioritize, and schedule tasks. Confirmation
policy does not implicitly add deletion, completion, external messaging, or other tools. Keep
existing manual capabilities and remaining release commitments; tool expansion is separately reviewed.

## Success measures for the release

- A new user can add a task in under 15 seconds without documentation.
- A user can move from brain dump to a correct confirmed day plan in under 2 minutes; measure this
  against the current flow before claiming improvement.
- Track correction rate, wrong/duplicate writes, false-success claims, time/interactions per accepted
  plan, bounded token/cost per run, and restart/delete safety. Conversation length is not a success metric.
- The G1–G11 golden paths in `docs/QUALITY.md` work at their required desktop/mobile widths.
- The app remains fully useful when the OpenAI integration is disabled.
- Task, habit, Focus, export, and local startup remain useful when Web Push/VAPID or the reminder
  worker is absent; only reminder delivery degrades.
- The installable shell never claims offline writes or stores authenticated user content in its
  service-worker cache.
- A fresh self-host setup succeeds from the README without hidden services.

## Business model constraint

No premium feature gating is part of this product plan. Hosting providers and OpenAI usage can have real operating costs; self-hosters supply those resources or keys. The project must communicate that distinction honestly rather than promising cost-free infrastructure.
