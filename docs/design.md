# EmoPet TRIO Analysis Design

## Goal
Provide a maintainable analysis pipeline for MAT + Context Tag + context APIs, with transparent confidence and quality.

## Pipeline Steps
1. Read streams from `imu.csv`, `mat.csv`, `context.csv`, optional `audio_features.csv`.
2. Normalize into a common internal timeseries model.
3. Window data (default 5 seconds).
4. Compute features:
   - IMU: `acc_rms`, `acc_var`, `gyro_rms`, `jerk_rms`, `dominant_freq`, `turn_rate`
   - MAT: `presence`, `micro_movement_energy`, `interruptions_count`, `fragmentation_index`
   - Context: weather/air/pollen/light fallback, plus optional audio features
5. Build an individual baseline from prior days (median/IQR/percentiles).
6. Classify windows with interpretable rules:
   - `SLEEP`, `REST_VIGILANT`, `WALK`, `RUN`, `ZOOMIES`, `UNKNOWN`
7. Aggregate to episodes and daily summary.
8. Generate prudent non-medical alerts.

## Quality and Confidence
- `quality` reflects data completeness per window.
- `confidence` reflects rule fit and quality.
- Low quality yields `UNKNOWN` or reduced confidence.

## Extensibility
- Classifier interface allows future ML replacement.
- Context API keys are loaded from environment variables.
- Output schema is JSON-based for easy API/UI consumption.
