/**
 * Frozen session controls — the third channel.
 *
 * During an administration the respondent still has to be able to continue, stop,
 * pause and resume. Those prompts cannot come from the conversation channel,
 * because a model must never produce a question while items are being presented,
 * and they cannot come from the instrument channel, because they are not licensed
 * content. So they live here: fixed strings, written once, reviewed once,
 * versioned, and never generated.
 *
 * That distinction is what makes an interrogative safe. A model that asks no
 * question cannot smuggle in an item; a button offering to continue is not an item
 * in disguise. The rule therefore constrains the PRODUCER, not the surface.
 *
 * The registry deliberately covers a tiny vocabulary: continue, stop, pause,
 * resume, and the deadline notice. It never mentions a canine behaviour, never
 * comments on an answer, and never uses a scale word — `validateRegistry` enforces
 * all three, and a test runs it.
 */

export type SessionControlKind = 'prompt' | 'action' | 'notice';

export type SessionControlId =
  | 'CONTINUE_OFFER'
  | 'CONTINUE_ACCEPT'
  | 'CONTINUE_DECLINE'
  | 'PAUSE_ACTION'
  | 'PAUSE_OFFER'
  | 'RESUME_ACTION'
  | 'DEADLINE_NOTICE';

export interface SessionControl {
  readonly id: SessionControlId;
  readonly kind: SessionControlKind;
  readonly locale: 'fr-FR';
  readonly version: number;
  readonly text: string;
}

export class SessionControlError extends Error {
  readonly code = 'INSTRUMENT_SESSION_CONTROL_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'SessionControlError';
  }
}

/**
 * The complete registry. Anything shown to a respondent during an item sequence
 * that is not licensed content must be one of these strings.
 */
export const SESSION_CONTROLS: readonly SessionControl[] = [
  {
    id: 'CONTINUE_OFFER',
    kind: 'prompt',
    locale: 'fr-FR',
    version: 1,
    text: 'Encore quelques-unes ?',
  },
  {
    id: 'CONTINUE_ACCEPT',
    kind: 'action',
    locale: 'fr-FR',
    version: 1,
    text: 'Continuer',
  },
  {
    id: 'CONTINUE_DECLINE',
    kind: 'action',
    locale: 'fr-FR',
    version: 1,
    // No "for today", no "already": stopping is a choice, not a shortfall.
    text: 'Je m’arrête ici',
  },
  {
    id: 'PAUSE_ACTION',
    kind: 'action',
    locale: 'fr-FR',
    version: 1,
    text: 'Mettre en pause',
  },
  {
    id: 'PAUSE_OFFER',
    kind: 'prompt',
    locale: 'fr-FR',
    version: 1,
    // Offered at a cut point, and worded about the moment rather than the person.
    // It must not hint at pace, regularity or answer quality, or it would become a
    // comment on the answers themselves.
    text: 'On peut s’arrêter là et reprendre plus tard, si vous préférez.',
  },
  {
    id: 'RESUME_ACTION',
    kind: 'action',
    locale: 'fr-FR',
    version: 1,
    text: 'Reprendre',
  },
  {
    id: 'DEADLINE_NOTICE',
    kind: 'notice',
    locale: 'fr-FR',
    version: 1,
    // Factual and loss-free. What ends is the ability to score THIS
    // administration; the answers stay and a new administration is always
    // possible. Loss framing would be an effective lever, which is exactly why it
    // is excluded.
    text:
      'Ce qui se termine est la possibilité de scorer cette administration. '
      + 'Les réponses déjà données sont conservées, et une nouvelle administration reste possible.',
  },
];

export function sessionControl(id: SessionControlId): SessionControl {
  const control = SESSION_CONTROLS.find((candidate) => candidate.id === id);
  if (!control) throw new SessionControlError(`Unknown session control '${id}'`);
  return control;
}

// ── Validation ──────────────────────────────────────────────────────

interface ForbiddenPattern {
  readonly id: string;
  readonly why: string;
  readonly pattern: RegExp;
}

/**
 * What a session control may never contain.
 *
 * These mirror the semantic ceilings applied to generated content, minus the
 * interrogative ban: a fixed prompt is allowed to ask, a model is not.
 */
export const FORBIDDEN_CONTROL_PATTERNS: readonly ForbiddenPattern[] = [
  {
    id: 'scale-lexicon',
    why: 'a scale word outside the instrument channel would paraphrase a response option',
    pattern: /\b(jamais|rarement|parfois|souvent|toujours|not(?:ez|er)|sur une échelle)\b/i,
  },
  {
    id: 'answer-commentary',
    why: 'commenting on an answer tells the respondent how to answer the next one',
    pattern: /\b(bonne réponse|mauvaise réponse|c'est normal|rassurant|inquiétant|intéressant que vous)\b/i,
  },
  {
    id: 'answer-suggestion',
    why: 'suggesting what others answer steers the response',
    pattern: /\b(la plupart des|généralement on|à votre place|comme beaucoup)\b/i,
  },
  {
    id: 'pace-or-regularity-feedback',
    why: 'remarking on pace or regularity is feedback on the answering behaviour itself',
    pattern: /\b(trop vite|rapidement|régulièr|assidu|fatigué|vous répondez)\b/i,
  },
  {
    id: 'behavioural-lexicon',
    why: 'a session control is about the session, never about the animal',
    pattern: /\b(chien|chienne|aboie|aboiement|peur|agress|anxi|stress|caresse|laisse|promenade|grogne)\b/i,
  },
  {
    id: 'loss-framing',
    why: 'loss aversion is a dark pattern, and nothing is actually lost when a window closes',
    pattern: /\b(perdre|perdu|perdue|effacé|effacée|supprimé|dernière chance|il ne reste plus que)\b/i,
  },
  {
    id: 'streak-or-reward',
    why: 'series and rewards put the respondent under performance pressure',
    pattern: /\b(série|bravo|félicitations|record|badge|niveau atteint|objectif)\b/i,
  },
];

export interface RegistryViolation {
  readonly controlId: string;
  readonly patternId: string;
  readonly why: string;
}

/**
 * Check every control against every forbidden pattern.
 *
 * Fail-closed and exhaustive: the registry is small enough to check in full, so
 * there is no reason to sample it.
 */
export function validateRegistry(
  controls: readonly SessionControl[] = SESSION_CONTROLS,
): readonly RegistryViolation[] {
  const violations: RegistryViolation[] = [];

  for (const control of controls) {
    if (control.text.trim().length === 0) {
      violations.push({ controlId: control.id, patternId: 'empty', why: 'a control cannot be blank' });
    }
    for (const forbidden of FORBIDDEN_CONTROL_PATTERNS) {
      if (forbidden.pattern.test(control.text)) {
        violations.push({ controlId: control.id, patternId: forbidden.id, why: forbidden.why });
      }
    }
    // Only a prompt may ask. An action label or a notice that asks a question is
    // either mislabelled or is doing something it should not.
    if (control.kind !== 'prompt' && /\?/.test(control.text)) {
      violations.push({
        controlId: control.id,
        patternId: 'interrogative-outside-prompt',
        why: `a ${control.kind} must not ask a question`,
      });
    }
  }

  return violations;
}

export function assertRegistryIsSafe(controls: readonly SessionControl[] = SESSION_CONTROLS): void {
  const violations = validateRegistry(controls);
  if (violations.length > 0) {
    throw new SessionControlError(
      `Session control registry violations: ${violations
        .map((violation) => `${violation.controlId}/${violation.patternId}`)
        .join(', ')}`,
    );
  }
}

/**
 * Whether a string shown during an item sequence came from this registry.
 *
 * The client renders only licensed item payloads and registry entries while items
 * are being presented. Anything else appearing there is a bug, and this is how a
 * test or a runtime assertion catches it.
 */
export function isRegisteredControlText(text: string): boolean {
  return SESSION_CONTROLS.some((control) => control.text === text);
}
