'use client';

/**
 * Export "carte postale" d'une entrÃ©e du carnet (Sprint 02, US4).
 *
 * GÃ©nÃ©ration 100 % client via <canvas> â€” pas de backend. Deux formats :
 * Story (1080Ã—1920) et CarrÃ© (1080Ã—1080). Le rendu est tÃ©lÃ©chargeable.
 */

import { Modal } from '@/lib/heroui-compat';
import { useEffect, useRef, useState } from 'react';
import { DOG, formatDateLong } from '../../lib/journal';
import type { JournalEntry } from '../../lib/journal';

type Format = 'story' | 'square';
const DIMS: Record<Format, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

function entryTitle(entry: JournalEntry): string {
  if ('title' in entry && entry.title) return entry.title;
  switch (entry.type) {
    case 'observation': return 'Observation';
    case 'walk_recorded': return 'Balade';
    case 'milestone': return 'Jalon';
    default: return 'Souvenir';
  }
}

function entryBody(entry: JournalEntry): string {
  if ('content' in entry && entry.content) return entry.content;
  return '';
}

function entryPhoto(entry: JournalEntry): string | null {
  if ((entry.type === 'photo_text' || entry.type === 'walk_recorded') && entry.photoUrls[0]) return entry.photoUrls[0];
  return null;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function draw(canvas: HTMLCanvasElement, entry: JournalEntry, format: Format) {
  const { w, h } = DIMS[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fond sable
  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(0, 0, w, h);

  const margin = 90;
  const photo = entryPhoto(entry);
  let y = margin;

  // Photo (si prÃ©sente)
  if (photo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ph = format === 'story' ? 1000 : 560;
        const ratio = Math.max((w - margin * 2) / img.width, ph / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        ctx.save();
        ctx.beginPath();
        ctx.rect(margin, y, w - margin * 2, ph);
        ctx.clip();
        ctx.drawImage(img, margin + (w - margin * 2 - dw) / 2, y + (ph - dh) / 2, dw, dh);
        ctx.restore();
        y += ph + 60;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = photo;
    });
  } else {
    // Bandeau aperture
    const bh = format === 'story' ? 520 : 300;
    const grad = ctx.createLinearGradient(margin, y, w - margin, y + bh);
    grad.addColorStop(0, '#ECE5D7');
    grad.addColorStop(1, '#DDD4C2');
    ctx.fillStyle = grad;
    ctx.fillRect(margin, y, w - margin * 2, bh);
    ctx.fillStyle = '#FE502D';
    ctx.font = '160px serif';
    ctx.textAlign = 'center';
    ctx.fillText('âŠ™', w / 2, y + bh / 2 + 55);
    ctx.textAlign = 'left';
    y += bh + 60;
  }

  // Kicker
  ctx.fillStyle = '#C2350F';
  ctx.font = '28px monospace';
  ctx.fillText(`âŠ™ ${DOG.name.toUpperCase()} Â· ${formatDateLong(entry.occurredAt).toUpperCase()}`, margin, y);
  y += 70;

  // Titre marque (Sora dans l'UI, fallback canvas lisible).
  ctx.fillStyle = '#14123A';
  ctx.font = 'italic 72px Georgia, serif';
  for (const line of wrapText(ctx, entryTitle(entry), w - margin * 2)) {
    ctx.fillText(line, margin, y);
    y += 84;
  }
  y += 24;

  // Corps
  ctx.fillStyle = '#4A4796';
  ctx.font = '40px sans-serif';
  for (const line of wrapText(ctx, entryBody(entry), w - margin * 2).slice(0, format === 'story' ? 10 : 4)) {
    ctx.fillText(line, margin, y);
    y += 56;
  }

  // Footer
  ctx.fillStyle = '#6B6F76';
  ctx.font = '26px monospace';
  ctx.fillText('EMOPET Â· Breiz', margin, h - margin);
}

export function ExportCardModal({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<Format>('story');

  useEffect(() => {
    if (entry && canvasRef.current) void draw(canvasRef.current, entry, format);
  }, [entry, format]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carnet-${DOG.name.toLowerCase()}-${entry?.occurredAt.slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <Modal isOpen={entry !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--fg-strong)', margin: 0 }}>
                Carte postale
              </Modal.Heading>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['story', 'square'] as Format[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        border: `1px solid ${format === f ? 'var(--border-strong)' : 'var(--border)'}`,
                        background: format === f ? 'var(--surface)' : 'transparent',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: format === f ? 'var(--fg-strong)' : 'var(--fg-2)',
                        cursor: 'pointer',
                      }}
                    >
                      {f === 'story' ? 'Story 9:16' : 'CarrÃ© 1:1'}
                    </button>
                  ))}
                </div>
                <canvas
                  ref={canvasRef}
                  aria-label="AperÃ§u de la carte postale"
                  style={{ width: format === 'story' ? 200 : 280, height: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={download}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--terracotta-500)',
                  color: 'white',
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                TÃ©lÃ©charger le PNG
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

