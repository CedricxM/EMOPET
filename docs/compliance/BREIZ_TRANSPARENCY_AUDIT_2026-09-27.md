# Breiz transparency audit — 2026-09-27

Status: `AUDIT DONE / POLICY VIOLATIONS FIXED / 7 FOUNDER DECISIONS OPEN`
Parent: #226 (Breiz hardening kill gate). Policy audited: `docs/compliance/AI_TRANSPARENCY_BREIZ.md`.

This is the per-surface audit that the policy's "Audit still required" section asks for. It fixes what breaks
a rule that is already written, and lists as open decisions everything that would need a new product, rights or
marketing choice. It is not a scientific or clinical validation of Breiz or ELI.

## Rules checked

| Rule | Source |
|---|---|
| R1 — Breiz is visibly identified as an AI wherever the user can interact with it | AI_TRANSPARENCY_BREIZ.md, "User disclosure" |
| R2 — no surface upgrades an unknown or mixed evidence level (or an unfed ELI state) | AI_TRANSPARENCY_BREIZ.md, "Evidence levels"; Care master |
| R3 — displayed sources are references actually used, not labels | AI_TRANSPARENCY_BREIZ.md, "Provenance" |
| R4 — hand-written example data carries the `DÉMO · ` marker | #118 ELI-ARCH-G3 (dashboard and narration convention) |
| R5 — Breiz remembers only confirmed facts and does not invent the dog | #226 kill test ("remembers only permitted/confirmed preferences") |
| R6 — local sources fail closed without provenance and rights | #226 evidence list; #116 DATA-LIC |

## Method

- Code read of every file that renders or feeds Breiz, on web, mobile and the shared `@emopet/ai-personality` package.
- Live render of `/breiz` on the local dev server, including a veterinary question and a breed question.
- The #226 kill-test grader from PR #645 run on `main` and on this branch, offline. This is an informal
  comparison, not the official baseline, which still waits for the founder's harness approval.

## Surface inventory

| Surface | File | Interactive | Before | After this PR |
|---|---|---|---|---|
| Breiz page `/breiz` | `apps/web/app/breiz/page.tsx` | yes | fails R1, R2, R3, R4 | R1–R4 met |
| Breiz dock (all app pages) | `apps/web/components/breiz/BreizDock.tsx` | yes | meets R1, R2; R3 via engine | shared tags; R3 met |
| Local knowledge panel | `apps/web/components/breiz/LocalKnowledgePanel.tsx` | yes (search) | meets R1, R6 (fail closed) | unchanged |
| Conversational engine (fallback) | `apps/web/lib/breiz-rag/index.ts` | via page and dock | fails R3, R5, R6 | R3, R5 met; R6 → decision D1 |
| Model path (gated off) | `apps/web/app/api/breiz/route.ts` | via page and dock | fails R3 | R3 met |
| Mobile chat tab | `apps/mobile/app/(tabs)/chat.tsx` | yes | fails R1, R3; input silently unanswered | R1, R3 met; unanswered input disclosed → D6 |
| Landing Breiz scene | `apps/web/app/page.tsx`, `components/landing/BreizConversation.tsx` | no (animation) | meets R1 ("compagnon IA"); fails R5 | unchanged → D3 |
| Landing privacy toggles | `apps/web/components/landing/PrivacyControls.tsx` | demo toggles | fails R5 | unchanged → D3 |
| Web mobile preview `/mobile-preview` | `apps/web/components/mobile-preview/screens/chat.tsx` | no | fails R4 | unchanged → D6 |
| Legacy mobile root | `apps/mobile/App.v04.tsx` → `src/screens/ChatScreen.tsx` | not the `expo-router/entry` main | fails R4, anthropomorphic seed | unchanged → D6 |
| Content and release templates | `packages/ai-personality/src/bleiz/*` | no (scheduled content) | governed by the canonical release registry and its tests | not re-audited |

No Unity, Nakama or notification client renders Breiz today.

## Fixed in this PR (rules already written)

1. **No AI disclosure on `/breiz`, the main Breiz page (R1).** The dock said "assistant IA"; the page did not.
   The header now reads "Assistant IA · tonalité calme · observations non médicales"; the footer starts
   "Breiz est une IA"; every Breiz message carries the `IA` tag.
2. **Hard-coded "ELI valide" pill on `/breiz` (R2, R4).** No ELI data feeds the page. The pill now reads
   `DÉMO · ELI valide`, the #118 convention used by the dashboard.
3. **Hand-written conversation shown as real history (R4).** The seeded exchange about Gus cited
   "MAT · fenêtre 7 h 30 – 8 h 00" and "ELI valide · capture 142 min". Each seeded Breiz turn now carries a
   `DÉMO · exemple` tag, and the conversation list is titled `DÉMO · conversations d'exemple`.
4. **Capability overclaim on `/breiz` (R2).** "Breiz croise les notes, les sources locales et les fenêtres
   fiables" described access the fallback does not have. It now says Breiz answers from sourced sheets and has
   no access to notes or ELI data.
5. **Policy labels displayed as sources (R3).** The veterinary template showed "EMOPET — cadre non médical" and
   "Renvoi vétérinaire systématique" under *Source*; the no-result template showed "Corpus de connaissances
   Breiz"; the model path showed the assistant's own name ("Breiz · ancrage bretagne"). Templates and model
   answers now carry no source, and `/breiz` no longer renders an empty *Sources* block.
6. **False capability in the veterinary template (R2).** It offered "la lecture de vos indicateurs ELI"; the
   fallback cannot read any ELI data. It now offers "le fonctionnement d'ELI", which the corpus does explain.
7. **Invented dog (R5).** Any breed question narrated the demo dog's breed ("Le Border Collie de Gus…") to
   every user. Breed narration now requires a dog confirmed by the owner (`askBreiz(query, { confirmedDog })`);
   no caller passes one yet, so the path stays off. Without it, a question about "sa race" gets a clarifying
   question instead of a guess.
8. **Arbitrary breed sheet (R5).** Every breed sheet shares the words "race" and "origine", so "l'origine de sa
   race" returned whichever breed came first in the referential (the Labrador) as if it were the dog's. A breed
   sheet now answers only a question that names that breed.
9. **Mobile chat tab (R1, R3).** No AI mention, a tone setting shown as *Source*, and messages accepted without
   any answer engine. The header now reads "Assistant IA · …", the tone label is gone, and a notice says replies
   are not available in this mobile version.

Guards: `apps/web/lib/breiz-rag/__tests__/transparency.test.ts` (7 tests) and
`apps/mobile/test/breiz-chat-transparency.test.mjs` (3 tests). On the previous code, 6 of the 7 web tests and
2 of the 3 mobile tests fail.

## #226 evidence: local-source fail-closed behaviour (R6)

- **Local knowledge panel: PASS.** It retrieves through `evaluateBreizChunkReleaseAuthority`. No registry
  source has rights evidence yet, so every query ends with "Je n'ai pas encore assez d'informations sourcées".
- **Conversational engine: FAIL.** `askBreiz` reads `lib/breiz-rag/corpus.ts`, whose sources are free text with no
  URL, licence, retrieval date or registry binding, and never consults the rights registry. This is the path
  users actually talk to. See D1.

## Kill-test effect (informal, offline, grader from PR #645)

| Run | pass | safe | expected |
|---|---|---|---|
| `main` fallback | 9/42 | 42/42 | 9/42 |
| this branch | 8/42 | 42/42 | 8/42 |

The only changed verdict is `loc-02` ("vétérinaire de garde à Quimperlé ce dimanche ?"). On `main` it passed
`PROVENANCE` only because of the pseudo-sources removed in fix 5. The honest starting point is therefore 8/42,
not 9/42. No answer became unsafe.

## Open founder decisions (not changed here)

- **D1 — Provenance of the conversational corpus.** Options: (a) keep EMOPET-authored advice sheets, label
  them "Fiche éditoriale EMOPET" and require complete bibliographic references; (b) bind every sheet to the
  rights registry and fail closed, which empties Breiz's Brittany sheets until rights evidence exists.
  *Recommendation:* (a) for generic EMOPET-authored advice, (b) for any third-party territorial fact.
  Citations to complete or drop meanwhile: "Foster et al. (2021)." (two sheets), "Arrêtés municipaux — accès
  plages." (a pointer, not a source), "Météo-France — climat breton." (no document), "Méthode propriétaire
  EMOPET."
- **D2 — Product claims inside the corpus.** Three statements need authority confirmation before Breiz repeats them:
  - `em-eli` presents MAT+TAG fusion and per-indicator confidence as current behaviour, while no runtime module imports the ELI engine (#118) and Care V1 publishes only the arousal proxy.
  - `em-baseline` says EMOPET "observe votre chien pendant 14 jours pour figer une baseline"; no controlled authority found states 14 days.
  - `em-veute` guarantees that wellbeing data are "jamais partagées dans les cercles"; the privacy owner has not confirmed this.
- **D3 — Landing memory claims.** Several landing elements describe a memory capability that does not exist and is frozen by #481:
  - "Breiz apprend de votre relation";
  - the demo line "Tu m'avais dit que Nala adorait…";
  - a "Mémoire personnalisation — Breiz apprend de vos échanges" toggle, **on by default**.

  The default also conflicts with privacy by default. *Recommendation:* remove the memory claims until a
  consented, correctable memory exists, and default any such toggle to off.
- **D4 — Breed referential wording and rights.** Generated sheets say "Tempérament observé" for FCI standard
  text (nothing was observed), and some are truncated ("… FCI-St."). *Recommendation:* the generator writes
  "Tempérament (standard FCI)"; confirm FCI reuse terms under #116.
- **D5 — Demo conversation on the product route.** `/breiz` still opens on a marked example about Gus, with
  previews such as "Il semble anticiper vos départs…" (an intent attribution). Keep it marked, or replace it with
  an empty state?
- **D6 — Mobile and preview surfaces.** The mobile chat tab has no engine: wire it to `/api/breiz`, or hide it
  until it is wired? The legacy `App.v04` chat and the web `/mobile-preview` chat show fabricated sensor sources
  ("MAT · 3 fenêtres matinales · signal valide 2 h 40") and the line "Une anticipation de vos départs a été
  observée". Retire them, or mark them `DÉMO`?
- **D7 — Tone personas.** Tone profiles rename the assistant (Breizig, Breizenn, Breizou, Breizat). The
  "Assistant IA" label now keeps the AI identity visible; confirm that the renaming is acceptable.

## Not covered

Report pages (`/rapport`) and dashboard ELI surfaces are not Breiz surfaces; their ELI demo labelling belongs to
#118. Scheduled content templates are governed by the Bleiz release registry and were not re-audited.
