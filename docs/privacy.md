# EmoPet Privacy Defaults (TRIO Pipeline)

## Core Principles
- Non-medical observations only.
- Privacy by design: minimum data needed for trend analysis.
- Explicit opt-in for sensitive signals.

## Defaults
- `enable_audio_features: false`
- `enable_geo: false`
- `store_raw_audio: false`

## Audio Handling
- Pipeline accepts only aggregated audio features (`db_mean`, `db_max`, `peaks_count`).
- Raw audio files are not required and are not stored by default.

## Geolocation
- Geolocation is off by default.
- Light context can use a day/night fallback without location.

## Output Scope
- Outputs contain trends, confidence, and quality.
- No diagnosis, no medical claims.
