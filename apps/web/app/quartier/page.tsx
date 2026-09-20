'use client';

/**
 * /quartier — page stratégique du produit (refonte 14→6 routes).
 * Fusionne /local (carte Mapbox + annuaire + spots communautaires) et
 * /communaute (cercles, posts, événements, entraide) en une seule destination
 * « se relier ». Anciennes routes redirigées (next.config.mjs).
 *
 * Opt-in explicite pour toute contribution ; aucune donnée sensible publique ;
 * aucun classement (invariants EMOPET).
 */

import { useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { Eyebrow, H1, Icon, Lead, P2 } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { COMMUNITY_WORLD } from '../../lib/mock-world';
import { LocalSection } from './LocalSection';
import { CommunitySection } from './CommunitySection';
import styles from '../../styles/living-pages.module.css';

type Section = 'carte' | 'communaute';

export default function QuartierPage() {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>('carte');
  // Contributions communautaires : opt-in EXPLICITE (RGPD), désactivé par défaut.
  const [optIn, setOptIn] = useState(false);

  const tabs: Array<{ id: Section; label: string }> = [
    { id: 'carte', label: t('quartier', 'tabMap') },
    { id: 'communaute', label: t('quartier', 'tabCommunity') },
  ];

  return (
    <ContentShell>
      <div className={styles.pageFlow}>
        <header className={styles.livingHero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Eyebrow tone="accent">{t('quartier', 'eyebrow')}</Eyebrow>
              <H1>{t('quartier', 'title')}</H1>
              <Lead>{t('quartier', 'lead')}</Lead>
              <span className={styles.dogCue}>Exploration locale · contributions opt-in</span>
            </div>
            <div className={styles.explorationMiniMap} aria-hidden />
          </div>
        </header>

        {/* Activité du quartier — visible seulement après opt-in explicite (RGPD). */}
        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-2-soft)', border: '1px solid var(--accent-2-soft-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)', color: 'var(--lichen-700)' }}>
              <Icon name="users" size={16} /> {t('quartier', 'activityTitle')}
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--fg-2)' }}>
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              {t('quartier', 'optIn')}
            </label>
          </div>
          {optIn ? (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COMMUNITY_WORLD.updates.map((u) => (
                <li key={u} style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg)' }}>{u}</li>
              ))}
            </ul>
          ) : (
            <P2 style={{ marginTop: 8 }}>{t('quartier', 'optInHint')}</P2>
          )}
        </div>

        {/* Sélecteur de section */}
        <div role="tablist" aria-label={t('quartier', 'title')} style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--bg-sunk)', borderRadius: 'var(--radius-pill)', width: 'fit-content' }}>
          {tabs.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setSection(tab.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-pill)',
                  background: active ? 'var(--surface)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
                  boxShadow: active ? 'var(--shadow-xs)' : 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semi)',
                  color: active ? 'var(--fg-strong)' : 'var(--fg-2)',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {section === 'carte' ? <LocalSection /> : <CommunitySection />}
        </div>
      </div>
    </ContentShell>
  );
}

