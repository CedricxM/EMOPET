'use client';

import { useMemo, useState } from 'react';
import { Card, Eyebrow, H2, P2 } from '../ui';
import { createDogProfileFromFciBreed } from '../../lib/data/fci/fciToDogProfile';
import { findFciBreedById, searchFciBreeds } from '../../lib/data/fci/fciBreedSearch';
import { estimateSignalConstraintsFromDogProfile } from '../../lib/data/eli/dogProfile.schema';
import type { SignalConstraintNote } from '../../lib/data/eli/dogProfile.schema';

const NOTE_LABELS: Record<SignalConstraintNote, string> = {
  possible_fur_related_signal_damping: 'Pelage : verifier la qualite de couplage lors de la mise en place.',
  size_requires_mat_variant_check: 'Gabarit : verifier que la variante MAT correspond au chien.',
  morphology_requires_positioning_validation: 'Morphologie : confirmer le positionnement pendant la configuration.',
  no_constraint_known: 'Aucune contrainte technique connue avec les donnees disponibles.',
};

export interface FciBreedSelectProps {
  dogId: string;
  dogName: string;
  initialBreedName: string;
  ageYears: number;
  weightKg: number;
}

export function FciBreedSelect({
  dogId,
  dogName,
  initialBreedName,
  ageYears,
  weightKg,
}: FciBreedSelectProps) {
  const initialBreed = useMemo(() => searchFciBreeds(initialBreedName, undefined, { limit: 1 })[0] ?? null, [initialBreedName]);
  const [query, setQuery] = useState(initialBreedName);
  const [selectedBreedId, setSelectedBreedId] = useState(initialBreed?.id ?? null);

  const results = useMemo(() => searchFciBreeds(query, undefined, { limit: 6 }), [query]);
  const selectedBreed = selectedBreedId ? findFciBreedById(selectedBreedId) : initialBreed;
  const profile = createDogProfileFromFciBreed({
    dog_id: dogId,
    name: dogName,
    breed: selectedBreed,
    age_optional: ageYears,
    sex_optional: 'unknown',
    weight_kg_optional: weightKg,
  });
  const constraints = estimateSignalConstraintsFromDogProfile(profile);

  return (
    <Card tone="sunk">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Eyebrow tone="accent2">Referentiel FCI</Eyebrow>
          <H2>Race et configuration capteurs</H2>
          <P2>
            La race sert a l onboarding, aux cohortes de validation et aux contraintes techniques de signal.
            Elle ne produit pas d interpretation comportementale.
          </P2>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            Rechercher une race
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Border Collie, Labrador..."
            style={{
              height: 40,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: '0 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--fg-strong)',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {results.map((breed) => {
            const active = breed.id === selectedBreedId;
            return (
              <button
                key={breed.id}
                type="button"
                onClick={() => setSelectedBreedId(breed.id)}
                aria-pressed={active}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${active ? 'var(--emopet-orange)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--surface)',
                  color: 'var(--fg-strong)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minWidth: 180,
                }}
              >
                <strong style={{ fontSize: 13 }}>{breed.breed_name_fr ?? breed.breed_name_original}</strong>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  {breed.group_number ? `Groupe ${breed.group_number}` : 'Groupe non renseigne'}
                  {breed.country_of_origin ? ` - ${breed.country_of_origin}` : ''}
                </span>
              </button>
            );
          })}
          {query.trim() && results.length === 0 && (
            <P2>Pas de correspondance locale pour cette recherche.</P2>
          )}
        </div>

        {selectedBreed && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <P2><strong>Race :</strong> {profile.breed_name_optional}</P2>
            <P2><strong>Groupe :</strong> {profile.fci_group_optional ?? 'Non renseigne'}</P2>
            <P2><strong>Origine :</strong> {selectedBreed.country_of_origin ?? 'Non renseignee'}</P2>
            <P2><strong>Gabarit :</strong> {profile.size_category_optional ?? 'Non renseigne'}</P2>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow>Notes de configuration</Eyebrow>
          {constraints.notes.map((note) => (
            <P2 key={note} style={{ color: 'var(--fg-2)' }}>
              {NOTE_LABELS[note]}
            </P2>
          ))}
        </div>
      </div>
    </Card>
  );
}
