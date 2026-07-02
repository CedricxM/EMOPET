'use client';

import { ContentShell } from '../../components/content-shell';
import { ContactForm } from '../../components/contact/ContactForm';
import { Card, Eyebrow, H1, Lead } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { RequestHistory } from './RequestHistory';

export default function ContactPage() {
  const { t } = useI18n();
  return (
    <ContentShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">{t('contact', 'eyebrow')}</Eyebrow>
          <H1>{t('contact', 'title')}</H1>
          <Lead>{t('contact', 'lead')}</Lead>
        </header>

        <Card>
          <ContactForm />
        </Card>

        {/* Historique des demandes (fusion /contact/mes-demandes) */}
        <RequestHistory />
      </div>
    </ContentShell>
  );
}
