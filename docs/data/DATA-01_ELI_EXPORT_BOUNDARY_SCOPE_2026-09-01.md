# DATA-01 ELI export boundary — controlled scope

This slice is intentionally narrow.

It fixes one demonstrated P0 inconsistency: a Guardian portability export must not bypass the current ELI publication gate merely because internal variables are persisted in `eli_states`.

It does not settle firmware raw-data availability, preprocessed-vs-inferred classification for every algorithm, direct-access architecture, related-service data, retention, or third-party delegation. Those remain under DATA-01.

No scientific threshold or persistence model is changed by this slice.
