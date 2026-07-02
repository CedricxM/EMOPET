'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { WavePattern } from '../brand';
import { Button, Icon } from '../ui';
import { useI18n } from '../../lib/i18n';
import { WorldScene } from './WorldScene';
import { ResourceBar } from './ResourceBar';
import { BuildInventory } from './BuildInventory';
import {
  COMMUNITY_WORLD,
  INITIAL_WORLD_ITEM_IDS,
  MOCK_WORLD_EVENTS,
  WORLD_BUILD_ITEMS,
  WORLD_QUESTS,
  canAfford,
  computeResourceBalance,
  getResourceDefinition,
  spendResources,
  type ResourceBalance,
  type WorldBuildItem,
  type WorldResourceKey,
} from '../../lib/mock-world';
import styles from './world-builder.module.css';

export function WorldBuilder() {
  const { t } = useI18n();
  const [resources, setResources] = useState<ResourceBalance>(() => computeResourceBalance());
  const [builtIds, setBuiltIds] = useState<string[]>(INITIAL_WORLD_ITEM_IDS);
  const [communityOptIn, setCommunityOptIn] = useState(false);
  const [feedback, setFeedback] = useState(() => t('world', 'feedbackInitial'));
  const [placingCell, setPlacingCell] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => WORLD_BUILD_ITEMS.find((item) => !INITIAL_WORLD_ITEM_IDS.includes(item.id))?.id ?? null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const builtItems = useMemo(
    () => builtIds.map((id) => MOCK_BUILD_ITEM_BY_ID.get(id)).filter(Boolean) as WorldBuildItem[],
    [builtIds],
  );

  const selectedItem = useMemo(
    () => (selectedItemId ? MOCK_BUILD_ITEM_BY_ID.get(selectedItemId) ?? null : null),
    [selectedItemId],
  );

  function handleSelect(item: WorldBuildItem) {
    setSelectedItemId(item.id);
    setHoveredCell(item.cell);
    if (builtIds.includes(item.id)) {
      setFeedback(`${item.title} est deja visible dans le monde.`);
    } else if (canAfford(resources, item.cost)) {
      setFeedback(`${item.title} est pret a etre place sur la tuile lumineuse.`);
    } else {
      setFeedback(t('world', 'feedbackNeedMore'));
    }
  }

  function handleBuild(item: WorldBuildItem) {
    if (builtIds.includes(item.id)) return;
    if (!canAfford(resources, item.cost)) {
      setFeedback(t('world', 'feedbackNeedMore'));
      return;
    }
    setResources((current) => spendResources(current, item.cost));
    setBuiltIds((current) => [...current, item.id]);
    setSelectedItemId(nextUnbuiltItemId(item.id));
    setFeedback(`${item.title} ${t('world', 'feedbackAddedSuffix')}`);
    setPlacingCell(item.cell);
    setHoveredCell(null);
    window.setTimeout(() => setPlacingCell((cell) => (cell === item.cell ? null : cell)), 860);
  }

  function handleTileBuild(cell: number) {
    if (!selectedItem) return;
    if (cell !== selectedItem.cell) {
      setFeedback('Cette tuile ne correspond pas a l objet selectionne.');
      return;
    }
    handleBuild(selectedItem);
  }

  function nextUnbuiltItemId(currentId: string) {
    return WORLD_BUILD_ITEMS.find((item) => item.id !== currentId && !builtIds.includes(item.id))?.id ?? null;
  }

  return (
    <div className={styles.screen}>
      <section className={styles.hero}>
        <WavePattern tone="dark" className={styles.heroPattern} />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{t('world', 'heroTitle')}</h1>
            <p className={styles.heroLead}>{t('world', 'heroLead')}</p>
            <div className={styles.loopStrip} aria-label="Boucle de progression Mon Monde">
              <span>Routine accomplie</span>
              <span>Ressources gagnees</span>
              <span>Objet place</span>
              <span>Monde enrichi</span>
            </div>
            <div className={styles.heroActions}>
              <Button kind="accent" leading={<Icon name="plus" size={15} />} onClick={() => setFeedback(t('world', 'buildPanelText'))}>
                {t('world', 'buildNext')}
              </Button>
              <Link href="/quartier" style={{ textDecoration: 'none' }}>
                <Button kind="outline" style={{ color: 'var(--cream-50)', borderColor: 'rgba(246, 239, 231, 0.72)' }}>
                  {t('world', 'viewLocal')}
                </Button>
              </Link>
            </div>
          </div>

          <aside className={styles.heroPanel} aria-label={t('world', 'resources')}>
            <div>
              <h2 className={styles.heroPanelTitle}>{t('world', 'resources')}</h2>
              <p className={styles.heroPanelText}>{feedback}</p>
            </div>
            <ResourceBar resources={resources} />
          </aside>
        </div>
      </section>

      <section className={styles.worldLayout}>
        <div className={`${styles.panel} ${styles.scenePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>{t('world', 'personalWorld')}</h2>
              <p className={styles.panelText}>{t('world', 'personalWorldText')}</p>
            </div>
          </div>
          <div className={styles.worldCanvas}>
            <WorldScene
              builtItems={builtItems}
              placingCell={placingCell}
              selectedItem={selectedItem}
              hoveredCell={hoveredCell}
              onTileHover={setHoveredCell}
              onTileLeave={() => setHoveredCell(null)}
              onTileBuild={handleTileBuild}
            />
          </div>
        </div>

        <aside className={`${styles.panel} ${styles.inventoryPanel}`} aria-label={t('world', 'buildPanel')}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>{t('world', 'buildPanel')}</h2>
              <p className={styles.panelText}>{t('world', 'buildPanelText')}</p>
            </div>
          </div>
          <BuildInventory
            resources={resources}
            builtIds={builtIds}
            selectedItemId={selectedItemId}
            canAffordItem={(item) => canAfford(resources, item.cost)}
            onSelect={handleSelect}
            onBuild={handleBuild}
            labels={{
              built: t('world', 'built'),
              placed: t('world', 'placed'),
              build: t('world', 'build'),
              needMore: t('world', 'needMore'),
              softNote: t('world', 'softNote'),
            }}
          />
        </aside>
      </section>

      <section className={styles.supportGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>{t('world', 'questsTitle')}</h2>
              <p className={styles.panelText}>{t('world', 'questsText')}</p>
            </div>
          </div>
          <div className={styles.questList}>
            {WORLD_QUESTS.map((quest) => {
              const resource = getResourceDefinition(quest.resourceHint);
              const percentage = Math.min(100, Math.round((quest.progress / quest.target) * 100));
              return (
                <article key={quest.id} className={styles.questItem}>
                  <div className={styles.questTop}>
                    <div>
                      <h3 className={styles.questTitle}>{quest.title}</h3>
                      <p className={styles.questDetail}>{quest.detail}</p>
                    </div>
                    <span className={styles.costChip} style={{ color: resource.color }}>
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <div className={styles.progressTrack} aria-hidden="true">
                    <div className={styles.progressFill} style={{ width: `${percentage}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className={`${styles.panel} ${styles.communityPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>{t('world', 'communityTitle')}</h2>
              <p className={styles.panelText}>{t('world', 'communityText')}</p>
            </div>
            <label className={styles.communityToggle}>
              <input
                type="checkbox"
                checked={communityOptIn}
                onChange={(event) => setCommunityOptIn(event.target.checked)}
              />
              {t('world', 'optInLabel')}
            </label>
          </div>
          <div className={styles.communityList}>
            <div className={styles.mapPreview} aria-label={`${COMMUNITY_WORLD.city} community map preview`}>
              {COMMUNITY_WORLD.nodes.map((node) => {
                const color =
                  node.tone === 'orange'
                    ? 'var(--emopet-orange)'
                    : node.tone === 'teal'
                      ? 'var(--emopet-teal)'
                      : 'var(--emopet-navy)';
                return (
                  <span
                    key={node.label}
                    className={styles.mapNode}
                    title={node.label}
                    style={{ '--node-color': color, left: `${node.x}%`, top: `${node.y}%` } as CSSProperties}
                  />
                );
              })}
            </div>

            <div className={styles.communityStats}>
              {COMMUNITY_WORLD.stats.map((stat) => (
                <div key={stat.label} className={styles.communityStat}>
                  <span className={styles.communityStatValue}>{stat.value}</span>
                  <span className={styles.communityStatLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            {communityOptIn ? (
              <>
                <strong className={styles.buildTitle}>{COMMUNITY_WORLD.headline}</strong>
                {COMMUNITY_WORLD.updates.map((update) => (
                  <div key={update} className={styles.communityUpdate}>{update}</div>
                ))}
                <Link href="/quartier" className={styles.quartierLink}>
                  {t('world', 'bridgeToQuartier')} {t('world', 'openQuartier')} -&gt;
                </Link>
              </>
            ) : (
              <div className={styles.optInBox}>{t('world', 'optInBox')}</div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>{t('world', 'whyEarned')}</h2>
            <p className={styles.panelText}>{t('world', 'whyEarnedText')}</p>
          </div>
        </div>
        <div className={styles.eventList}>
          {MOCK_WORLD_EVENTS.map((event) => (
            <article key={event.id} className={styles.eventItem}>
              <div className={styles.eventTop}>
                <div>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDetail}>{event.detail}</p>
                </div>
              </div>
              <GrantRow grants={event.grants} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const MOCK_BUILD_ITEM_BY_ID = new Map(WORLD_BUILD_ITEMS.map((item) => [item.id, item]));

function GrantRow({ grants }: { grants: Partial<ResourceBalance> }) {
  const entries = Object.entries(grants) as Array<[WorldResourceKey, number]>;
  return (
    <div className={styles.grantRow} aria-label="Resources earned">
      {entries.map(([key, value]) => {
        const resource = getResourceDefinition(key);
        return (
          <span key={key} className={styles.grantChip} style={{ color: resource.color }}>
            +{value} {resource.shortLabel}
          </span>
        );
      })}
    </div>
  );
}






