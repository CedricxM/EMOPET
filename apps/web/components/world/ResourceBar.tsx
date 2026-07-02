'use client';

import type { CSSProperties } from 'react';
import { WORLD_RESOURCES, type ResourceBalance } from '../../lib/mock-world';
import styles from './world-builder.module.css';

export function ResourceBar({ resources }: { resources: ResourceBalance }) {
  return (
    <div className={styles.resourceRail} aria-label="Ressources de construction disponibles">
      {WORLD_RESOURCES.map((resource) => (
        <div
          key={resource.key}
          className={styles.resourcePill}
          title={resource.description}
          style={{ '--resource-color': resource.color } as CSSProperties}
        >
          <span className={styles.resourceDot} aria-hidden="true" />
          <span className={styles.resourcePillLabel}>{resource.shortLabel}</span>
          <span className={styles.resourcePillValue}>{resources[resource.key]}</span>
        </div>
      ))}
    </div>
  );
}
