'use client';

import { useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import {
  Button,
  Card,
  DataXL,
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
import { MOCK_DOG, MOCK_ELI, MOCK_REPOS, MOCK_SENSORS, MOCK_TREND_14D } from '../../lib/mock-data';

type DemoStep = 'overview' | 'eli' | 'breiz' | 'hardware';

const STEPS: { id: DemoStep; label: string; icon: 'signal' | 'info' | 'wave' | 'compass' }[] = [
  { id: 'overview', label: '1 · Observatoire', icon: 'signal' },
  { id: 'eli', label: '2 · ELI & confiance', icon: 'info' },
  { id: 'breiz', label: '3 · Breiz', icon: 'wave' },
  { id: 'hardware', label: '4 · MAT + TAG', icon: 'compass' },
];

export default function DemoPage() {
  const [step, setStep] = useState<DemoStep>('overview');

  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
          <Eyebrow>Démonstration MVP · jeu de données contrôlé</Eyebrow>
          <H1>EMOPET — observer sans surinterpréter</H1>
          <Lead>
            Cette surface de démonstration raconte le cœur du produit avec des données simulées et clairement identifiées.
            Elle ne prétend ni à une mesure clinique, ni à une connexion hardware live, ni à une release Product V1.
          </Lead>
        </header>

        <nav
          aria-label="Parcours de démonstration"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }}
        >
          {STEPS.map((item) => (
            <Button
              key={item.id}
              kind={step === item.id ? 'primary' : 'secondary'}
              size="sm"
              leading={<Icon name={item.icon} size={14} />}
              onClick={() => setStep(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {step === 'overview' && <OverviewStep />}
        {step === 'eli' && <EliStep />}
        {step === 'breiz' && <BreizStep />}
        {step === 'hardware' && <HardwareStep />}

        <Card>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color="var(--emopet-teal)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Eyebrow>Cadre de démonstration</Eyebrow>
              <P2>
                Les chiffres affichés sur cette page sont des fixtures de démonstration. Les garde-fous, les états de confiance,
                la logique non diagnostique et les frontières MAT/TAG illustrent le comportement attendu du MVP logiciel.
              </P2>
            </div>
          </div>
        </Card>
      </div>
    </ContentShell>
  );
}

function OverviewStep() {
  const recent = MOCK_TREND_14D.slice(-7);
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.6fr)', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <Eyebrow>Profil observé</Eyebrow>
                <H2>{MOCK_DOG.name} · {MOCK_DOG.breed}</H2>
              </div>
              <Pill state="valid" label="Démo contrôlée" showDot />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
              <Metric label="ELI" value={String(MOCK_ELI.value)} detail="indice de démonstration" />
              <Metric label="Capture" value={`${MOCK_ELI.captureMinutes} min`} detail="fenêtre exploitable" />
              <Metric label="Repos" value={`${MOCK_REPOS.durationMinutes} min`} detail={`${MOCK_REPOS.confidence}% de confiance`} />
            </div>
            <P>
              EMOPET ne montre pas seulement une valeur : il montre aussi si la donnée est suffisamment fiable pour être interprétée.
            </P>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Eyebrow>État actuel</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <DataXL>{MOCK_ELI.value}</DataXL>
              <span style={{ color: 'var(--lichen-700)', fontWeight: 'var(--weight-semi)', fontFamily: 'var(--font-sans)' }}>
                +{MOCK_ELI.delta} / semaine
              </span>
            </div>
            <Meter value={MOCK_ELI.value} />
            <P2>Indicateur de démonstration, non médical et conditionné par la qualité de capture.</P2>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Eyebrow>Tendance 7 jours</Eyebrow>
            <H2 style={{ fontSize: 'var(--text-xl)' }}>Variation de l’ELI de démonstration</H2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 150 }}>
            {recent.map((point) => {
              const height = 42 + Math.max(0, Math.min(90, point.eli));
              return (
                <div key={point.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div
                    title={`Jour ${point.day} · ELI ${point.eli}`}
                    style={{
                      width: '100%',
                      maxWidth: 54,
                      height,
                      borderRadius: 'var(--radius-sm)',
                      background: point.state === 'valid' ? 'var(--accent-2)' : 'var(--eli-degraded)',
                    }}
                  />
                  <P2>J{point.day}</P2>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}

function EliStep() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow>Ce que l’ELI sait dire</Eyebrow>
          <H2>Une observation + son niveau de confiance</H2>
          <P>
            Sur la fixture actuelle, le rythme observé est stable et la capture est suffisamment longue pour afficher un indicateur.
          </P>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Evidence label="Capture exploitable" value={`${MOCK_ELI.captureMinutes} min`} state="valid" />
            <Evidence label="Repos" value={`${MOCK_REPOS.confidence}% de confiance`} state="degraded" />
            <Evidence label="Conclusion émotionnelle" value="Non autorisée" state="degraded" />
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow>Frontière produit</Eyebrow>
          <H2>Pas de diagnostic déguisé</H2>
          <P>
            Le MVP est conçu pour distinguer ce qui est observé, ce qui est déclaré par le gardien et ce qui serait une interprétation.
          </P>
          <P2>
            Exemple : « une phase d’éveil se répète avant le départ » est une observation. « Gus est anxieux » serait une conclusion
            émotionnelle non justifiée et ne doit pas être produite automatiquement.
          </P2>
          <Pill state="valid" label="Garde-fou actif" showDot />
        </div>
      </Card>
    </section>
  );
}

function BreizStep() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr)', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Breiz</Eyebrow>
          <H2>Assistant d’observation</H2>
          <P>
            Breiz reformule les données disponibles, cite leur provenance et refuse de transformer une corrélation en diagnostic.
          </P>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Evidence label="Mode" value="Observation" state="valid" />
            <Evidence label="ELI" value="Valide sur la fixture" state="valid" />
            <Evidence label="Diagnostic" value="Interdit" state="degraded" />
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '12px 16px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-lg)' }}>
            <P>Pourquoi Gus se réveille-t-il avant que je parte ?</P>
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: '88%' }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="wave" size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <P>
                Sur les six derniers matins de la fixture, une courte phase d’éveil apparaît juste avant l’horaire habituel de départ.
                C’est une répétition de rythme observée, pas une évaluation vétérinaire ni une attribution émotionnelle.
              </P>
              <P2>Sources · MAT, fenêtre matinale · ELI valide · données de démonstration</P2>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function HardwareStep() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow>Architecture de démonstration</Eyebrow>
          <H2>MAT + TAG → signaux → ELI → Breiz</H2>
          <P>
            La démo logicielle illustre cette chaîne sans prétendre que le hardware final, son tooling ou son Product V1 sont gelés.
          </P>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {MOCK_SENSORS.map((sensor) => (
          <Card key={sensor.id}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <Eyebrow>{sensor.id.toUpperCase()}</Eyebrow>
                  <H2 style={{ fontSize: 'var(--text-xl)' }}>{sensor.label}</H2>
                </div>
                <Pill state={sensor.state} showDot />
              </div>
              <Meter value={sensor.coverage} />
              <P2>Couverture simulée : {sensor.coverage}% · firmware de fixture {sensor.firmware}</P2>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="info" size={18} color="var(--emopet-teal)" />
          <P2>
            Pour une présentation fournisseur, cette étape sert à expliquer l’architecture et les états de maturité. Elle ne doit pas être
            présentée comme une preuve de validation mécanique, électronique, CE ou industrielle.
          </P2>
        </div>
      </Card>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Eyebrow>{label}</Eyebrow>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--fg-strong)' }}>{value}</span>
      <P2>{detail}</P2>
    </div>
  );
}

function Evidence({ label, value, state }: { label: string; value: string; state: 'valid' | 'degraded' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
      <P2>{label}</P2>
      <Pill state={state} label={value} showDot />
    </div>
  );
}
