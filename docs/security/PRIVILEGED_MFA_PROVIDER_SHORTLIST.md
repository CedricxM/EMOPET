# Privileged MFA Provider Shortlist

Status: **DRAFT / SHORTLIST ONLY / NO PROVIDER SELECTED**  
Research date: **2026-09-04**  
Parent decision contract: `PRIVILEGED_MFA_PROVIDER_DECISION.md` / #211  
External gate: `PRIV-SEC-MFA-PROVIDER-01` / #175

## 1. Scope

This document performs a current documentation-backed prescreen of three workforce identity candidates for EMOPET privileged access:

1. Microsoft Entra ID
2. Okta Workforce Identity / Identity Engine
3. Google Workspace / Cloud Identity

It is **not** a procurement decision and is **not** staging evidence.

All three candidates remain unselected until a real target tenant, licensing position, operational owner and provider-specific adapter prototype are available.

The repository currently contains no provider SDK or established historical preference for these three candidates. The canonical EMOPET security boundary remains provider-neutral.

## 2. Hard rule inherited from #211

A provider can authenticate people, but it does not get to redefine EMOPET authority.

The selected provider must be adapted server-side to the existing finite contracts:

- directory -> `{ subject, role: 'admin' | 'support' | 'operator', active }`;
- MFA -> either strict `{ status: 'VERIFIED', subject, method, verifiedAt, assuranceRef }` or `{ status: 'REJECTED' }`;
- provider roles, groups, email addresses, browser claims and arbitrary MFA metadata are never direct application authority;
- canonical AUTH-01 subject binding, freshness checks, method validation and privileged JWT issuance remain owned by EMOPET code.

## 3. Executive prescreen

| Candidate | Phishing-resistant policy | Staff active/disabled state | Auditable events | Prescreen result |
| --- | --- | --- | --- | --- |
| Microsoft Entra ID | Strong. Conditional Access authentication strengths can require phishing-resistant MFA and FIDO2/passkeys for privileged users. | Strong. Microsoft Graph exposes `accountEnabled`. | Strong. Sign-in, MFA, Conditional Access and directory/policy audit logs are available. | **SHORTLIST-PASS** |
| Okta Workforce Identity | Strong. Passkeys (FIDO2 WebAuthn) and Okta FastPass are explicitly phishing-resistant and can be required by sign-in/enrollment policies. | Strong. User lifecycle exposes ACTIVE/SUSPENDED/DEPROVISIONED states. | Strong. System Log covers authentication, lifecycle, groups and policy changes. | **SHORTLIST-PASS** |
| Google Workspace / Cloud Identity | Strong when configured correctly. Workspace can enforce `Only security key`; current policy treats security keys and passkeys as equivalent phishing-protected 2SV methods. | Strong. Directory API exposes `suspended`, enrollment/enforcement state and user sign-out controls. | Strong. Admin Reports exposes administrator setting events and 2SV-related events. | **SHORTLIST-PASS** |

`SHORTLIST-PASS` means only that official documentation supports continued technical evaluation. It does not close any PROVIDER-G gate.

## 4. Candidate A — Microsoft Entra ID

### Verified strengths

- Microsoft documents a built-in **phishing-resistant MFA authentication strength** for Conditional Access.
- Microsoft specifically recommends phishing-resistant MFA for privileged administrator roles.
- Supported phishing-resistant methods include FIDO2/passkeys and other strong methods such as Windows Hello for Business/platform credentials and certificate-based authentication, depending on policy.
- Passkeys (FIDO2) support both device-bound and synced models; authentication-strength policy can restrict accepted passkey types/AAGUIDs when needed.
- Microsoft Graph exposes `accountEnabled`, enabling a directory adapter to fail closed for disabled users.
- Entra sign-in logs show authentication methods and Conditional Access outcomes; audit logs record policy and directory changes and can be queried through Microsoft Graph.

### Important constraint

Conditional Access requires **Microsoft Entra ID P1** or an appropriate higher entitlement. Passkey availability alone does not prove that the target tenant can enforce the required privileged authentication strength.

### EMOPET adapter questions still open

- Which Entra immutable identifier will be bound to the canonical EMOPET staff UUID?
- Which Entra groups or directory attributes will map to `admin`, `support`, `operator`?
- Which server-side protocol will prove a fresh privileged step-up and produce the strict `PrivilegedMfaVerifier` result?
- Which authentication strength will be allowed for each EMOPET role?
- Will synced passkeys be accepted for privileged users, or only device-bound/attested credentials?
- How will tenant disable/offboarding interact with already-issued 15-minute staging-baseline EMOPET privileged tokens?
- What exact break-glass design is approved without creating an undocumented password-only bypass?

### Provisional fit

**High-fit candidate if the workforce already uses Microsoft 365 / Entra or intends to.** The policy model is particularly well aligned with the requirement to distinguish ordinary MFA from phishing-resistant privileged MFA.

No ecosystem decision is known in the repository, so this is not a recommendation to adopt Microsoft solely for EMOPET.

### Official evidence reviewed

- Microsoft Learn — Require phishing-resistant multifactor authentication for Microsoft Entra administrator roles: https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-admin-phish-resistant-mfa
- Microsoft Learn — How to enable passkeys (FIDO2) in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2
- Microsoft Learn — Conditional Access authentication strengths: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths
- Microsoft Graph — User resource / `accountEnabled`: https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0
- Microsoft Learn — Conditional Access and Microsoft Entra activity logs: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies
- Microsoft Learn — Sign-in details / authentication methods: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details

## 5. Candidate B — Okta Workforce Identity / Identity Engine

### Verified strengths

- Okta documents **Passkeys (FIDO2 WebAuthn)** and **Okta FastPass** as phishing-resistant authenticators.
- App sign-in policies can require phishing-resistant possession-factor characteristics rather than merely generic MFA.
- Authenticator enrollment and account-recovery policies can themselves require phishing-resistant authenticators, reducing the risk that recovery silently becomes the weakest path.
- User lifecycle operations expose states including ACTIVE, SUSPENDED and DEPROVISIONED; suspended users cannot sign in.
- Okta System Log provides near-real-time, read-only audit access and records authentication, user lifecycle, group membership and policy events.
- Lifecycle events such as user deactivation can be delivered through event hooks if an operational workflow needs push notification rather than polling.

### Important constraint

The exact Okta product bundle, Identity Engine entitlement, device-management assumptions and commercial licensing required for the chosen policy set must be validated against a real target org. Documentation capability is not equivalent to purchased entitlement.

### EMOPET adapter questions still open

- Which Okta user identifier will be bound to the canonical EMOPET staff UUID?
- Which Okta groups/profile attributes will map to the finite EMOPET roles?
- Will privileged access require WebAuthn, FastPass, or an approved chain of phishing-resistant methods?
- If FastPass is used, are managed devices required for privileged staff, and who owns device lifecycle?
- Which server-side transaction/protocol will produce a fresh verifier result without trusting browser-supplied `amr`-style metadata blindly?
- How will suspension/deactivation be tested against new EMOPET step-up attempts?
- Which System Log events are exported to the eventual monitoring destination?

### Provisional fit

**High-fit candidate if EMOPET wants a dedicated workforce identity control plane independent of Microsoft or Google productivity suites.** The explicit phishing-resistance and policy/lifecycle model maps cleanly to #175.

It may be operationally heavier than reusing an identity platform the company already owns. That tradeoff is a procurement/operations decision, not a repository decision.

### Official evidence reviewed

- Okta Help — Phishing-resistant authentication: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/authenticators/phishing-resistant-auth.htm
- Okta Help — Okta FastPass: https://help.okta.com/oie/en-us/content/topics/identity-engine/devices/fp/fp-main.htm
- Okta Help — App sign-in policy rule / phishing-resistant possession constraint: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/policies/add-app-sign-on-policy-rule.htm
- Okta Help — Phishing-resistant account recovery rule: https://help.okta.com/oie/en-us/content/topics/identity-engine/policies/oamp-configure-account-recovery.htm
- Okta Developer — User Lifecycle API: https://developer.okta.com/docs/api/openapi/okta-management/management/tags/userlifecycle
- Okta Developer — System Log query: https://developer.okta.com/docs/reference/system-log-query/
- Okta Developer — Event types: https://developer.okta.com/docs/reference/api/event-types/

## 6. Candidate C — Google Workspace / Cloud Identity

### Verified strengths

- Google Workspace administrators can enforce 2-Step Verification for selected organizational units or configuration groups.
- The enforcement method **`Only security key`** requires security-key-class authentication; Google's current documentation states that this option now supports both security keys and passkeys and gives them the same phishing-protection level.
- Admins can avoid trusted-device bypass by leaving the trust-device option disabled for the privileged population.
- In `Only security key` mode, users cannot generate their own backup verification codes; an administrator controls the temporary recovery code/grace mechanism.
- Directory API user records expose `suspended`, `isEnrolledIn2Sv`, `isEnforcedIn2Sv`, organizational unit and stable user ID fields.
- Directory API can sign a user out of web/device sessions and reset sign-in cookies.
- Admin Reports exposes administrator setting changes and 2SV-related audit events.

### Important constraint

Google's broad passkey/passwordless capability is not itself enough for #175. The target privileged group must be explicitly placed under a restrictive policy such as `Only security key`, with trusted-device behavior, recovery grace and security-code options reviewed. Exact Workspace/Cloud Identity edition and tenant controls must be validated in the real environment.

### EMOPET adapter questions still open

- Will Google Workspace or Cloud Identity be the actual staff source of truth, or merely an authentication provider?
- Which stable Google user ID will bind to the canonical EMOPET staff UUID?
- Will group/OU membership or another controlled directory field map to EMOPET roles?
- Can the chosen step-up flow produce runtime evidence precise enough for the strict EMOPET `PrivilegedMfaVerifier`, rather than only post-hoc audit evidence?
- Will `Only security key` be enforced for every privileged role, with trusted-device bypass disabled?
- What recovery grace period is acceptable and who may generate backup codes?
- Which Admin Reports events are exported to monitoring?

### Provisional fit

**High-fit candidate if Google Workspace / Cloud Identity is already the workforce directory.** It offers a comparatively direct route to enforcing phishing-resistant credentials on a specific privileged population.

The runtime step-up adapter still needs a prototype. The presence of strong account-level 2SV does not by itself prove that EMOPET can consume a fresh MFA assertion in the exact server-side contract required by #170/#211.

### Official evidence reviewed

- Google Workspace — Deploy 2-Step Verification: https://support.google.com/a/answer/9176657
- Google Workspace — Protect your business with 2-Step Verification: https://support.google.com/a/answer/175197
- Google Workspace — Allow users to skip passwords at sign-in: https://support.google.com/a/answer/13529161
- Google Workspace Directory API — User resource: https://developers.google.com/workspace/admin/directory/reference/rest/v1/users
- Google Workspace Directory API overview: https://developers.google.com/workspace/admin/directory/reference/rest
- Google Workspace Reports API — Admin Audit Application Settings events: https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-application-settings
- Google Workspace Reports API — Admin Audit User Settings events: https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-user-settings

## 7. Comparative decision matrix

Legend: `STRONG` = documented native support relevant to the criterion; `PROTOTYPE` = capability looks compatible but must be proven against the EMOPET runtime adapter; `TENANT` = depends on purchased/configured tenant; `TBD` = operational decision remains open.

| Dimension | Microsoft Entra ID | Okta Workforce Identity | Google Workspace / Cloud Identity |
| --- | --- | --- | --- |
| Enforce phishing-resistant method for privileged population | **STRONG** | **STRONG** | **STRONG** (`Only security key`) |
| Passkey / FIDO2 support | **STRONG** | **STRONG** | **STRONG** |
| Explicit active/disabled staff state | **STRONG** (`accountEnabled`) | **STRONG** (lifecycle status) | **STRONG** (`suspended`) |
| Fine-grained privileged policy | **STRONG** (Conditional Access strengths) | **STRONG** (sign-in/authenticator policies) | **STRONG**, but exact privileged OU/group design TBD |
| Server-side fresh step-up adapter to EMOPET contract | **PROTOTYPE** | **PROTOTYPE** | **PROTOTYPE** |
| Audit / monitoring surface | **STRONG** | **STRONG** | **STRONG** |
| Recovery controls suitable for privileged access | **TBD after staging evidence** | **TBD after staging evidence** | **TBD after staging evidence** |
| Offboarding proof | **PROVIDER-G4 required** | **PROVIDER-G4 required** | **PROVIDER-G4 required** |
| Licensing / commercial fit | **TENANT**; CA requires Entra ID P1+ | **TENANT** | **TENANT** |
| Existing EMOPET provider dependency | None found | None found | None found |

## 8. What is deliberately not ranked yet

Do **not** score or select a winner until these facts are known:

1. existing company productivity/workforce identity stack;
2. number of privileged staff accounts;
3. whether managed devices are available/required;
4. expected use of hardware security keys versus platform/synced passkeys;
5. jurisdiction/data-processing and contractual requirements;
6. actual license tier and cost;
7. operational owner for staff lifecycle and recovery;
8. required monitoring/SIEM destination;
9. successful provider-specific proof that a fresh challenge can be transformed into the existing strict EMOPET verifier contract.

A provider that is slightly nicer on paper but introduces a second workforce directory without an operational owner may be a worse security choice than reusing an existing well-managed tenant.

## 9. Next controlled step

Before selection, build a **non-production adapter spike** for the strongest candidate already present in the company's real workforce environment.

The spike must prove only:

- canonical subject binding;
- active/disabled directory lookup;
- finite role mapping;
- fresh successful MFA challenge -> strict `VERIFIED` result;
- rejected challenge -> `REJECTED`;
- outage/malformed provider result -> fail closed;
- no provider credential reaches browser code;
- PROVIDER-G2 and PROVIDER-G4 can be evidenced.

It must **not** activate privileged production routes or close #175.

## 10. Current verdict

- Microsoft Entra ID: **SHORTLIST-PASS / UNSELECTED**
- Okta Workforce Identity: **SHORTLIST-PASS / UNSELECTED**
- Google Workspace / Cloud Identity: **SHORTLIST-PASS / UNSELECTED**

No provider is selected.

`PRIV-SEC-MFA-PROVIDER / EXTERNAL-UNVERIFIED`

`G-PRIV-SEC-MFA-PROVIDER-SHORTLIST = OPEN`
