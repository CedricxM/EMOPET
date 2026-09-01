# Candidate delta

- replaces persistence-row spread for Guardian ELI export with a controlled serializer;
- excludes valence from Guardian JSON/CSV;
- gates arousal/load on `PUBLISH`;
- fails closed for unknown gate states;
- adds value-level and structural regression tests;
- adds a dedicated CI gate;
- leaves the broader DATA-01 architecture open.
