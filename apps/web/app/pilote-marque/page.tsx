/**
 * Pilote marque — BRAND-AUTHORITY-001 (25 août 2026) vs rendu actuel.
 *
 * ⚠ CE N'EST PAS UNE AUTORITÉ, NI UNE MIGRATION.
 *
 * `CLAUDE.md` exige « pilote + QA » avant toute bascule visuelle. Cette route
 * EST ce pilote : une surface isolée, hors navigation, qui n'est importée par
 * aucune autre page. Elle ne modifie aucun token global et ne change rien au
 * rendu des surfaces existantes.
 *
 * Les trois familles prescrites sont chargées ICI SEULEMENT, via `next/font`,
 * qui les auto-héberge au build — aucune requête vers Google depuis le
 * navigateur du visiteur. Le reste du site continue de ne charger aucune
 * police (voir §1 ci-dessous : c'est précisément le constat).
 *
 * Licences : Fraunces, Instrument Sans et JetBrains Mono sont toutes trois
 * sous SIL Open Font License 1.1. À verser à #114 (IP-PROV-01) si la bascule
 * est décidée.
 */

import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Pilote marque — EMOPET',
  description: 'Comparaison contrôlée : rendu actuel vs BRAND-AUTHORITY-001. Pilote, non autorité.',
  robots: { index: false, follow: false },
};

const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', variable: '--pilot-display' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], display: 'swap', variable: '--pilot-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--pilot-mono' });

/* Valeurs relevées dans apps/web/styles/tokens.css sur main @ 1de3bf7. */
const ACTUEL = {
  fond: '#F6EFE7',
  texte: '#1D1A6A',
  accent: '#FE502D',
  second: '#2CB7AB',
  attenue: '#6B6F76',
} as const;

/* BRAND-AUTHORITY-001 §3.2, valeurs contrôlées. */
const PRESCRIT = {
  fond: '#F4EFE6',
  fondClair: '#FAF6EE',
  texte: '#1F2A36',
  texteClair: '#2E3B47',
  accent: '#C97B5A',
  accentSombre: '#A65E3F',
  second: '#6B8E6F',
  secondSombre: '#4F6F53',
  attenue: '#5A6570',
  pierre: '#D8D0C2',
} as const;

const FIABILITE = [
  { etat: 'VALID', hex: '#7A9B7E' },
  { etat: 'DEGRADED', hex: '#C9A55A' },
  { etat: 'SUPPRESSED', hex: '#9AA0A6' },
] as const;

const SYSTEME_FALLBACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function Pastille({ nom, hex, sombre }: { nom: string; hex: string; sombre?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: 6,
          background: hex,
          border: '1px solid rgba(0,0,0,0.14)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, lineHeight: 1.35 }}>
        <strong style={{ fontWeight: 600 }}>{nom}</strong>
        <br />
        <code style={{ fontFamily: 'var(--pilot-mono), ui-monospace, monospace', fontSize: 12, opacity: sombre ? 0.75 : 0.65 }}>
          {hex}
        </code>
      </span>
    </div>
  );
}

/**
 * Spécimen d'une vraie composition, rendu deux fois.
 *
 * Le texte respecte la doctrine Care : observation + fenêtre + référence +
 * provenance + limite. Aucun score nu, aucun label émotionnel, aucune
 * conclusion médicale. Il est là pour juger la typographie et la palette sur
 * une surface réaliste, pas pour proposer un contenu produit.
 */
function Specimen({
  variante,
  familleTitre,
  familleCorps,
  familleMono,
  couleurs,
}: {
  variante: string;
  familleTitre: string;
  familleCorps: string;
  familleMono: string;
  couleurs: { fond: string; texte: string; accent: string; second: string; attenue: string };
}) {
  return (
    <article
      style={{
        background: couleurs.fond,
        color: couleurs.texte,
        border: `1px solid ${couleurs.attenue}33`,
        borderRadius: 12,
        padding: '22px 24px',
        fontFamily: familleCorps,
      }}
    >
      <p
        style={{
          fontFamily: familleMono,
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: couleurs.accent,
          margin: '0 0 10px',
        }}
      >
        ⊙ Observation · 7 derniers jours
      </p>

      <h3 style={{ fontFamily: familleTitre, fontSize: 27, lineHeight: 1.18, margin: '0 0 12px', fontWeight: 600 }}>
        Repos plus fragmenté que sa référence habituelle
      </h3>

      <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 14px' }}>
        Sur les nuits observées cette semaine, les phases de repos continu sont plus
        courtes que la référence établie pour ce chien sur les huit semaines
        précédentes. Aucune interprétation médicale n&apos;est tirée de cette
        observation.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: familleMono,
            fontSize: 11,
            padding: '4px 9px',
            borderRadius: 999,
            background: `${couleurs.second}26`,
            color: couleurs.second,
            border: `1px solid ${couleurs.second}55`,
          }}
        >
          confiance : VALID
        </span>
        <span style={{ fontFamily: familleMono, fontSize: 11, color: couleurs.attenue }}>
          source : MAT · 6 nuits / 7
        </span>
      </div>

      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: couleurs.attenue, margin: '14px 0 0' }}>
        Limite : une nuit sans donnée exploitable. La comparaison porte sur le chien
        lui-même, jamais sur une moyenne de race.
      </p>

      <p
        style={{
          fontFamily: familleMono,
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: couleurs.attenue,
          margin: '16px 0 0',
          paddingTop: 10,
          borderTop: `1px solid ${couleurs.attenue}26`,
        }}
      >
        {variante}
      </p>
    </article>
  );
}

export default function PiloteMarquePage() {
  const colonne: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 22,
    alignItems: 'start',
  };
  const h2: React.CSSProperties = {
    fontFamily: 'var(--pilot-display), Georgia, serif',
    fontSize: 22,
    fontWeight: 600,
    margin: '0 0 6px',
    color: PRESCRIT.texte,
  };
  const chapeau: React.CSSProperties = {
    fontSize: 14.5,
    lineHeight: 1.6,
    color: PRESCRIT.texteClair,
    margin: '0 0 18px',
    maxWidth: '72ch',
  };
  const section: React.CSSProperties = { margin: '0 0 48px' };

  return (
    <main
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
      style={{
        fontFamily: 'var(--pilot-body), system-ui, sans-serif',
        background: PRESCRIT.fondClair,
        color: PRESCRIT.texte,
        minHeight: '100vh',
        padding: '40px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* ---------------------------------------------------------- */}
        <div
          style={{
            border: `2px solid ${PRESCRIT.accentSombre}`,
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 34,
            background: `${PRESCRIT.accent}14`,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--pilot-mono), ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: PRESCRIT.accentSombre,
              margin: '0 0 8px',
              fontWeight: 600,
            }}
          >
            Pilote · non autorité · aucune migration effectuée
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: PRESCRIT.texteClair }}>
            Cette page compare le rendu actuel d&apos;EMOPET à{' '}
            <strong>BRAND-AUTHORITY-001</strong> (25 août 2026). Elle est hors navigation,
            n&apos;est importée par aucune autre page, et ne modifie aucun token global —
            le reste du site est strictement inchangé. Elle existe pour qu&apos;une décision
            de bascule se prenne sur pièce plutôt que sur description.
          </p>
        </div>

        <h1
          style={{
            fontFamily: 'var(--pilot-display), Georgia, serif',
            fontSize: 40,
            lineHeight: 1.12,
            fontWeight: 600,
            margin: '0 0 14px',
          }}
        >
          Pilote marque
        </h1>
        <p style={{ ...chapeau, fontSize: 16, marginBottom: 46 }}>
          Trois sections : ce que le site rend réellement aujourd&apos;hui, ce que
          l&apos;autorité prescrit, et une composition réelle rendue dans les deux systèmes.
        </p>

        {/* ---------------------------------------------------------- */}
        <section style={section}>
          <h2 style={h2}>1. Constat — aucune police de marque n&apos;est livrée</h2>
          <p style={chapeau}>
            <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>tokens.css</code>{' '}
            déclare <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>--emopet-font-sora: &apos;Sora&apos;</code>,
            mais le dépôt ne contient <strong>aucun</strong>{' '}
            <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>next/font</code>,{' '}
            <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>@font-face</code>,
            lien Google Fonts, fichier <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>.woff2</code>{' '}
            ni dépendance de police. Sora n&apos;est donc jamais téléchargée. Sauf si un
            visiteur l&apos;a installée sur son système — ce qui est rare — chaque page rend
            dans le fallback système.
          </p>
          <p style={chapeau}>
            <strong>Conséquence :</strong> le site n&apos;expédie ni Fraunces, ni Instrument
            Sans, ni Sora. Ce que voient les visiteurs est la police par défaut de leur
            système d&apos;exploitation. La typographie de marque, actuelle comme
            superseded, n&apos;est pas en production.
          </p>
          <div style={colonne}>
            <div style={{ border: `1px solid ${PRESCRIT.pierre}`, borderRadius: 10, padding: 20, background: '#fff' }}>
              <p style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PRESCRIT.attenue, margin: '0 0 12px' }}>
                Ce que vous voyez aujourd&apos;hui
              </p>
              <p style={{ fontFamily: SYSTEME_FALLBACK, fontSize: 26, lineHeight: 1.25, margin: '0 0 8px', fontWeight: 600 }}>
                Observer sans conclure
              </p>
              <p style={{ fontFamily: SYSTEME_FALLBACK, fontSize: 14.5, lineHeight: 1.6, margin: 0, color: PRESCRIT.texteClair }}>
                Rendu dans la police système du visiteur. Le nom « Sora » est déclaré mais
                la fonte n&apos;est jamais chargée.
              </p>
            </div>
            <div style={{ border: `1px solid ${PRESCRIT.accent}`, borderRadius: 10, padding: 20, background: '#fff' }}>
              <p style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PRESCRIT.accentSombre, margin: '0 0 12px' }}>
                Prescrit — Fraunces + Instrument Sans
              </p>
              <p style={{ fontFamily: 'var(--pilot-display), Georgia, serif', fontSize: 26, lineHeight: 1.25, margin: '0 0 8px', fontWeight: 600 }}>
                Observer sans conclure
              </p>
              <p style={{ fontFamily: 'var(--pilot-body), sans-serif', fontSize: 14.5, lineHeight: 1.6, margin: 0, color: PRESCRIT.texteClair }}>
                Fraunces en display, Instrument Sans en corps, auto-hébergées au build.
                Aucune requête navigateur vers un tiers.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section style={section}>
          <h2 style={h2}>2. Palette — les noms actuels portent les valeurs superseded</h2>
          <p style={chapeau}>
            <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>tokens.css</code>{' '}
            a conservé le vocabulaire de la charte actuelle en lui donnant les valeurs
            navy / orange / teal. Un <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>grep lichen</code>{' '}
            renvoie du teal. Les deux colonnes ci-dessous portent les <em>mêmes noms</em>.
          </p>
          <div style={colonne}>
            <div style={{ border: `1px solid ${PRESCRIT.pierre}`, borderRadius: 10, padding: 20, background: '#fff' }}>
              <p style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PRESCRIT.attenue, margin: '0 0 14px' }}>
                Rendu aujourd&apos;hui
              </p>
              <Pastille nom="Fond (« cream »)" hex={ACTUEL.fond} />
              <Pastille nom="Texte (« granit »)" hex={ACTUEL.texte} />
              <Pastille nom="Accent (« terracotta »)" hex={ACTUEL.accent} />
              <Pastille nom="Secondaire (« lichen »)" hex={ACTUEL.second} />
              <Pastille nom="Atténué" hex={ACTUEL.attenue} />
            </div>
            <div style={{ border: `1px solid ${PRESCRIT.accent}`, borderRadius: 10, padding: 20, background: '#fff' }}>
              <p style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PRESCRIT.accentSombre, margin: '0 0 14px' }}>
                BRAND-AUTHORITY-001 §3.2
              </p>
              <Pastille nom="Sable" hex={PRESCRIT.fond} />
              <Pastille nom="Granit" hex={PRESCRIT.texte} />
              <Pastille nom="Terre cuite" hex={PRESCRIT.accent} />
              <Pastille nom="Lichen" hex={PRESCRIT.second} />
              <Pastille nom="Ardoise" hex={PRESCRIT.attenue} />
              <Pastille nom="Pierre" hex={PRESCRIT.pierre} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section style={section}>
          <h2 style={h2}>3. États de fiabilité</h2>
          <p style={chapeau}>
            Prescrits séparément de la palette. L&apos;autorité §3.2 impose une limite
            explicite : <em>« ces couleurs ne doivent jamais être utilisées pour laisser
            croire à un PASS technique, une validation, une mise en production ou une
            conclusion scientifique »</em>. Elles qualifient l&apos;état d&apos;une
            observation, rien d&apos;autre.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {FIABILITE.map((f) => (
              <Pastille key={f.etat} nom={f.etat} hex={f.hex} />
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section style={section}>
          <h2 style={h2}>4. Une composition réelle, rendue deux fois</h2>
          <p style={chapeau}>
            Même contenu, même structure, seuls la typographie et la palette changent.
            Le texte respecte la doctrine Care — observation, fenêtre, référence propre au
            chien, provenance, limite — et ne sert ici qu&apos;à juger la forme sur une
            surface réaliste plutôt que sur des pastilles.
          </p>
          <div style={colonne}>
            <Specimen
              variante="Rendu actuel · police système · navy / orange / teal"
              familleTitre={SYSTEME_FALLBACK}
              familleCorps={SYSTEME_FALLBACK}
              familleMono="ui-monospace, monospace"
              couleurs={ACTUEL}
            />
            <Specimen
              variante="BRAND-AUTHORITY-001 · Fraunces / Instrument Sans / JetBrains Mono"
              familleTitre="var(--pilot-display), Georgia, serif"
              familleCorps="var(--pilot-body), sans-serif"
              familleMono="var(--pilot-mono), ui-monospace, monospace"
              couleurs={{
                fond: PRESCRIT.fond,
                texte: PRESCRIT.texte,
                accent: PRESCRIT.accentSombre,
                second: PRESCRIT.secondSombre,
                attenue: PRESCRIT.attenue,
              }}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        <section style={{ ...section, marginBottom: 0 }}>
          <h2 style={h2}>Ce que ce pilote ne décide pas</h2>
          <ul style={{ ...chapeau, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              Il ne bascule rien. Aucun token global, aucune surface existante,
              aucune police chargée hors de cette route.
            </li>
            <li style={{ marginBottom: 8 }}>
              Il ne traite pas la marque figurative : le système de marque
              (aperture + wordmark) relève de §3.3 et n&apos;est pas abordé ici.
            </li>
            <li style={{ marginBottom: 8 }}>
              Il ne tranche pas la licence : Fraunces, Instrument Sans et JetBrains Mono
              sont sous SIL OFL 1.1, à verser à <strong>#114</strong> (IP-PROV-01) si la
              bascule est décidée.
            </li>
            <li>
              Il ne constitue pas la QA que <code style={{ fontFamily: 'var(--pilot-mono), monospace', fontSize: 13 }}>CLAUDE.md</code>{' '}
              exige — contraste, accessibilité, mode sombre et rendu mobile restent à
              mesurer avant toute décision.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
