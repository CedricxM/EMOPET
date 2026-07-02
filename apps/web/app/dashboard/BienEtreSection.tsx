'use client';

import { useMemo, useState } from 'react';
import { AddContextDialog, ConfidenceBadge, DeltaText, Gauge, ProxyChartModal, ScientificFooter, Sparkline } from '../../components/eli';
import type { DeclaredContext } from '../../components/eli';
import { Card, Eyebrow, H2, Icon, Lead, P2 } from '../../components/ui';
import { DOG } from '../../lib/journal';
import {
  FAMILIES,
  GATE_META,
  RSI_ALERT_THRESHOLD,
  RSI_STABLE_THRESHOLD,
  TIER_META,
  VETOES,
  driftMessage,
  indicatorStateMessage,
  proxiesOf,
} from '../../lib/eli/catalog';
import type { FamilyId, IndicatorState, Proxy } from '../../lib/eli/catalog';
import { freezeBaseline, generateSnapshots, proxyHistory, summarize } from '../../lib/eli/mock';
import { useI18n } from '../../lib/i18n';

const PERIODS = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
] as const;

const STATE_INK: Record<IndicatorState, string> = {
  stable: 'var(--fg-2)',
  amelioration: 'var(--lichen-700)',
  attention: 'var(--orange-pro)',
};

function Bar({ pct, color = 'var(--terracotta-500)' }: { pct: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 7, borderRadius: 999, background: 'var(--cream-300)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  );
}

export function BienEtreSection() {
  const { t } = useI18n();
  const snapshots = useMemo(() => generateSnapshots(), []);
  const baseline = useMemo(() => freezeBaseline(snapshots), [snapshots]);

  const [periodDays, setPeriodDays] = useState<number>(7);
  const [expandedFamily, setExpandedFamily] = useState<FamilyId | null>(null);
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [declared, setDeclared] = useState<DeclaredContext[]>([]);

  const summary = useMemo(() => summarize(snapshots, baseline, periodDays), [snapshots, baseline, periodDays]);
  const proxyHist = useMemo(
    () => (selectedProxy ? proxyHistory(snapshots, selectedProxy.id, periodDays) : []),
    [snapshots, selectedProxy, periodDays],
  );

  const rsiState = summary.rsi.current >= RSI_STABLE_THRESHOLD ? 'Routine stable' : summary.rsi.current < RSI_ALERT_THRESHOLD ? 'Routine nettement perturbée' : 'Léger écart de routine';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">{t('bienEtre', 'eyebrow')}</Eyebrow>
          <H2>{t('bienEtre', 'title')} — {DOG.name}</H2>
          <Lead>{t('bienEtre', 'lead')}</Lead>
        </header>

        {/* Sélecteur de période */}
        <div style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--bg-sunk)', borderRadius: 'var(--radius-pill)', width: 'fit-content' }}>
          {PERIODS.map((p) => {
            const active = periodDays === p.days;
            return (
              <button key={p.days} onClick={() => setPeriodDays(p.days)} aria-pressed={active} style={{ padding: '8px 18px', borderRadius: 'var(--radius-pill)', background: active ? 'var(--surface)' : 'transparent', border: `1px solid ${active ? 'var(--border)' : 'transparent'}`, boxShadow: active ? 'var(--shadow-xs)' : 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', color: active ? 'var(--fg-strong)' : 'var(--fg-2)', cursor: 'pointer' }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Indicateur de bien-être global (PAS le WQI) + gating de publication */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                Indice de bien-être (ELI)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: GATE_META[summary.gate].color }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: GATE_META[summary.gate].color }} /> {GATE_META[summary.gate].label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Gauge value={summary.wellbeing.current} baseline={summary.wellbeing.baselineMean} color="var(--terracotta-500)" label="Bien-être" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <DeltaText delta={summary.wellbeing.delta} />
                <P2 style={{ color: STATE_INK[summary.wellbeing.state], fontStyle: 'italic' }}>{indicatorStateMessage(summary.wellbeing.state)}</P2>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>baseline {summary.wellbeing.baselineMean.toFixed(0)} · composite des 4 familles</span>
              </div>
            </div>
          </div>
        </Card>

        {/* WQI (Walk Quality) + RSI (Routine Stability) — définitions fidèles au modèle */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Qualité de balade · WQI</span>
                <ConfidenceBadge state={summary.wqi.confidenceState} size="sm" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', color: 'var(--fg-strong)' }}>{summary.wqi.current.toFixed(0)}</span>
                <DeltaText delta={summary.wqi.delta} />
              </div>
              {[
                { label: 'Exercice', v: summary.wqi.exercise },
                { label: 'Exploration', v: summary.wqi.exploration },
                { label: 'Social', v: summary.wqi.social },
              ].map((d) => (
                <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-2)' }}>
                    <span>{d.label}</span><span>{d.v}</span>
                  </div>
                  <Bar pct={d.v} color="var(--lichen-500)" />
                </div>
              ))}
              <P2 style={{ color: 'var(--fg-muted)' }}>Exercice 40 % · exploration 35 % · social 25 % (ELI v6 §7).</P2>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Stabilité de routine · RSI</span>
                <ConfidenceBadge state={summary.rsi.confidenceState} size="sm" />
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <Gauge value={summary.rsi.current} baseline={summary.rsi.baselineMean} color="var(--lichen-600)" label="RSI" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <DeltaText delta={summary.rsi.delta} />
                  <P2 style={{ color: summary.rsi.current < RSI_ALERT_THRESHOLD ? 'var(--orange-pro)' : 'var(--fg-2)', fontStyle: 'italic' }}>{rsiState}</P2>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>similarité du jour vs moyenne 14 j</span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Dynamiques v6 : récupération + anticipation */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <Card tone="sunk" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Eyebrow>Retour au calme</Eyebrow>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--fg-strong)' }}>{summary.recovery.minutes} min</span>
              <P2>Temps moyen de retour à la baseline après une activation. Tendance {summary.recovery.trend4wPct >= 0 ? '+' : ''}{summary.recovery.trend4wPct} % sur 4 semaines.</P2>
            </div>
          </Card>
          <Card tone="sunk" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Eyebrow>Anticipation</Eyebrow>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--fg-strong)' }}>indice {summary.anticipation.index.toFixed(1)}</span>
              <P2>Activité avant les événements récurrents (départ, repas). {summary.anticipation.occurrences} occurrences détectées.</P2>
            </div>
          </Card>
        </section>

        {/* Contextes actifs */}
        {(summary.activeVetoes.length > 0 || declared.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 14px', background: 'var(--prudence-bg)', borderLeft: '6px solid var(--terracotta-500)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--prudence-ink)' }}>Contextes pris en compte</span>
            {summary.activeVetoes.map((vid) => {
              const v = VETOES.find((x) => x.id === vid);
              return v ? <ContextChip key={vid} label={v.label} /> : null;
            })}
            {declared.map((d, i) => <ContextChip key={`d${i}`} label={`${d.label} (déclaré)`} />)}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-lg)', color: 'var(--fg-2)' }}>Quatre familles d’indicateurs</span>
          <button type="button" onClick={() => setContextOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)', cursor: 'pointer' }}>
            <Icon name="plus" size={15} /> Déclarer un contexte
          </button>
        </div>

        {/* 4 familles */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FAMILIES.map((f) => {
            const fs = summary.families[f.id];
            const expanded = expandedFamily === f.id;
            return (
              <Card key={f.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button type="button" onClick={() => setExpandedFamily(expanded ? null : f.id)} aria-expanded={expanded} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>
                        <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: f.color }} /> {f.label}
                      </span>
                      <ConfidenceBadge state={fs.confidenceState} size="sm" />
                    </div>
                    <Sparkline data={fs.spark} color={f.color} width={220} height={40} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', color: 'var(--fg-strong)' }}>{fs.current.toFixed(0)}</span>
                      <DeltaText delta={fs.delta} />
                    </div>
                    <P2 style={{ color: STATE_INK[fs.state] }}>{indicatorStateMessage(fs.state)}</P2>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--terracotta-700)', fontWeight: 600 }}>{expanded ? '— Masquer les proxies' : '+ Voir les proxies'}</span>
                  </button>
                  {expanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                      {proxiesOf(f.id).map((p) => (
                        <button key={p.id} type="button" onClick={() => setSelectedProxy(p)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 4px', borderRadius: 6 }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{p.id}</span> · {p.label}
                          </span>
                          <Icon name="chevron" size={14} color="var(--fg-muted)" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </section>

        {/* Sous-baselines contextuelles (ELI v6 §4) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow>Sous-baselines contextuelles</Eyebrow>
          <P2 style={{ color: 'var(--fg-muted)' }}>Chaque signal est comparé au bon contexte, pas à une norme unique. Temps de retour au calme par contexte (v6).</P2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {summary.subBaselines.map((sb) => (
              <Card key={sb.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', color: 'var(--fg-strong)' }}>{sb.label}</span>
                    <ConfidenceBadge state={sb.confidence} size="sm" />
                  </div>
                  <P2 style={{ color: 'var(--fg-muted)' }}>{sb.description}</P2>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
                    <span>retour calme {sb.recoveryMin} min</span>
                    <span>{sb.sampleCount} obs.</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Baseline + qualité de fenêtre + dérive */}
        <Card tone="sunk" bordered={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Eyebrow>Baseline personnelle</Eyebrow>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: TIER_META[summary.tier].color }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: TIER_META[summary.tier].color }} /> Fenêtre {TIER_META[summary.tier].label}
              </span>
            </div>
            <P2>
              Baseline figée le <strong style={{ color: 'var(--fg-strong)' }}>{summary.baselineFrozenAt}</strong> après 14 jours d’usage.
              Couverture de données : <strong style={{ color: 'var(--fg-strong)' }}>{Math.round(summary.dataCoverage * 100)} %</strong> de jours valides.
            </P2>
            {summary.driftSignal.active && (
              <div style={{ padding: 12, background: 'var(--prudence-bg)', borderLeft: '6px solid var(--orange-pro)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--prudence-ink)' }}>
                {summary.driftSignal.message ?? driftMessage(DOG.name)}
              </div>
            )}
          </div>
        </Card>

        {/* Export */}
        <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-pill)', background: 'var(--terracotta-500)', color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          <Icon name="download" size={15} color="white" /> Exporter pour mon vétérinaire
        </button>

        <ScientificFooter />
      </div>

      {contextOpen && (
        <AddContextDialog isOpen={contextOpen} onClose={() => setContextOpen(false)} onDeclare={(c) => setDeclared((prev) => [...prev, c])} />
      )}
      {selectedProxy && (
        <ProxyChartModal proxy={selectedProxy} history={proxyHist} baseline={baseline.values[selectedProxy.id]!} onClose={() => setSelectedProxy(null)} />
      )}
    </>
  );
}

function ContextChip({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--surface)', border: '1px solid var(--accent-soft-border)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent-press)' }}>
      {label}
    </span>
  );
}
