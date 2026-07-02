# UX v6 audit notes

Date: 2026-03-08

## Scope

Goal: improve the Flutter UX to a more polished consumer-app feel without changing repo structure, backend logic, or database schema.

Active Flutter app path:

- `flutter_app/lib/src/...`
- `flutter_app/lib/app/theme.dart`
- `flutter_app/lib/l10n/*.arb`

## Active navigation and screens

Current active shell:

- `flutter_app/lib/src/home_shell.dart`

Current active screens:

- `flutter_app/lib/src/ui/screens/today_screen.dart`
- `flutter_app/lib/src/ui/screens/balance_screen.dart`
- `flutter_app/lib/src/ui/screens/profile_screen.dart`
- `flutter_app/lib/src/ui/screens/journal_screen.dart`
- `flutter_app/lib/src/ui/screens/services_screen.dart`

Supporting active widgets:

- `flutter_app/lib/widgets/disclaimer_banner.dart`
- `flutter_app/lib/widgets/emopet_chips.dart`
- `flutter_app/lib/widgets/confidence_badge.dart`
- `flutter_app/lib/src/ui/widgets/section_card.dart`
- `flutter_app/lib/src/ui/widgets/sources_meta.dart`
- `flutter_app/lib/src/ui/widgets/how_to_read_expander.dart`

## Files targeted for this UX pass

Planned edits:

- `flutter_app/lib/src/home_shell.dart`
- `flutter_app/lib/app/theme.dart`
- `flutter_app/lib/src/ui/screens/today_screen.dart`
- `flutter_app/lib/src/ui/screens/balance_screen.dart`
- `flutter_app/lib/src/ui/screens/profile_screen.dart`
- `flutter_app/lib/src/ui/screens/journal_screen.dart`
- `flutter_app/lib/l10n/app_fr.arb`
- `flutter_app/lib/l10n/app_en.arb`

Planned additions:

- `flutter_app/lib/src/ui/components/score_gauge.dart`
- `flutter_app/lib/src/ui/components/info_card.dart`
- `flutter_app/lib/src/ui/components/signal_chip.dart`
- `flutter_app/lib/src/ui/components/event_tile.dart`

Generated files expected after l10n regeneration:

- `flutter_app/lib/l10n/app_localizations.dart`
- `flutter_app/lib/l10n/app_localizations_fr.dart`
- `flutter_app/lib/l10n/app_localizations_en.dart`

## Audit findings

### What is safe

- The active Flutter app already uses generated `AppLocalizations`.
- The active UX can be improved locally inside the existing screens.
- FCI data is already consumed from the backend through `FciApi`.
- No database or Alembic change is required for the requested Flutter scope.

### What needs correction

- Bottom navigation does not match the requested IA. Current order is Today / Profile / Insights / Journal / Services.
- The current home screen is image-led and text-led, not score-led.
- The current insights screen is mostly technical expansion tiles, not a consumer summary.
- The profile screen exposes `group / section` details too directly for the requested UX.
- Copy still contains stale strings such as `Why?` and `in one sentence`.
- Copy consistency is mixed around reliability/confidence wording.
- Backend endpoint `/meta` is not present at the moment, while `/healthz`, `/breeds`, `/groups`, `/fci/documents`, and `/fci/documents/{id}/sections` are present.

### AppLocalizations getter audit

The currently generated localization API already contains the getters mentioned in prior error reports:

- `signalsTempHelp`
- `servicesTitle`
- `commonSoon`

Result:

- no active `undefined_getter` was reproduced from a static comparison between `l10n` usages in `flutter_app/lib/src/...` and generated `app_localizations.dart`
- planned i18n work is still required for the new UX copy

### Planned i18n additions

- `navHome`
- `navCarnet`
- `homeWelcomeBack`
- `homeWellbeingSummary`
- `homeRestScore`
- `homeRestScoreSubtitle`
- `homeDataUsedTitle`
- `homePartialData`
- `homePossibleAlternativesTitle`
- `homeEventsPreviewTitle`
- `insightsRestScoreTitle`
- `insightsRestScoreSubtitle`
- `insightsWhyTitle`
- `insightsAlternativesTitle`
- `insightsUsedDataTitle`
- `insightsEventsTitle`
- `insightsNight`
- `insightsDay`
- `insightsAll`
- `insightsFunctioningTitle`
- `insightsFunctioningSubtitle`
- `insightsReliabilityTitle`
- `commonDashValue`
- `commonPartialData`
- `commonNonMedicalDisclaimerShort`
- `eventRestStable`
- `eventRestPerturbed`
- `eventDeepRest`
- `profileGeneralContextTitle`
- `profileGeneralContextSubtitle`
- `profileFciReferenceTitle`
- `profileFciReferenceSubtitle`
- `profileBreedSuggestionsTitle`
- `profileWeightLabel`
- `profileUsageLabel`
- `profileReferenceOptional`
- `profileGroupHiddenHint`

## Risks

- `flutter_app/lib/ui/...` contains a legacy parallel UI tree. Even if inactive from `main.dart`, it still increases cognitive noise and may complicate future cleanup.
- Some strings and terminal output show mojibake in shell output. Edits should preserve valid UTF-8 JSON for `.arb` files.
- `/meta` missing may block the exact verification checklist requested by the user. A minimal backend endpoint may be needed later if verification must be strict.

## Non-risks

- No migration is needed for the requested UX pass.
- No Postgres schema change is needed.
- No FastAPI model change is needed for current FCI rendering.
- Existing endpoints are sufficient for breed lookup and FCI detail rendering.

## Run / verify

Backend:

```powershell
docker compose up -d
Invoke-RestMethod http://127.0.0.1:8000/healthz
Invoke-RestMethod http://127.0.0.1:8000/meta
```

Flutter:

```powershell
cd flutter_app
flutter pub get
flutter gen-l10n
flutter run -d windows
```

## Decision log

- Do not touch Alembic or DB schema.
- Do not delete legacy files.
- Keep backend changes to zero unless `/meta` becomes necessary for the requested verification contract.
