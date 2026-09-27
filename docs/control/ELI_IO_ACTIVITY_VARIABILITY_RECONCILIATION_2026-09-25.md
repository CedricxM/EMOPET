# ELI IO first-slice reconciliation — activity_variability

**Issue:** #122  
**Parent:** #118  
**Date:** 2026-09-25  
**Status:** `TRANSPORT GAP EXPLICIT / FIRST PRODUCER OWNER IDENTIFIED / NO RUNTIME ACTIVATION`

## Finding

The repository currently has three different facts that were easy to blur together:

1. TAG firmware contains a real `activity_variability` implementation.
2. `FeatureVector` contains an `activity_variability` field.
3. BLE V1 `TagPayload` does **not** contain an `activity_variability` field.

Therefore the current end-to-end statement is:

`firmware computes candidate feature != BLE V1 transports feature != backend ingests feature`

Only the first statement is currently true for this feature.

## First-slice owner decision

For **activity_variability only**, the existing implementation is sufficient to choose the narrow computation owner:

`FEATURE COMPUTATION OWNER = TAG FIRMWARE`

Reason:
- the 30-minute / 1 Hz / >=900-valid-second / BODY_SHAKE-suppressed algorithm already exists in firmware;
- the measurement contract is coherent across firmware and documentation;
- recomputing the same long-window feature independently on mobile/backend would create unnecessary duplicate authority and drift risk.

This does not assign every future feature to firmware.

## Layer ownership for the first slice

### TAG firmware
Owns:
- 1 Hz ODBA accumulation;
- 30-minute window;
- BODY_SHAKE sample suppression;
- minimum valid coverage;
- CV computation;
- explicit invalid/no-result.

### BLE / transport
Must eventually carry:
- feature id/version;
- value/null state;
- source;
- window end / device-time lineage;
- quality/coverage;
- sequence/replay identity.

Current BLE V1 does not do this.

### Mobile
Candidate role:
- receive;
- preserve bytes/metadata;
- bind transport session information;
- forward without independent scientific recomputation.

### Backend
Candidate role:
- bind canonical device/dog identity;
- map device time to event time;
- enforce feature-contract version;
- reject duplicate/replayed/conflicting envelopes;
- persist approved feature provenance;
- orchestrate ELI only after science/runtime gates permit.

## Current wire gap

Current `TagPayload` transports fields such as activity magnitude, posture, agitation, vocal features, throat RR, GPS and reliability states.

It does not transport:
- `activity_variability`;
- `tremor_detected`;
- `lateral_acc_rms`;
- `gyro_std_deg_s`.

Current MAT payload likewise does not transport `rr_variability`.

The previous firmware-protocol wording implied that shared FeatureVector additions were already uplink fields. That wording is corrected by this branch.

## What must not happen

Do not solve the gap by:

- silently stuffing new bytes into BLE V1 without a version change;
- inferring activity_variability from `activityMg` on the backend;
- recomputing a 30-minute feature independently on every client;
- treating missing transport as zero;
- accepting a client-supplied dog id as device attribution;
- calling a software transport fix scientific validation.

## Transport design options still open

A later implementation may choose one controlled approach, for example:

1. versioned BLE frame extension;
2. a separate versioned feature-summary characteristic/message;
3. another explicitly governed device-to-backend path.

The choice must preserve compatibility, offline/replay behavior and Device Trust #66.

This document intentionally does not choose the byte layout.

## Conformance gate

Before this feature can feed canonical backend ELI orchestration, one deterministic vector must prove:

`firmware feature output -> versioned transport -> parser -> provenance envelope -> backend validator -> EliInput`

The vector must include:
- valid feature;
- insufficient coverage/null;
- duplicate/replay;
- wrong feature-contract version;
- device/dog binding mismatch;
- timestamp/sequence reset case;
- degraded/suppressed quality.

## Science boundary

The **measurement** contract is coherent.

The mapping:

`activity_variability -> latent arousal`

remains an unvalidated EMOPET hypothesis under #87.

Closing the transport gap does not authorize Guardian publication.

## Current status

`ELI_IO_ACTIVITY_VARIABILITY_PRODUCER = TAG_FIRMWARE`

`ELI_IO_ACTIVITY_VARIABILITY_BLE_TRANSPORT = NOT_IMPLEMENTED`

`ELI_IO_FEATURE_INGESTION = NOT_IMPLEMENTED`

`ELI_IO_END_TO_END = OPEN`
