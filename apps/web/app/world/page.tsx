import type { Metadata } from 'next';
import { ContentShell } from '../../components/content-shell';
import { WorldBuilder } from '../../components/world/WorldBuilder';
import styles from '../../styles/living-pages.module.css';

export const metadata: Metadata = {
  title: 'My Dog World | EMOPET',
  description: 'A controlled preview of EMOPET World built around deliberate Owner actions, local discovery and community participation.',
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


