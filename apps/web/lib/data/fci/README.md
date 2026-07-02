# FCI Breed Reference Module

This module ingests local FCI-compatible files only. It does not scrape external websites.

Current local sources:

- `data/reference/fci_breeds.csv`: small controlled CSV with `fci_group,name,country_origin,size_class`.
- `data/breed_profiles.json`: richer local EMOPET reference with FCI number, names, group, origin and optional morphology fields.

The normalized `FciBreed` schema keeps unavailable fields nullable:

- section data may be null;
- standard URL may be null;
- coat and morphology fields may be null unless present in a local source.

Allowed EMOPET uses:

- breed search during onboarding;
- FCI group display;
- optional coat, size and morphology metadata when present;
- cohort grouping for future validation work;
- sensor-quality interpretation such as fur-related signal damping or mat-variant checks;
- educational content grounded in local sources.

Not allowed:

- using breed as a shortcut for animal wellbeing estimation;
- assigning deterministic personality traits from breed;
- deriving a dog internal state from breed, location or public territory data.
