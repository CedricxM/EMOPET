'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Eyebrow, H2, P2 } from '../ui';
import { createBreizMockStore, retrieveBreizLocalKnowledge } from '../../lib/data/breiz/breizRetriever';

const INITIAL_QUERY = 'Lorient patrimoine local';

export function LocalKnowledgePanel() {
  const store = useMemo(() => createBreizMockStore(), []);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(INITIAL_QUERY);
  const retrieval = useMemo(
    () => retrieveBreizLocalKnowledge(submittedQuery, store, 3),
    [store, submittedQuery],
  );

  return (
    <Card tone="sunk">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedQuery(query.trim() || INITIAL_QUERY);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Eyebrow tone="accent2">Sources locales</Eyebrow>
          <H2 style={{ fontSize: 'var(--text-xl)' }}>Connaissance Breiz sourcee</H2>
          <P2>
            Breiz peut consulter des documents locaux mockes. Les reponses doivent rester ancrees
            dans les sources affichees et signaler les manques d information.
          </P2>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un territoire, une source, un theme..."
            aria-label="Rechercher dans les sources locales Breiz"
            style={{
              flex: 1,
              height: 38,
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: '0 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--fg-strong)',
              minWidth: 0,
            }}
          />
          <Button kind="secondary" size="sm" type="submit">Chercher</Button>
        </div>

        {retrieval.status === 'not_enough_information' ? (
          <P2 style={{ color: 'var(--fg-muted)' }}>
            Je n ai pas encore assez d informations sourcees sur ce point.
          </P2>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {retrieval.chunks.map((chunk) => (
              <div
                key={chunk.id}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <Eyebrow>{chunk.metadata.source_name}</Eyebrow>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {chunk.metadata.territory} - {chunk.metadata.theme}
                  </span>
                </div>
                <P2 style={{ color: 'var(--fg-2)' }}>{chunk.content}</P2>
                {chunk.metadata.source_url && (
                  <a
                    href={chunk.metadata.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--emopet-navy)' }}
                  >
                    Source externe
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </form>
    </Card>
  );
}
