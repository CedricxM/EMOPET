'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { KnowledgeReader, PathwayCard } from '../../components/gamification';
import { BreedStoryCard } from '../../components/breed/BreedStoryCard';
import { FciBreedSelect } from '../../components/breed/FciBreedSelect';
import { Button, Card, Eyebrow, H1, H2, Icon, Lead, Meter, P2, Pill } from '../../components/ui';
import { PATHWAYS, computeCounters, fetchServerCounters, markCardRead } from '../../lib/gamification';
import type { Counters, KnowledgeCard } from '../../lib/gamification';
import { MOCK_DOG, MOCK_SENSORS } from '../../lib/mock-data';
import { useI18n } from '../../lib/i18n';
import type { Dict } from '../../lib/i18n';
import { DonneesSection } from './DonneesSection';
import styles from '../../styles/living-pages.module.css';

const SETTINGS = [
  { id: 's1', label: 'IA & tonalité', meta: 'Breiz · calme', icon: 'chat' as const },
  { id: 's2', label: 'Mode prudence', meta: 'Activé', icon: 'info' as const },
  { id: 's3', label: 'Suivi vétérinaire', meta: 'Cabinet du Ter', icon: 'profile' as const },
  { id: 's4', label: 'Confidentialité', meta: 'Données locales', icon: 'signal' as const },
  { id: 's5', label: "À propos d'EMOPET", meta: 'v6.0.0', icon: 'info' as const },
];

// Global points/badges/levels are no longer release-authorized. The profile is a
// management surface. Learning keeps only read/unread resume state.
const TABS = ['Compte', 'Apprentissage'] as const;
type Tab = (typeof TABS)[number];
const TAB_KEY: Record<Tab, keyof Dict['profil'] & string> = {
  Compte: 'tabCompte',
  Apprentissage: 'tabApprentissage',
};

export default function ProfilPage() {
  const { t, locale } = useI18n();
  const [counters, setCounters] = useState<Counters>(() => computeCounters());
  const [tab, setTab] = useState<Tab>('Compte');
  const [readerCard, setReaderCard] = useState<KnowledgeCard | null>(null);
  const [readerAlready, setReaderAlready] = useState(false);

  useEffect(() => {
    // Compatibility API now returns reading-state only. It intentionally does not
    // derive progression from journal, walks, Community, MAT/TAG or ELI.
    let cancelled = false;
    void fetchServerCounters().then((c) => { if (!cancelled) setCounters(c); });
    return () => { cancelled = true; };
  }, []);

  function openCard(card: KnowledgeCard) {
    const already = counters.knowledgeCardsRead.includes(card.id);
    setReaderAlready(already);
    setReaderCard(card);
    if (!already) {
      markCardRead(card.id);
      void fetchServerCounters().then(setCounters);
    }
  }

  const safeLead = locale === 'en'
    ? 'Manage your account, dog profile, sensors, preferences, privacy and optional learning resources.'
    : 'Gérez votre compte, le profil du chien, les capteurs, vos préférences, la confidentialité et les ressources d’apprentissage optionnelles.';

  const worldBridge = locale === 'en'
    ? 'My Dog World is an optional playful space with its own state. It is not powered by Care/ELI or real-dog performance.'
    : 'Mon monde est un espace ludique optionnel avec son propre état. Il n’est pas alimenté par Care/ELI ni par les performances réelles du chien.';

  const learningIntro = locale === 'en'
    ? 'Short, sourced, non-medical cards. Read status only helps you resume later. It earns no points, level, rank or product rights.'
    : 'Des fiches courtes, sourcées et non médicales. Le statut lu/non lu sert seulement à reprendre plus tard. Il ne donne aucun point, niveau, rang ni droit produit.';

  return (
    <ContentShell>
      <div className={styles.pageFlow}>
        <header className={styles.livingHero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Eyebrow>{t('profil', 'eyebrow')}</Eyebrow>
              <H1>{t('profil', 'title')}</H1>
              <Lead>{safeLead}</Lead>
              <span className={styles.dogCue}>Fiche de Gus · profil, capteurs et préférences</span>
            </div>
            <div className={styles.sceneStamp} aria-hidden />
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--bg-sunk)', borderRadius: 'var(--radius-pill)', width: 'fit-content', flexWrap: 'wrap' }}>
          {TABS.map((tb) => {
            const active = tab === tb;
            return (
              <button key={tb} onClick={() => setTab(tb)} aria-pressed={active} style={{ padding: '8px 16px', borderRadius: 'var(--radius-pill)', background: active ? 'var(--surface)' : 'transparent', border: `1px solid ${active ? 'var(--border)' : 'transparent'}`, boxShadow: active ? 'var(--shadow-xs)' : 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', color: active ? 'var(--fg-strong)' : 'var(--fg-2)', cursor: 'pointer' }}>
                {t('profil', TAB_KEY[tb])}
              </button>
            );
          })}
        </div>

        <Card tone="accent2Soft">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <P2 style={{ color: 'var(--lichen-700)' }}>{worldBridge}</P2>
            <Link href="/world" style={{ textDecoration: 'none' }}><Button kind="accent2" size="sm">{t('profil', 'worldCta')}</Button></Link>
          </div>
        </Card>

        {tab === 'Apprentissage' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <P2>{learningIntro}</P2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {PATHWAYS.map((p) => (
                <PathwayCard key={p.id} pathway={p} readIds={counters.knowledgeCardsRead} onOpen={openCard} />
              ))}
            </div>
          </section>
        )}

        {tab === 'Compte' && (
          <>
            <div className={styles.profileDogCard}>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 78, height: 78, borderRadius: 'var(--radius-pill)', background: 'var(--emopet-navy)', color: 'var(--cream-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-semi)', boxShadow: '0 8px 16px rgba(29, 26, 106, 0.16)' }}>
                  {MOCK_DOG.initial}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
                  <H2>{MOCK_DOG.name}</H2>
                  <P2 style={{ fontFeatureSettings: 'var(--ff-tabular)' }}>{MOCK_DOG.breed} · {MOCK_DOG.ageYears} ans · {MOCK_DOG.weightKg} kg</P2>
                  <span className={styles.dogCue}>MAT, TAG et carnet reliés au même profil</span>
                </div>
                <Button kind="ghost" size="sm">Modifier</Button>
              </div>
            </div>

            <BreedStoryCard dogName={MOCK_DOG.name} breedName={MOCK_DOG.breed} />
            <FciBreedSelect
              dogId="mock-dog-gus"
              dogName={MOCK_DOG.name}
              initialBreedName={MOCK_DOG.breed}
              ageYears={MOCK_DOG.ageYears}
              weightKg={MOCK_DOG.weightKg}
            />

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Eyebrow>Capteurs</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {MOCK_SENSORS.map((s) => (
                  <Card key={s.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)' }}>
                            <Icon name={s.id === 'mat' ? 'mat' : 'tag'} size={18} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{s.label}</span>
                        </div>
                        <Pill state={s.state} />
                      </div>
                      <Meter value={s.coverage} tone={s.state === 'valid' ? 'accent2' : 'degraded'} />
                      <P2 style={{ fontFeatureSettings: 'var(--ff-tabular)' }}>Couverture {s.coverage}% · firmware {s.firmware}</P2>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Eyebrow>Paramètres</Eyebrow>
              <Card padding={0}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {SETTINGS.map((s, i) => (
                    <button key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--divider)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)' }}>
                        <Icon name={s.icon} size={16} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--fg-strong)', flex: 1 }}>{s.label}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--fg-muted)' }}>{s.meta}</span>
                      <Icon name="chevron" size={14} color="var(--fg-hint)" />
                    </button>
                  ))}
                </div>
              </Card>
            </section>

            <DonneesSection />
          </>
        )}
      </div>

      <KnowledgeReader card={readerCard} alreadyRead={readerAlready} onClose={() => setReaderCard(null)} />
    </ContentShell>
  );
}
