'use client';

import { useState } from 'react';
import { BREIZ_DEMO_LEXICON } from '../../lib/breiz-language/lexicon';
import styles from './breiz-dictionary.module.css';

const DOMAIN_LABELS = {
  rhythm: 'Rythme',
  evidence: 'Preuve',
  affective: 'Valence–Arousal',
  exploration: 'Exploration',
} as const;

export function BreizDictionary() {
  const [activeTerm, setActiveTerm] = useState(BREIZ_DEMO_LEXICON[0]?.term ?? 'cadence');
  const active = BREIZ_DEMO_LEXICON.find((entry) => entry.term === activeTerm) ?? BREIZ_DEMO_LEXICON[0];

  if (!active) return null;

  return (
    <section className={styles.shell} aria-labelledby="breiz-dictionary-title">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Dictionnaire vivant · contrôlé</p>
          <h4 id="breiz-dictionary-title">Breiz choisit ses mots comme il choisit ses conclusions.</h4>
        </div>
        <p>
          Pas pour faire savant. Pour être plus exact. Chaque terme possède une définition et une condition d’emploi ; le lexique enrichit
          la voix de Breiz sans jamais augmenter la certitude des données.
        </p>
      </div>

      <div className={styles.lexiconStage}>
        <nav className={styles.wordRail} aria-label="Mots du dictionnaire de Breiz">
          {BREIZ_DEMO_LEXICON.map((entry) => (
            <button
              key={entry.term}
              type="button"
              className={`${styles.wordButton} ${active.term === entry.term ? styles.wordButtonActive : ''}`}
              onClick={() => setActiveTerm(entry.term)}
              aria-pressed={active.term === entry.term}
            >
              <span>{DOMAIN_LABELS[entry.domain]}</span>
              <strong>{entry.term}</strong>
            </button>
          ))}
        </nav>

        <article className={styles.definition} aria-live="polite">
          <span className={styles.domain}>{DOMAIN_LABELS[active.domain]}</span>
          <h5>{active.term}</h5>
          <p className={styles.meaning}>{active.meaning}</p>
          <div className={styles.usage}>
            <span>Breiz l’emploie quand</span>
            <p>{active.useWhen}</p>
          </div>
          {active.avoidWhen ? (
            <div className={styles.avoid}>
              <span>Pas quand</span>
              <p>{active.avoidWhen}</p>
            </div>
          ) : null}
        </article>
      </div>

      <p className={styles.rule}>
        Curation, pas auto-apprentissage silencieux : les conversations ne créent pas toutes seules de nouveaux mots d’autorité.
      </p>
    </section>
  );
}
