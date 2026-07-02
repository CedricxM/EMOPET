'use client';

import { LOCALES, useI18n } from '../../lib/i18n';

/** Bascule de langue (FR/EN) — persistée. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t('common', 'language')} style={{ display: 'inline-flex', gap: 4, padding: 3, background: 'var(--bg-sunk)', borderRadius: 'var(--radius-pill)' }}>
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
