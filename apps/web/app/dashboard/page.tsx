'use client';

import { ContentShell } from '../../components/content-shell';
import {
  Button,
  Card,
  DataXL,
  Disclaimer,
  Eyebrow,
  H1,
  H2,
  Icon,
  Lead,
  Meter,
  P,
  P2,
  Pill,
} from '../../components/ui';
import {
  MOCK_DOG,
  MOCK_ELI,
  MOCK_RECOVERY,
  MOCK_REPOS,
  MOCK_TREND_14D,
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
              <Eyebrow>{t('dashboard', 'today')} Â· {today}</Eyebrow>
              <H1>{t('dashboard', 'title')} â€” {MOCK_DOG.name}</H1>
              <Lead>{t('dashboard', 'lead')}</Lead>
              <span className={styles.dogCue}>Observatoire de Gus Â· routines et signaux fiables</span>
            </div>
            <div className={`${styles.sceneStamp} ${styles.softPulse}`} aria-hidden />
          </div>
        </header>

        {/* Signature Â« confiance Â» : la capture insuffisante est assumÃ©e, pas masquÃ©e. */}
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

        <section className={styles.observatoryGrid}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Pill state={MOCK_ELI.state} />
                  <Eyebrow>{t('dashboard', 'balanceIndex')}</Eyebrow>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--fg-muted)',
                    fontFeatureSettings: 'var(--ff-tabular)',
                  }}
                >
                  {MOCK_ELI.captureMinutes} {t('dashboard', 'captureSummary')} Â· {t('dashboard', 'captureContext')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <DataXL>{MOCK_ELI.value}</DataXL>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--lichen-700)',
                    fontWeight: 'var(--weight-semi)',
                  }}
                >
                  +{MOCK_ELI.delta} {t('dashboard', 'weeklyDelta')}
                </span>
              </div>
              <Meter value={MOCK_ELI.value} />
              <P2>
                {t('dashboard', 'stableRhythm')}
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

          <Card tone="sunk" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Eyebrow>{t('dashboard', 'recovery')}</Eyebrow>
              <P>
                {t('dashboard', 'recoveryIntro')} {MOCK_DOG.name} {t('dashboard', 'recoveryMiddle')}{' '}
                <strong style={{ color: 'var(--fg-strong)' }}>{MOCK_RECOVERY.mins} min</strong> {t('dashboard', 'recoveryReturn')}{' '}
                {t('dashboard', 'recoveryOutro')} {t('dashboard', 'recoveryTrigger')}.
              </P>
              <P2>{t('dashboard', 'recoveryDetail')}</P2>
            </div>
          </Card>
        </section>

        <section>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Eyebrow>{t('dashboard', 'trend14d')}</Eyebrow>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'var(--text-xl)',
                      color: 'var(--fg-strong)',
                    }}
                  >
                    {t('dashboard', 'dailyEli')}
                  </span>
                </div>
                <Button kind="ghost" size="sm" leading={<Icon name="download" size={14} />} onClick={() => window.print()}>
                  {t('dashboard', 'exportSummary')}
                </Button>
              </div>
              <TrendChart data={MOCK_TREND_14D} dayShort={t('dashboard', 'dayShort')} />
            </div>
          </Card>
        </section>

        {/* Tendances ELI v6 + Â« Comprendre les indicateurs Â» (fusion /bien-etre) */}
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

function TrendChart({
  data,
  dayShort,
}: {
  data: { day: number; eli: number; state: 'valid' | 'degraded' }[];
  dayShort: string;
}) {
  const max = Math.max(...data.map((d) => d.eli));
  const min = Math.min(...data.map((d) => d.eli));
  const range = Math.max(1, max - min);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
      {data.map((d) => {
        const h = 20 + ((d.eli - min) / range) * 120;
        return (
          <div
            key={d.day}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <div
              title={`${dayShort}${d.day} Â· ELI ${d.eli}`}
              style={{
                width: '100%',
                height: h,
                background: d.state === 'valid' ? 'var(--accent-2)' : 'var(--eli-degraded)',
                borderRadius: 'var(--radius-sm)',
                opacity: 0.92,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xxs)',
                color: 'var(--fg-muted)',
                fontFeatureSettings: 'var(--ff-tabular)',
              }}
            >
              {dayShort}{d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

