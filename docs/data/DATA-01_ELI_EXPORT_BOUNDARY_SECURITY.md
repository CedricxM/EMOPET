# Disclosure threat model

Primary regression threat: a future schema change adds or renames internal ELI fields and a Guardian export spreads the persistence row, silently disclosing model internals.

Control: the route delegates to an explicit allowlist-style serializer. Tests guard both field names and persisted numeric values across JSON/CSV behavior. Unknown gate states fail closed.
