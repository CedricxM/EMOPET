'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './brand';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';
import { Icon, type IconName } from './ui/icon';
import { useI18n } from '../lib/i18n';
import type { Dict } from '../lib/i18n';
import styles from './app-shell.module.css';

type NavItem = { href: string; key: keyof Dict['nav'] & string; icon: IconName };

// Refonte 14→6 : voir (dashboard) — noter (journal) — se relier (quartier)
// — progresser (world) — dialoguer (breiz) — gérer (profil).
// Hors sidebar : / (landing), /contact, /admin, /rapport (technique), /mobile-preview (démo interne).
const ITEMS: NavItem[] = [
  { href: '/dashboard', key: 'dashboard', icon: 'signal' },
  { href: '/journal', key: 'journal', icon: 'journal' },
  { href: '/quartier', key: 'quartier', icon: 'compass' },
  { href: '/world', key: 'world', icon: 'wave' },
  { href: '/breiz', key: 'breiz', icon: 'chat' },
  { href: '/profil', key: 'profil', icon: 'profile' },
];

/** Marque emopet : patte navy + spirale orange (inspirée des vagues bretonnes). */
export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandLogo variant="navy" mode="mark" width={32} height={32} />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--granit-800)',
              letterSpacing: 0,
            }}
          >
            emopet
          </span>
        </div>
        <div
          className={styles.tagline}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xxs)',
            fontWeight: 'var(--weight-semi)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--fg-muted)',
          }}
        >
          {t('common', 'tagline')}
        </div>
      </div>

      <nav className={styles.nav}>
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navLink}
              style={{
                color: active ? 'var(--accent-press)' : 'var(--fg)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                fontWeight: active ? 'var(--weight-semi)' : 'var(--weight-medium)',
              }}
            >
              <Icon name={item.icon} size={18} />
              {t('nav', item.key)}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <LanguageSwitcher />
        <div
          className={styles.version}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xxs)',
            color: 'var(--fg-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 'var(--weight-semi)',
          }}
        >
          v6.0 · ELI gated
        </div>
      </div>
    </aside>
  );
}
