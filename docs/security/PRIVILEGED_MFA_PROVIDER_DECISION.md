# Privileged MFA Provider Decision Contract

Status: **DRAFT / EXTERNAL-UNVERIFIED**  
Owner gate: `PRIV-SEC-MFA-PROVIDER-01` (#175)  
Related implementation: #169 / #170 / canonical privileged-auth package #185

## 1. Purpose

This document defines the evidence and integration contract required before EMOPET can claim that privileged MFA and the privileged staff directory are operational.

It does **not** select a provider. It prevents provider selection from silently weakening the provider-neutral security boundaries already implemented in the repository.

A provider decision is acceptable only when all required decisions and PROVIDER-G1..G7 evidence below are completed in staging without committing credentials, recovery material, private keys, MFA seeds or provider access tokens.

## 2. Existing repository boundary

The backend already owns the security-sensitive validation after an external authority responds.

### Privileged directory adapter

A selected staff-directory authority must be adapted to:

```ts
interface PrivilegedIdentityDirectory {
  findBySubject(subject: string): Promise<unknown>;
}
```

The canonical step-up parser accepts only:

```ts
{
  subject: string; // canonical EMOPET UUID, equal to authenticated AUTH-01 subject
  role: 'admin' | 'support' | 'operator';
  active: boolean;
}
```

No provider role, group name, email address or free-form metadata may become authority by being forwarded directly. Provider-specific membership must be mapped server-side to the finite EMOPET role vocabulary.

### MFA verifier adapter

A selected MFA authority must be adapted to:

```ts
interface PrivilegedMfaVerifier {
  verify(input: {
    subject: string;
    assertion: unknown;
    requestedAt: string;
  }): Promise<unknown>;
}
```

The canonical step-up parser accepts only one of:

```ts
{
  status: 'VERIFIED';
  subject: string;
  method: 'webauthn' | 'totp' | 'idp_mfa';
  verifiedAt: string; // canonical UTC timestamp
  assuranceRef: string; // opaque non-secret audit reference
}
```

or:

```ts
{ status: 'REJECTED' }
```

Extra fields are not trusted. The provider adapter must not return secrets, recovery codes, raw authenticator material or provider tokens through this contract.

## 3. Provider non-negotiables

A candidate is **REJECTED** if any mandatory item cannot be demonstrated.

| Requirement | Mandatory | Decision/evidence |
| --- | --- | --- |
| Enforce MFA specifically for privileged identities | Yes | TBD |
| Support phishing-resistant WebAuthn/passkey-class MFA, directly or through an IdP assurance policy | Yes unless an explicit exception is approved | TBD |
| Expose a trustworthy subject that can be bound to the canonical EMOPET staff UUID | Yes | TBD |
| Expose active/disabled staff state suitable for joiner/mover/leaver enforcement | Yes | TBD |
| Support finite role/group mapping to `admin`, `support`, `operator` | Yes | TBD |
| Failed/denied MFA can be distinguished from provider outage/configuration failure | Yes | TBD |
| MFA/admin-policy events are auditable/exportable | Yes | TBD |
| Staff disable/offboarding takes effect without relying on long-lived EMOPET privileged tokens | Yes | TBD |
| Recovery does not permit password-only privileged access | Yes | TBD |
| Provider secrets can remain outside Git and client bundles | Yes | TBD |
| Staging/test tenant or equivalent evidence environment is available | Yes | TBD |
| Provider data-processing / contractual posture is reviewed for the intended deployment | Yes | TBD |

## 4. Candidate comparison record

Do not mark a provider SELECTED from marketing claims alone. Each candidate row must link to concrete internal evidence or provider documentation reviewed during the decision.

| Dimension | Candidate A | Candidate B | Candidate C |
| --- | --- | --- | --- |
| Provider / product | TBD | TBD | TBD |
| Directory authority | TBD | TBD | TBD |
| MFA authority | TBD | TBD | TBD |
| WebAuthn/passkey support | TBD | TBD | TBD |
| TOTP support and intended use | TBD | TBD | TBD |
| Conditional-access / privileged policy capability | TBD | TBD | TBD |
| Staff disable/offboarding behavior | TBD | TBD | TBD |
| Audit export capability | TBD | TBD | TBD |
| Recovery controls | TBD | TBD | TBD |
| Staging/test support | TBD | TBD | TBD |
| Integration effort with existing interfaces | TBD | TBD | TBD |
| Operational ownership | TBD | TBD | TBD |
| Commercial / contractual decision | TBD | TBD | TBD |
| Security exceptions required | TBD | TBD | TBD |
| Verdict | UNASSESSED | UNASSESSED | UNASSESSED |

## 5. Policy decisions that must be explicit

The repository deliberately refuses to infer these values from a provider response.

### Accepted MFA methods by role

| Role | WebAuthn | TOTP | IdP MFA | Approved rule |
| --- | --- | --- | --- | --- |
| `admin` | TBD | TBD | TBD | TBD |
| `support` | TBD | TBD | TBD | TBD |
| `operator` | TBD | TBD | TBD | TBD |

Safe evaluation preference: phishing-resistant WebAuthn/passkey-class assurance for normal privileged access. TOTP, if retained, must have an explicit purpose such as controlled fallback or recovery and must not silently become the weakest universal path.

### Freshness and lifetime

Values consumed by the existing step-up boundary:

- `maxAssertionAgeSeconds`: **TBD**
- `tokenTtlSeconds`: **TBD**

Initial staging test baseline, **not a production approval**:

- assertion freshness: 300 seconds;
- privileged token TTL: 900 seconds.

Both remain below the existing repository safety cap of 3600 seconds. Production values require explicit approval and evidence that offboarding/revocation exposure is acceptable.

### Session establishment

The provider decision must identify:

- which backend endpoint initiates/receives step-up;
- how the already-authenticated AUTH-01 subject is bound to the provider challenge;
- how the resulting privileged JWT becomes the hardened `__Host-emopet-privileged` server-side session cookie;
- cookie lifetime and clearing behavior;
- logout and privileged-session revocation behavior;
- whether re-authentication/step-up is required for sensitive action classes beyond ordinary privileged-session expiry.

No browser-supplied role, subject, MFA method or `mfaVerified=true` flag is acceptable authority.

## 6. Recovery and break-glass decision

The selected design must document all of the following before activation:

- lost-factor recovery owner and approval path;
- identity verification during recovery;
- whether recovery temporarily removes phishing-resistant assurance;
- maximum recovery/break-glass duration;
- mandatory audit event and alerting;
- forced re-enrollment after recovery where applicable;
- credential rotation requirements;
- who may activate and who may review emergency access;
- explicit prohibition on an undocumented password-only bypass.

If break-glass access exists, it must be separately inventoried, highly constrained and observable. It must not be hidden in application environment variables or static shared headers.

## 7. Joiner / mover / leaver controls

The directory authority must have an operational source of truth for:

- **Joiner:** privileged access is absent until an approved staff record, role and required MFA enrollment exist;
- **Mover:** role changes update the finite EMOPET role mapping and remove obsolete authority;
- **Leaver:** disabling/removing the staff identity prevents new step-up immediately and is tested in staging;
- privileged-session lifetime remains short enough that already-issued authority cannot survive offboarding for an unacceptable period.

The evidence record must identify the human/operational owner of these actions.

## 8. PROVIDER-G1..G7 evidence packet

### PROVIDER-G1 — Enrollment

Required staging evidence:

1. privileged identity exists;
2. required approved second factor is **not** enrolled;
3. step-up cannot complete;
4. approved factor is enrolled;
5. step-up can then proceed.

Record: `TBD`.

### PROVIDER-G2 — Challenge

Capture successful and rejected challenges and map them to the repository verifier contract:

- success -> `VERIFIED` with exact subject, finite method, canonical `verifiedAt`, opaque `assuranceRef`;
- rejection -> `REJECTED`;
- provider/configuration outage -> adapter failure, never synthetic `VERIFIED`.

Record: `TBD`.

### PROVIDER-G3 — Recovery

Exercise the documented lost-factor path. Prove it cannot turn privileged access into password-only access and that recovery is audited.

Record: `TBD`.

### PROVIDER-G4 — Offboarding

Disable/remove the privileged identity in the selected directory authority. Prove subsequent step-up fails and the adapter resolves no active privileged record.

Record: `TBD`.

### PROVIDER-G5 — MFA policy

Capture redacted provider-console/configuration evidence showing the actual privileged MFA policy, accepted methods and target population.

Record: `TBD`.

### PROVIDER-G6 — Auditability

Prove authentication, MFA challenge, staff disable/role change and MFA/admin-policy-change events can be queried/exported or otherwise delivered to the intended monitoring process.

Record: `TBD`.

### PROVIDER-G7 — No secret leakage

Before evidence is committed or attached:

- no MFA seed;
- no recovery code;
- no private key;
- no client secret;
- no session/access/refresh token;
- no provider API token;
- no unredacted personal identifier unless necessary and approved.

Record: `TBD`.

## 9. Adapter acceptance tests required after provider selection

A provider-specific implementation PR must add executable tests for at least:

- canonical AUTH-01 subject is the lookup key;
- unknown staff -> no privileged identity;
- disabled staff -> inactive identity;
- provider role/group outside approved mapping -> fail closed;
- MFA rejection -> `REJECTED`;
- provider exception/outage -> fail closed;
- mismatched MFA subject -> existing step-up boundary denies;
- unsupported MFA method -> existing step-up boundary denies;
- stale/future verification -> existing step-up boundary denies;
- assurance reference is opaque, bounded and non-secret;
- no provider token or directory credential reaches browser code;
- production configuration missing -> privileged step-up unavailable, never bypassed.

## 10. Decision record

This section is the only place where a completed provider decision may be declared.

- Selected provider/product: **TBD**
- Directory source of truth: **TBD**
- MFA authority: **TBD**
- Approved roles/groups mapping: **TBD**
- Approved MFA methods per role: **TBD**
- `maxAssertionAgeSeconds`: **TBD**
- `tokenTtlSeconds`: **TBD**
- Recovery owner/process: **TBD**
- Joiner/mover/leaver owner/process: **TBD**
- Break-glass design: **TBD / NONE**
- Audit/export destination: **TBD**
- Evidence packet location: **TBD**
- Security exceptions: **NONE APPROVED**
- Decision date: **TBD**
- Decision owner: **TBD**

Until this section and PROVIDER-G1..G7 are completed, the correct status remains:

`PRIV-SEC-MFA-PROVIDER / EXTERNAL-UNVERIFIED`

`G-PRIV-SEC-MFA-PROVIDER-01 = OPEN`
