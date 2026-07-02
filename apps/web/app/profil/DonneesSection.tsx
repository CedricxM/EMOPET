'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  Section01Overview,
  Section02Levels,
  Section03Categories,
  Section04Rights,
  Section05Consent,
} from '../../components/donnees/Sections';
import { CATEGORIES } from '../../components/donnees/data';
import type { CategoryId, LevelId } from '../../components/donnees/data';
import { exportData } from '../../components/donnees/export';
import { Eyebrow, H1, Lead } from '../../components/ui';
import { useI18n } from '../../lib/i18n';

/*
 * Modals lazy-loadés via next/dynamic.
 *
 * Chaque modal n'est téléchargé que lors de la première ouverture, ce
 * qui retire ~50 kB du First Load du /donnees pour les utilisateurs
 * qui ne vont qu'auditer leurs réglages sans cliquer sur les droits.
 *
 * ssr: false car ces composants utilisent des portails browser-only.
 */
const ViewDataModal = dynamic(
  () => import('../../components/donnees/modals').then((m) => m.ViewDataModal),
  { ssr: false },
);
const ExportModal = dynamic(
  () => import('../../components/donnees/modals').then((m) => m.ExportModal),
  { ssr: false },
);
const UsagesModal = dynamic(
  () => import('../../components/donnees/modals').then((m) => m.UsagesModal),
  { ssr: false },
);
const DeleteModal = dynamic(
  () => import('../../components/donnees/modals').then((m) => m.DeleteModal),
  { ssr: false },
);
const DeletedToastModal = dynamic(
  () => import('../../components/donnees/modals').then((m) => m.DeletedToastModal),
  { ssr: false },
);

type CategoryState = { on: boolean; level: LevelId };

function buildInitialCategoryState(): Record<CategoryId, CategoryState> {
  const out = {} as Record<CategoryId, CategoryState>;
  for (const c of CATEGORIES) {
    out[c.id] = { on: c.defaultOn, level: c.defaultLevel };
  }
  return out;
}

export function DonneesSection() {
  const { t } = useI18n();
  // === État de partage ===
  const [globalLevel, setGlobalLevel] = useState<LevelId>('prive');
  const [categoryState, setCategoryState] = useState<Record<CategoryId, CategoryState>>(
    () => buildInitialCategoryState(),
  );

  const activeCount = useMemo(
    () => Object.values(categoryState).filter((s) => s.on).length,
    [categoryState],
  );

  function toggleCategory(id: CategoryId, on: boolean) {
    setCategoryState((prev) => ({ ...prev, [id]: { ...prev[id], on } }));
  }
  function changeCategoryLevel(id: CategoryId, level: LevelId) {
    setCategoryState((prev) => ({ ...prev, [id]: { ...prev[id], level } }));
  }

  // === Modals ===
  const [viewDataFor, setViewDataFor] = useState<CategoryId | null>(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [usagesOpen, setUsagesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletedToastOpen, setDeletedToastOpen] = useState(false);

  const viewDataOpen = viewDataFor !== null || viewAllOpen;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Header */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">{t('donnees', 'eyebrow')}</Eyebrow>
          <H1>{t('donnees', 'title')}</H1>
          <Lead>{t('donnees', 'lead')}</Lead>
        </header>

        <Section01Overview globalLevel={globalLevel} activeCount={activeCount} />

        <Section02Levels value={globalLevel} onChange={setGlobalLevel} />

        <Section03Categories
          categoryState={categoryState}
          onToggle={toggleCategory}
          onLevelChange={changeCategoryLevel}
          onShowData={(id) => setViewDataFor(id)}
        />

        <Section04Rights
          onViewAll={() => setViewAllOpen(true)}
          onExport={() => setExportOpen(true)}
          onSeeUsages={() => setUsagesOpen(true)}
          onDelete={() => setDeleteOpen(true)}
        />

        <Section05Consent />
      </div>

      {/* Modals — rendus uniquement quand au moins ouverts une fois (next/dynamic) */}
      {viewDataOpen && (
        <ViewDataModal
          isOpen={viewDataOpen}
          onClose={() => { setViewDataFor(null); setViewAllOpen(false); }}
          focusedCategory={viewDataFor}
          categoryState={categoryState}
        />
      )}
      {exportOpen && (
        <ExportModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          onExport={(fmt) => exportData(fmt, categoryState)}
        />
      )}
      {usagesOpen && (
        <UsagesModal isOpen={usagesOpen} onClose={() => setUsagesOpen(false)} />
      )}
      {deleteOpen && (
        <DeleteModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirmed={() => { setDeleteOpen(false); setDeletedToastOpen(true); }}
        />
      )}
      {deletedToastOpen && (
        <DeletedToastModal isOpen={deletedToastOpen} onClose={() => setDeletedToastOpen(false)} />
      )}
    </>
  );
}
