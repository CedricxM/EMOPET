# DATA-01 ELI export boundary — test plan

The dedicated `DATA-01 ELI export boundary` workflow is the candidate evidence gate for this slice.

Required PASS conditions:

- backend dependency closure builds;
- Guardian serializer tests pass;
- PUBLISH permits only the currently authorized latent fields;
- DEGRADE, REJECT and unknown/future gate states fail closed for latent values;
- JSON never contains persisted valence;
- CSV never contains persisted valence;
- non-PUBLISH CSV contains none of the persisted arousal/load/valence values;
- route static guard confirms inferred rows are passed through the controlled serializer rather than persistence-schema spread;
- backend typecheck passes.

A green result makes this **ELI export-boundary slice** a candidate PASS only. It does not close DATA-01 as a whole.
