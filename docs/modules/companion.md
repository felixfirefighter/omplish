# Companion module contract

`modules/companion` owns Ameth’s optional progression, communication preferences, private derived
summaries, and explicit approved memory. Assistant owns the shared conversation and execution path;
Companion never becomes an alternative task writer or separate conversational authority.

## Responsibilities

- Maintain a user-owned profile, three-level XP projection, and append-only idempotent award ledger.
- Render the global avatar/progress ring and accessible XP preview; its conversation entry opens the
  same assistant history rather than a separate chat silo.
- Produce transparent, user-readable aggregate summaries without storing raw chat or task content.
- Offer honest scripted provider-absent feedback and provide personality/approved context to the
  assistant's controlled interaction contract. Progression never gates core assistant operation.

## Owned persistence

- `companion_profiles`, `companion_xp_events`, `companion_behavior_summaries`, and `companion_memories`.

## Invariants

- Levels are 1 at 0 XP, 2 at 300 XP, and 3 at 1,000 XP; Level 3 unlocks the separate Prompt Library module.
- Awards happen through source-module application transactions and are unique by user/action/source.
- Task completion awards 10 XP, an explicit planner apply awards 20 XP once per local day, and a
  completed daily check-in awards 10 XP once per local day. Reapplying or rewriting the same source
  produces no additional XP.
- Every query is constrained by `user_id`; reset cascades profile-owned companion data.
- Companion-owned handlers/summaries never write task or other domain state; the shared assistant
  owns the controlled command path independently of the Companion entry point.
- Companion never stores a duplicate transcript or task-content history. Assistant owns retained
  conversations/action evidence under its deletion/export contract. No key/provider trace/content log.
- User-approved memory cards only are durable. Their UTF-8 total is capped at 30 MiB; the oldest cards are removed before a new card exceeds that cap.
- A `warm`, `focused`, or `direct` daily mode remains until the next local-day app reopen; default communication style remains user-configurable.
- Current version-2 export includes companion-derived data and approved memories. AIF adds
  assistant-owned conversations/receipts through a separately versioned export change; Companion
  does not copy that data. Memory edits, deletion, and cap eviction invalidate assistant context
  through public application contracts, including later reconstruction from retained history under
  the assistant's policy. Companion does not own transcript retention or deletion.

## Required tests

- Level threshold, duplicate source, concurrent award, user-isolation, rollback, reset, and export tests.
- Provider-absent feedback and shared assistant-entry tests prove there is no Companion-owned task
  writer; permitted assistant commands retain their normal execution policy.
- Memory edit/delete/cap-eviction invalidation, summary delete/rebuild, keyboard/touch/reduced-motion,
  and responsive drawer tests.
