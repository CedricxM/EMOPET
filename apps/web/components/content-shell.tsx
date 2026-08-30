import type { ReactNode } from 'react';

export function ContentShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5vw, 48px)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 'var(--content-max-app)' }}>{children}</div>
    </div>
  );
}
