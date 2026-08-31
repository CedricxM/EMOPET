# Breiz official-source connectors

These connectors are server-side discovery adapters for official/institutional sources. They return compact discovery records with provenance; they are not permission to copy or embed every upstream document.

## Connected without credentials

- `pop-culture` — Ministère de la Culture open-data datasets (heritage + cultural places)
- `bnf-gallica` — Gallica SRU descriptive metadata
- `data-gouv-fr` — data.gouv.fr catalogue API
- `geobretagne` — public CSW metadata catalogue
- `region-bretagne-open-data` — Région Bretagne Opendatasoft catalogue API

The aggregator is exposed at:

`GET /api/breiz/discoveries?q=<query>&per_source=3`

Each upstream failure is isolated. A source can fail while the other sources still return records.

## Free but credentialed

### DATAtourisme

Create a free API key, then set:

`DATATOURISME_API_KEY=<secret>`

Never commit the real key. The connector is automatically added to discovery when the environment variable exists.

### SIRENE

The registry reserves:

`INSEE_API_TOKEN=<secret>`

SIRENE is not yet included in the cultural-discovery aggregator. It belongs to a later service-directory connector with privacy/data-minimisation rules.

## Partnership track

BCD/Bécédia and Bretania are intentionally **not** scraped. Their registry status is `partner_review` until a technical feed and commercial-reuse/rights scope are confirmed with Bretagne Culture Diversité.

## Security / product boundaries

- server-side only for credentialed connectors;
- short upstream timeout;
- no silent fallback from metadata rights to full-text rights;
- preserve canonical URL, source name, attribution, licence and retrieval date;
- never feed territorial/cultural discoveries into ELI as evidence of the dog's internal state;
- do not mark a source production-connected until CI + live endpoint smoke tests pass.
