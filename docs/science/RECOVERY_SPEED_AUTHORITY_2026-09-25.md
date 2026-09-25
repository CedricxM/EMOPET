# Recovery speed — semantic hold, parameter provenance and Bleiz publication firewall

**Issue:** #90  
**Status:** `HOLD PENDING SCIENCE/PRODUCT SEMANTIC DECISION`  
**Date:** 2026-09-25

Machine-readable authority:

`config/science/recovery-speed-authority.json`

## Current implementation facts

The current tracker:

- opens an episode on the first sample above `thresholdHigh`;
- requires 300 s below `thresholdLow` to confirm return;
- resets that confirmation when arousal rises back to/above `thresholdLow`;
- reports the first low-threshold crossing as the return timestamp after retrospective confirmation;
- measures recovery duration to that first crossing rather than the confirmation time;
- uses EMA alpha 0.1;
- computes a 28-day split trend from two 14-day periods;
- returns no trend below four samples;
- uses >20% as the load-modulation boundary;
- applies a 1.10 load-decay multiplier.

Those are implementation facts, not scientific validation.

## Parameter provenance

The current numerical constants are classified:

`EMOPET_MODEL_PARAMETER_UNVALIDATED`

McEwen (1998) is conceptual allostasis context. It does not establish EMOPET's 60 s / 5 min / 20% / 1.10 / alpha 0.1 canine model constants.

## Bleiz persistence fix

The controlled Bleiz documentation requires recovery slowing to persist for at least seven days before publication.

The template now fail-closes on two explicit runtime facts:

- `sensor.recovery_contract_authorized === true`;
- `sensor.recovery_trend_sustained_7d_met === true`;

in addition to the current `recovery_trend_4w_pct > 20` trigger.

No current runtime produces those authority/persistence fields. Therefore the template cannot accidentally publish a one-shot >20% event.

This does not decide whether seven days or >20% are scientifically correct. It enforces the currently documented safeguard while #90 remains open.

## Open semantic decisions

1. sustained-high start versus first-sample start;
2. bounce at `a_low` versus `a_high`;
3. first-crossing versus confirmation timestamp;
4. recovery-duration endpoint;
5. threshold derivation and units;
6. minimum trend samples;
7. canonical tracker → persistence → Bleiz → client payload;
8. validation/tuning of all numerical parameters.

## Current gate

`G-RECOVERY-CONTRACT-01 = HOLD / PUBLICATION FAIL-CLOSED / SEMANTICS+VALIDATION OPEN`
