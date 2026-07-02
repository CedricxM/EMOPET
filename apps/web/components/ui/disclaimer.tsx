'use client';

import { Icon } from './icon';
import { useI18n } from '../../lib/i18n';

export interface DisclaimerProps {
  variant?: 'banner' | 'inline';
}

export function Disclaimer({ variant = 'banner' }: DisclaimerProps) {
  const { t } = useI18n();
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: variant === 'banner' ? '12px 14px' : '8px 12px',
        background: 'var(--prudence-bg)',
        color: 'var(--prudence-ink)',
        border: '1px solid var(--prudence-border)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--lh-relaxed)',
      }}
    >
      <Icon name="info" size={16} />
      <span>{t('common', 'disclaimer')}</span>
    </div>
  );
}
