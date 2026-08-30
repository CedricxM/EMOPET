import { BREIZ_DEMO_LEXICON } from '../../lib/breiz-language/lexicon';
import styles from './breiz-dictionary.module.css';

const DOMAIN_LABELS = {
  rhythm: 'Rythme',
  evidence: 'Preuve',
  affective: 'Valence–Arousal',
  exploration: 'Exploration',
} as const;

export function BreizDictionary() {
  return (
    <section className={styles.shell} aria-labelledby="breiz-dictionary-title">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Dictionnaire vivant · contrôlé</p>
          <h4 id="breiz-dictionary-title">Les mots de Breiz ont une fonction.</h4>
        </div>
        <p>
          Breiz ne pioche pas dans un thésaurus pour paraître intelligent. Ce lexique lui donne une langue plus précise et plus riche,
          avec une condition d’emploi pour chaque mot. Le vocabulaire peut évoluer par curation ; il n’augmente jamais la certitude des données.
        </p>
      </div>

      <div className={styles.words}>
        {BREIZ_DEMO_LEXICON.map((entry) => (
          <article key={entry.term} className={styles.word}>
            <span className={styles.domain}>{DOMAIN_LABELS[entry.domain]}</span>
            <strong>{entry.term}</strong>
            <p>{entry.meaning}</p>
          </article>
        ))}
      </div>

      <p className={styles.rule}>
        Règle de voix : un ou deux termes distinctifs bien choisis valent mieux qu’une réponse saturée de jargon.
      </p>
    </section>
  );
}
