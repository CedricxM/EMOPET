# Production backup + restore authority — 2026-10-01

Status: **CONTRACT ONLY / NO PRODUCTION BACKUP OR RESTORE AUTHORITY**

Parent: #831  
Backup/restore evidence slice: #965  
Launch-security dependency: #214 HARDEN-G10  
Privacy/retention dependencies: #69, #478

## Purpose

This record defines the minimum non-secret evidence required before a future production release may represent its backup and restore posture as reviewed.

It does **not** configure backups and it does not select a cloud, storage vendor, schedule, RPO, RTO or retention duration.

## Required evidence

A production backup/restore receipt must bind to the reviewed **production** environment and carry non-secret references for:

- the backup authority;
- durable-store coverage;
- backup automation;
- encryption;
- access control;
- failure visibility;
- one identified backup snapshot/set;
- one restore target;
- a restore exercise;
- restore verification;
- the applicable retention/erasure authority;
- independent review.

The canonical machine-readable authority is:

`config/release/production-backup-restore-authority-v1.json`

## Fail-closed boundary

The default receipt state is `DRAFT_UNVERIFIED`.

Provider defaults, marketing statements, local dumps, disposable QA databases and P0 DB setup are not production backup evidence.

A missing, stale, mismatched or `UNVERIFIED` backup/restore receipt keeps the production release at HOLD.

## Restore evidence

A future readiness claim must include a reviewed restore exercise bound to an identified backup snapshot/set and target environment.

The receipt records evidence references only. It must not contain restored personal-data dumps, credentials, secret values or encryption keys.

## Retention and recovery policy

This contract deliberately does not select:

- backup frequency;
- RPO;
- RTO;
- retention duration;
- backup storage provider;
- deletion schedule.

Retention/erasure composition remains dependent on #69/#478.

## Non-effects

This contract creates no backup job, snapshot, restore environment, provider account, credential, production migration, deployment or release authority.

`REL-G7-BACKUP-RESTORE-CONTRACT = DEFINED / LIVE EVIDENCE UNVERIFIED`
