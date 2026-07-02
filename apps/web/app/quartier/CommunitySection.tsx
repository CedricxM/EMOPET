'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CircleJoinDialog,
  CommunityCharterModal,
  CreateEventDialog,
  CreatePostDialog,
  ReportDialog,
} from '../../components/community';
import { Button, Card, Eyebrow, H1, H2, Icon, Lead, P, P2 } from '../../components/ui';
import {
  AUTO_HIDE_FLAG_THRESHOLD,
  EVENT_TYPE_LABELS,
  INITIAL_CIRCLES,
  INITIAL_EVENTS,
  INITIAL_POSTS,
  LS_KEYS,
  POST_TYPE_LABELS,
  containsForbiddenContent,
  formatEventDate,
  relativeTime,
  upcomingEvents,
} from '../../lib/community';
import type { Circle, CircleEvent, CirclePost, Participation } from '../../lib/community';
import { useI18n } from '../../lib/i18n';

export function CommunitySection() {
  const circles = INITIAL_CIRCLES;
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const { t } = useI18n();
  const [posts, setPosts] = useState<CirclePost[]>(INITIAL_POSTS);
  const [events, setEvents] = useState<CircleEvent[]>(INITIAL_EVENTS);

  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<Circle | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [charterOpen, setCharterOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    // Memberships : restent locales (par appareil) tant qu'il n'y a pas d'auth.
    try {
      const m = localStorage.getItem(LS_KEYS.memberships);
      if (m) setMemberships(JSON.parse(m) as Record<string, string>);
      const p = localStorage.getItem(LS_KEYS.posts);
      if (p) setPosts((prev) => [...(JSON.parse(p) as CirclePost[]).filter((u) => !prev.some((x) => x.id === u.id)), ...prev]);
      const e = localStorage.getItem(LS_KEYS.events);
      if (e) setEvents((prev) => [...prev, ...(JSON.parse(e) as CircleEvent[]).filter((u) => !prev.some((x) => x.id === u.id))]);
    } catch { /* indisponible */ }
    // R3 : posts + événements = serveur autoritaire (données communautaires partagées).
    (async () => {
      try {
        const [pr, er] = await Promise.all([fetch('/api/community/posts'), fetch('/api/community/events')]);
        if (pr.ok) { const d = (await pr.json()) as { posts: CirclePost[] }; if (d.posts?.length) setPosts(d.posts); }
        if (er.ok) { const d = (await er.json()) as { events: CircleEvent[] }; if (d.events?.length) setEvents(d.events); }
      } catch { /* hors-ligne → baseline local */ }
    })();
  }, []);

  function notify(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  }
  function persistMemberships(next: Record<string, string>) {
    try { localStorage.setItem(LS_KEYS.memberships, JSON.stringify(next)); } catch {}
  }
  function persistUserPosts(all: CirclePost[]) {
    try { localStorage.setItem(LS_KEYS.posts, JSON.stringify(all.filter((p) => p.id.startsWith('user-')))); } catch {}
  }
  function persistUserEvents(all: CircleEvent[]) {
    try { localStorage.setItem(LS_KEYS.events, JSON.stringify(all.filter((e) => e.id.startsWith('user-')))); } catch {}
  }

  const joinedCircles = circles.filter((c) => memberships[c.id]);
  const otherCircles = circles.filter((c) => !memberships[c.id]);
  const myAgenda = useMemo(
    () => upcomingEvents(events.filter((e) => memberships[e.circleId])),
    [events, memberships],
  );

  const selectedCircle = circles.find((c) => c.id === selectedCircleId) ?? null;
  const isMember = selectedCircle ? !!memberships[selectedCircle.id] : false;
  const circlePosts = selectedCircle ? posts.filter((p) => p.circleId === selectedCircle.id && !p.isHidden) : [];
  const circleEvents = selectedCircle ? upcomingEvents(events.filter((e) => e.circleId === selectedCircle.id)) : [];

  /* Handlers */
  function joinCircle(displayName: string) {
    if (!joinTarget) return;
    const next = { ...memberships, [joinTarget.id]: displayName };
    setMemberships(next);
    persistMemberships(next);
    notify(`Vous avez rejoint ${joinTarget.name}.`);
    setSelectedCircleId(joinTarget.id);
    setJoinTarget(null);
  }
  async function createPost(input: { type: CirclePost['type']; title?: string; content: string }) {
    if (!selectedCircle) return;
    const authorName = memberships[selectedCircle.id] ?? 'Vous';
    try {
      const res = await fetch('/api/community/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ circleId: selectedCircle.id, ...input, authorName }) });
      const data = (await res.json()) as { ok: boolean; post?: CirclePost; errors?: string[] };
      if (res.ok && data.ok && data.post) { setPosts((prev) => [data.post!, ...prev]); setPostOpen(false); notify('Publication ajoutée au cercle.'); return; }
      if (data.errors?.length) { notify(data.errors[0]!); return; }
    } catch { /* repli local */ }
    const post: CirclePost = { id: `user-${Date.now()}`, circleId: selectedCircle.id, type: input.type, authorName, title: input.title, content: input.content, replies: [], flagCount: 0, isHidden: false, createdAt: new Date().toISOString() };
    setPosts((prev) => { const n = [post, ...prev]; persistUserPosts(n); return n; });
    setPostOpen(false);
    notify('Publication ajoutée au cercle.');
  }
  async function addReply(postId: string, content: string) {
    const check = containsForbiddenContent(content);
    if (check.blocked) { notify(check.reason ?? 'Contenu non autorisé.'); return; }
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, authorName: 'Vous' }) });
      const data = (await res.json()) as { ok: boolean; reply?: CirclePost['replies'][number]; errors?: string[] };
      if (res.ok && data.ok && data.reply) { setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, data.reply!] } : p))); return; }
      if (data.errors?.length) { notify(data.errors[0]!); return; }
    } catch { /* repli local */ }
    setPosts((prev) => {
      const n = prev.map((p) => p.id === postId ? { ...p, replies: [...p.replies, { id: `r-${Date.now()}`, authorName: 'Vous', content, createdAt: new Date().toISOString() }] } : p);
      persistUserPosts(n);
      return n;
    });
  }
  async function flagPost(_reason: string) {
    if (!reportPostId) return;
    const id = reportPostId;
    setReportPostId(null);
    try {
      const res = await fetch(`/api/community/posts/${id}/flag`, { method: 'POST' });
      const data = (await res.json()) as { ok: boolean; flagCount?: number; isHidden?: boolean };
      if (res.ok && data.ok) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, flagCount: data.flagCount ?? p.flagCount, isHidden: data.isHidden ?? p.isHidden } : p)));
        notify(data.isHidden ? 'Contenu masqué et transmis à la modération.' : 'Merci, votre signalement a été enregistré.');
        return;
      }
    } catch { /* repli local */ }
    let nowHidden = false;
    setPosts((prev) => {
      const n = prev.map((p) => { if (p.id !== id) return p; const flagCount = p.flagCount + 1; nowHidden = flagCount >= AUTO_HIDE_FLAG_THRESHOLD; return { ...p, flagCount, isHidden: nowHidden }; });
      persistUserPosts(n);
      return n;
    });
    notify(nowHidden ? 'Contenu masqué et transmis à la modération.' : 'Merci, votre signalement a été enregistré.');
  }
  async function createEvent(input: { type: CircleEvent['type']; title: string; description?: string; startsAt: string; meetingPointName: string }) {
    if (!selectedCircle) return;
    const organizerName = memberships[selectedCircle.id] ?? 'Vous';
    const payload = { circleId: selectedCircle.id, ...input, lat: selectedCircle.lat, lon: selectedCircle.lon, organizerName };
    try {
      const res = await fetch('/api/community/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await res.json()) as { ok: boolean; event?: CircleEvent; errors?: string[] };
      if (res.ok && data.ok && data.event) { setEvents((prev) => [...prev, data.event!]); setEventOpen(false); notify('Événement créé — le point de RDV apparaît sur la carte (Veute).'); return; }
      if (data.errors?.length) { notify(data.errors[0]!); return; }
    } catch { /* repli local */ }
    const ev: CircleEvent = { id: `user-${Date.now()}`, circleId: selectedCircle.id, type: input.type, organizerName, title: input.title, description: input.description, startsAt: input.startsAt, meetingPointName: input.meetingPointName, lat: selectedCircle.lat, lon: selectedCircle.lon, participants: 1, myStatus: 'going' };
    setEvents((prev) => { const n = [...prev, ev]; persistUserEvents(n); return n; });
    setEventOpen(false);
    notify('Événement créé — le point de RDV apparaît sur la carte (Veute).');
  }
  function participate(eventId: string, status: Participation) {
    setEvents((prev) => {
      const n = prev.map((e) => {
        if (e.id !== eventId) return e;
        const was = e.myStatus;
        let participants = e.participants;
        const countedBefore = was === 'going';
        const countedNow = status === 'going';
        if (countedBefore && !countedNow) participants -= 1;
        if (!countedBefore && countedNow) participants += 1;
        return { ...e, myStatus: status, participants };
      });
      persistUserEvents(n);
      return n;
    });
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {flash && (
          <div role="status" style={{ padding: '10px 14px', background: 'var(--accent-2-soft)', border: '1px solid var(--accent-2-soft-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--lichen-700)' }}>
            {flash}
          </div>
        )}

        {!selectedCircle ? (
          <>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Eyebrow tone="accent">{t('communaute', 'eyebrow')}</Eyebrow>
              <H1>{t('communaute', 'title')}</H1>
              <Lead>{t('communaute', 'lead')}</Lead>
            </header>

            {myAgenda.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <H2 style={{ fontSize: 'var(--text-xl)' }}>Mon agenda</H2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {myAgenda.map((e) => <EventCard key={e.id} event={e} circles={circles} onParticipate={participate} />)}
                </div>
              </section>
            )}

            {joinedCircles.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <H2 style={{ fontSize: 'var(--text-xl)' }}>Mes cercles</H2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {joinedCircles.map((c) => <CircleCard key={c.id} circle={c} isMember onOpen={() => setSelectedCircleId(c.id)} onJoin={() => setJoinTarget(c)} />)}
                </div>
              </section>
            )}

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <H2 style={{ fontSize: 'var(--text-xl)' }}>Découvrir</H2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {otherCircles.map((c) => <CircleCard key={c.id} circle={c} isMember={false} onOpen={() => setSelectedCircleId(c.id)} onJoin={() => setJoinTarget(c)} />)}
              </div>
            </section>

            <button type="button" onClick={() => setCharterOpen(true)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--fg-muted)', fontFamily: 'var(--font-sans)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
              Lire la charte communautaire
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setSelectedCircleId(null)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--fg-2)', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}><Icon name="chevron" size={16} /></span> Tous les cercles
            </button>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Eyebrow tone="accent">Cercle · {selectedCircle.department}</Eyebrow>
                <H1>{selectedCircle.name}</H1>
                <Lead>{selectedCircle.description}</Lead>
                <P2>{selectedCircle.memberCount + (isMember ? 1 : 0)} membres</P2>
              </div>
              {isMember ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button kind="secondary" size="sm" leading={<Icon name="plus" size={14} />} onClick={() => setPostOpen(true)}>Publier</Button>
                  <Button kind="primary" size="sm" leading={<Icon name="calendar" size={14} color="white" />} onClick={() => setEventOpen(true)}>Événement</Button>
                </div>
              ) : (
                <Button kind="primary" onClick={() => setJoinTarget(selectedCircle)}>Rejoindre</Button>
              )}
            </header>

            {circleEvents.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <H2 style={{ fontSize: 'var(--text-lg)' }}>Événements à venir</H2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {circleEvents.map((e) => <EventCard key={e.id} event={e} circles={circles} onParticipate={isMember ? participate : undefined} />)}
                </div>
              </section>
            )}

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
              <H2 style={{ fontSize: 'var(--text-lg)' }}>Fil du cercle</H2>
              {circlePosts.length === 0 && <P2>Aucune publication pour l’instant.</P2>}
              {circlePosts.map((p) => (
                <PostCard key={p.id} post={p} canReply={isMember} onReply={addReply} onReport={() => setReportPostId(p.id)} />
              ))}
            </section>
          </>
        )}
      </div>

      {joinTarget && (
        <CircleJoinDialog circle={joinTarget} isOpen={!!joinTarget} onClose={() => setJoinTarget(null)} onJoin={joinCircle} onOpenCharter={() => { setJoinTarget(null); setCharterOpen(true); }} />
      )}
      {postOpen && selectedCircle && (
        <CreatePostDialog circleName={selectedCircle.name} isOpen={postOpen} onClose={() => setPostOpen(false)} onCreate={createPost} />
      )}
      {eventOpen && selectedCircle && (
        <CreateEventDialog circle={selectedCircle} isOpen={eventOpen} onClose={() => setEventOpen(false)} onCreate={createEvent} />
      )}
      {reportPostId && (
        <ReportDialog isOpen={!!reportPostId} onClose={() => setReportPostId(null)} onReport={flagPost} />
      )}
      {charterOpen && <CommunityCharterModal isOpen={charterOpen} onClose={() => setCharterOpen(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes                                                              */
/* ------------------------------------------------------------------ */

function CircleCard({ circle, isMember, onOpen, onJoin }: { circle: Circle; isMember: boolean; onOpen: () => void; onJoin: () => void }) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', color: 'var(--fg-strong)' }}>{circle.name}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--fg-muted)' }}>{circle.memberCount + (isMember ? 1 : 0)} membres</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunk)', color: 'var(--fg-2)' }}>{circle.department}</span>
        </div>
        <P2 style={{ minHeight: 38 }}>{circle.description}</P2>
        {isMember ? (
          <Button kind="accent2" onClick={onOpen}>Ouvrir le cercle</Button>
        ) : (
          <Button kind="secondary" onClick={onJoin}>Rejoindre</Button>
        )}
      </div>
    </Card>
  );
}

function EventCard({ event, circles, onParticipate }: { event: CircleEvent; circles: Circle[]; onParticipate?: (id: string, status: Participation) => void }) {
  const circle = circles.find((c) => c.id === event.circleId);
  return (
    <Card tone="accentSoft">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow tone="accent">{EVENT_TYPE_LABELS[event.type]}</Eyebrow>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{event.title}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
          <Icon name="calendar" size={13} /> {formatEventDate(event.startsAt)}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-2)' }}>
          <Icon name="compass" size={13} /> {event.meetingPointName}{circle ? ` · ${circle.city}` : ''}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-muted)' }}>{event.participants} participant{event.participants > 1 ? 's' : ''}</span>
        {onParticipate && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button kind={event.myStatus === 'going' ? 'primary' : 'secondary'} size="sm" onClick={() => onParticipate(event.id, 'going')}>Je participe</Button>
            <Button kind={event.myStatus === 'maybe' ? 'accent2' : 'ghost'} size="sm" onClick={() => onParticipate(event.id, 'maybe')}>Peut-être</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function PostCard({ post, canReply, onReply, onReport }: { post: CirclePost; canReply: boolean; onReply: (postId: string, content: string) => void; onReport: () => void }) {
  const [reply, setReply] = useState('');
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Eyebrow tone={post.type === 'annonce' ? 'accent' : 'accent2'}>{POST_TYPE_LABELS[post.type]}</Eyebrow>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)' }}>{post.authorName} · {relativeTime(post.createdAt)}</span>
        </div>
        {post.title && <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>{post.title}</span>}
        <P>{post.content}</P>

        {post.replies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
            {post.replies.map((r) => (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--fg-strong)' }}>{r.authorName} · {relativeTime(r.createdAt)}</span>
                <P2 style={{ color: 'var(--fg)' }}>{r.content}</P2>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {canReply ? (
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Répondre…"
                aria-label="Votre réponse"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-strong)' }}
              />
              <Button kind="secondary" size="sm" onClick={() => { if (reply.trim().length >= 2) { onReply(post.id, reply.trim()); setReply(''); } }}>Envoyer</Button>
            </div>
          ) : <span />}
          <button type="button" onClick={onReport} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
            Signaler
          </button>
        </div>
      </div>
    </Card>
  );
}
