# Breiz — contextual discovery scenes

Status: `DEMO_CANDIDATE / PRODUCT_PATTERN`

Breiz is not only an explanation layer for EMOPET observations. It can also turn a voluntary territorial context into small discovery scenes: culture, heritage, language, events, nature and practical local information.

## Experience loop

`real outing -> useful location context -> eligible sourced discovery -> Breiz scene -> optional exploration / memory`

The goal is to make the real world feel explorable without turning EMOPET into a generic tourism feed.

Examples of scene prompts:

- **Une histoire passe près de toi** — a cultural or heritage notice becomes relevant to the current place.
- **Le territoire a aussi son propre rythme** — a verified local event is relevant to the current date.
- **Un symbole peut devenir un repère de voyage** — language, symbols or regional context are surfaced when relevant.
- **À savoir avant d’y aller** — a future practical connector can surface verified dog-access rules, opening constraints or services.

## Current implementation

### Controlled scene model

Executable source: `apps/web/lib/breiz-discovery/index.ts`.

Each scene carries:

- category;
- title / hook / story;
- `whyNow` explanation;
- territory;
- trigger context (region, optional department/city/month);
- explicit provenance;
- source name / URL / update date / licence when available;
- priority.

`selectBreizControlledDiscoveries()` chooses only scenes compatible with the supplied context. City-specific scenes do not appear when the city is unknown.

### Official-source enrichment

Existing endpoint:

`GET /api/breiz/discoveries?q=<place-or-topic>&per_source=<n>`

It searches server-side official/institutional discovery connectors. Current no-credential sources include POP / Ministère de la Culture metadata, Gallica metadata, Région Bretagne Open Data, GéoBretagne and data.gouv.fr. DATAtourisme is added when its free API key is configured.

`officialDiscoveryToScene()` transforms a discovery record into a UI scene **without inventing additional local facts**. If the upstream record has no summary, the scene says that there is not enough text to narrate more.

### Demo surface

`BreizDiscoveryScenes` is embedded in `/demo` under the Breiz chapter.

The demo uses a controlled Lorient/August context first, then offers optional official-source enrichment. External-source failure never breaks the presentation: the UI stays on controlled fixtures and says that the live layer is unavailable.

## Privacy and triggering

Product triggering should use the least precise location context needed for the scene.

Preferred order:

1. voluntary city / area context;
2. department / region when city precision is unnecessary;
3. precise coordinates only for a feature that genuinely requires them and with explicit user authorisation.

No precise position should be silently sent to cultural sources.

## Separation from ELI

This boundary is absolute:

- a place, event, weather condition, heritage notice or cultural fact is **external context**;
- it is never evidence of the dog's internal state;
- discovery scenes must never change Valence–Arousal confidence or create an emotional label;
- Breiz may juxtapose the two layers in the experience only if their provenance remains visibly distinct.

Example:

> The Festival Interceltique is happening nearby.

Allowed as cultural context.

> Gus is excited because the Festival Interceltique is nearby.

Not allowed unless a separate, valid observation path independently supports a descriptive claim — and even then the festival is context, not proof.

## Editorial quality

A scene should feel like a small moment of discovery, not a database row or a Wikipedia excerpt.

However narration may only use facts supported by the source metadata/content allowed for the response. Style can improve the reading experience; style cannot increase factual certainty.

## Next production steps

- connect the scene selector to voluntary user location context;
- add explicit preferences for discovery categories and proactive suggestions;
- add a saved `Découvertes` / travel-memory collection;
- add dog-access / local-service connectors only when source and freshness rules are verified;
- expand beyond Bretagne through the same region-profile architecture;
- perform product QA for frequency so Breiz feels curious, not intrusive.
