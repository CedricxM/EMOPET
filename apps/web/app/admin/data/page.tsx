import Link from 'next/link';
import { cookies } from 'next/headers';
import { ContentShell } from '../../../components/content-shell';
import { Button, Card, Eyebrow, H1, H2, Lead, P2 } from '../../../components/ui';
import { MOCK_SCORED_BRITTANY_TERRITORIES } from '../../../lib/data/territory/mockTerritories';
import { DEFAULT_TERRITORY_SCORING_WEIGHTS } from '../../../lib/data/territory/territoryScoring';
import { ADMIN_TOKEN_COOKIE, isAdminTokenValue } from '../../../lib/server/admin';

const BREAKDOWN_LABELS = [
  ['population_density_potential', 'Population / densite'],
  ['canine_ecosystem_density', 'Ecosysteme canin'],
  ['purchasing_power', 'Pouvoir d achat'],
  ['housing_lifestyle_compatibility', 'Habitat / mode de vie'],
  ['tourism_mobility', 'Tourisme / mobilite'],
  ['community_potential', 'Potentiel communaute'],
  ['heritage_local_identity', 'Identite locale'],
] as const;

function ScoreBar({ value }: { value: number }) {
  return (
    <div
      aria-label={`Score ${value} sur 100`}
      style={{
        height: 8,
        borderRadius: 'var(--radius-pill)',
        background: 'color-mix(in srgb, var(--emopet-gray) 18%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          borderRadius: 'inherit',
          background:
            value >= 80
              ? 'var(--emopet-teal)'
              : value >= 70
                ? 'var(--emopet-orange)'
                : 'var(--emopet-navy)',
        }}
      />
    </div>
  );
}

function formatWeight(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default async function AdminDataPage() {
  const cookieStore = await cookies();
  const isAuthorized = isAdminTokenValue(cookieStore.get(ADMIN_TOKEN_COOKIE)?.value);
  if (!isAuthorized) {
    return (
      <ContentShell>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
          <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Eyebrow tone="accent">Equipe EMOPET - data interne</Eyebrow>
            <H1>Acces interne requis</H1>
            <Lead>Cette page affiche des donnees de pilotage et reste fermee sans token admin valide.</Lead>
          </header>
          <Card>
            <P2>Chargez le token depuis la file de moderation avant d'ouvrir le scoring territorial.</P2>
            <div style={{ marginTop: 12 }}>
              <Link href="/admin" style={{ textDecoration: 'none' }}>
                <Button kind="secondary" size="sm">Ouvrir la moderation</Button>
              </Link>
            </div>
          </Card>
        </div>
      </ContentShell>
    );
  }

  const rankedTerritories = MOCK_SCORED_BRITTANY_TERRITORIES;

  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860 }}>
          <Eyebrow tone="accent">Equipe EMOPET - data interne</Eyebrow>
          <H1>Scoring territorial pilote</H1>
          <Lead>
            Lecture strategique des territoires bretons pour prioriser un lancement local.
            Cette page utilise des donnees mockees et ne constitue pas un modele de bien-etre animal.
          </Lead>
          <div>
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <Button kind="secondary" size="sm">Retour moderation</Button>
            </Link>
          </div>
        </header>

        <Card tone="navy">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow tone="accent">Formule configurable</Eyebrow>
              <H2 style={{ color: 'var(--fg-on-dark)' }}>Score de lancement, pas score animal</H2>
              <P2 style={{ color: 'rgba(246, 239, 231, 0.78)' }}>
                Le score combine attractivite territoriale, services canins, contexte habitat,
                mobilite locale, potentiel communaute et ancrage culturel. Il sert a la strategie
                de deploiement EMOPET.
              </P2>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(DEFAULT_TERRITORY_SCORING_WEIGHTS).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'rgba(246, 239, 231, 0.8)',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong style={{ color: 'var(--emopet-cream)' }}>{formatWeight(value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {rankedTerritories.map((territory, index) => (
            <Card key={territory.code_insee}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Eyebrow tone={index === 0 ? 'accent' : 'accent2'}>Rang {index + 1}</Eyebrow>
                    <H2>{territory.commune}</H2>
                    <P2>{territory.department} - {territory.urban_rural_type}</P2>
                  </div>
                  <div
                    style={{
                      minWidth: 84,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--emopet-navy)',
                      color: 'var(--fg-on-dark)',
                      padding: '12px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'rgba(246, 239, 231, 0.72)' }}>Score</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{territory.launch_score}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 9 }}>
                  {BREAKDOWN_LABELS.map(([key, label]) => {
                    const value = territory.score_breakdown[key];
                    return (
                      <div key={key} style={{ display: 'grid', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{value}</span>
                        </div>
                        <ScoreBar value={value} />
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    paddingTop: 4,
                  }}
                >
                  <P2 style={{ fontFeatureSettings: 'var(--ff-tabular)' }}>Pop. {territory.population.toLocaleString('fr-FR')}</P2>
                  <P2 style={{ fontFeatureSettings: 'var(--ff-tabular)' }}>Dens. {territory.density.toLocaleString('fr-FR')}</P2>
                  <P2 style={{ fontFeatureSettings: 'var(--ff-tabular)' }}>INSEE {territory.code_insee}</P2>
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </ContentShell>
  );
}
