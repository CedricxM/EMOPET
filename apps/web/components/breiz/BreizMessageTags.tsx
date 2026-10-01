/**
 * Étiquettes de transparence d'un message Breiz, communes à toutes les surfaces
 * web (dock et page /breiz).
 *
 * `IA` est toujours affiché : l'identité IA ne dépend pas des métadonnées
 * (docs/compliance/AI_TRANSPARENCY_BREIZ.md). Le niveau d'évidence n'est
 * affiché que s'il est connu, jamais deviné côté UI. Un message d'exemple
 * porte le marqueur `DÉMO · ` de #118 (ELI-ARCH-G3).
 */

import type { BreizEvidenceLevel, BreizMessage } from '../../lib/breiz-rag/useBreizChat';
import { ELI_DEMO_PREFIX } from '../../lib/narration';

export const EVIDENCE_LABELS: Record<BreizEvidenceLevel, string> = {
  measured: 'Mesuré',
  preprocessed: 'Prétraité',
  inferred: 'Inféré',
  mixed_or_inferred: 'Mixte / inféré',
  external_context: 'Contexte externe',
  unknown: 'Niveau inconnu',
};

const TAG_STYLE = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-2)',
  background: 'var(--bg-sunk)',
  padding: '2px 7px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border)',
} as const;

export function BreizMessageTags({ message }: { message: BreizMessage }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={TAG_STYLE}>IA</span>
      {message.demo && <span style={TAG_STYLE}>{ELI_DEMO_PREFIX}exemple</span>}
      {message.transparency?.evidenceLevel && (
        <span style={TAG_STYLE}>{EVIDENCE_LABELS[message.transparency.evidenceLevel]}</span>
      )}
      {message.eli && <span style={TAG_STYLE}>donnée ELI · ton verrouillé</span>}
    </div>
  );
}
