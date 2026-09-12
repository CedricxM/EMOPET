# Community disclosure boundary candidate

Date: 2026-09-11 UTC  
Parent: #55 / #56 / #98 / #223 / #232  
Branch: `experience-hardening-2026-09-06` / draft PR #224  
State: **DRAFT / UNMERGED / NOT RELEASE AUTHORITY**

## Confirmed gaps and governing authority

The member-scoped Hono core returned whole post, community and event rows. A stored `sensor_overlay` could therefore automatically cross into the social feed, and community/event coordinates and the event's free-form meeting point were exposed without a participant-disclosure policy. The arbitrary JSONB `media_urls` column could also carry objects rather than URL references. Persisted `like_count` was returned even though this core has no implemented likes/reputation lifecycle.

The Experience Doctrine (§2.6 and §3), Product Authority Map (Community/Circles row), and Guardian Authority Master prohibit automatic Care/ELI disclosure and inheritance of private authority from social membership. [Circle #55](https://github.com/CedricxM/EMOPET/issues/55) requires broad location until an eligible controlled event is mutually joined. [Event #56](https://github.com/CedricxM/EMOPET/issues/56) reserves a precise meeting point for eligible accepted participants at a controlled stage. Those permissions and RSVP stages do not exist in the current Hono core.

This patch applies those existing restrictions. It neither defines a new location-sharing permission nor authorizes a release exception.

## Implemented response contract

`backend/api/services/community-disclosure.ts` defines explicit SQL column projections, reused for reads and creation responses. All existing Community reads/returns are explicit, including comments and rules acceptance, so adding a schema column does not automatically publish it.

| Surface | Published candidate data | Withheld / status |
|---|---|---|
| Community list/detail | ID, name, description, type, creator, creation time; list also includes the caller's own membership role/time | Latitude, longitude and radius omitted; `locationDisclosure=WITHHELD_PENDING_LOCATION_AUTHORITY` |
| Post create/feed | ID, community, server-controlled author, type, chosen text, bounded media references, creation time | No `sensorOverlay` or `likeCount`; no fabricated zero popularity count |
| Event create/list | ID, community, server-controlled creator, title, description, start/creation times | Entire dedicated `location` field and coordinates omitted; the same explicit location-disclosure status |
| Comment creation | ID, parent ID, server-controlled author, chosen text, creation time | Explicit projection; no authority inherited from parent metadata |
| Rules acceptance | Account, server rules version, acceptance time | No client-selected version or extra account fields |

The dedicated event location string is withheld as well as numeric coordinates: the schema cannot establish that this text is only a broad area. No geocoding, rounding or invented approximate location is performed. The restriction also applies to creators and social moderators on these routes; no precise-location exception has been implemented for them.

The previous membership/rules/parent-binding transaction discipline remains in place. Caller-supplied role, include, participant or consent flags cannot widen the response. Existing shared prototype types are not promoted into the narrower Hono response contract.

## JSONB media boundary

The selected `media_urls` value is validated as a whole list of at most nine HTTP(S) URL strings without embedded username/password credentials. The backend reuses the shared schema and narrows it without adding a dependency or changing the legacy shared prototype contract.

- Valid lists are returned with `mediaStatus=URL_REFERENCES_ONLY`. This is not proof that a referenced file exists, is licensed, safe, consented for every audience or accessible.
- Invalid historical values, including objects, mixed arrays, malformed URLs, unsupported schemes, embedded credentials, null and oversized lists, return `mediaUrls=[]` with `mediaStatus=WITHHELD_INVALID_METADATA`. Consumers must treat this as withheld metadata, not proof of no attachments. Other valid post fields and other posts remain available.
- Invalid incoming media is rejected with `400` before any post is written. Malformed URL parsing must return a validation failure rather than throw.

No historical sensor, popularity, location or media value is erased or rewritten. Existing event creation still stores validated location input, but the response explicitly reports that location disclosure is unavailable. Storage and retention governance remain under the broader privacy workstream.

## Executable evidence

`backend/test/community-disclosure.integration.test.mjs` uses the actual JWT middleware, Hono routes and disposable PostgreSQL. Seven subtests prove:

1. Sensitive sensor/ELI/Memory/Breiz fixtures and legacy popularity fields do not appear in member or creator/moderator feeds; chosen social text and valid media references survive.
2. Arbitrary legacy media metadata is withheld with an explicit status while the post and stored source values remain intact.
3. Creation and subsequent feed recovery use the same post projection; client-supplied author/private fields cannot override server authorship or persist sensor context; comments remain durable.
4. Community list/detail omit precise coordinates/radius for members and creators/moderators, including client attempts to enable location.
5. Historical and newly created event locations are withheld on actual responses, despite client participant/consent claims, while the exact stored values remain intact.
6. Invalid incoming media produces `400`, private/no-store and no new database row.
7. Unknown-community, non-member and unauthenticated denials remain enforced.

The tests inspect serialized responses, explicit field sets and stored rows. They exercise the route boundary, not only a helper with a copied fixture. P0 CI now explicitly watches `community-*.ts` service changes as well as the route and tests. Record completed evidence against the published commit in the linked issues/PR; local skipped integration tests are not database proof.

## Remaining limits

This is a boundary for structured database fields and media metadata. It does not redact chosen free text, inspect remote media/EXIF, implement content moderation, grant media-provider rights, introduce participant eligibility or RSVP, or complete privacy retention/erasure. Human-authored text and chosen valid URL strings can still contain sensitive information and require the pending content/media policies.

All linked product gates remain OPEN. Circle/event lifecycle, progressive-location authority, moderation/report/block enforcement, finite-feed policy, privacy, media controls and final client integration remain separate work. The PR stays draft and unmerged; no production activation is authorized.
