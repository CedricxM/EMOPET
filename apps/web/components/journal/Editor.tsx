'use client';

/**
 * Ã‰diteur de nouvelle entrÃ©e du carnet (Sprint 02).
 * Wizard 2 Ã©tapes : choix du type â†’ contenu. Types couverts :
 * souvenir photo+texte, observation courte, balade (saisie manuelle), visite vÃ©to.
 *
 * Frontend-first : pas d'upload S3, les photos sont lues en data URL cÃ´tÃ© client.
 */

import { Modal } from '@/lib/heroui-compat';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { ActivityTag, EntryType, JournalEntry } from '../../lib/journal';
import { ACTIVITY_LABELS } from '../../lib/journal';
import { fetchCurrentWeather } from '../../lib/weather';

const FIELD: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--fg-strong)',
};

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

const PRIMARY_BTN: CSSProperties = {
  padding: '12px 24px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--terracotta-500)',
  color: 'white',
  border: 'none',
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const TYPE_CHOICES: Array<{ type: Exclude<EntryType, 'milestone'>; label: string; hint: string }> = [
  { type: 'photo_text', label: 'Souvenir', hint: 'Photo + texte libre' },
  { type: 'observation', label: 'Observation', hint: 'Note courte (280 car.)' },
  { type: 'walk_recorded', label: 'Balade', hint: 'DurÃ©e, distance' },
  { type: 'vet_visit', label: 'Visite vÃ©tÃ©rinaire', hint: 'Type, note (non mÃ©dicale)' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LABEL}>{label}</span>
      {children}
    </label>
  );
}

export function JournalEditor({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (entry: JournalEntry) => void;
}) {
  const [type, setType] = useState<Exclude<EntryType, 'milestone'> | null>(null);

  // Champs partagÃ©s / spÃ©cifiques
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activityTag, setActivityTag] = useState<ActivityTag>('balade');
  const [locationName, setLocationName] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [visitType, setVisitType] = useState<'annual' | 'vaccine' | 'control' | 'other'>('annual');
  const [vetName, setVetName] = useState('');
  const [weather, setWeather] = useState<{ tempC: number; conditions: string } | null>(null);

  // Capture mÃ©tÃ©o rÃ©elle (Open-Meteo, Lorient) Ã  l'ouverture d'une balade.
  useEffect(() => {
    if (type !== 'walk_recorded' || weather) return;
    let cancelled = false;
    fetchCurrentWeather(47.7482, -3.3702).then((w) => {
      if (!cancelled && w) setWeather({ tempC: w.tempC, conditions: w.label });
    });
    return () => { cancelled = true; };
  }, [type, weather]);

  function reset() {
    setType(null);
    setTitle('');
    setContent('');
    setActivityTag('balade');
    setLocationName('');
    setPhotoUrls([]);
    setDurationMin('');
    setDistanceKm('');
    setVisitType('annual');
    setVetName('');
    setWeather(null);
  }

  function close() {
    reset();
    onClose();
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    const slots = 4 - photoUrls.length;
    Array.from(files).slice(0, slots).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPhotoUrls((prev) => (prev.length >= 4 ? prev : [...prev, reader.result as string]));
      reader.readAsDataURL(file);
    });
  }

  function canSave(): boolean {
    if (!type) return false;
    if (type === 'observation') return content.trim().length >= 1 && content.trim().length <= 280;
    if (type === 'photo_text') return content.trim().length >= 1;
    if (type === 'walk_recorded') return Number(durationMin) > 0 && Number(distanceKm) > 0;
    if (type === 'vet_visit') return true;
    return false;
  }

  function save() {
    if (!type || !canSave()) return;
    const occurredAt = new Date().toISOString();
    const base = { id: `user-${Date.now()}`, occurredAt };
    let entry: JournalEntry;
    switch (type) {
      case 'photo_text':
        entry = { ...base, type, title: title.trim() || undefined, content: content.trim(), photoUrls, activityTag, locationName: locationName.trim() || undefined };
        break;
      case 'observation':
        entry = { ...base, type, content: content.trim() };
        break;
      case 'walk_recorded':
        entry = { ...base, type, title: title.trim() || undefined, durationSeconds: Math.round(Number(durationMin) * 60), distanceMeters: Math.round(Number(distanceKm) * 1000), photoUrls, locationName: locationName.trim() || undefined, content: content.trim() || undefined, weather: weather ?? undefined };
        break;
      case 'vet_visit':
        entry = { ...base, type, title: title.trim() || undefined, visitType, vetName: vetName.trim() || undefined, content: content.trim() || undefined };
        break;
    }
    onCreate(entry);
    close();
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ ...LABEL, color: 'var(--terracotta-700)' }}>âŠ™ Carnet</span>
                <Modal.Heading style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--fg-strong)', margin: 0 }}>
                  {type ? 'Nouvelle entrÃ©e' : 'Que voulez-vous ajouter ?'}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="Fermer" />
            </Modal.Header>
            <Modal.Body>
              {!type ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {TYPE_CHOICES.map((c) => (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => setType(c.type)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: 16,
                        textAlign: 'left',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--fg-strong)' }}>{c.label}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>{c.hint}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(type === 'photo_text' || type === 'walk_recorded' || type === 'vet_visit') && (
                    <Field label="Titre (optionnel)">
                      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} style={FIELD} placeholder="Ex : Balade au Cap" />
                    </Field>
                  )}

                  {type === 'photo_text' && (
                    <>
                      <Field label="Photos (4 max)">
                        <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ ...FIELD, padding: 8 }} />
                      </Field>
                      {photoUrls.length > 0 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {photoUrls.map((u, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={u} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                          ))}
                        </div>
                      )}
                      <Field label="Texte">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} rows={3} style={{ ...FIELD, resize: 'vertical' }} placeholder="Ce que vous avez observÃ©â€¦" />
                      </Field>
                      <Field label="ActivitÃ©">
                        <select value={activityTag} onChange={(e) => setActivityTag(e.target.value as ActivityTag)} style={FIELD}>
                          {(Object.keys(ACTIVITY_LABELS) as ActivityTag[]).map((t) => (
                            <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Lieu (optionnel)">
                        <input value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={200} style={FIELD} />
                      </Field>
                    </>
                  )}

                  {type === 'observation' && (
                    <Field label={`Observation (${content.length}/280)`}>
                      <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 280))} rows={3} style={{ ...FIELD, resize: 'vertical' }} placeholder="Une note courte sur ce que vous avez remarquÃ©â€¦" />
                    </Field>
                  )}

                  {type === 'walk_recorded' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="DurÃ©e (min)">
                          <input type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} style={FIELD} />
                        </Field>
                        <Field label="Distance (km)">
                          <input type="number" min={0} step={0.1} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} style={FIELD} />
                        </Field>
                      </div>
                      {weather && (
                        <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-2-soft)', color: 'var(--lichen-700)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                          âŠ™ MÃ©tÃ©o capturÃ©e : {weather.tempC}Â° Â· {weather.conditions}
                        </span>
                      )}
                      <Field label="Lieu (optionnel)">
                        <input value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={200} style={FIELD} />
                      </Field>
                      <Field label="Note (optionnelle)">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={500} rows={2} style={{ ...FIELD, resize: 'vertical' }} />
                      </Field>
                    </>
                  )}

                  {type === 'vet_visit' && (
                    <>
                      <Field label="Type de visite">
                        <select value={visitType} onChange={(e) => setVisitType(e.target.value as typeof visitType)} style={FIELD}>
                          <option value="annual">Visite annuelle</option>
                          <option value="vaccine">Vaccin</option>
                          <option value="control">ContrÃ´le</option>
                          <option value="other">Autre</option>
                        </select>
                      </Field>
                      <Field label="VÃ©tÃ©rinaire (optionnel)">
                        <input value={vetName} onChange={(e) => setVetName(e.target.value)} maxLength={120} style={FIELD} />
                      </Field>
                      <Field label="Note (non mÃ©dicale, optionnelle)">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={500} rows={2} style={{ ...FIELD, resize: 'vertical' }} placeholder="Ex : rappels Ã  jour, prochaine visite programmÃ©eâ€¦" />
                      </Field>
                    </>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              {type ? (
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button type="button" onClick={() => setType(null)} style={{ ...PRIMARY_BTN, background: 'transparent', color: 'var(--fg-strong)', border: '1.5px solid var(--cream-400)' }}>
                    Retour
                  </button>
                  <button type="button" onClick={save} disabled={!canSave()} style={{ ...PRIMARY_BTN, flex: 1, opacity: canSave() ? 1 : 0.5, cursor: canSave() ? 'pointer' : 'not-allowed' }}>
                    Enregistrer dans le carnet
                  </button>
                </div>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

