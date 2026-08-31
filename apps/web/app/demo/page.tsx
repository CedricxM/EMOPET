'use client';

import { useState } from 'react';
import { BrandLogo, WavePattern } from '../../components/brand';
import { BreizDictionary } from '../../components/breiz/BreizDictionary';
import { Icon, Pill } from '../../components/ui';
import { WorldScene } from '../../components/world/WorldScene';
import { MOCK_REPOS, MOCK_SENSORS } from '../../lib/mock-data';
import styles from './demo.module.css';

type PlaceId = 'home' | 'observatory' | 'breiz' | 'lab';

const PLACES: Array<{
  id: PlaceId;
  kicker: string;
  title: string;
  detail: string;
  icon: 'home' | 'signal' | 'compass' | 'mat';
}> = [
  {
    id: 'home',
    kicker: '01 · La maison',
    title: 'Comprendre le rythme',
    detail: 'Le quotidien devient une histoire lisible, sans transformer une observation en diagnostic.',
    icon: 'home',
  },
  {
    id: 'observatory',
    kicker: '02 · L’observatoire',
    title: 'Voir la dynamique',
    detail: 'Activation, valence descriptive et incertitude remplacent le faux “score de santé”.',
    icon: 'signal',
  },
  {
    id: 'breiz',
    kicker: '03 · Breiz',
    title: 'Explorer avec contexte',
    detail: 'Le compagnon explique ce qui est observé, cite la provenance et propose une prochaine exploration.',
    icon: 'compass',
  },
  {
    id: 'lab',
    kicker: '04 · Le labo',
    title: 'Voir l’invisible',
    detail: 'MAT + TAG alimentent une chaîne de signaux prudente, sans prétendre que le hardware final est gelé.',
    icon: 'mat',
  },
];

export default function DemoPage() {
  const [place, setPlace] = useState<PlaceId>('home');
  const current = PLACES.find((item) => item.id === place) ?? PLACES[0]!;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <WavePattern tone="dark" opacity={0.5} className={styles.heroPattern} />
        <div className={styles.topbar}>
          <BrandLogo variant="white" mode="lockup" width={154} priority />
          <div className={styles.modeBadge}>
            <span className={styles.modeDot} />
            Démonstration contrôlée
          </div>
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>EMOPET · living companion system</p>
          <h1>Un monde vivant autour de votre chien.</h1>
          <p className={styles.heroLead}>
            EMOPET ne résume pas un compagnon à une note. Il relie ses rythmes, son environnement et les signaux disponibles
            dans un univers que l’on explore — avec de la nuance, de l’incertitude et des frontières claires.
          </p>
        </div>

        <div className={styles.heroStatement}>
          <span>Observer.</span>
          <span>Contextualiser.</span>
          <span>Explorer.</span>
        </div>
      </section>

      <main className={styles.experience}>
        <section className={styles.worldSection} aria-labelledby="world-title">
          <div className={styles.worldIntro}>
            <div>
              <p className={styles.eyebrowDark}>La démo commence ici</p>
              <h2 id="world-title">Explore le monde de Gus</h2>
            </div>
            <p>
              Chaque lieu raconte une partie de l’idée. Pas de menu de fonctionnalités à réciter : on entre dans son quotidien,
              puis on découvre progressivement ce qu’EMOPET sait observer — et ce qu’il refuse d’inventer.
            </p>
          </div>

          <div className={styles.worldFrame}>
            <WorldScene
              builtItems={[]}
              placingCell={null}
              selectedItem={null}
              hoveredCell={null}
              onTileHover={() => undefined}
              onTileLeave={() => undefined}
              onTileBuild={() => undefined}
            />

            <div className={styles.worldHud} aria-label="Lieux à explorer">
              {PLACES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.placeButton} ${place === item.id ? styles.placeButtonActive : ''}`}
                  onClick={() => setPlace(item.id)}
                  aria-pressed={place === item.id}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.storySection} aria-live="polite">
          <div className={styles.storyHeader}>
            <p className={styles.eyebrowDark}>{current.kicker}</p>
            <h2>{current.title}</h2>
            <p>{current.detail}</p>
          </div>

          {place === 'home' && <HomeStory onNext={() => setPlace('observatory')} />}
          {place === 'observatory' && <ObservatoryStory onNext={() => setPlace('breiz')} />}
          {place === 'breiz' && <BreizStory onNext={() => setPlace('lab')} />}
          {place === 'lab' && <LabStory onRestart={() => setPlace('home')} />}
        </section>
      </main>

      <section className={styles.manifesto}>
        <div>
          <p className={styles.eyebrow}>Ce que la démo affirme</p>
          <h2>Une interface peut être émotionnelle sans prétendre lire les émotions.</h2>
        </div>
        <div className={styles.manifestoRules}>
          <span>Pas de “health score”.</span>
          <span>Pas de diagnostic déguisé.</span>
          <span>Pas de certitude sans qualité de capture.</span>
          <span>Pas de hardware final prétendument validé.</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <BrandLogo variant="navy" mode="mark" width={38} />
        <p>Données de démonstration simulées · non clinique · non Product V1 · hardware live non revendiqué.</p>
      </footer>
    </div>
  );
}

function HomeStory({ onNext }: { onNext: () => void }) {
  return (
    <div className={styles.sceneGrid}>
      <div className={styles.timelinePanel}>
        <div className={styles.timelineTop}>
          <span className={styles.time}>07:42</span>
          <Pill state="valid" label="Capture exploitable" showDot />
        </div>
        <h3>Le matin commence avant le départ.</h3>
        <p>
          Sur la fixture, Gus passe du repos à une phase d’éveil courte puis revient vers un niveau d’activation plus bas.
          EMOPET conserve la séquence. Il ne conclut pas automatiquement “anxiété”, “joie” ou “stress”.
        </p>
        <div className={styles.rhythmLine} aria-label="Séquence simulée de repos et activation">
          <span className={styles.rhythmRest} />
          <span className={styles.rhythmWake} />
          <span className={styles.rhythmRestShort} />
          <span className={styles.rhythmWakeSoft} />
        </div>
        <div className={styles.microMeta}>
          <span>Repos simulé · {MOCK_REPOS.durationMinutes} min</span>
          <span>Confiance fixture · {MOCK_REPOS.confidence}%</span>
        </div>
      </div>

      <aside className={styles.narrativeAside}>
        <p className={styles.eyebrowDark}>Le principe</p>
        <blockquote>“Une récurrence dans le rythme n’est pas encore une émotion nommée.”</blockquote>
        <button className={styles.nextButton} type="button" onClick={onNext}>
          Ouvrir l’observatoire <span aria-hidden>→</span>
        </button>
      </aside>
    </div>
  );
}

function ObservatoryStory({ onNext }: { onNext: () => void }) {
  return (
    <div className={styles.sceneGridObservatory}>
      <div className={styles.vaPanel}>
        <div className={styles.vaHeader}>
          <div>
            <p className={styles.eyebrowDark}>Espace Valence–Arousal</p>
            <h3>Une position, pas une note.</h3>
          </div>
          <Pill state="valid" label="Fixture · confiance élevée" showDot />
        </div>

        <div className={styles.vaMap} role="img" aria-label="Carte Valence–Arousal de démonstration avec zone d’incertitude">
          <span className={styles.axisVertical} />
          <span className={styles.axisHorizontal} />
          <span className={`${styles.axisLabel} ${styles.axisTop}`}>Activation élevée</span>
          <span className={`${styles.axisLabel} ${styles.axisBottom}`}>Activation faible</span>
          <span className={`${styles.axisLabel} ${styles.axisLeft}`}>Valence −</span>
          <span className={`${styles.axisLabel} ${styles.axisRight}`}>Valence +</span>
          <span className={styles.vaHalo} />
          <span className={styles.vaPoint} />
          <span className={styles.vaPointLabel}>état observé · fixture</span>
        </div>

        <div className={styles.vaReadout}>
          <div>
            <span>Activation descriptive</span>
            <strong>modérée</strong>
          </div>
          <div>
            <span>Valence descriptive</span>
            <strong>légèrement positive</strong>
          </div>
          <div>
            <span>Incertitude</span>
            <strong>visible autour du point</strong>
          </div>
        </div>
      </div>

      <aside className={styles.narrativeAsideDark}>
        <p className={styles.eyebrowLight}>Pourquoi c’est important</p>
        <h3>Le système peut aussi s’abstenir.</h3>
        <p>
          Si la qualité de capture est insuffisante, la bonne sortie n’est pas un chiffre “quand même”. C’est une abstention :
          donnée insuffisante, contexte manquant ou lecture non autorisée.
        </p>
        <button className={styles.nextButtonLight} type="button" onClick={onNext}>
          Demander à Breiz <span aria-hidden>→</span>
        </button>
      </aside>
    </div>
  );
}

function BreizStory({ onNext }: { onNext: () => void }) {
  return (
    <div className={styles.breizScene}>
      <div className={styles.breizIdentity}>
        <div className={styles.breizOrb} aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className={styles.eyebrowDark}>Breiz · compagnon d’observation</p>
          <h3>Il relie les indices. Il ne fabrique pas une certitude.</h3>
        </div>
      </div>

      <div className={styles.chatStage}>
        <div className={styles.userBubble}>Pourquoi Gus se réveille-t-il avant que je parte ?</div>
        <div className={styles.breizBubble}>
          <div className={styles.breizMiniMark}>B</div>
          <div>
            <p>
              Je vois une récurrence assez nette dans la fixture : sur six matinées, la phase d’éveil se glisse dans la même fenêtre,
              juste avant le départ habituel. C’est une concordance temporelle intéressante, pas une émotion détectée. Pour tester cette
              piste, je comparerais ce motif avec des matinées sans départ ou après une promenade calme.
            </p>
            <div className={styles.sourceStrip}>
              <span>MAT · fenêtre matinale</span>
              <span>capture exploitable</span>
              <span>contexte déclaré · départ</span>
            </div>
          </div>
        </div>
      </div>

      <BreizDictionary />

      <div className={styles.discoveryRail}>
        <div>
          <span className={styles.discoveryIcon}><Icon name="compass" size={18} /></span>
          <div>
            <strong>Prochaine exploration</strong>
            <span>Comparer la cadence des matinées avec et sans départ.</span>
          </div>
        </div>
        <button className={styles.nextButton} type="button" onClick={onNext}>
          Voir la couche technique <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

function LabStory({ onRestart }: { onRestart: () => void }) {
  return (
    <div className={styles.labScene}>
      <div className={styles.signalFlow} aria-label="Chaîne de signal de démonstration MAT TAG vers observations">
        <SignalNode label="MAT" detail="micro-mouvements · présence" tone="teal" />
        <SignalLink label="signaux" />
        <SignalNode label="TAG" detail="mouvement · température locale" tone="orange" />
        <SignalLink label="qualité" />
        <SignalNode label="ELI" detail="fusion prudente · abstention" tone="navy" />
        <SignalLink label="contexte" />
        <SignalNode label="Breiz" detail="explication · provenance" tone="cream" />
      </div>

      <div className={styles.sensorGrid}>
        {MOCK_SENSORS.map((sensor) => (
          <article key={sensor.id} className={styles.sensorItem}>
            <div>
              <span className={styles.sensorId}>{sensor.id.toUpperCase()}</span>
              <strong>{sensor.label}</strong>
            </div>
            <Pill state={sensor.state} showDot />
            <p>Couverture simulée : {sensor.coverage}% · fixture firmware {sensor.firmware}</p>
          </article>
        ))}
      </div>

      <div className={styles.labBoundary}>
        <div>
          <p className={styles.eyebrowDark}>Frontière de la démo</p>
          <h3>L’architecture est racontée. La validation industrielle n’est pas simulée.</h3>
        </div>
        <button className={styles.nextButton} type="button" onClick={onRestart}>
          Revenir au monde <span aria-hidden>↺</span>
        </button>
      </div>
    </div>
  );
}

function SignalNode({ label, detail, tone }: { label: string; detail: string; tone: 'teal' | 'orange' | 'navy' | 'cream' }) {
  const toneClass = {
    teal: styles.signalTeal,
    orange: styles.signalOrange,
    navy: styles.signalNavy,
    cream: styles.signalCream,
  }[tone];

  return (
    <div className={`${styles.signalNode} ${toneClass}`}>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}

function SignalLink({ label }: { label: string }) {
  return (
    <div className={styles.signalLink} aria-hidden>
      <span>{label}</span>
      <i />
    </div>
  );
}
