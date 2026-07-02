/**
 * EKF predict + update.
 *
 * Update step is batched â€” we build a reduced observation vector from
 * non-null rows only (no padding with zero or baseline mean). This is the
 * critical null-handling rule for v6 observations.
 */

import type { StateVector, Covariance3, EKFState, ObservationRow, EKFContext } from './types.js';
import { predictState, stateJacobian, processNoise } from './state-transition.js';

// â”€â”€ 3x3 matrix helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function matMul3(A: Covariance3, B: Covariance3): Covariance3 {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
      A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
      A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
    ],
    [
      A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
      A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
      A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
    ],
  ];
}
function matAdd3(A: Covariance3, B: Covariance3): Covariance3 {
  return [
    [A[0][0] + B[0][0], A[0][1] + B[0][1], A[0][2] + B[0][2]],
    [A[1][0] + B[1][0], A[1][1] + B[1][1], A[1][2] + B[1][2]],
    [A[2][0] + B[2][0], A[2][1] + B[2][1], A[2][2] + B[2][2]],
  ];
}

function matTranspose3(A: Covariance3): Covariance3 {
  return [
    [A[0][0], A[1][0], A[2][0]],
    [A[0][1], A[1][1], A[2][1]],
    [A[0][2], A[1][2], A[2][2]],
  ];
}

function identity3(): Covariance3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function cloneCov(P: Covariance3): Covariance3 {
  return [
    [P[0][0], P[0][1], P[0][2]],
    [P[1][0], P[1][1], P[1][2]],
    [P[2][0], P[2][1], P[2][2]],
  ];
}

// â”€â”€ Predict â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function predict(state: EKFState, now: Date, ctx: EKFContext): EKFState {
  const dtSec = Math.max(1, (now.getTime() - state.lastUpdatedAt.getTime()) / 1000);
  const xPred = predictState(state.x, dtSec, ctx);
  const F = stateJacobian(state.x, dtSec, ctx);
  const Ft = matTranspose3(F);
  const Q = processNoise(dtSec);
  const P1 = matMul3(F, state.P);
  const P2 = matMul3(P1, Ft);
  const PPred = matAdd3(P2, Q);
  return { x: xPred, P: PPred, lastUpdatedAt: now };
}

// â”€â”€ Update (scalar-sequential form, handles variable obs count) â”€â”€

/**
 * Apply one scalar observation to the state. Sequential scalar updates
 * are equivalent to the batched matrix update when observations are
 * independent (diagonal R), which holds here â€” each observation's noise
 * is modeled independently. This avoids inverting a variable-sized S.
 */
function applyScalarObservation(state: EKFState, row: ObservationRow, zValue: number): EKFState {
  // H is 1x3, P is 3x3
  const H = row.H;
  const P = state.P;

  // S = H P H^T + R  (scalar)
  const PH: StateVector = [
    P[0][0] * H[0] + P[0][1] * H[1] + P[0][2] * H[2],
    P[1][0] * H[0] + P[1][1] * H[1] + P[1][2] * H[2],
    P[2][0] * H[0] + P[2][1] * H[1] + P[2][2] * H[2],
  ];
  const S = H[0] * PH[0] + H[1] * PH[1] + H[2] * PH[2] + row.R_base;
  if (!Number.isFinite(S) || S <= 0) return state;

  // K = P H^T / S  (3x1)
  const K: StateVector = [PH[0] / S, PH[1] / S, PH[2] / S];

  // x := x + K * (z - expected)
  const innov = zValue - row.expected;
  const xNew: StateVector = [
    state.x[0] + K[0] * innov,
    state.x[1] + K[1] * innov,
    state.x[2] + K[2] * innov,
  ];

  // P := (I - K H) P
  const KH: Covariance3 = [
    [K[0] * H[0], K[0] * H[1], K[0] * H[2]],
    [K[1] * H[0], K[1] * H[1], K[1] * H[2]],
    [K[2] * H[0], K[2] * H[1], K[2] * H[2]],
  ];
  const I = identity3();
  const IminusKH: Covariance3 = [
    [I[0][0] - KH[0][0], -KH[0][1], -KH[0][2]],
    [-KH[1][0], I[1][1] - KH[1][1], -KH[1][2]],
    [-KH[2][0], -KH[2][1], I[2][2] - KH[2][2]],
  ];
  const PNew = matMul3(IminusKH, P);
  return {
    x: clampState(xNew),
    P: PNew,
    lastUpdatedAt: state.lastUpdatedAt,
  };
}

function clampState(x: StateVector): StateVector {
  return [
    Math.min(1, Math.max(0, x[0])),
    Math.min(1, Math.max(-1, x[1])),
    Math.min(1, Math.max(0, x[2])),
  ];
}

/**
 * Apply all non-null observation rows. Rows with R_base = Infinity or
 * value = null are skipped â€” they contribute nothing to the update.
 *
 * Returns an updated EKFState plus the list of observation names that
 * actually contributed (non-null AND finite R).
 */
export function update(state: EKFState, rows: ObservationRow[]): {
  state: EKFState;
  contributed: string[];
} {
  let current = { ...state, P: cloneCov(state.P) };
  const contributed: string[] = [];

  for (const row of rows) {
    if (row.value == null) continue;
    if (!Number.isFinite(row.R_base)) continue;
    current = applyScalarObservation(current, row, row.value);
    contributed.push(row.name);
  }

  return { state: current, contributed };
}

/** Cross-modal agreement score in [0,1] for confidence gating input. */
export function crossModalAgreement(rows: ObservationRow[]): number {
  const active = rows.filter((r) => r.value != null && Number.isFinite(r.R_base));
  if (active.length < 2) return 0.5;
  // Pairwise sign agreement of innovation direction, weighted equally.
  let agreeCount = 0;
  let pairs = 0;
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = Math.sign((active[i]!.value! - active[i]!.expected));
      const b = Math.sign((active[j]!.value! - active[j]!.expected));
      if (a === 0 || b === 0) continue;
      pairs++;
      if (a === b) agreeCount++;
    }
  }
  return pairs === 0 ? 0.5 : agreeCount / pairs;
}

