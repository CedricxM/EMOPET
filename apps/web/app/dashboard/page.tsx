'use client';

import { ContentShell } from '../../components/content-shell';
import {
  Button,
  Card,
  Disclaimer,
  Eyebrow,
  H1,
  H2,
  Icon,
  Lead,
  P,
  P2,
  Pill,
} from '../../components/ui';
import {
  MOCK_DOG,
  MOCK_ELI,
  MOCK_RECOVERY,
  MOCK_REPOS,
} from '../../lib/mock-data';
import { formatDateLocale, useI18n } from '../../lib/i18n';
import { useState } from 'react';
import { BienEtreSection } from './BienEtreSection';
import styles from '../../styles/living-pages.module.css';

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const today = formatDateLocale(new Date().toISOString(), locale, { day: 'numeric', month: 'short' });
  const [eliOpen, setEliOpen] = useState(false);
  return (
    <ContentShell>
      <div className={styles.pageFlow}>
        <header className={styles.livingHero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Eyebrow>{t('dashboard', 'today')} · {today}</Eyebrow>
              <H1>{t('dashboard', 'title')} — {MOCK_DOG.name}</H1>
              <Lead>{t('dashboard', 'lead')}</Lead>
              <span className={styles.dogCue}>Observatoire de Gus · routines et signaux fiables</span>
            </div>
            <div className={`${styles.sceneStamp} ${styles.softPulse}`} aria-hidden />
          </div>
        </header>

        {/* Signature « confiance » : la capture insuffisante est assumée, pas masquée. */}
        {MOCK_ELI.captureMinutes < 60 && (
          <div
            role="status"
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '14px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-sunk)', border: '1px solid var(--border)',
              borderLeft: '4px solid var(--emopet-teal)',
            }}
          >
            <Icon name="info" size={18} color="var(--emopet-teal)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)', color: 'var(--fg-strong)' }}>
                {t('dashboard', 'insufficientCapture')}
              </span>
              <P2>{t('dashboard', 'insufficientCaptureDetail')}</P2>
              <button
                type="button"
                onClick={() => setEliOpen(true)}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: 'var(--emopet-teal)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t('dashboard', 'understandShow')}
              </button>
            </div>
          </div>
        )}

        {/* Observation principale.
            L'indice global qui occupait cet emplacement — « Indice d'équilibre (ELI) »,
            sa valeur, son delta hebdomadaire, sa jauge et la tendance « ELI quotidien »
            sur 14 jours — est retiré. Décision et autorités citées dans
            docs/records/memory/DASHBOARD_GLOBAL_INDEX_RETIREMENT_2026-09-20.md ;
            constat d'origine dans CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md §8.3. */}
        <section className={styles.observatoryGrid}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Eyebrow>{t('dashboard', 'rest')}</Eyebrow>
                <Pill state={MOCK_REPOS.state} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <Stat label={t('dashboard', 'interruptions')} value={String(MOCK_REPOS.interruptions)} />
                <Stat label={t('dashboard', 'duration')} value={`${MOCK_REPOS.durationMinutes} min`} />
                <Stat label={t('dashboard', 'confidence')} value={`${MOCK_REPOS.confidence}%`} />
              </div>
              <P2>
                {t('dashboard', 'partialCapture')}
              </P2>
            </div>
          </Card>

          <Card tone="accentSoft">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Eyebrow tone="accent">{t('dashboard', 'anticipation')}</Eyebrow>
              <H2 style={{ fontSize: 'var(--text-2xl)' }}>{t('dashboard', 'anticipationMessage')}</H2>
              <P>{t('dashboard', 'anticipationDetail')}</P>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Button kind="primary" size="sm">
                  {t('dashboard', 'learnMore')}
                </Button>
                <Button kind="ghost" size="sm">
                  {t('dashboard', 'dismiss')}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <Card tone="sunk" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <Eyebrow>{t('dashboard', 'recovery')}</Eyebrow>
                <Button kind="ghost" size="sm" leading={<Icon name="download" size={14} />} onClick={() => window.print()}>
                  {t('dashboard', 'exportSummary')}
                </Button>
              </div>
              <P>
                {t('dashboard', 'recoveryIntro')} {MOCK_DOG.name} {t('dashboard', 'recoveryMiddle')}{' '}
                <strong style={{ color: 'var(--fg-strong)' }}>{MOCK_RECOVERY.mins} min</strong> {t('dashboard', 'recoveryReturn')}{' '}
                {t('dashboard', 'recoveryOutro')} {t('dashboard', 'recoveryTrigger')}.
              </P>
              <P2>{t('dashboard', 'recoveryDetail')}</P2>
            </div>
          </Card>
        </section>

        {/* Tendances ELI v6 + « Comprendre les indicateurs » (fusion /bien-etre) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Button
            kind="secondary"
            onClick={() => setEliOpen((v) => !v)}
            trailing={<Icon name="chevron" size={14} />}
            style={{ alignSelf: 'flex-start' }}
          >
            {eliOpen ? t('dashboard', 'understandHide') : t('dashboard', 'understandShow')}
          </Button>
          {eliOpen && (
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
              <BienEtreSection />
            </div>
          )}
        </section>

        <Disclaimer />
      </div>
    </ContentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xxs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--fg-muted)',
          fontWeight: 'var(--weight-semi)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--fg-strong)',
          fontFeatureSettings: 'var(--ff-tabular)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
