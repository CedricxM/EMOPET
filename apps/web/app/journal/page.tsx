'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContentShell } from '../../components/content-shell';
import { EntryCard, ExportCardModal, JournalEditor } from '../../components/journal';
import { Button, Card, Eyebrow, H1, Icon, Lead, P2 } from '../../components/ui';
import {
  DOG,
  INITIAL_ENTRIES,
  JOURNAL_OWNER_HEADER,
  availableMonths,
  getJournalOwnerToken,
  groupByDay,
  monthKey,
  monthSummary,
} from '../../lib/journal';
import type { JournalEntry } from '../../lib/journal';
import { detectMilestones, milestoneToEntry } from '../../lib/milestones';
import { useI18n } from '../../lib/i18n';
import type { Locale } from '../../lib/i18n';
import styles from '../../styles/living-pages.module.css';

const STORAGE_ENTRIES = 'breiz-journal-user-entries';

function intlLocale(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

function formatDayHeaderLocale(dayKey: string, locale: Locale): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatMonthLabelLocale(key: string, locale: Locale): string {
  const [yearRaw, monthRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  return new Date(Number.isFinite(year) ? year : 1970, (Number.isFinite(month) ? month : 1) - 1, 1).toLocaleDateString(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
  });
}

export default function JournalPage() {
  const { locale, t } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>(INITIAL_ENTRIES);
  const [month, setMonth] = useState<string>(() => monthKey(INITIAL_ENTRIES[0]!.occurredAt));
  const [editorOpen, setEditorOpen] = useState(false);
  const [exportEntry, setExportEntry] = useState<JournalEntry | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Hydratation : baseline local (offline) puis serveur autoritaire (R3).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ENTRIES);
      if (raw) {
        const userEntries = JSON.parse(raw) as JournalEntry[];
        setEntries((prev) => [...userEntries.filter((u) => !prev.some((p) => p.id === u.id)), ...prev]);
      }
    } catch {
      /* localStorage indisponible */
    }
    (async () => {
      try {
        const ownerToken = getJournalOwnerToken();
        const res = await fetch('/api/journal', {
          headers: ownerToken ? { [JOURNAL_OWNER_HEADER]: ownerToken } : undefined,
        });
        if (res.ok) {
          const data = (await res.json()) as { entries: JournalEntry[] };
          if (data.entries?.length) {
            setEntries(data.entries);
            setMonth(monthKey(data.entries[0]!.occurredAt));
          }
        }
      } catch {
        /* hors-ligne â†’ on conserve le baseline local */
      }
    })();
  }, []);

  const months = useMemo(() => availableMonths(entries), [entries]);
  const monthEntries = useMemo(() => entries.filter((e) => monthKey(e.occurredAt) === month), [entries, month]);
  const summary = useMemo(() => monthSummary(monthEntries), [monthEntries]);
  const byDay = useMemo(() => groupByDay(monthEntries), [monthEntries]);

  const monthIndex = months.indexOf(month);
  const olderMonth = monthIndex >= 0 && monthIndex < months.length - 1 ? months[monthIndex + 1] : null;
  const newerMonth = monthIndex > 0 ? months[monthIndex - 1] : null;

  function persistUserEntries(all: JournalEntry[]) {
    try {
      const userEntries = all.filter((e) => e.id.startsWith('user-') || e.id.startsWith('milestone-'));
      localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(userEntries));
    } catch {
      /* quota / indisponible â€” on ignore */
    }
  }

  function handleCreate(entry: JournalEntry) {
    // Jalons Ã©ventuels (sujet : le propriÃ©taire).
    const candidates = detectMilestones([entry, ...entries]);
    const milestoneEntries = candidates.map((c) => milestoneToEntry(c));
    const created = [...milestoneEntries, entry];

    setEntries((prev) => {
      const next = [...created, ...prev];
      persistUserEntries(next); // repli local (offline)
      return next;
    });
    setFlash(candidates.length > 0 ? `${t('journal', 'milestoneUnlocked')} ${candidates[0]!.title}` : t('journal', 'entryAdded'));
    setTimeout(() => setFlash(null), candidates.length > 0 ? 4500 : 3000);
    setMonth(monthKey(entry.occurredAt));

    // R3 : persistance serveur (best-effort ; le serveur prime au prochain chargement).
    void Promise.all(
      created.map((e) =>
        fetch('/api/journal', {
          method: 'POST',
          headers: { 'content-type': 'application/json', [JOURNAL_OWNER_HEADER]: getJournalOwnerToken() },
          body: JSON.stringify(e),
        }).catch(() => undefined),
      ),
    );
  }

  return (
    <ContentShell>
      <div className={styles.pageFlow}>
        <header className={styles.livingHero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Eyebrow>{t('journal', 'eyebrow')}</Eyebrow>
              <H1>{t('journal', 'titlePrefix')} {DOG.name}</H1>
              <Lead>{t('journal', 'lead')}</Lead>
              <span className={styles.dogCue}>Carnet de lieux, sorties et observations declarees</span>
            </div>
            <Button kind="primary" leading={<Icon name="plus" size={14} color="white" />} onClick={() => setEditorOpen(true)}>
              {t('journal', 'addEntry')}
            </Button>
          </div>
        </header>

        {flash && (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-soft-border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--accent-press)',
            }}
          >
            {flash}
          </div>
        )}

        {/* Navigation mensuelle + rÃ©sumÃ© */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              disabled={!olderMonth}
              onClick={() => olderMonth && setMonth(olderMonth)}
              aria-label={t('journal', 'previousMonth')}
              style={navBtn(!!olderMonth)}
            >
              <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}><Icon name="chevron" size={18} /></span>
            </button>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-xl)', color: 'var(--fg-strong)' }}>
              {formatMonthLabelLocale(month, locale)}
            </span>
            <button
              type="button"
              disabled={!newerMonth}
              onClick={() => newerMonth && setMonth(newerMonth)}
              aria-label={t('journal', 'nextMonth')}
              style={navBtn(!!newerMonth)}
            >
              <Icon name="chevron" size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <SummaryStat label={t('journal', 'entries')} value={summary.totalEntries} />
            <SummaryStat label={t('journal', 'walks')} value={summary.walksCount} />
            <SummaryStat label={t('journal', 'photos')} value={summary.photosCount} />
            <SummaryStat label={t('journal', 'milestones')} value={summary.milestonesCount} />
          </div>
        </div>


        <div className={styles.memoryNote}>
          <P2>Les entrees gardent le ton carnet : moments notes, sorties, lieux et fenetres observees restent separes des interpretations.</P2>
        </div>
        {/* Timeline */}
        {byDay.length === 0 ? (
          <Card tone="sunk">
            <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span aria-hidden style={{ fontSize: 32, color: 'var(--terracotta-400)' }}>âŠ™</span>
              <P2>{t('journal', 'empty')}</P2>
            </div>
          </Card>
        ) : (
          <div className={styles.carnetList}>
            {byDay.map(([day, dayEntries]) => (
              <section key={day} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    margin: 0,
                    padding: '8px 0',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {formatDayHeaderLocale(day, locale)}
                </h2>
                {dayEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} onExport={setExportEntry} />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <JournalEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} onCreate={handleCreate} />
      )}
      {exportEntry && <ExportCardModal entry={exportEntry} onClose={() => setExportEntry(null)} />}
    </ContentShell>
  );
}

function navBtn(enabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: enabled ? 'var(--fg-strong)' : 'var(--fg-hint)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
  };
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        minWidth: 84,
      }}
    >
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--fg-strong)' }}>{value}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
        {label}
      </span>
    </div>
  );
}

