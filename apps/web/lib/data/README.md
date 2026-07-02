# EMOPET Data Intelligence Layer

This folder contains data-only modules for the first EMOPET intelligence architecture. It does not define routes, page UI, navigation or visual components.

## Layer 1: Territorial scoring

Location: `territory/`

Purpose: help EMOPET compare pilot territories for launch planning.

Inputs include population, density, median income, housing/lifestyle compatibility, tourism, local canine ecosystem, community potential and heritage/local identity.

The default launch score is a configurable weighted business score:

- 25% population / density potential
- 20% canine ecosystem density
- 15% purchasing power
- 15% housing and lifestyle compatibility
- 10% tourism / mobility
- 10% community potential
- 5% heritage / local identity

This layer is strategic market planning only. It is not an animal wellbeing model.

## Layer 2: Breiz local knowledge

Location: `breiz/`

Purpose: prepare a local knowledge base for Breiz answers and future retrieval systems.

The ingestion functions support local JSON, CSV and Markdown content, then normalize it into `BreizDocument`, chunk it and export vector-store-ready records. A mock lexical store is included so the project can test retrieval without a paid vector database.

Rules:

- Breiz may use sourced local culture, territory and community information.
- Breiz should preserve source metadata internally.
- Breiz must say when the local corpus lacks enough information.
- Public territorial or cultural data must never be used as a proxy for a dog internal state.

## Layer 3: Future ELI sensor data

Location: `eli/`

Purpose: prepare future MAT/TAG/app observation schemas and validation checks.

The placeholder pipeline validates input shape, checks signal quality and returns `insufficient_data` when quality is too low. Demonstration outputs are clearly marked as mock and not validated.

Dog profile metadata is optional and only supports:

- onboarding;
- cohort grouping;
- sensor-quality interpretation;
- textile/coupling checks;
- future calibration research.

It does not assign internal state labels.

## Mapbox data support

Location: `mapbox/`

The app already has a Mapbox implementation in `apps/web/components/bretagne-map/`. This folder only defines schemas, mock entities and marker descriptors that can feed that existing integration later.

Supported data types:

- pilot territories;
- dog-friendly places;
- quiet walking spots;
- local routes;
- veterinarians;
- dog trainers;
- groomers;
- shelters;
- dog clubs;
- community contributions;
- EMOPET discovery points.

Community contributions remain opt-in. Public maps must not expose private animal data.

## FCI breed reference

Location: `fci/`

FCI data is treated as a taxonomy and onboarding reference. Local project sources currently include:

- `data/reference/fci_breeds.csv`
- `data/breed_profiles.json`

Missing source fields remain nullable. Breed data may support breed search, group display, cohort grouping, coat/morphology metadata when available, and sensor-quality constraints. Breed data must not be used as a shortcut for animal wellbeing estimation.

## Combined mock flow

Location: `use-cases/dogProfileLocalMapFlow.ts`

This pure data flow shows how a user can select a breed from the local FCI module, create a dog profile, receive neutral signal-quality notes and view public/opt-in local markers. It does not create a screen.
