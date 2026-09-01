## Scope
Resolves the demonstrated DATA-01 ELI export leakage without claiming closure of the full Data Act architecture.

### Candidate behavior
- Guardian export no longer spreads persisted `eli_states` rows;
- valence is excluded from Guardian JSON/CSV;
- arousal/load are emitted only for exact `PUBLISH` states;
- DEGRADE/REJECT/unknown states fail closed for latent values;
- confidence/gate/reliability/provenance remain available to explain publication/withholding;
- raw high-rate streams remain explicitly not persisted/fabricated.

### Evidence
Dedicated tests cover JSON field leakage, numeric-value leakage in CSV, fail-closed unknown gates, and a structural guard against reintroducing persistence-row spread. A dedicated CI workflow builds the backend, runs these tests and typechecks.

### Non-decisions
No retention rule, new persistence, third-party delegation, legal classification of internal derived variables, scientific validation, merge, deployment or release is authorized.

Refs #68, #81, #82, #70.
