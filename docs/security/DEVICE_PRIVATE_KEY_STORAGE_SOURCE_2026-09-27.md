# DEVICE-TRUST-ID-10 — persistent P-256 key provisioning source boundary

**Issue:** #657  
**Parent:** #648 / #66  
**Date:** 2026-09-27  
**Status:** `SOURCE CANDIDATE / DISABLED BY DEFAULT / TARGET STORAGE PROOF OPEN`

## Decision

The selected P0 identity architecture generates the P-256 private key on-device
and retains it as a **persistent PSA key**.

The application never receives private-key bytes.

The selected at-rest direction for nRF52840 is:

`PSA persistent key -> NCS Secure Storage -> HUK/KDR-derived AEAD protection`

This is intentionally different from a KMU design. nRF52840 has no KMU.

## Activation gate

The source primitive is controlled by:

`CONFIG_EMOPET_DEVICE_KEY_PROVISIONING`

and that option is **default n**.

Kconfig refuses activation unless all of these are present:

- PSA Crypto;
- Secure Storage;
- Hardware Unique Key support;
- Secure Storage HUK-library AEAD key provider.

The repository does not enable those storage/HUK settings in `prj.conf` yet.

That omission is deliberate. Source availability is not target evidence.

## Provisioning primitive

`device_identity_key_provision_p256_v1()` receives:

- an explicit application PSA key id;
- an explicit credential version;
- an output receipt for the public key only.

It:

1. rejects null key id / zero credential version;
2. checks whether the key id already exists;
3. refuses overwrite;
4. creates an ECC P-256 key pair;
5. sets persistent lifetime;
6. permits SIGN_HASH only;
7. pins ECDSA(SHA-256);
8. exports only the 65-byte SEC1 uncompressed public key;
9. destroys the newly-created key if post-generation public export/format
   validation fails.

There is no private-key export or production private-key import path.

## Rollback authority

`psa_destroy_key()` appears only as rollback for a key created by the same
failed provisioning attempt.

This is not a generic key-management or runtime deletion API.

Rotation/revocation/RMA remain separate lifecycle gates.

## Still required before enabling the Kconfig option

### NSIB/HUK
- representative nRF52840 NSIB/HUK configuration;
- KDR generation/provisioning evidence;
- HUK library usable after reboot;
- application never directly reads KDR.

### Secure Storage
- exact partition/layout;
- HUK-derived AEAD provider confirmed in build/config;
- persistence across reboot;
- erase/rework behavior.

### Production security dependencies
- APPROTECT final state;
- signed/verified firmware;
- production update authenticity/rollback authority.

### Representative MS88SF3 proof
- key provision;
- reboot;
- same public key;
- #656 signature;
- #654 backend verification;
- wrong/revoked credential rejection;
- replay rejection.

## Hard stop

This source candidate does not authorize Device Data Trust or network telemetry
persistence.

A source file containing `psa_generate_key()` is not proof that production
private-key storage is safe.
