# Cleanup suggestions

This file lists cleanup candidates only. No file is removed in this UX pass.

## Candidates

- `flutter_app/lib/ui/...`
  Legacy parallel UI tree not used by the active app entrypoint in `flutter_app/lib/main.dart`.

- `flutter_app/lib/ui/widgets/confidence_badge.dart`
  Legacy widget tree parallel to the active widget tree under `flutter_app/lib/widgets/...`.

- `flutter_app/lib/ui/screens/today_main_screen.dart`
  Legacy screen with copy and encoding issues, not wired to the active shell.

- `flutter_app/lib/ui/screens/why_screen.dart`
  Legacy explanation screen, not wired to the active shell.

- `flutter_app/lib/src/i18n/i18n.dart`
  Parallel custom i18n layer that overlaps with generated `AppLocalizations`.

- `flutter_app/lib/src/i18n/i18n_scope.dart`
  Related to the parallel i18n path above.

## Why keep them for now

- Removing them is outside the current "safe mode" scope.
- They may still be referenced by experiments or pending work outside the active app flow.
- The requested UX pass can be completed without structural cleanup.

## Suggested future cleanup order

1. Confirm there are no imports from `flutter_app/lib/ui/...`.
2. Confirm there are no imports from `flutter_app/lib/src/i18n/...`.
3. Remove the legacy UI tree in one dedicated cleanup PR.
4. Keep generated l10n as the single source of truth.
