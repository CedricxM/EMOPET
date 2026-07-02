import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo, MetricCard, WavePattern } from '../components/brand';
import { Icon } from '../components/ui';

const navItems = [
  { href: '#mat', label: 'MAT' },
  { href: '#tag', label: 'TAG' },
  { href: '#eli', label: 'ELI' },
  { href: '/dashboard', label: 'App' },
];

const linkButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 'var(--radius-pill)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  fontWeight: 700,
  textDecoration: 'none',
} as const;

export default function HomePage() {
  return (
    <div className="landing-page">
      <section
        style={{
          position: 'relative',
          minHeight: '78vh',
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          background: 'var(--emopet-cream)',
        }}
      >
        <Image
          src="/assets/brand/emopet-mat.png"
          alt="Golden retriever resting on the EMOPET MAT sensing surface"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(246,239,231,0.98) 0%, rgba(246,239,231,0.86) 38%, rgba(246,239,231,0.18) 72%, rgba(29,26,106,0.22) 100%)',
          }}
        />
        <div
          className="landing-inner"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '26px clamp(20px, 4vw, 64px) 48px',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              marginBottom: 'auto',
            }}
          >
            <BrandLogo variant="navy" mode="lockup" width={120} priority />
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} aria-label="Landing">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--emopet-navy)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    background: 'rgba(246, 239, 231, 0.62)',
                    border: '1px solid rgba(29, 26, 106, 0.08)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div style={{ maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <h1
              style={{
                margin: 0,
                color: 'var(--emopet-navy)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(54px, 9vw, 118px)',
                lineHeight: 0.92,
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              EMOPET
            </h1>
            <p
              style={{
                margin: 0,
                color: 'var(--emopet-navy)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(24px, 4vw, 44px)',
                lineHeight: 1.1,
                fontWeight: 700,
                maxWidth: 560,
              }}
            >
              Smart care. Strong bond.
            </p>
            <p
              style={{
                margin: 0,
                color: 'var(--fg-2)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-lg)',
                lineHeight: 1.7,
                maxWidth: 560,
              }}
            >
              A premium connected pet-care system for non-medical dog wellbeing insights,
              built around observed routines, confidence-based interpretation, and a
              quieter way to understand daily changes at home.
            </p>
            <div className="brand-cta-row">
              <Link
                href="/dashboard"
                style={{
                  ...linkButton,
                  color: 'var(--fg-on-dark)',
                  background: 'var(--emopet-navy)',
                  boxShadow: '0 14px 34px rgba(29, 26, 106, 0.22)',
                }}
              >
                Open the app
              </Link>
              <Link
                href="#system"
                style={{
                  ...linkButton,
                  color: 'var(--emopet-navy)',
                  background: 'rgba(246, 239, 231, 0.72)',
                  border: '1px solid rgba(29, 26, 106, 0.22)',
                }}
              >
                Explore MAT + TAG
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="landing-section" style={{ paddingTop: 42 }}>
        <div className="landing-inner landing-grid-3">
          <MetricCard
            label="MAT"
            value="Reference surface"
            detail="An instrumented bed surface that observes rest continuity, movement transitions, and context windows."
            confidence="At-home signals"
            icon={<Icon name="mat" size={22} />}
          />
          <MetricCard
            label="TAG"
            value="Wearable context"
            detail="A refined collar module that adds movement, sound context, temperature, and daily activity patterns."
            tone="teal"
            confidence="Secondary sensing"
            icon={<Icon name="tag" size={22} />}
          />
          <MetricCard
            label="ELI"
            value="Confidence layer"
            detail="The Emotional Load Index summarizes non-medical indicators only when signal quality is sufficient."
            tone="navy"
            confidence="Cautious output"
            icon={<Icon name="wave" size={22} />}
          />
        </div>
      </section>

      <ProductSection
        id="mat"
        title="MAT, the calm reference surface"
        body="The MAT is the stable sensing base of the EMOPET system. It observes rest phases, weight distribution changes, and movement rhythms in the place where routines naturally happen."
        detail="No cameras, no invasive setup, no clinical framing. The goal is to help owners better understand observed routines and discuss meaningful variations with the right professional context when needed."
        image="/assets/brand/emopet-mat.png"
        alt="EMOPET MAT sensing surface with a dog resting at home"
        icon="mat"
      />

      <ProductSection
        id="tag"
        reverse
        title="TAG, refined wearable context"
        body="The TAG complements the MAT with collar-based behavioral and contextual sensing. It is designed to feel premium and discreet, with a soft technology language rather than a harsh device aesthetic."
        detail="Together, MAT and TAG create a richer view of activity, transitions, and environmental context without turning the dog into a score or a fixed label."
        image="/assets/brand/emopet-tag.png"
        alt="EMOPET TAG wearable module with spiral signal motif"
        icon="tag"
      />

      <section id="eli" className="landing-section" style={{ background: 'var(--emopet-navy)', color: 'var(--fg-on-dark)' }}>
        <div className="landing-inner landing-grid-2">
          <div className="landing-product-copy">
            <span style={sectionLabelStyle}>ELI v6</span>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1, fontWeight: 700 }}>
              Interpretation only when confidence is strong enough.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', lineHeight: 1.75, color: 'rgba(246, 239, 231, 0.78)' }}>
              ELI combines MAT and TAG signals into non-medical indicators. When signal quality is partial,
              the interface reduces certainty instead of over-interpreting the moment.
            </p>
          </div>
          <AppPreview />
        </div>
      </section>

      <section className="landing-section" style={{ background: 'var(--cream-50)' }}>
        <div className="landing-inner landing-grid-2">
          <div className="landing-navy-panel" style={{ minHeight: 360, padding: 32 }}>
            <WavePattern tone="dark" opacity={0.58} />
            <BrandLogo variant="white" mode="lockup" width={170} />
            <p style={{ margin: '54px 0 0', maxWidth: 460, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-2xl)', lineHeight: 1.35, fontWeight: 700 }}>
              Premium care, local roots, and a calmer relationship with everyday data.
            </p>
          </div>
          <div className="landing-product-copy">
            <span style={sectionLabelStyle}>Non-medical by design</span>
            <h2 style={sectionTitleStyle}>Warm technology, not a clinical dashboard.</h2>
            <p style={sectionBodyStyle}>
              EMOPET avoids affective labels and clinical-style claims. It presents observations, trends,
              confidence levels, and context so owners can follow daily wellbeing signals without turning
              normal life into a medical interface.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ position: 'relative', overflow: 'hidden', background: 'var(--emopet-navy)', color: 'var(--fg-on-dark)', padding: '44px clamp(20px, 4vw, 64px)' }}>
        <WavePattern tone="dark" opacity={0.36} />
        <div className="landing-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <BrandLogo variant="white" mode="lockup" width={150} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(246, 239, 231, 0.72)' }}>
            Smart care. Strong bond.
          </span>
        </div>
      </footer>
    </div>
  );
}

const sectionLabelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--emopet-orange)',
} as const;

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--emopet-navy)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(32px, 5vw, 56px)',
  lineHeight: 1.02,
  fontWeight: 700,
} as const;

const sectionBodyStyle = {
  margin: 0,
  color: 'var(--fg-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-lg)',
  lineHeight: 1.75,
} as const;

function ProductSection({
  id,
  title,
  body,
  detail,
  image,
  alt,
  icon,
  reverse = false,
}: {
  id: string;
  title: string;
  body: string;
  detail: string;
  image: string;
  alt: string;
  icon: 'mat' | 'tag';
  reverse?: boolean;
}) {
  const copy = (
    <div className="landing-product-copy">
      <span style={sectionLabelStyle}>{id.toUpperCase()}</span>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <p style={sectionBodyStyle}>{body}</p>
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          padding: 18,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--fg-2)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span style={{ color: 'var(--emopet-orange)', display: 'inline-flex', marginTop: 2 }}>
          <Icon name={icon} size={22} />
        </span>
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
          {detail}
        </p>
      </div>
    </div>
  );

  const media = (
    <div className="landing-media" style={{ aspectRatio: '16 / 11' }}>
      <Image src={image} alt={alt} fill sizes="(max-width: 980px) 100vw, 48vw" style={{ objectFit: 'cover' }} />
    </div>
  );

  return (
    <section id={id} className="landing-section">
      <div className="landing-inner landing-grid-2">
        {reverse ? media : copy}
        {reverse ? copy : media}
      </div>
    </section>
  );
}

function AppPreview() {
  return (
    <div className="landing-navy-panel" style={{ minHeight: 520, padding: 28, background: '#14123A' }}>
      <WavePattern tone="dark" opacity={0.48} />
      <div
        style={{
          width: 'min(100%, 360px)',
          margin: '0 auto',
          borderRadius: 36,
          padding: 12,
          background: '#05062D',
          border: '1px solid rgba(246, 239, 231, 0.16)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div
          style={{
            borderRadius: 28,
            minHeight: 468,
            background: 'linear-gradient(180deg, #1D1A6A 0%, #111047 100%)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <BrandLogo variant="white" mode="mark" width={44} height={44} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18 }}>emopet</span>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(246, 239, 231, 0.62)' }}>
              Today
            </span>
            <h3 style={{ margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.15, fontWeight: 700 }}>
              Observed routines are steady.
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PreviewTile label="Rest continuity" value="7 h 42" color="var(--emopet-teal)" />
            <PreviewTile label="ELI window" value="Valid" color="var(--emopet-orange)" />
          </div>
          <div style={{ padding: 16, borderRadius: 18, background: 'rgba(246, 239, 231, 0.09)', border: '1px solid rgba(246, 239, 231, 0.12)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(246, 239, 231, 0.62)' }}>
              Confidence-based interpretation
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
              {[48, 72, 58, 82, 66, 76, 70].map((height, index) => (
                <span
                  key={index}
                  style={{
                    flex: 1,
                    height,
                    borderRadius: 999,
                    background: index === 3 ? 'var(--emopet-orange)' : 'var(--emopet-teal)',
                    opacity: index === 3 ? 0.96 : 0.72,
                  }}
                />
              ))}
            </div>
          </div>
          <p style={{ margin: 'auto 0 0', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.6, color: 'rgba(246, 239, 231, 0.72)' }}>
            Observations and trends only. EMOPET keeps interpretation cautious when signals are partial.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: 'rgba(246, 239, 231, 0.1)', border: '1px solid rgba(246, 239, 231, 0.12)' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(246, 239, 231, 0.58)' }}>
        {label}
      </span>
      <strong style={{ display: 'block', marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 20, color, lineHeight: 1 }}>
        {value}
      </strong>
    </div>
  );
}
