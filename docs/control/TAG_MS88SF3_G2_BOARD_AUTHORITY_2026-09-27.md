# TAG MS88SF3 G2 board-authority register

**Issue:** #625  
**Date:** 2026-09-27  
**Status:** `G2 AUTHORITY REGISTER / PRODUCTION BOARD FILE BLOCKED`

## Purpose

This register separates **known hardware authority** from convenient Zephyr
defaults before EMOPET creates a production board definition for the Minew
MS88SF3 / nRF52840 TAG.

The nRF52840 DK remains a compile harness only.

A board file that compiles is not evidence that the MS88SF3 hardware has the
same clocks, pins, programming path or peripheral wiring as the DK.

## Controlled inputs

Current Rev-B authority supports the following MS88SF3-side assignments:

| Signal | MS88SF3 / nRF52840 GPIO | Module pad | Current purpose |
|---|---|---:|---|
| NTC ADC | P0.04 / AIN2 | open | NTC measurement node |
| NTC excitation | P0.05 | 15 | duty-cycled NTC excitation |
| host UART TX | P0.06 | 21 | TX to nRF9151 RXD |
| host UART RX | P0.08 | 26 | RX from nRF9151 TXD |
| nRF9151 main VDD gate | P0.07 | 20 | modem main-rail gate |
| nRF9151 VDD_GPIO gate | P0.17 | 41 | modem VDD_GPIO gate |

Supply candidate:
- VDD pad 31 + VDDH pad 32 → `3V3_CANDIDATE`.

The exact **nRF9151-side** UART pins remain separate final pin-budget work.
Older text referencing nRF9151 P0.00/P0.01 is not an alternative MS88SF3 pin
mapping.

## Blocking unknowns

The production board/devicetree is still blocked on:

- BMI270 I2C SCL;
- BMI270 I2C SDA;
- BMI270 INT1;
- INMP441 PDM CLK;
- INMP441 PDM DATA;
- MS88SF3 HF clock source/configuration;
- MS88SF3 LF clock source/configuration;
- SWDIO/SWDCLK/programming fixture contract;
- any board-specific flash/partition assumptions;
- module pad authority for P0.04/AIN2;
- final nRF9151-side UART pin allocation.

## Encoding rule

Until the relevant authority closes:

- do not assign guessed pins;
- do not inherit Nordic DK pin routing as production truth;
- do not silently select HFXO/LFXO/RC clock policy;
- do not create an `ms88sf3` production board definition;
- keep unknown peripherals absent or disabled.

A future G2 implementation must update the machine-readable authority first,
then add devicetree/pinctrl in the same reviewed change.

## Relationship to G1/G3

G1 and the GATT source scaffold may continue to compile against the nRF52840 DK
harness.

That does not weaken this gate.

The source-level EMOPET GATT service is allowed to exist before G2 closes;
claiming a **production MS88SF3 target build** is not.

## Current decision

`DO_NOT_CREATE_PRODUCTION_MS88SF3_DEVICETREE`
