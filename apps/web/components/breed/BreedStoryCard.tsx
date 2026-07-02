'use client';

/**
 * Carte « Découvrir la race » (Partie C, sur demande) — narration vivante,
 * jamais une fiche froide. Données VERIFIED uniquement (via /api/breeds).
 */

import { useEffect, useState } from 'react';
import { Card, Eyebrow, P, P2 } from '../ui';
import { narrateBreedStory } from '../../lib/narration';
import type { Breed } from '../../lib/breeds';

export function BreedStoryCard({ dogName, breedName }: { dogName: string; breedName: string }) {
  const [breed, setBreed] = useState<Breed | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/breeds?q=${encodeURIComponent(breedName)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { breeds: Breed[] };
        const found = data.breeds.find((b) => b.verificationStatus === 'VERIFIED') ?? data.breeds[0] ?? null;
        if (!cancelled) setBreed(found);
      } catch { /* hors-ligne → carte masquée */ }
    })();
    return () => { cancelled = true; };
  }, [breedName]);

  if (!breed) return null;
  const n = narrateBreedStory(dogName, breed);

  return (
    <Card tone="accent2Soft">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow tone="accent2">⊙ Découvrir sa race</Eyebrow>
        <P>{n.text}</P>
        {n.hook && (
          <P2 style={{ color: 'var(--lichen-700)', fontStyle: 'italic' }}>{n.hook.text}</P2>
        )}
      </div>
    </Card>
  );
}
