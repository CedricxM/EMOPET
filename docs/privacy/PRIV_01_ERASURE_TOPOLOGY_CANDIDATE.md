# PRIV-01 — Erasure Topology Candidate

Status: `P0 TECHNICAL TOPOLOGY CANDIDATE — NOT PRIVACY/LEGAL AUTHORITY`

Tracked by: #69 (`PRIV-01 — Retention, erasure & privacy authority closure`)

This document records **mechanical repository facts** needed to design erasure. It does not choose legal bases, retention periods, deletion-vs-anonymisation policy, backup expiry, processor obligations, or production release authority.

## 1. Controlled boundary

The purpose of this file is to answer four technical questions before any destructive endpoint is enabled:

1. Which persisted objects currently point to a Guardian (`users.id`) or dog (`dogs.id`)?
2. Which relationships are enforced by database foreign keys, and what happens if a parent row is deleted today?
3. Which persisted or externally referenced objects are outside that SQL graph?
4. Which decisions remain policy decisions rather than engineering facts?

### Authorities distinguished here

- **CURRENT MAIN**: repository default branch as inspected on 2026-09-01.
- **ID-01 CANDIDATE**: PR #71 (`emopet/id-01-canonical-uuid`), not treated as merged authority.
- **BACKEND-01 CANDIDATE**: PR #77, which replaces synthetic dog CREATE/PATCH success with persistence and makes dog DELETE explicitly non-destructive while PRIV-01 is open.

No candidate PR is silently treated as merged production authority.

---

## 2. Important PostgreSQL fact: current core relationships are not cascades

The active Drizzle core schema and `backend/db/baseline-draft/0000_core_baseline.sql` define Guardian/dog foreign keys without an explicit `ON DELETE CASCADE` for the product-data relationships listed below.

Practical consequence:

> A direct `DELETE FROM users ...` or `DELETE FROM dogs ...` is not an erasure implementation. Existing referencing rows can block deletion, and rows outside the FK graph would not be touched at all.

This is desirable while PRIV-01 is open: the database should not silently choose policy on behalf of the privacy authority.

The only observed explicit cascade located during this review belongs to dataset-registry lineage (`dataset_versions → dataset_registry`), not Guardian/dog erasure. It must not be generalized into a product-data deletion policy.

---

## 3. Guardian-root SQL topology — CURRENT MAIN

Root identity: `users.id` (UUID primary key).

| Child table / field | Relationship | Nullability | Current delete action | Mechanical consequence of deleting user first | Policy still required |
|---|---|---:|---|---|---|
| `dogs.owner_id` | FK → `users.id` | NOT NULL | no explicit cascade | user deletion blocked while owned dogs exist | dog/account erasure ordering; dog deletion vs transfer not decided |
| `subscriptions.user_id` | FK → `users.id` | NOT NULL | no explicit cascade | user deletion blocked while subscription row exists | provider cancellation, financial/legal retention, local row disposition |
| `achievements.user_id` | FK → `users.id` | NOT NULL | no explicit cascade | user deletion blocked while achievements exist | delete vs retain/anonymise not decided |
| `communities.created_by` | FK → `users.id` | NOT NULL | no explicit cascade | creator account deletion can be blocked by community row | ownership transfer / deletion / anonymisation policy |
| `community_members.user_id` | FK → `users.id` | NOT NULL | no explicit cascade | account deletion blocked by memberships | membership deletion is likely technical candidate but not final policy |
| `posts.author_id` | FK → `users.id` | NOT NULL | no explicit cascade | account deletion blocked by authored posts | delete vs anonymise/public residue/moderation exception |
| `comments.author_id` | FK → `users.id` | NOT NULL | no explicit cascade | account deletion blocked by authored comments | delete vs anonymise/moderation exception |
| `community_events.created_by` | FK → `users.id` | NOT NULL | no explicit cascade | account deletion blocked by created events | transfer/delete/anonymise decision |
| `ai_messages.target_user_id` | nullable FK → `users.id` | nullable | no explicit cascade | referenced user can block deletion while targeted message exists | delete/null/anonymise/retention decision |

### Guardian-root conclusion

There is currently **no single database cascade** that can truthfully implement account erasure. The current SQL topology requires an ordered erasure plan or an approved set of FK actions after policy decisions.

---

## 4. Dog-root SQL topology — CURRENT MAIN

Root identity: `dogs.id` (UUID primary key), owned through `dogs.owner_id`.

| Child table / field | Relationship | Nullability | Current delete action | Mechanical consequence of deleting dog first | Policy still required |
|---|---|---:|---|---|---|
| `devices.dog_id` | FK → `dogs.id` | NOT NULL | no explicit cascade | dog deletion blocked while bound devices exist | unbind/delete/pseudonymise security metadata; hardware trust interaction |
| `health_entries.dog_id` | FK → `dogs.id` | NOT NULL | no explicit cascade | dog deletion blocked while health entries exist | delete/retention exception decision |
| `sensor_summaries.dog_id` | FK → `dogs.id` | NOT NULL | no explicit cascade | dog deletion blocked while summaries exist | product-history deletion and backup policy |
| `eli_states.dog_id` | FK → `dogs.id` | NOT NULL | no explicit cascade | dog deletion blocked while ELI states exist | derived-data deletion and backup policy |
| `baselines.dog_id` | FK → `dogs.id`, unique | NOT NULL | no explicit cascade | dog deletion blocked while baseline exists | derived-data deletion policy |
| `ai_messages.dog_id` | nullable FK → `dogs.id` | nullable | no explicit cascade | dog can be blocked by referencing AI message | delete/null/retain decision |

### Dog profile external references

`dogs.photo_url` is a URL field. Deleting the SQL row does **not** prove deletion of a backing object if the URL points to object storage or a provider. No object-storage deletion authority is inferred from the column.

`users.avatar_url` has the same boundary for account erasure.

---

## 5. ELI shared-identity topology — CURRENT MAIN vs PR #71

### Current main

`backend/db/schema/eli-v5.ts` currently uses unconstrained text identities for:

- `dog_sub_baselines.dog_id`;
- `recovery_events.dog_id`;
- `anticipation_events.dog_id`;
- `baseline_drift_monitor.dog_id`;
- `walk_quality.dog_id`;
- `routine_stability.dog_id`;
- `user_config.user_id`;
- `user_config.dog_id`.

These rows are outside the core FK erasure graph on `main`. A core dog/account delete therefore cannot rely on referential constraints to discover or clean them.

### PR #71 candidate

PR #71 converts the shared fields above to canonical UUIDs and adds:

- seven dog relationships → `dogs.id`;
- `user_config.user_id` → `users.id`.

The candidate does **not** add an explicit `onDelete` action.

Mechanical consequence if PR #71 is later merged:

- silent ELI orphans become harder to create;
- direct dog/account deletion becomes more strongly blocked until ELI rows are intentionally handled;
- the privacy authority still must choose delete/anonymise/restrict/exception semantics.

This is an integrity improvement, not an erasure-policy decision.

---

## 6. Community graph — independent blockers

Community data is not merely a flat user-owned table.

### Community parent chain

- `community_members.community_id` → `communities.id`;
- `posts.community_id` → `communities.id`;
- `community_events.community_id` → `communities.id`;
- `comments.post_id` → `posts.id`.

All are defined without an explicit cascade in the current Drizzle schema.

Therefore:

- deleting a community can be blocked by members/posts/events;
- deleting a post can be blocked by comments;
- deleting a user can be blocked by their authorship/creator foreign keys.

This is why account erasure cannot be implemented as “delete all rows with `user_id` then delete user”. Public/community residue requires an approved policy for authorship, moderation evidence, continuity of conversations/events, and anonymisation where justified.

### Copresence events

`copresence_events.dog_a_id` and `dog_b_id` are UUID fields but **have no FK to `dogs.id` in the current schema**.

Mechanical consequence: these rows are outside automatic referential discovery. Dog erasure must explicitly search both fields unless the schema is later reconciled.

This is a concrete PRIV-01/ID-01 debt item.

---

## 7. Other relationship gaps visible in current schema

### AI community target

`ai_messages.target_community_id` is a UUID field without an FK to `communities.id`.

A community deletion cannot rely on SQL referential integrity to identify those messages.

### Location-bearing community rows

The current community schema can persist coordinates in:

- `communities.latitude` / `longitude`;
- `community_events.latitude` / `longitude`;
- `copresence_events.latitude` / `longitude`.

PRIV-01 location policy remains independent. The topology records where coordinates can exist; it does not authorize precise-location persistence or select a retention period.

### Weather/local directory

`weather_context` and `local_directory` are not linked to a Guardian/dog identity through an FK in the current schema. Their deletion requirements depend on whether their stored values are personal/user-derived in the eventual production flow. No subject linkage is inferred merely from table presence.

---

## 8. Non-PostgreSQL durable store: `.data/*.json`

The web prototype contains a server-side JSON-file store in `apps/web/lib/server/store.ts`.

It writes named collections under `.data/<collection>.json` using filesystem reads/writes.

### Contact requests

`apps/web/app/api/contact/route.ts` uses:

- `.data/contact-requests.json` through `collection('contact-requests')`;
- an `ownerToken` boundary rather than canonical `users.id`;
- a DELETE route that removes the selected request from that JSON collection.

This is a separate durable-store surface for an erasure enumerator. Deleting PostgreSQL account rows would not touch it.

The source comment contains an old candidate “purge cron 6 months” note. That comment is **not privacy authority** and must not be promoted into the retention schedule without the justification required by #69.

### Dog journal

`apps/web/app/api/journal/route.ts` uses:

- `.data/journal-entries.json` through `collection('journal-entries')`;
- `ownerToken`, not canonical user/dog UUID ownership;
- per-entry DELETE;
- demo seed entries;
- possible photo data URLs inside journal entries, with a source note that storage migration is still required.

Mechanical consequence: account/dog erasure cannot currently discover these rows through SQL identity. Canonical subject mapping is a prerequisite to claiming complete erasure.

### Serverless boundary

The store implementation itself states that filesystem persistence must be replaced by Postgres for production serverless deployment. Until that migration occurs, the erasure graph must continue to track both the prototype JSON store and its future replacement; migration must not silently strand old files.

---

## 9. Share grants / report tokens

Veterinary report sharing currently uses signed JWTs generated by `createVetReportShareToken()`:

- token scope: `vet-report`;
- subject: user ID;
- embedded dog ID + days;
- expiry: 30 minutes;
- signature secret: `REPORT_SHARE_SECRET` or `JWT_SECRET`.

No persistent share-token table is used by this implementation.

Mechanical consequence:

- there is no SQL row to delete for an individual already-issued share token;
- deletion of the dog/user row does not cryptographically revoke an already-issued stateless token by itself;
- current report loading may fail after underlying dog data disappears, but that is not equivalent to explicit grant revocation evidence.

PRIV-01 must later decide whether short expiry is sufficient for the approved share flow or whether revocation/versioning/denylisting is required. This document makes no such decision.

---

## 10. Media, uploaded objects, providers and caches

### Community media

`posts.media_urls` stores JSON references. The database schema does not prove deletion of the referenced media object.

### Dog/user images

`dogs.photo_url` and `users.avatar_url` are URL references, not object-lifecycle controls.

### Journal images

The current journal route warns that photos may exist as data URLs and should migrate to storage. Any migration must include subject identity and deletion metadata.

### Provider-held copies

The privacy inventory intentionally leaves provider/processor authority to be confirmed. No provider-side deletion is treated as implemented merely because a local SQL/file record can be removed.

### Cache/search/vector/analytics copies

The runbook requires enumeration of caches, search indexes, vector stores and analytics/telemetry identifiers. This review found no single canonical erasure registry tying those surfaces to a Guardian/dog ID. Their absence from the SQL graph must be treated as **not yet proven**, not as proof that they do not exist in all deployment environments.

---

## 11. Current deletion truth at API/UI boundaries

### Dog DELETE

On current `main`, the dog DELETE route historically returned a synthetic success after ownership checking without deleting database state. PRIV-01 already records that gap.

BACKEND-01 PR #77 changes the candidate behavior to an explicit non-destructive response (`erasure_policy_pending`) and proves that the dog row remains intact. That is a truth-boundary improvement only; it is not erasure implementation.

### Privacy UI deletion modal

The current web privacy modal is a simulation. Its parent callback only closes the confirmation modal and opens a “suppression simulée” modal; it does not call an erasure endpoint.

The current copy also contains an unsupported production timing claim (“sous 30 jours”). That timing is not authorized by the privacy inventory or #69 and must be removed or replaced by controlled pending-policy language before production-facing promotion.

Tracking consequence: **UI-COPY-PRIV-ERASURE = OPEN** until the unsupported claim is removed.

---

## 12. Mechanical erasure order candidate — NOT POLICY

The following is only a dependency-safe engineering ordering model. It does **not** say every row should be deleted.

### Dog-only request

Before deleting `dogs` mechanically, the implementation would need an approved disposition for at least:

1. externally stored dog media / photo references;
2. devices/bindings;
3. sensor summaries;
4. core ELI states;
5. baselines;
6. health entries;
7. dog-targeted AI messages;
8. copresence rows where dog is A or B;
9. PR #71 ELI rows if/when that candidate becomes authority;
10. `user_config` rows tied to the dog if/when PR #71 becomes authority;
11. journal entries/media once canonical dog ownership exists;
12. provider/cache/index/analytics copies;
13. backup expiry handling;
14. only then the dog profile row, if deletion is the approved disposition.

### Account request

Before deleting `users` mechanically, the implementation would need approved disposition for at least:

1. sessions/auth/share grants;
2. all owned dogs through the complete dog graph above;
3. subscriptions + external billing/provider state;
4. achievements;
5. community memberships;
6. communities created by the user;
7. posts/comments/events authored or created by the user;
8. user-targeted AI messages;
9. `user_config` if/when PR #71 becomes authority;
10. contact requests and journal entries currently keyed by owner tokens;
11. avatar/media objects;
12. provider/cache/index/analytics copies;
13. security/incident/rights evidence under separately justified retention exceptions;
14. backup expiry handling;
15. only then the user row, if deletion is the approved disposition.

The implementation must be idempotent and must not report completion until every approved surface reaches its required terminal state.

---

## 13. Decision matrix still required from PRIV-01 authority

For each node above, privacy/legal/product authority still needs to choose and justify one of the appropriate dispositions, for example:

- delete;
- anonymise;
- unlink/pseudonymise;
- retain temporarily under a justified exception;
- restrict access until expiry;
- transfer/reattribute ownership where product semantics require it.

Required decision dimensions remain:

- purpose;
- legal basis;
- retention trigger;
- active retention;
- archive/restriction period if applicable;
- exception/hold conditions;
- provider-side behavior;
- backup behavior;
- evidence of completion;
- accountable approver.

No values are supplied here where #69 requires authority approval.

---

## 14. Concrete next engineering gates

The topology supports the following non-destructive next work without prematurely deciding privacy policy:

1. **Canonical subject discovery** — define one erasure enumerator that can list every known SQL row, JSON-store row and external object reference for a Guardian/dog without deleting anything.
2. **Copresence identity reconciliation** — decide under ID-01 whether `copresence_events.dog_a_id/dog_b_id` must become explicit FKs or be covered by a tested application-level integrity rule.
3. **AI community target reconciliation** — determine whether `ai_messages.target_community_id` requires an FK/application integrity rule.
4. **JSON-store migration identity** — contact/journal persistence must obtain canonical subject identifiers before production erasure can claim full coverage.
5. **External object inventory** — record provider/bucket/key/deletion mechanism for every media/object URL surface actually enabled.
6. **Share-grant authority** — determine whether stateless report links need explicit revocation semantics for erasure/session invalidation.
7. **UI truth boundary** — remove unsupported erasure timing and prevent simulation wording from being mistaken for implemented erasure.
8. **Policy-driven erasure executor** — only after the disposition matrix is approved, implement ordered delete/anonymise/restrict actions and end-to-end negative/positive tests.

---

## 15. Gate status

- `PRIV-01D / G-PRIV-ERASURE`: **OPEN**.
- SQL dependency topology: **CANDIDATE MAPPED**.
- ID-01 ELI dependency delta: **CANDIDATE MAPPED, PR #71 NOT MERGED**.
- non-SQL JSON-store topology: **CANDIDATE MAPPED**.
- external object/provider deletion: **OPEN / NOT PROVEN**.
- backup expiry/deletion: **OPEN / POLICY + INFRA EVIDENCE REQUIRED**.
- community deletion/anonymisation semantics: **OPEN / POLICY REQUIRED**.
- security/audit retention exceptions: **OPEN / POLICY REQUIRED**.
- production erasure endpoint: **NOT AUTHORIZED**.

This topology may be used as engineering input to PRIV-01. It must not be cited as privacy/legal sign-off or as proof that user-data erasure is already implemented.
