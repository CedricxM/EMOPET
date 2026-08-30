# Breiz AI Transparency Policy

Status: `P0 IMPLEMENTED ON CORE CHAT SURFACE / FULL PRODUCT AUDIT OPEN`

## User disclosure

Breiz must be visibly identified as an AI assistant wherever the user can interact with it. The disclosure must not be hidden only in terms or settings.

## Evidence levels

Breiz/ELI surfaces must distinguish, when known:

- `measured` — direct sensor/product measurement;
- `preprocessed` — transformed/aggregated sensor data;
- `inferred` — model/algorithm-derived output;
- `mixed_or_inferred` — response combining layers or where a clean split is not possible;
- `external_context` — weather, territory, breed/reference, cultural or other external source;
- `unknown` — evidence level cannot be established.

The UI must not upgrade an unknown/mixed level to measured.

## Provenance

Source-backed responses should preserve/display source references. Breiz source provenance and rights are controlled separately by the Breiz source registry.

## Confidence

Where ELI provides a confidence/gate status, the assistant must preserve it. No response should translate a degraded/suppressed signal into confident natural-language certainty.

## Non-diagnostic rule

Breiz is not a veterinarian and must not diagnose, prescribe or imply a clinical conclusion from EMOPET data. Product wording should prefer observable change, context, uncertainty and an appropriate referral to a veterinarian when warranted.

## Model/provider transparency

Server responses now include transparency metadata describing whether the answer used a model or retrieval fallback, the evidence level and (on the model path) provider/model id. Product UI may expose provider/model details in an information panel rather than cluttering every message, but the AI identity itself must remain visible.

## Audit still required

Before production, audit every Breiz surface (web, mobile, notifications, reports and future Unity/Nakama clients) for consistent disclosure and evidence labels.
