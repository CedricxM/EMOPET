'use client';

/**
 * DÃ©tail d'un proxy ELI v6 (Sprint 03) : graphe historique + baseline + bande Â±2Ïƒ.
 * Graphe SVG maison (pas de Recharts â€” zÃ©ro dÃ©pendance ajoutÃ©e).
 */

import { Modal } from '@/lib/heroui-compat';
import { CONFIDENCE_META } from '../../lib/eli/catalog';
import type { Proxy } from '../../lib/eli/catalog';
import type { ProxyHistoryPoint } from '../../lib/eli/mock';

const W = 600;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

export function ProxyChartModal({
  proxy,
  history,
  baseline,
  onClose,
}: {
  proxy: Proxy | null;
  history: ProxyHistoryPoint[];
  baseline: { mean: number; std: number };
  onClose: () => void;
}) {
  const open = proxy !== null;
  if (!proxy) {
    return (
      <Modal isOpen={false} onOpenChange={() => onClose()}>
        <Modal.Backdrop><Modal.Container><Modal.Dialog /></Modal.Container></Modal.Backdrop>
      </Modal>
    );
  }

  const values = history.map((h) => h.value);
  const bandLo = baseline.mean - 2 * baseline.std;
  const bandHi = baseline.mean + 2 * baseline.std;
  const lo = Math.min(...values, bandLo);
  const hi = Math.max(...values, bandHi);
  const range = Math.max(1e-6, hi - lo);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xOf = (i: number) => PAD.left + (history.length <= 1 ? 0 : (i / (history.length - 1)) * plotW);
  const yOf = (v: number) => PAD.top + (1 - (v - lo) / range) * plotH;

  const linePts = history.map((h, i) => `${xOf(i).toFixed(1)},${yOf(h.value).toFixed(1)}`).join(' ');

  return (
    <Modal isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--terracotta-700)' }}>
                  âŠ™ {proxy.id} Â· {proxy.unit}
                </span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--fg-strong)', margin: 0 }}>
                  {proxy.label}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)', lineHeight: 1.6 }}>
                  {proxy.description}
                </p>

                <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Historique de ${proxy.label}`} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {/* Bande Â±2Ïƒ baseline */}
                  <rect x={PAD.left} y={yOf(bandHi)} width={plotW} height={Math.max(0, yOf(bandLo) - yOf(bandHi))} fill="var(--cream-300)" opacity={0.4} />
                  {/* Ligne baseline */}
                  <line x1={PAD.left} y1={yOf(baseline.mean)} x2={W - PAD.right} y2={yOf(baseline.mean)} stroke="var(--granit-500)" strokeWidth="1" strokeDasharray="4 3" />
                  <text x={W - PAD.right} y={yOf(baseline.mean) - 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--granit-500)">baseline {baseline.mean}</text>
                  {/* Axe Y min/max */}
                  <text x={PAD.left - 6} y={yOf(hi) + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">{hi.toFixed(1)}</text>
                  <text x={PAD.left - 6} y={yOf(lo) + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">{lo.toFixed(1)}</text>
                  {/* Courbe */}
                  <polyline points={linePts} fill="none" stroke="var(--terracotta-500)" strokeWidth="2" strokeLinejoin="round" />
                  {/* Points colorÃ©s par confiance */}
                  {history.map((h, i) => (
                    <circle key={h.date} cx={xOf(i)} cy={yOf(h.value)} r={2.6} fill={CONFIDENCE_META[h.confidenceState].color}>
                      <title>{`${h.date} Â· ${h.value} (${CONFIDENCE_META[h.confidenceState].label})`}</title>
                    </circle>
                  ))}
                  {/* Axe X premiÃ¨res/derniÃ¨res dates */}
                  <text x={PAD.left} y={H - 8} fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">{history[0]?.date.slice(5)}</text>
                  <text x={W - PAD.right} y={H - 8} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">{history[history.length - 1]?.date.slice(5)}</text>
                </svg>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
                  <span><strong style={{ color: 'var(--fg-strong)' }}>Baseline</strong> : {baseline.mean} Â± {baseline.std} ({proxy.unit})</span>
                  <span><strong style={{ color: 'var(--fg-strong)' }}>Capteurs</strong> : MAT Â· TAG</span>
                </div>

                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                  RÃ©fÃ©rence : {proxy.reference}
                </p>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

