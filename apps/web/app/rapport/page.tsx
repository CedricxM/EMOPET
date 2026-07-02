import { ContentShell } from '../../components/content-shell';
import { Button, Card, DataMD, DataXL, Disclaimer, Eyebrow, H1, H2, H3, Icon, Lead, P, P2, Pill } from '../../components/ui';
import { MOCK_DOG, MOCK_TREND_14D } from '../../lib/mock-data';

const WINDOW_START = '5 avril 2026';
const WINDOW_END = '18 avril 2026';

const SUMMARY = {
  eliAverage: 68,
  eliDelta: +3,
  captureHours: 34,
  captureCoverage: 74,
  anticipations: 2,
  recoveryAverageMin: 11,
};

const VETOES = [
  { kind: 'Capture insuffisante', count: 2, days: 'J4, J10' },
  { kind: 'Motif récent (< 3 j)', count: 1, days: 'J12' },
  { kind: 'Contexte déclaré incomplet', count: 1, days: 'J8' },
];

const OBSERVATIONS = [
  {
    title: 'Anticipation matinale récurrente',
    window: 'J8 – J14 · 7 h 40 – 7 h 55',
    state: 'valid' as const,
    body:
      "Un motif d'éveil bref se répète 6 matins consécutifs avant la sortie habituelle. Observé sans pic d'activité atypique.",
  },
  {
    title: 'Récupération plus longue après perturbation sonore',
    window: 'J11 · 21 h 12',
    state: 'valid' as const,
    body:
      "Retour au rythme habituel en 14 min après un passage bruyant dans la rue. Médiane observée sur 14 j : 9 min.",
  },
  {
    title: 'Interruptions de repos nocturnes',
    window: 'J10 · 02 h – 04 h',
    state: 'degraded' as const,
    body:
      "Trois interruptions mesurées sur cette fenêtre. Capture partielle : interprétation à considérer avec prudence.",
  },
];

export default function RapportPage() {
  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow>Rapport pour le vétérinaire</Eyebrow>
          <H1>Rapport 14 jours · {MOCK_DOG.name}</H1>
          <Lead>
            Fenêtre d&apos;observation du {WINDOW_START} au {WINDOW_END}. Observations non-médicales.
          </Lead>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button kind="secondary" leading={<Icon name="download" size={14} />}>
            PDF
          </Button>
          <Button kind="primary" leading={<Icon name="send" size={14} />}>
            Envoyer au vétérinaire
          </Button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <SummaryCard eyebrow="ELI moyen" value={String(SUMMARY.eliAverage)} delta={`+${SUMMARY.eliDelta}`} state="valid" />
        <SummaryCard
          eyebrow="Capture totale"
          value={`${SUMMARY.captureHours} h`}
          delta={`${SUMMARY.captureCoverage}% couverture`}
        />
        <SummaryCard eyebrow="Anticipations observées" value={String(SUMMARY.anticipations)} delta="répétées ≥ 6 j" />
        <SummaryCard
          eyebrow="Retour au calme"
          value={`${SUMMARY.recoveryAverageMin} min`}
          delta="médiane après perturbation"
        />
      </section>

      <section>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Eyebrow>Tendance 14 jours</Eyebrow>
                <H2 style={{ fontSize: 'var(--text-2xl)' }}>ELI quotidien et couverture capture</H2>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <LegendDot color="var(--accent-2)" label="ELI valide" />
                <LegendDot color="var(--eli-degraded)" label="Dégradé" />
                <LegendDot color="var(--accent-soft-border)" label="Capture" />
              </div>
            </div>
            <DualChart data={MOCK_TREND_14D} />
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Observations retenues</Eyebrow>
          {OBSERVATIONS.map((obs, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <H3 style={{ fontSize: 'var(--text-xl)' }}>{obs.title}</H3>
                  <Pill state={obs.state} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--fg-muted)',
                    fontFeatureSettings: 'var(--ff-tabular)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {obs.window}
                </span>
                <P>{obs.body}</P>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Gating & vétos</Eyebrow>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <H3 style={{ fontSize: 'var(--text-xl)' }}>Fenêtres non consolidées</H3>
              <P2>
                Les vétos suivants ont été levés sur la période. Les fenêtres associées sont affichées pour
                transparence mais ne sont pas utilisées pour les conclusions.
              </P2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {VETOES.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '8px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--fg-strong)',
                          fontWeight: 'var(--weight-medium)',
                        }}
                      >
                        {v.kind}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-xxs)',
                          color: 'var(--fg-muted)',
                          fontFeatureSettings: 'var(--ff-tabular)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {v.days}
                      </span>
                    </div>
                    <DataMD>{v.count}</DataMD>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card tone="accent2Soft">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow tone="accent2">Méthodologie</Eyebrow>
              <P2>
                Observations issues des capteurs MAT et TAG, consolidées par fenêtres ELI valides (≥ 90 min de
                capture par jour). Chaque motif retenu est répété sur au moins 3 jours distincts.
              </P2>
            </div>
          </Card>
        </div>
      </section>

      <Disclaimer />
      </div>
    </ContentShell>
  );
}

function SummaryCard({
  eyebrow,
  value,
  delta,
  state,
}: {
  eyebrow: string;
  value: string;
  delta: string;
  state?: 'valid';
}) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          {state && <Pill state={state} showDot={false} />}
        </div>
        <DataXL style={{ fontSize: 'var(--text-4xl)' }}>{value}</DataXL>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--fg-muted)',
            fontFeatureSettings: 'var(--ff-tabular)',
          }}
        >
          {delta}
        </span>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xxs)',
        color: 'var(--fg-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 'var(--weight-semi)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: color }} />
      {label}
    </span>
  );
}

function DualChart({ data }: { data: { day: number; eli: number; captureMinutes: number; state: 'valid' | 'degraded' }[] }) {
  const max = Math.max(...data.map((d) => d.eli));
  const min = Math.min(...data.map((d) => d.eli));
  const range = Math.max(1, max - min);
  const maxCap = Math.max(...data.map((d) => d.captureMinutes));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 180 }}>
        {data.map((d) => {
          const h = 24 + ((d.eli - min) / range) * 140;
          const capH = (d.captureMinutes / maxCap) * 32;
          return (
            <div
              key={d.day}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <div
                title={`J${d.day} · ELI ${d.eli} · capture ${d.captureMinutes} min`}
                style={{
                  width: '100%',
                  height: h,
                  background: d.state === 'valid' ? 'var(--accent-2)' : 'var(--eli-degraded)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: capH,
                  background: 'var(--accent-soft-border)',
                  borderRadius: 'var(--radius-xs)',
                  opacity: 0.65,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {data.map((d) => (
          <span
            key={d.day}
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xxs)',
              color: 'var(--fg-muted)',
              fontFeatureSettings: 'var(--ff-tabular)',
            }}
          >
            J{d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
