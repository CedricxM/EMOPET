'use client';

import { useMemo, useState } from 'react';
import {
  officialDiscoveryToScene,
  selectBreizControlledDiscoveries,
  type BreizDiscoveryScene,
} from '../../lib/breiz-discovery';
import type { BreizOfficialDiscoveryResult } from '../../lib/data/breiz/connectors/types';
import { Icon } from '../ui';
import styles from './breiz-discoveries.module.css';

const CATEGORY_LABEL: Record<BreizDiscoveryScene['category'], string> = {
  culture: 'Culture',
  heritage: 'Patrimoine',
  territory: 'Territoire',
  event: 'Événement',
  language: 'Langue',
  nature: 'Nature',
  practical: 'Pratique',
};

const DEMO_CONTEXT = {
  regionId: 'bretagne',
  department: '56',
  city: 'Lorient',
  month: 8,
  limit: 4,
} as const;

type LiveState = 'idle' | 'loading' | 'ready' | 'unavailable';

export function BreizDiscoveryScenes() {
  const controlled = useMemo(() => selectBreizControlledDiscoveries(DEMO_CONTEXT), []);
  const [scenes, setScenes] = useState<BreizDiscoveryScene[]>(controlled);
  const [activeId, setActiveId] = useState(controlled[0]?.id ?? '');
  const [liveState, setLiveState] = useState<LiveState>('idle');
  const active = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  async function enrichFromOfficialSources() {
    if (liveState === 'loading') return;
    setLiveState('loading');
    try {
      const response = await fetch('/api/breiz/discoveries?q=Lorient&per_source=1');
      if (!response.ok) throw new Error('official discovery unavailable');
      const result = (await response.json()) as BreizOfficialDiscoveryResult;
      const officialScenes = result.records
        .slice(0, 4)
        .map((record) => officialDiscoveryToScene(record, 'Source trouvée pour Lorient dans la démo'));

      if (!officialScenes.length) {
        setLiveState('unavailable');
        return;
      }

      setScenes([...controlled, ...officialScenes]);
      setActiveId(officialScenes[0]!.id);
      setLiveState('ready');
    } catch {
      setLiveState('unavailable');
    }
  }

  if (!active) return null;

  return (
    <section className={styles.shell} aria-labelledby="breiz-discoveries-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Découvertes · monde réel</p>
          <h4 id="breiz-discoveries-title">Les sorties peuvent débloquer des histoires.</h4>
        </div>
        <p>
          Breiz peut faire émerger une scène culturelle, patrimoniale ou pratique quand le lieu et le moment la rendent pertinente.
          Le contexte territorial enrichit l’exploration ; il ne devient jamais une preuve sur l’état interne du chien.
        </p>
      </div>

      <div className={styles.stage}>
        <nav className={styles.rail} aria-label="Scènes de découverte Breiz">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={`${styles.sceneButton} ${scene.id === active.id ? styles.sceneButtonActive : ''}`}
              onClick={() => setActiveId(scene.id)}
              aria-pressed={scene.id === active.id}
            >
              <span className={styles.sceneIcon} aria-hidden>
                <Icon name={iconFor(scene.category)} size={16} />
              </span>
              <span className={styles.sceneButtonCopy}>
                <small>{CATEGORY_LABEL[scene.category]}</small>
                <strong>{scene.title}</strong>
              </span>
            </button>
          ))}
        </nav>

        <article className={styles.scene} aria-live="polite">
          <div className={styles.sceneTopline}>
            <span>{CATEGORY_LABEL[active.category]}</span>
            <span>{active.territory}</span>
          </div>
          <p className={styles.hook}>{active.hook}</p>
          <h5>{active.title}</h5>
          <p className={styles.story}>{active.story}</p>

          <div className={styles.whyNow}>
            <span className={styles.whyIcon} aria-hidden><Icon name="compass" size={15} /></span>
            <div>
              <small>Pourquoi maintenant</small>
              <p>{active.whyNow}</p>
            </div>
          </div>

          <div className={styles.provenance}>
            <div>
              <small>Provenance</small>
              <strong>{active.sourceName}</strong>
            </div>
            <span className={styles.provenanceState}>
              {active.provenance === 'OFFICIAL_METADATA' ? 'source officielle' : 'fixture contrôlée'}
            </span>
          </div>

          {active.sourceUrl ? (
            <a className={styles.sourceLink} href={active.sourceUrl} target="_blank" rel="noreferrer">
              Ouvrir la source <span aria-hidden>↗</span>
            </a>
          ) : null}
        </article>
      </div>

      <div className={styles.liveBar}>
        <div>
          <span className={styles.liveDot} />
          <div>
            <strong>Couche sources officielles</strong>
            <span>
              {liveState === 'ready'
                ? 'Métadonnées officielles ajoutées à la scène.'
                : liveState === 'unavailable'
                  ? 'Indisponible pour l’instant : la démo reste sur ses fixtures contrôlées.'
                  : 'Optionnelle pendant la démo ; les fixtures gardent le parcours fiable.'}
            </span>
          </div>
        </div>
        <button type="button" onClick={enrichFromOfficialSources} disabled={liveState === 'loading'}>
          {liveState === 'loading' ? 'Recherche…' : liveState === 'ready' ? 'Actualiser' : 'Explorer Lorient'}
        </button>
      </div>

      <p className={styles.boundary}>
        Déclenchement produit prévu : localisation volontaire à granularité utile + moment + préférences d’exploration. Pas de partage silencieux
        de position précise, pas d’inférence ELI à partir d’un lieu culturel.
      </p>
    </section>
  );
}

function iconFor(category: BreizDiscoveryScene['category']): 'compass' | 'journal' | 'calendar' | 'info' | 'wave' {
  if (category === 'event') return 'calendar';
  if (category === 'heritage' || category === 'culture' || category === 'language') return 'journal';
  if (category === 'nature') return 'wave';
  if (category === 'practical') return 'info';
  return 'compass';
}
