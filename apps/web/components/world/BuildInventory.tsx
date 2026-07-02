'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Button } from '../ui';
import { ObjectPreview } from './WorldScene';
import {
  WORLD_BUILD_ITEMS,
  getResourceDefinition,
  type ResourceBalance,
  type WorldBuildItem,
  type WorldResourceKey,
} from '../../lib/mock-world';
import styles from './world-builder.module.css';

interface BuildInventoryProps {
  resources: ResourceBalance;
  builtIds: string[];
  selectedItemId: string | null;
  canAffordItem: (item: WorldBuildItem) => boolean;
  onSelect: (item: WorldBuildItem) => void;
  onBuild: (item: WorldBuildItem) => void;
  labels: {
    built: string;
    placed: string;
    build: string;
    needMore: string;
    softNote: string;
  };
}

const ALL_CATEGORIES = 'Tous';

export function BuildInventory({
  resources,
  builtIds,
  selectedItemId,
  canAffordItem,
  onSelect,
  onBuild,
  labels,
}: BuildInventoryProps) {
  const categories = useMemo(() => [ALL_CATEGORIES, ...Array.from(new Set(WORLD_BUILD_ITEMS.map((item) => item.category)))], []);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const visibleItems = category === ALL_CATEGORIES
    ? WORLD_BUILD_ITEMS
    : WORLD_BUILD_ITEMS.filter((item) => item.category === category);

  return (
    <div className={styles.inventoryWrap}>
      <div className={styles.inventoryTabs} aria-label="Categories de construction">
        {categories.map((entry) => (
          <button
            key={entry}
            type="button"
            className={`${styles.inventoryTab} ${category === entry ? styles.inventoryTabActive : ''}`}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className={styles.buildList}>
        {visibleItems.map((item) => {
          const built = builtIds.includes(item.id);
          const affordable = canAffordItem(item);
          const selected = selectedItemId === item.id;
          const stateLabel = built ? labels.placed : affordable ? 'A placer' : 'A debloquer';
          return (
            <article
              key={item.id}
              className={`${styles.buildItem} ${built ? styles.buildItemPlaced : ''} ${selected ? styles.buildItemSelected : ''}`}
            >
              <button
                type="button"
                className={styles.buildIcon}
                onClick={() => onSelect(item)}
                aria-label={`Selectionner ${item.title}`}
                aria-pressed={selected}
              >
                <ObjectPreview motif={item.motif} />
              </button>
              <div className={styles.buildItemMain}>
                <div className={styles.buildMeta}>
                  <span className={styles.category}>{item.category}</span>
                  <span className={`${styles.stateBadge} ${built ? styles.statePlaced : affordable ? styles.stateReady : styles.stateLocked}`}>
                    {stateLabel}
                  </span>
                </div>
                <button type="button" className={styles.buildTitleButton} onClick={() => onSelect(item)}>
                  {item.title}
                </button>
                <p className={styles.buildDescription}>{item.description}</p>
                <CostRow cost={item.cost} resources={resources} />
                <div className={styles.buildActions}>
                  <Button
                    kind={built ? 'secondary' : affordable ? 'primary' : 'ghost'}
                    size="sm"
                    disabled={built || !affordable}
                    onClick={() => (selected ? onBuild(item) : onSelect(item))}
                    aria-label={`${built ? labels.placed : affordable ? labels.build : labels.needMore}: ${item.title}`}
                    style={!affordable && !built ? { opacity: 0.62, cursor: 'not-allowed' } : undefined}
                  >
                    {built ? labels.placed : affordable ? (selected ? labels.build : 'Voir dans le monde') : labels.needMore}
                  </Button>
                  {!built && !affordable ? <span className={styles.softNote}>{labels.softNote}</span> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CostRow({ cost, resources }: { cost: Partial<ResourceBalance>; resources: ResourceBalance }) {
  const entries = Object.entries(cost) as Array<[WorldResourceKey, number]>;
  return (
    <div className={styles.costRow} aria-label="Cout de construction">
      {entries.map(([key, value]) => {
        const resource = getResourceDefinition(key);
        const enough = resources[key] >= value;
        return (
          <span
            key={key}
            className={`${styles.costChip} ${enough ? styles.costEnough : styles.costMissing}`}
            style={{ '--chip-color': resource.color } as CSSProperties}
          >
            {value} {resource.shortLabel}
          </span>
        );
      })}
    </div>
  );
}
