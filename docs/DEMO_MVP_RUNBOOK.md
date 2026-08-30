# EMOPET — MVP demo runbook

Status: `DEMO_FREEZE_CANDIDATE`

This runbook is for a controlled software demonstration. It is not a Product V1 release, a clinical demonstration, a manufacturing release, or evidence of live MAT/TAG hardware validation.

## Demo objective

Show the core EMOPET product story in 8–10 minutes:

1. MAT/TAG provide observable signals.
2. ELI exposes an index together with data quality / confidence state.
3. EMOPET distinguishes observation from interpretation.
4. Breiz explains evidence without turning it into a diagnosis or emotional label.
5. The software architecture is ready to be connected progressively to validated hardware and authenticated user flows.

Primary demo URL: `/demo`.

The `/demo` surface uses explicit controlled fixtures. Do not describe its values as live sensor measurements.

## Presenter script

### 0:00–1:00 — Positioning

Open `/demo` on **1 · Observatoire**.

Say:

> EMOPET is a canine-wellbeing observation system. The demo uses controlled data so we can show the product logic without pretending the hardware or Product V1 is frozen.

Point out the persistent demo banner.

### 1:00–3:00 — Observatoire

Show Gus, the ELI value, capture duration, rest confidence and the 7-day trend.

Core message:

> The number alone is not the product. EMOPET also carries the confidence and capture state needed to decide whether the number should be shown at all.

Do not claim that the values are medically meaningful or live.

### 3:00–5:00 — ELI & confidence

Open **2 · ELI & confiance**.

Explain the distinction:

- observation: a repeated phase of wakefulness before a routine event;
- user declaration: context supplied by the guardian;
- prohibited automatic conclusion: an unsupported emotional or veterinary diagnosis.

Core message:

> EMOPET is designed to fail closed when the evidence is not strong enough.

### 5:00–7:00 — Breiz

Open **3 · Breiz**.

Read the scripted example. Emphasize that Breiz cites the evidence boundary and refuses to translate correlation into diagnosis.

Core message:

> Breiz explains what EMOPET observed and what it cannot justify.

If the full `/breiz` conversational surface is not explicitly QA-cleared for the meeting, remain on the self-contained demo scene.

### 7:00–9:00 — MAT + TAG

Open **4 · MAT + TAG**.

Explain the chain:

`MAT + TAG → derived signals → ELI + confidence → Breiz / user-facing explanation`

State explicitly that sensor coverage and firmware values on the demo page are fixtures.

For MOKO / engineering audiences, separate software architecture maturity from mechanical / PCB / tooling maturity.

### 9:00–10:00 — Close

Close with:

> The MVP demonstrates the software contract and safety boundaries. The next step is progressive integration with validated hardware, authenticated accounts and controlled field data — not a silent jump to Product V1.

## Claims allowed in the demo

- `MVP software demonstration`
- `controlled / simulated demo data`
- `non-medical canine wellbeing observations`
- `ELI confidence / gating logic`
- `Breiz non-diagnostic explanation layer`
- `MAT + TAG target architecture`
- `owner-scoped backend data export exists in the codebase`
- `CI, build, tests and security gates have current evidence on main`

## Claims prohibited in the demo

- live MAT/TAG readings unless a separately validated live integration is actually connected;
- medical, diagnostic or emotional-state conclusions;
- CE conformity;
- Product V1 freeze;
- manufacturing release;
- tooling authorization;
- production-ready authentication;
- production deployment readiness;
- final mechanical / PCB / enclosure geometry;
- real-user beta readiness.

## Known boundaries before external demo

- Backend register/login/refresh remain stubs; do not make account creation part of the demo path.
- The dedicated `/demo` route is deliberately self-contained and does not require authentication.
- Some legacy application surfaces still contain text-encoding drift; do not improvise outside the approved demo path until those surfaces are QA-cleared.
- Full live-hardware integration is outside this software demo freeze.

## Pre-demo checklist

- Open the preview deployment from `demo/mvp-freeze`.
- Confirm `/demo` loads without authentication.
- Click all four demo steps.
- Check desktop viewport and one mobile-sized viewport.
- Confirm no mojibake / broken accents on `/demo`.
- Confirm the banner says controlled/simulated data and non-clinical.
- Confirm there are no console errors that affect the demo path.
- Confirm the current branch passes web typecheck, tests and build.
- Keep a static screenshot or screen recording as fallback for presentation-day network failure.

## Freeze rule

After the demo candidate passes CI and visual smoke testing, only demo-blocking fixes are allowed on `demo/mvp-freeze` until the presentation is complete.
