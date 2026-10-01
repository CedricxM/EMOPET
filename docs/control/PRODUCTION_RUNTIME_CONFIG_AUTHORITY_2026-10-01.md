# Production Runtime Configuration and Secret Authority

Status: `CONTRACT_ONLY / PRODUCTION_SECRET_CUSTODY_UNVERIFIED`  
Authority issue: #831  
Related launch-security authority: #214  
Machine-readable contract: `config/release/production-runtime-config-authority-v1.json`

## Purpose

This contract defines how EMOPET classifies production runtime configuration without storing or inventing secret values.

It does not configure a production environment and it does not select a secret manager.

## Core classification rule

### Client-exposed configuration

Any variable named `NEXT_PUBLIC_*` is treated as **client-exposed by construction**.

Therefore:

- it must be safe to disclose to arbitrary clients;
- it must never contain a password, private API credential, private signing material or other secret;
- its presence does not authorize use of the corresponding provider or dataset.

A publishable token can still require independent account, rights, billing, privacy and release authority.

### Server-private configuration

Anything not explicitly client-exposed remains **server-private by default**.

Server-private does not mean every value is cryptographically secret. It means the value must not be exposed to the client merely because it is convenient.

Typical non-secret server configuration includes:

- environment mode;
- ports and CORS origins;
- model names;
- sender identities;
- controlled backend URLs;
- feature flags and release gates.

### Server secrets

Secret-like names and authorities include:

- `*_SECRET`;
- `*_PASSWORD`;
- `*_API_KEY`;
- `*_ACCESS_KEY`;
- `*_ACCESS_TOKEN`;
- `*_WEBHOOK_SECRET`;
- database/Redis connection URLs.

The machine-readable contract records semantic examples, not values.

## Database credential separation

The repository already distinguishes:

- `DATABASE_URL` for the long-lived runtime application role;
- `MIGRATION_DATABASE_URL` for migration/DDL authority.

Production evidence must preserve this authority separation.

Local or disposable fallback behavior is not evidence that production roles are correctly separated.

## Privileged internal audit secret

`EMOPET_INTERNAL_AUDIT_SERVICE_SECRET` is server-only and must remain distinct from:

- `JWT_SECRET`;
- `PRIVILEGED_JWT_SECRET`.

The existing privileged-audit authority also requires an HTTPS backend origin in production.

## Checked-in env examples

`.env.example` and `apps/web/.env.example` are templates and variable-name inventories.

They are not:

- a secret store;
- proof of credential rotation;
- proof that a provider account exists;
- proof that a production environment is configured;
- release authority.

Production values must never be copied into repository evidence.

## Required production receipt

A future production environment receipt must identify, without exposing values:

- environment authority;
- release receipt;
- digest of the reviewed configuration manifest;
- runtime injection authority;
- secret-custody authority;
- rotation owner and rotation evidence;
- runtime DB role evidence;
- migration DB role evidence;
- DB role-separation evidence;
- review of client-exposed/public configuration;
- production HTTPS evidence for backend/server-to-server flows;
- approver and review timestamp.

Missing evidence means `HOLD`.

## Provider credentials are not product authority

A valid API key or token proves only that a transport credential exists.

It does not prove:

- licence or data-use rights;
- provider privacy/retention acceptance;
- billing/account authority;
- production release approval;
- permission to enable a feature.

Existing service-rights and provider-authority gates remain independent and fail closed.

## Current disposition

`REL-G5-RUNTIME-CONFIG-CONTRACT = DEFINED`

`PRODUCTION_SECRET_CUSTODY = UNVERIFIED`

`PRODUCTION_RUNTIME_CONFIGURATION = NOT AUTHORIZED`

Refs: #831, #214, #69, #116, #782.
