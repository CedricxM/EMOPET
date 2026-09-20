# Contact input — option A reconstruction

Decision date: 2026-09-20. Status: user-selected contract; implementation candidate.

The user selected **A** after reviewing the #219/#270 mismatch: harden the
existing Next.js Contact contract, discard unknown fields, and use an 8 KiB HTTP
body ceiling. This decision is limited to this correction batch. It does not
promote the historical Contact model into final Product V1 authority.

## Reconstruction boundary

Base: `main` at `11ee28b54619fbab580cded7608724411a878839`.

Runtime: `apps/web/app/api/contact/route.ts` and `apps/web/lib/contact.ts`.
No Hono Contact runtime exists on this base. #270's backend test imports a
missing module, so redirecting that test without recording its changed contract
would misrepresent the evidence.

The new candidate reconstructs #219's bounded structural parser and adapts the
applicable hostile-input cases from #270 to the real web route. The original
branches remain available as historical evidence; #221 also still depends on
#219's historical branch.

| Source expectation | Disposition under A |
| --- | --- |
| #219: 8 KiB request body | Selected explicitly; actual received bytes are counted while streaming, before JSON parsing. |
| #219: structural validation before domain logic | Reconstructed; runtime route tests prove invalid bodies cannot reach storage or notification. |
| #219: bounded known strings and slots | Preserved: contact value 254, message 500, owner token 128, slot timestamps 64 characters; at most five slots. |
| #270: reject null, arrays, primitives, incomplete bodies and malformed known types | Adapted to the existing web shape and tested. |
| #270: reject unsupported reasons | Preserved against the current finite reason vocabulary, including inherited property names. |
| #270: reject `ownerToken`, `channel`, `contactValue`, `proposedSlots` | Not adopted for this batch: these remain recognized, validated web fields. |
| #270: reject `requesterUserId` and other unknown fields | Replaced by explicit omission from the parsed object; unknown fields cannot supply identity or stored properties. |
| #270: required nonempty message and parser text normalization | Not adopted: message remains optional; existing `buildRequest` trimming remains in place. The 500-character bound is preserved. |
| #270: backend-only `reason + message + consentGiven` shape | Not adopted; no unused backend parser is created to make historical tests pass. |

## Transport correction

The existing shared `readLimitedJson` reader previously called `req.text()` and
checked the byte count only after buffering the entire body. The reconstruction
stops consuming at the first chunk that exceeds the caller's ceiling, cancels
the stream, and returns 413 even when `Content-Length` is absent or understated.
An oversized declared length is rejected before reading. UTF-8 decoding happens
after the bounded read, preserving split characters and BOM behavior.

This changes the shared reader used by other web routes; their configured byte
ceilings and the 400/413 response contract are unchanged. Tests cover transport
failure, cancellation failure, exact limits, multibyte input and malformed JSON.

## Remaining authority

`G-CONTACT-RUNTIME-AUTHORITY-01` / #244 stays **OPEN**. This patch does not resolve
authenticated requester identity, the legacy owner-token model, file-backed
PII containment, durable storage, retention, deletion policy, processor/CRM
selection or operational handling. It does not alter privileged authorization.

Fresh tests and CI must attach to the successor commit. Earlier green checks on
#219 or #270 are provenance, not evidence for this reconstructed candidate.
