# EMOPET — Bretagne linguistic & cultural reviewer candidate register

**Date:** 2026-10-01  
**Status:** `CANDIDATE REGISTER / NO REVIEW AUTHORITY CREATED`

## Purpose

Breiz and the regional MotsPet layer need real linguistic and cultural review before regional vocabulary can move from `PENDING_REVIEW` to release-ready.

The machine-readable candidate register is:

`config/language/bretagne-language-reviewer-candidates-v1.json`

This document explains what each candidate could contribute and, just as importantly, what their presence in the register does **not** mean.

---

## 1. Office Public de la Langue Bretonne

**Current relationship state:** `CANDIDATE_NOT_CONTACTED`

Public capability evidence reviewed on 2026-10-01 indicates that the OPLB operates:

- Traduction-Conseil;
- TermBret terminology work;
- TermOfis, the public terminology database;
- digital-language / software-localisation capabilities;
- linguistic review for public-facing material.

Potential EMOPET review scope:

- existing Breiz Breton terms;
- future public Breton wording;
- technical/software terminology;
- spelling, style and readability;
- identifying when a term belongs in terminology work versus ordinary-language editorial review.

### Important boundary

TermOfis is a terminology database, not a general dictionary.

EMOPET should therefore **not** treat “found in TermOfis” as universal approval for every conversational or cultural usage.

Exact term approval still requires the regional review-receipt path.

---

## 2. Institut du Galo

**Current relationship state:** `CANDIDATE_NOT_CONTACTED`

Public capability evidence reviewed on 2026-10-01 indicates that the Institut du Galo works on:

- public use of Gallo;
- translation;
- linguistic and terminological tools;
- terminology/expertise work;
- support to organisations using Gallo.

Potential EMOPET review scope:

- when Gallo is geographically/culturally appropriate;
- Gallo public wording;
- translation/review;
- terminology;
- preventing the Bretagne companion from being designed as if Breton were the only regional language/cultural layer.

### Important boundary

The product should not add decorative Gallo words merely to look local.

Regional language is useful only when it is:

- accurate;
- appropriate to the territory/context;
- understandable for the intended audience;
- reviewed.

---

## 3. Bretagne Culture Diversité

**Current relationship state:** `OUTREACH_SENT`

This status comes from the existing controlled Bécédia/Bretania outreach record.

It proves only that an EMOPET message was sent.

It does **not** prove:

- a BCD response;
- review agreement;
- content-reuse permission;
- partnership;
- endorsement.

Potential additional reviewer role if BCD is interested:

- advise on cultural-context framing;
- help identify qualified cultural reviewers;
- distinguish contextualisation from folklore/stereotype;
- guide the Bécédia/Bretania source-rights discussion.

---

## 4. Evidence progression

The reviewer register uses:

`CANDIDATE_NOT_CONTACTED`  
→ `OUTREACH_SENT`  
→ `RESPONSE_RECEIVED`  
→ `REVIEW_SCOPE_DISCUSSION`  
→ `REVIEW_SCOPE_AGREED`  
→ `REVIEW_RECEIPT_RECORDED`

The last state still does **not** mean “partner”.

It means only that exact controlled review evidence exists.

Regional vocabulary release remains governed by the review-receipt code path from PR #822.

---

## 5. First review batch

Do not send a 300-word language manifesto.

The first useful review batch should be deliberately tiny.

### Breton batch

Candidate entries:

- `Breiz` — assistant name/origin/usage;
- `Demat` — whether/how it should be used as a greeting;
- `Ar Veute` — spelling, meaning and whether it should exist at all in public product copy;
- any current Breton wording visible in the prototype.

Questions:

1. Is the term linguistically correct?
2. Is it natural in this exact UI/conversation context?
3. Is the register/tone appropriate?
4. Is it geographically/culturally over-generalised?
5. Should it be replaced rather than corrected?
6. What source/recommendation should EMOPET preserve with the review?

### Gallo batch

Do **not** invent candidate Gallo translations before contact.

First ask:

1. where Gallo use would be appropriate in the Bretagne companion;
2. whether a regional companion should expose optional Gallo wording, a locale, or only contextual cultural knowledge;
3. how to avoid presenting one standardised phrase as representative of every local practice;
4. what review/translation process they recommend.

---

## 6. What goes into a review receipt

After an actual review, preserve only controlled non-sensitive evidence needed by the repository:

- region;
- exact lexicon entry ID;
- exact reviewed term;
- reviewer role/reference;
- review date;
- approved meaning;
- permitted usage;
- source/evidence reference;
- disposition.

Do not dump private email bodies or unnecessary personal contact data into runtime/config files.

---

## 7. Why this matters for scaling

The reviewer workflow itself becomes part of the regionalisation template:

`candidate regional identity`  
→ `qualified linguistic/cultural review`  
→ `exact review receipts`  
→ `verified regional lexicon`  
→ `regional companion release`

Future regions should repeat the method with their own legitimate local expertise instead of copying Brittany's vocabulary and swapping a few nouns.

## Public references reviewed

OPLB:
- https://www.fr.brezhoneg.bzh/140-poles-et-services.htm
- https://www.fr.brezhoneg.bzh/UTB_S/1/19-traduire.htm
- https://www.fr.brezhoneg.bzh/36-termofis.htm

Institut du Galo:
- https://institutdugalo.bzh/fr/accueil/
- https://institutdugalo.bzh/fr/linstitut/nos-missions/

BCD/Bécédia/Bretania:
- existing EMOPET controlled outreach/source workstream remains authoritative for current relationship status.

Related:
- #821
- PR #815
- PR #822
- #35
- #116
