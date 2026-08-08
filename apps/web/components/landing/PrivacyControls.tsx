'use client';

import { useState } from 'react';

interface ToggleItem {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

const controls: ToggleItem[] = [
  {
    id: 'location',
    label: 'Localisation',
    description: 'Approximative seulement',
    defaultValue: true,
  },
  {
    id: 'community',
    label: 'Découverte communauté',
    description: 'Suggestions de connexions locales',
    defaultValue: true,
  },
  {
    id: 'research',
    label: 'Contribution recherche',
    description: 'Données anonymisées pour la recherche',
    defaultValue: false,
  },
  {
    id: 'memory',
    label: 'Mémoire personnalisation',
    description: 'Breiz apprend de vos échanges',
    defaultValue: true,
  },
];

export default function PrivacyControls() {
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(controls.map((c) => [c.id, c.defaultValue]))
  );

  const toggle = (id: string) => {
    setValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-md mx-auto px-4">
      {/* Toggles */}
      <div className="space-y-4 mb-8">
        {controls.map((control) => (
          <div
            key={control.id}
            className="flex items-center justify-between py-3 border-b border-[#ECE5D7] last:border-0"
          >
            <div className="flex-1 mr-4">
              <p
                className="text-[#141C25] text-sm font-medium"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {control.label}
              </p>
              <p
                className="text-[#6B7684] text-xs mt-0.5"
                style={{ fontFamily: 'var(--font-source-sans)' }}
              >
                {control.description}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={values[control.id]}
              aria-label={`${control.label}: ${values[control.id] ? 'Activé' : 'Désactivé'}`}
              onClick={() => toggle(control.id)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                values[control.id] ? 'bg-[#6B8E6F]' : 'bg-[#C6BBA4]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  values[control.id] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          className="px-4 py-2.5 text-sm text-[#4A5766] border border-[#DDD4C2] rounded-lg hover:bg-[#F4EFE6] transition-colors duration-200"
          style={{ fontFamily: 'var(--font-source-sans)' }}
          aria-label="Supprimer une préférence"
        >
          Supprimer une préférence
        </button>
        <button
          className="px-4 py-2.5 text-sm text-[#4A5766] border border-[#DDD4C2] rounded-lg hover:bg-[#F4EFE6] transition-colors duration-200"
          style={{ fontFamily: 'var(--font-source-sans)' }}
          aria-label="Exporter mes données"
        >
          Exporter mes données
        </button>
      </div>
    </div>
  );
}
