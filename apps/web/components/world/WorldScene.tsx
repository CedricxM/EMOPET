'use client';

import type { CSSProperties } from 'react';
import type { TileMotif, WorldBuildItem } from '../../lib/mock-world';
import styles from './world-scene.module.css';

export type TerrainKind = 'grass' | 'sand' | 'water' | 'coastalPath' | 'wood' | 'stone';

type SceneTile = {
  cell: number;
  terrain: TerrainKind;
};

type BaseObject = {
  id: string;
  title: string;
  motif: TileMotif;
  cell: number;
  builtIn?: boolean;
};

type SceneObject = BaseObject & {
  source: 'base' | 'built' | 'preview';
};

export interface WorldSceneProps {
  builtItems: WorldBuildItem[];
  placingCell: number | null;
  selectedItem: WorldBuildItem | null;
  hoveredCell: number | null;
  onTileHover: (cell: number) => void;
  onTileLeave: () => void;
  onTileBuild: (cell: number) => void;
}

const COLS = 7;
const TILE_W = 98;
const TILE_H = 58;
const ORIGIN_X = 330;
const ORIGIN_Y = 26;

const TERRAIN: SceneTile[] = [
  'water', 'water', 'sand', 'grass', 'grass', 'stone', 'grass',
  'water', 'sand', 'coastalPath', 'grass', 'grass', 'grass', 'stone',
  'sand', 'coastalPath', 'coastalPath', 'grass', 'wood', 'grass', 'stone',
  'grass', 'grass', 'coastalPath', 'coastalPath', 'wood', 'grass', 'sand',
  'grass', 'grass', 'grass', 'coastalPath', 'sand', 'sand', 'water',
].map((terrain, cell) => ({ cell, terrain: terrain as TerrainKind }));

const BASE_OBJECTS: BaseObject[] = [
  { id: 'home', title: 'Cozy home', motif: 'houseMotif', cell: 18, builtIn: true },
  { id: 'tree', title: 'Soft forest edge', motif: 'treeMotif', cell: 9, builtIn: true },
  { id: 'stone', title: 'Garden stones', motif: 'stoneMotif', cell: 20, builtIn: true },
  { id: 'coast', title: 'Coast line', motif: 'waveMotif', cell: 32, builtIn: true },
];

function positionForCell(cell: number) {
  const row = Math.floor(cell / COLS);
  const col = cell % COLS;
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * (TILE_H / 2),
    z: row * COLS + col,
  };
}

export function WorldScene({
  builtItems,
  placingCell,
  selectedItem,
  hoveredCell,
  onTileHover,
  onTileLeave,
  onTileBuild,
}: WorldSceneProps) {
  const occupiedCells = new Set([...BASE_OBJECTS.map((object) => object.cell), ...builtItems.map((item) => item.cell)]);
  const selectedBuilt = selectedItem ? builtItems.some((item) => item.id === selectedItem.id) : false;
  const previewObject: SceneObject | null = selectedItem && !selectedBuilt
    ? { id: selectedItem.id, title: selectedItem.title, motif: selectedItem.motif, cell: selectedItem.cell, source: 'preview' }
    : null;
  const objects: SceneObject[] = [
    ...BASE_OBJECTS.map((object) => ({ ...object, source: 'base' as const })),
    ...builtItems.map((item) => ({ id: item.id, title: item.title, motif: item.motif, cell: item.cell, source: 'built' as const })),
  ];

  return (
    <div className={styles.shell} aria-label="Mon Monde EMOPET en vue isometrique">
      <div className={styles.sky} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.waveLine} />
        <span className={styles.waveLineTwo} />
      </div>
      <div className={styles.sceneStage} role="grid" aria-label="Scene de construction personnelle">
        {TERRAIN.map((tile) => {
          const isTarget = selectedItem?.cell === tile.cell && !selectedBuilt;
          const isHovered = hoveredCell === tile.cell;
          return (
            <IsometricTile
              key={tile.cell}
              tile={tile}
              occupied={occupiedCells.has(tile.cell)}
              target={isTarget}
              hovered={isHovered}
              selectedTitle={selectedItem?.title ?? null}
              onHover={onTileHover}
              onLeave={onTileLeave}
              onBuild={onTileBuild}
            />
          );
        })}
        {previewObject ? <PreviewObject object={previewObject} active={hoveredCell === previewObject.cell} /> : null}
        {objects.map((object) => {
          const position = positionForCell(object.cell);
          return (
            <WorldObject
              key={`${object.source}-${object.id}`}
              object={object}
              placing={object.source === 'built' && placingCell === object.cell}
              style={{ '--x': `${position.x}px`, '--y': `${position.y}px`, '--z': position.z + 40 } as CSSProperties}
            />
          );
        })}
        <DogPresence />
      </div>
      <div className={styles.sceneCaption}>
        <strong>{selectedItem && !selectedBuilt ? `A placer : ${selectedItem.title}` : 'Routine - ressources - construction'}</strong>
        <span>{selectedItem && !selectedBuilt ? 'Survolez la tuile lumineuse puis cliquez pour poser l objet.' : 'Les elements debloques prennent place dans ce petit monde personnel.'}</span>
      </div>
    </div>
  );
}

export function IsometricTile({
  tile,
  occupied,
  target,
  hovered,
  selectedTitle,
  onHover,
  onLeave,
  onBuild,
}: {
  tile: SceneTile;
  occupied: boolean;
  target: boolean;
  hovered: boolean;
  selectedTitle: string | null;
  onHover: (cell: number) => void;
  onLeave: () => void;
  onBuild: (cell: number) => void;
}) {
  const position = positionForCell(tile.cell);
  const label = target && selectedTitle
    ? `Tuile cible pour ${selectedTitle}. Cliquer pour placer.`
    : `Tuile ${tile.cell + 1}, ${terrainLabel(tile.terrain)}${occupied ? ', occupee' : ''}`;
  return (
    <button
      type="button"
      role="gridcell"
      className={`${styles.tileWrap} ${styles[tile.terrain]} ${target ? styles.targetTile : ''} ${hovered ? styles.hoveredTile : ''} ${occupied ? styles.occupiedTile : ''}`}
      style={{ '--x': `${position.x}px`, '--y': `${position.y}px`, '--z': position.z } as CSSProperties}
      aria-label={label}
      onMouseEnter={() => onHover(tile.cell)}
      onFocus={() => onHover(tile.cell)}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      onClick={() => onBuild(tile.cell)}
    >
      <span className={styles.tileTop} />
      <span className={styles.tileSideLeft} />
      <span className={styles.tileSideRight} />
      {tile.terrain === 'water' ? <span className={styles.waterWave} aria-hidden="true" /> : null}
      {tile.terrain === 'coastalPath' ? <span className={styles.pathTrace} aria-hidden="true" /> : null}
      {target ? <span className={styles.targetHalo} aria-hidden="true" /> : null}
    </button>
  );
}

function PreviewObject({ object, active }: { object: SceneObject; active: boolean }) {
  const position = positionForCell(object.cell);
  return (
    <div
      className={`${styles.objectLayer} ${styles.previewLayer} ${active ? styles.previewActive : ''}`}
      style={{ '--x': `${position.x}px`, '--y': `${position.y}px`, '--z': position.z + 35 } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.objectShadow} />
      <span className={`${styles.object} ${styles[object.motif]}`}>
        {object.motif === 'lanternMotif' ? <span className={styles.lanternGlow} /> : null}
        {object.motif === 'plantMotif' ? <span className={styles.growingLeaf} /> : null}
        {object.motif === 'waveMotif' ? <span className={styles.objectWave} /> : null}
      </span>
    </div>
  );
}

export function WorldObject({ object, placing, style }: { object: SceneObject; placing: boolean; style: CSSProperties }) {
  return (
    <div className={`${styles.objectLayer} ${placing ? styles.placingObject : ''}`} style={style} aria-label={object.title}>
      <span className={styles.objectShadow} aria-hidden="true" />
      <span className={`${styles.object} ${styles[object.motif]}`} aria-hidden="true">
        {object.motif === 'lanternMotif' ? <span className={styles.lanternGlow} /> : null}
        {object.motif === 'plantMotif' ? <span className={styles.growingLeaf} /> : null}
        {object.motif === 'waveMotif' ? <span className={styles.objectWave} /> : null}
      </span>
      {placing ? <BuildAnimation /> : null}
    </div>
  );
}

export function DogPresence() {
  const position = positionForCell(22);
  return (
    <div
      className={styles.dogPresence}
      style={{ '--x': `${position.x}px`, '--y': `${position.y}px`, '--z': position.z + 86 } as CSSProperties}
      aria-label="Presence symbolique du chien dans le monde"
    >
      <span className={styles.dogCushion} />
      <span className={styles.dogBody} />
      <span className={styles.dogHead} />
      <span className={styles.dogEar} />
      <span className={styles.dogTail} />
      <span className={styles.dogBreath} />
      <span className={styles.pawTrail} />
    </div>
  );
}

export function BuildAnimation() {
  return <span className={styles.buildPulse} aria-hidden="true" />;
}

export function ObjectPreview({ motif }: { motif: TileMotif }) {
  return (
    <span className={styles.previewObject} aria-hidden="true">
      <span className={`${styles.object} ${styles[motif]}`} />
    </span>
  );
}

function terrainLabel(terrain: TerrainKind) {
  switch (terrain) {
    case 'grass': return 'herbe';
    case 'sand': return 'sable';
    case 'water': return 'eau';
    case 'coastalPath': return 'chemin cotier';
    case 'wood': return 'bois';
    case 'stone': return 'pierre';
  }
}

