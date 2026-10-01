# EMOPET — Home region vs current territory semantics

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED CONTEXT RESOLVER / CONSENTED INPUT ONLY`

## Purpose

Regional identity and current location are different concepts.

EMOPET now distinguishes:

- **home region**: stable regional identity declared by the user;
- **current territory**: optional current regional context supplied by the caller when already allowed;
- **active companion**: the regional companion selected for the current interaction.

## Resolution policy

1. A supported current territory wins and can change the active companion identity.
2. If a current territory is explicitly supplied but EMOPET has no controlled regional profile for it, the active companion becomes neutral `EMOPET`.
3. If no current territory is supplied, a supported home region remains active.
4. If neither is supported, EMOPET remains neutral.

This avoids two bad behaviours:

- keeping Breiz active while EMOPET knows the user is currently in an unsupported non-Brittany territory;
- inventing a regional identity for a territory that has not been reviewed.

## Example

Home region: Bretagne  
Current department: 75

Result:

- home region remains recorded as Bretagne;
- current context is recognised as supplied but unsupported;
- active companion = neutral EMOPET;
- Breiz is not presented as the local companion.

When a controlled Île-de-France pack exists later, the same resolver can activate it without changing the common engine.

## Privacy boundary

The resolver does not acquire GPS or location.

It only consumes:

- `currentRegionId`;
- `currentDepartment`;

when the caller already has authority to supply that context.

No precise coordinates are stored by this resolver.

## Non-goals

This slice does not:

- implement geolocation acquisition;
- decide consent UI;
- create future regional identities;
- persist travel history;
- expose precise location;
- change scientific interpretation.
