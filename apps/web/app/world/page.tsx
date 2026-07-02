import type { Metadata } from 'next';
import { ContentShell } from '../../components/content-shell';
import { WorldBuilder } from '../../components/world/WorldBuilder';
import styles from '../../styles/living-pages.module.css';

export const metadata: Metadata = {
  title: 'My Dog World | EMOPET',
  description: 'A calm EMOPET world-building space powered by care routines and observation quality.',
};

export default function WorldPage() {
  return (
    <ContentShell>
      <div className={styles.worldEmphasis}>
        <WorldBuilder />
      </div>
    </ContentShell>
  );
}


