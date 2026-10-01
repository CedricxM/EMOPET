# Production transport-security authority — 2026-10-01

Status: **CONTRACT ONLY / NO PRODUCTION TRANSPORT AUTHORITY**

Parent: #831  
Transport evidence slice: #964  
Launch-security dependency: #214 HARDEN-G5

## Purpose

This record defines the minimum non-secret evidence required before a future production release may represent its HTTPS/TLS/edge boundary as reviewed.

It does **not** configure infrastructure and it does not select a hosting provider, deployment platform, domain, certificate authority, HSTS value or edge architecture.

## Required evidence

A production transport receipt must bind to the reviewed **production** environment and carry non-secret references for:

- the environment authority;
- the public-origin authority;
- observed production HTTPS;
- plaintext HTTP handling;
- TLS termination, certificate and protocol evidence;
- HSTS disposition;
- effective security-header evidence;
- edge-to-origin transport disposition;
- independent review.

The canonical machine-readable authority is:

`config/release/production-transport-security-authority-v1.json`

## Fail-closed boundary

The default receipt state is `DRAFT_UNVERIFIED`.

Localhost, local HTTPS, preview deployments, CI success and repository configuration are not substitutes for evidence from the reviewed live ingress.

A missing, stale, mismatched or `UNVERIFIED` transport receipt keeps the production release at HOLD.

## HSTS and edge policy

This contract deliberately does not select:

- an HSTS max-age;
- `includeSubDomains`;
- preload participation;
- a certificate provider;
- TLS termination topology;
- edge-to-origin architecture.

Those values must come from reviewed production evidence and the appropriate human/operational authority.

## Secret boundary

Release receipts may contain non-secret provider or repository evidence references. They must never contain private keys, certificate private material, provider tokens, credentials or secret values.

## Non-effects

This contract creates no production environment, no DNS record, no certificate, no provider account, no deployment and no release authority.

`REL-G6-TRANSPORT-CONTRACT = DEFINED / LIVE EVIDENCE UNVERIFIED`
