# Conversational workspace and reality-aware planner

## Purpose and route

`/plan` becomes the primary authenticated conversational workspace under AIF. Users give instructions,
clarify intent, inspect proposals/receipts, and open the affected task/calendar views. Direct controls
remain available. The server applies the assistant contract's explicit-reversible versus confirmed-
proposal policy; model text never constitutes successful execution. Existing `/plan` behavior remains
the implemented baseline until the new composition passes its visual and behavior gates.

The retained inferred-plan states **Describe**, **Review**, and **Result** can appear inline or in a
linked detail pane within the same conversation. Preserve drafts across navigation and avoid making
the user repeat instructions in a second AI form. Leaving a proposal warns only when edits would be lost.

## Conversation contract

- Show bounded/paginated retained history with new conversation, reopen, export, and delete controls.
- Show understood intent, assumptions, targets, and constraints. Ask for material ambiguity only.
- For explicit allowed reversible commands, show progress followed by the committed receipt, affected
  records, and safe Undo. For inferred/bulk changes, show the exact diff and confirmation first.
- Separate proposed, awaiting confirmation, executing, checking result, applied, cancelled, conflict,
  failed, offline, provider-unavailable, empty, and permission-denied states. Never announce success
  from streamed prose; a lost response may require result lookup rather than “nothing changed.”
- One identity/history across Ameth and `/plan`; XP does not gate the assistant. Current task/calendar
  links remain editable inspection controls. Evidence explains effects without exposing hidden reasoning.
- Explain that conversation deletion removes history/derived context, preserves committed tasks and
  separately saved memory, stops pending runs, and removes linked receipts and assistant Undo.
  Disclose this before confirmation; deleted-thread Undo is unavailable and denied by the server.
  Memory controls are distinct from history deletion: edit/delete also invalidates assistant context,
  while the original statement can remain visible in retained history.
- Default post-onboarding entry becomes `/plan` only when AIF visual/behavior acceptance passes;
  existing Today/Calendar routes and direct access remain available.

## Step 1: Describe

Use the conversation plus an optional structured constraints editor with:

- brain-dump textarea;
- searchable checklist of open unscheduled tasks, initially unselected or selected only by an explicit, documented rule;
- planning local date;
- work-window start/end;
- default task duration;
- buffer;
- a concise data-use explanation.

The inferred-plan action states “Create proposal” and does not imply immediate writes. Show the user's
timezone and planning window. Provider keys stay in the existing dedicated Settings/setup controls,
never in the conversation composer or transcript.

## Processing

Use honest stages: interpreting input, validating suggestions, and fitting eligible work into free
intervals. Do not display fake percentages. Cancellation before dispatch prevents new work; a
commit/cancellation race is resolved by server state. If outcome is unknown, check the receipt and
report committed changes honestly rather than promising cancellation reversed them.

If reply generation fails after a committed command, retain its applied receipt and task links;
explain only that the assistant reply failed. Do not report rollback or repeat the mutation.

## Step 2: Review

Start with a summary of proposed, conflicting, deferred/overflow, and uncertain items. Then render proposal cards using `components.md`, grouped by:

1. Needs attention: invalid, uncertain, stale, or conflicting;
2. Scheduled/updated;
3. New tasks;
4. Deferred/overflow.

Every action shows its type, before/after value, rationale, and uncertainty. User can edit allowed fields, select/deselect each valid action, and return to Describe. Invalid actions remain visible but cannot be applied. A sticky apply bar states the count and action: “Apply 5 changes”. Nothing applies merely by reaching this step.

## Step 3: Result

After atomic success, show the exact applied counts and links to Today/Calendar. Deselect/invalid/deferred items remain summarized as not applied. Do not imply partial success when the server transaction failed.

## Inferred-plan subflow states

| State | Required presentation |
|---|---|
| Default | Describe form or a complete review diff with explicit selection and second-step Apply action. |
| Empty | Blank brain dump and no selected tasks shows guidance and disables Create proposal with a reason. A valid proposal with zero actions says why and offers Edit input; it is not an error. |
| Loading | Processing stages keep submitted constraints visible in read-only summary. Apply shows a stable in-progress state and blocks duplicate idempotency requests. |
| Error | Refusal, timeout, invalid schema, provider error, deterministic constraint failure, and atomic apply failure use specific recoverable copy. Preserve input/edits. State that nothing changed only when the server proves rollback/no dispatch; otherwise reconcile the operation outcome before retry. |
| Offline | Describe/review content already present may be read, but Create proposal and Apply are disabled under the global offline message. Never queue an AI request or apply locally. |
| Permission | Missing internal session routes to direct app launch. Selected task IDs are re-authorized server-side; removed/foreign tasks become generic stale actions without exposing their content. |
| Provider unavailable | When the authoritative capability reports no usable profile/server key or an unavailable provider, explain the state and link to manual Today/Calendar planning. Missing server environment key alone is not proof of unavailability. |
| Stale proposal | Mark affected cards, show latest safe before-values, require regeneration or revalidation, and prevent atomic Apply until every selected action is valid. |
| Overflow/conflict | Keep items visible with explanation and editable duration/window/selection where supported; never silently overlap or schedule outside the window. |

## Keyboard, touch, and accessibility

- The step indicator is an ordered status, not clickable tabs unless backward navigation is safe.
- Task selection is a labeled searchable checklist; selection count is textual.
- Proposal groups use headings; cards expose selection, action type, target, changes, rationale, uncertainty, and validity in reading order.
- After processing, focus moves to the Review heading; validation failure moves to the summary. After successful Apply, focus moves to Result.
- Sticky apply controls do not cover the focused proposal on mobile and include safe-area spacing.
- No meaning depends on AI/confidence color. Progress and apply results use live announcements without streaming raw model output.

## Acceptance evidence

Verify no-key disabled state; vague/multiple/fixed-appointment/overflow/impossible/irrelevant fixtures; edit/deselect; refusal/timeout/schema error; selected-task authorization; stale version; idempotent atomic success/failure; zero-action proposal; offline; keyboard/screen-reader review; and 1440/1024/390 px layouts.

AIF additionally requires G11, conversation deletion/export, direct-command Undo/conflict, restart/
replay, post-commit reply failure, deletion disclosure and deleted-thread Undo denial, same-conversation
entry from Companion, and explicit screenshot approval of the new primary composition. Shared
presentation changes also pass `pnpm verify:design`.
