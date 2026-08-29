# OpenFlow — v0.11 Architecture

> Precondition: v0.10's templates confirmed working. This version is a
> significant data-model change — every "owner_id" assumption baked into
> v0.5 onward (workflows, deployments, credentials, run history) needs
> revisiting. Budget more time for this than v0.9/v0.10; it's closer in
> weight to v0.5 or v0.6.

## Goal of v0.11

Move from "one user owns a workflow" to "an organization/team owns
workflows, with multiple users and basic roles." This is the point where
OpenFlow becomes usable by a small company/team, not just an individual.

## What v0.11 Adds

1. **Organization Data Model**
   - New concept: `organizations` (id, name, created_at).
   - `organization_members` (org_id, user_id, role) — roles: `owner`,
     `editor`, `viewer` to start. Don't over-design roles/permissions
     beyond these three yet.
   - Every workflow, deployment, and credential gains an `org_id` in
     addition to (or instead of) `owner_id` — decide explicitly: does a
     user still have "personal" workflows outside any org, or does
     everything live in at least one org (even a default personal one
     auto-created per user)? Recommendation: auto-create a personal org
     per user at signup, so the data model has exactly one shape
     (everything belongs to an org) rather than two parallel systems.

2. **Role Permissions (kept deliberately simple)**
   - `owner`: full control, can manage members/billing-later, delete org.
   - `editor`: create/edit/run/deploy workflows, cannot manage members.
   - `viewer`: can view and run workflows, cannot edit or deploy.
   - Enforce at the API layer, not just hidden in the UI — a viewer
     hitting the edit endpoint directly must get a 403, not just have the
     button hidden client-side.

3. **Shared Credentials**
   - Org-level credentials (e.g. one shared OpenAI key for the team)
     vs. personal credentials — decide the model explicitly: likely org
     credentials should be visible/usable to editors+, manageable only by
     owners.
   - This changes the v0.5 secrets model from "per-user" to "per-org,"
     needs careful migration for any existing personal credentials.

4. **Org Switching UI**
   - If a user belongs to multiple orgs (their personal one + a team
     they've been invited to), a switcher in the nav to move between
     them — workflows/dashboard scoped to the currently selected org.

5. **Invitations**
   - Owner can invite by email; invitee gets a link to join (accept →
     added to `organization_members` with the assigned role).
   - No complex approval flows — direct invite + accept is enough.

6. **Deployment & Trigger Ownership**
   - Deployed endpoints (v0.6) and triggers (v0.7) now belong to the org,
     not an individual — if the original creator leaves the org, the
     deployment/trigger keeps working (owned by the org, not the person).

## What v0.11 Explicitly Does NOT Include

- Real-time collaborative canvas editing (v0.12 — a separate, harder
  problem; don't conflate "multiple people can access this workflow"
  with "multiple people can edit it at the same second").
- Billing/subscription tiers per org.
- Fine-grained per-workflow permissions (e.g. "this editor can only touch
  these 3 workflows") — role is org-wide for now.
- SSO/SAML — email invite + basic auth from v0.5 is enough for this
  version.

## Definition of Done for v0.11

- [ ] Every user has at least one org (auto-created personal org) —
      verify no workflow/credential/deployment exists without an
      `org_id` after migration.
- [ ] A `viewer` role user cannot edit, delete, deploy, or manage
      credentials — verified at the API level via direct requests, not
      just by checking the UI hides buttons.
- [ ] Inviting a user by email, them accepting, and them seeing the org's
      workflows works end to end.
- [ ] Shared org credential is usable by an `editor` who didn't create
      it, but only manageable (add/remove) by an `owner`.
- [ ] Removing a user from an org doesn't break that org's existing
      deployments/triggers — they keep running under the org, not the
      removed individual.
- [ ] Org switcher correctly scopes the entire dashboard (workflows,
      deployments, run history, credentials) to the active org — no
      cross-org data leaking into view.
