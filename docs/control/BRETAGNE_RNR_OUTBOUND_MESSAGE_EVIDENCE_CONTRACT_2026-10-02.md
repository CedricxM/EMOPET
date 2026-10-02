# EMOPET — Bretagne RNR outbound-message evidence contract

**Date:** 2026-10-02  
**Status:** `CONTRACT IMPLEMENTED / CURRENT STATE UNSENT / NO RIGHTS PROMOTION`

## Purpose

Define the minimum public-repository evidence required before the RNR licence-clarification register may move from:

`messageSent: false`

to an evidence-backed manual patch candidate for:

`messageSent: true`.

This contract does not send email and does not create an outbound receipt by itself.

## Exact scope

Dataset:

`reserves-naturelles-regionales-de-bretagne`

Bound source version:

`sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`

Approved outreach packet:

`docs/partnerships/BRETAGNE_RNR_LICENCE_CLARIFICATION_OUTREACH_2026-10-02.md`

Exact packet Git blob:

`9df9ab6d15b49c8c3d42bce016fcb4d325a9bfc7`

Official public institutional recipient:

- role: `Région Bretagne PRADA`;
- address: `prada@bretagne.bzh`.

## Privacy-safe receipt

The machine-readable schema is:

`data/registry/schemas/bretagne-rnr-outbound-message-receipt-v1.schema.json`

A valid receipt records only:

- exact dataset/source version;
- exact reviewed outreach packet blob;
- institutional recipient role/address;
- `EMAIL` transport class;
- SHA-256 digest of the provider message reference;
- bounded public subject;
- send/capture/review timestamps;
- sender **role**, not sender mailbox;
- reviewer **role**, not reviewer mailbox;
- controlled repository receipt path;
- explicit false boundaries for body storage, private contact storage, response claims, partnership claims and rights promotion.

## Forbidden repository material

The validator is strict and rejects additional fields.

Do not commit:

- message body;
- raw MIME;
- OAuth/access tokens;
- private sender address;
- raw provider message/thread ID;
- inbox screenshots;
- unrelated headers/contact data.

A raw provider message identifier may remain in the authorised mail system. The public repository stores only a SHA-256 digest when a stable binding is needed.

## Register transition

A valid receipt can generate only a **manual** JSON-Patch candidate:

1. replace `/clarificationRequest/messageSent` with `true`;
2. add `/clarificationRequest/messageEvidenceRef` pointing to the controlled receipt.

The candidate explicitly preserves:

- `runtimeRightsDisposition = HOLD`;
- `releaseAllowed = false`;
- field approval;
- schema evidence;
- partnership status.

No automatic application is allowed.

## Current state

The committed clarification register still has:

- `messageSent = false`;
- no `messageEvidenceRef`;
- `runtimeRightsDisposition = HOLD`;
- `releaseAllowed = false`;
- no authoritative publisher confirmation.

No outbound receipt is committed by this change.

## Why the packet blob is pinned

A send receipt must prove **which wording was actually authorised for outreach**.

Binding the receipt to the exact repository Git blob prevents a later document edit from retroactively changing what the evidence claims was sent.

## Tests

Workspace tests verify:

- a valid privacy-safe synthetic receipt;
- exact packet-blob binding;
- current unsent register state;
- JSON-schema constants;
- wrong recipient/source/packet rejection;
- rejection of raw/private message material;
- SHA-256-only provider reference;
- timestamp ordering;
- no response/partnership/rights promotion claims;
- role labels cannot be email addresses.

Related: #1048, #836, #116, #1027, #1037, #1041.
