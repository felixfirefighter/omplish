# Identity module contract

`modules/identity` owns local profile setup, internal workspace bootstrap, server session context, and
user-level preferences. Credential entry is not a product surface. The internal session exists only
to preserve server-side ownership and authorization for the current PostgreSQL-backed workflows.

## Responsibilities

- Render the direct-launch profile setup dialog and cache one validated username in browser local
  storage. The cached value is a display preference, not an authentication credential.
- Run the scripted first-run onboarding and the returning-user check-in gate before opening Today.
- Persist onboarding completion, selected goals, and at most one daily check-in through the versioned
  preferences document; the local username remains browser-only.
- Bootstrap an isolated workspace through the existing server-side session boundary without asking
  the user to create an account, sign in, or sign out.
- Resolve the internal provider-neutral actor for protected application routes and APIs.
- Atomically bootstrap one personal Inbox and one preferences row for a workspace actor.
- Apply the browser-detected system timezone and read/update week start, hour cycle, theme, and
  reduced-motion preferences.
- Reset the current profile/workspace account transactionally so the next direct launch starts at
  profile setup again.

## Owned persistence

- Internal session/account tables remain an implementation detail of the current workspace bootstrap.
- `user_preferences`.

The locally cached profile username is browser state and must not be persisted as a replacement user
identity or copied into the server auth tables.

## Public use cases and contracts

- `getOptionalSessionIdentity(headers)` resolves the internal session, if present.
- `resolveActor(headers)` returns the provider-neutral actor for protected application work.
- `bootstrapAccount(userId)` opens one transaction, creates preferences, and calls the tasks Inbox
  bootstrap port inside it.
- `enterDemo(headers)` is the internal isolated-workspace bootstrap used by the direct-launch flow.
- `getUserPreferences(actor)` and `updateUserPreferences(actor, expectedVersion, patch)` own the
  canonical preferences contract.
- `getOnboardingState(actor)`, `completeOnboarding(actor, goals)`, and `recordCheckin(actor, mood, note)`
  own onboarding state transitions.
- `getIdentityRequestSecurity()` exposes only trusted-origin configuration needed by the bootstrap
  route.

## Invariants

- A locally cached username is trimmed, non-empty, limited to 64 characters, and never treated as an
  authorization claim.
- The direct-launch flow stores the username locally only after the server workspace bootstrap
  succeeds.
- An internal workspace actor has exactly one preferences row and exactly one active Inbox after
  bootstrap.
- The authenticated browser synchronizes its canonical IANA system timezone to the preferences row;
  a missing or unsupported browser timezone never blocks workspace startup.
- Inbox and preferences creation either both commit or both roll back.
- An unauthenticated internal actor cannot read or mutate domain data; a browser-local username never
  bypasses this rule.
- Demo/workspace data remains isolated by its server actor and reset cannot touch another actor.
- Reset deletes only the authenticated actor's account; foreign actors and server-level configuration
  remain untouched.

## Dependencies

- Better Auth and its Drizzle adapter as an internal server-session implementation only.
- `shared/auth`, `shared/db`, `shared/logging`, `shared/time`, and `shared/validation`.
- Narrow injected Inbox-bootstrap and demo-dataset ports; identity does not deep-import feature
  repositories.

## Non-responsibilities

- Public account creation, sign-in, sign-out, password forms, email verification, password reset,
  social login, passkeys, MFA, billing, collaboration, memberships, or workspaces.
- Task/list authorization or persistence beyond coordinating Inbox bootstrap.
- Domain seed implementation for tasks or planner proposals.

## Required tests

- Direct-launch username validation, local-storage persistence, bootstrap success/error, and offline
  behavior tests.
- Protected-route fallback to direct launch and safe resume intent.
- Internal session and cross-user authorization tests for every protected API remain required even
  though credential entry is not exposed.
- Fresh-workspace transaction, preference schema/conflict, and demo isolation tests.

## Urgent lifecycle acceptance

U01, U05, and U09 in `docs/IMPLEMENTATION_PLAN.md` repair the existing lifecycle to meet these
requirements. They are acceptance targets, not a claim that the current implementation passes.

- Ordinary bootstrap/ensure/resume, including legacy `enterDemo` callers, never resets an existing
  authenticated workspace. Explicit demo reset and Reset app retain separate deliberate intent.
- Missing local username does not invalidate a valid server session. No username, demo suffix, or
  first/only user row may establish ownership. Optional provider-setting failure cannot block launch.
- A response-capable session refresh renews actual cookies together with DB expiry. Read-only server
  rendering must not silently extend DB state alone. Keep lifetime/update policy explicit and
  preserve trusted-origin, no-store, cookie-security, and protected-route validation rules.
- Browser recovery after missing/expired cookies is deferred. Retain inaccessible records; do not
  describe creation of a new workspace as recovery of the old one.
- Desktop enrollment requires a valid actor session and installation-specific main-process proof.
  Identity owns binding, proof validation, session issuance, and revocation; Electron owns protected
  storage, trusted transport, and setting the resulting browser cookie. Loopback alone is not proof.
- Durable desktop capability is distinct from DB credentials and auth/provider encryption secrets.
  Keep it out of renderer/preload, URLs, logs, arguments, ordinary responses, and exports. Any new
  verifier binding uses typed identity-owned persistence after the canonical data-model gate.
- Enroll fresh actors or authenticated legacy actors only. Missing legacy session plus missing
  capability means recovery unavailable with preserved data. Reset revokes bindings and stale proof
  cannot resurrect the deleted actor. No browser recovery UI or cross-device recovery is included.
- Profile reset coordinates memory mutation through Companion's public application guard in the
  same transaction, acquired before account deletion/cascade; foreign data remains untouched.

Required evidence: retry/legacy-call preservation; actual browser-cookie and DB-expiry renewal;
forged/foreign/revoked proof denial; native expiry/cookie-loss/port-change/restart/upgrade recovery;
interrupted enrollment, reset races, unavailable protected storage, and clean shutdown. Platform
permission and native evidence remain separate from unit/mocked browser tests.
