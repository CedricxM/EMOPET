import type { ReactNode } from 'react';

export function ContentShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '40px 48px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 'var(--content-max-app)' }}>{children}</div>
    </div>
  );
}
