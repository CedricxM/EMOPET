'use client';

import type { CSSProperties, ReactNode } from 'react';
import { T } from './tokens';

/**
 * iOS 26 device frame: 402 × 874, 48px radius, dynamic island + home indicator.
 * Status bar sits absolutely at the top (z 10); content area scrolls beneath.
 */

export function IOSStatusBar({ time = '9:41' }: { time?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 54,
        padding: '16px 28px 0',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 10,
        fontFamily: T.fontSans,
        color: T.fgStrong,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, fontFeatureSettings: T.ffTabular }}>{time}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* signal bars */}
        <span style={{ display: 'inline-flex', gap: 1.5, alignItems: 'flex-end' }}>
          {[4, 6, 8, 10].map((h) => (
            <span
              key={h}
              style={{
                width: 3,
                height: h,
                borderRadius: 1,
                background: T.fgStrong,
                display: 'inline-block',
              }}
            />
          ))}
        </span>
        {/* wifi */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path
            d="M1 3.5c3.3-3 8.7-3 12 0M3 5.8c2-1.8 6-1.8 8 0M5.2 8.1c1-.9 2.6-.9 3.6 0"
            stroke={T.fgStrong}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.2" r="0.9" fill={T.fgStrong} />
        </svg>
        {/* battery */}
        <span
          style={{
            width: 24,
            height: 11,
            borderRadius: 2.5,
            border: `1px solid ${T.fgStrong}`,
            position: 'relative',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 1.5,
              width: 'calc(80% - 3px)',
              background: T.fgStrong,
              borderRadius: 1,
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: -2.5,
              top: 3,
              width: 1.5,
              height: 5,
              background: T.fgStrong,
              borderRadius: 1,
            }}
          />
        </span>
      </span>
    </div>
  );
}

type IOSDeviceProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function IOSDevice({ children, style }: IOSDeviceProps) {
  return (
    <div
      style={{
        width: 402,
        height: 874,
        borderRadius: 48,
        background: T.bg,
        boxShadow:
          '0 0 0 10px #1A1A1F, 0 0 0 11px #2E2E33, 0 30px 60px rgba(20, 28, 37, 0.25), 0 10px 20px rgba(20, 28, 37, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: T.fontSans,
        color: T.fg,
        ...style,
      }}
    >
      {/* Dynamic island */}
      <div
        style={{
          position: 'absolute',
          top: 11,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 126,
          height: 37,
          borderRadius: 999,
          background: '#0A0A0D',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />
      <IOSStatusBar />
      {/* Inner viewport: status bar area above content */}
      <div
        style={{
          position: 'absolute',
          top: 54,
          left: 0,
          right: 0,
          bottom: 34,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
      {/* Home indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 134,
          height: 5,
          borderRadius: 999,
          background: T.fgStrong,
          opacity: 0.92,
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
