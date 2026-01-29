import { Link } from 'react-router-dom';

import { gridBg } from '@/assets';

export function Landing() {
  return (
    <div className="relative">
      {/* Background grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] invert"
        style={{
          backgroundImage: `url(${gridBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-primary text-5xl leading-tight font-medium">
            Find your next role —
            <br />
            without mass applying.
          </h1>

          <p className="text-secondary mt-8 text-lg leading-relaxed">
            A personal job assistant for Israeli market.
            <br />
            We analyze roles and explain why they fit you.
          </p>

          <Link
            to="/register"
            className="bg-accent hover:bg-accent-hover mt-10 inline-block rounded-lg px-6 py-3 text-base font-medium text-white transition-colors"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative px-4 pb-24">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Paste profile */}
          <div className="bg-card relative overflow-hidden rounded-xl p-6 shadow-sm">
            <div
              className="absolute top-0 bottom-0 left-0 w-1"
              style={{
                background: 'linear-gradient(to bottom, #3B82F6, #06B6D4)',
              }}
            />
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h3 className="text-primary text-lg font-medium">Paste profile</h3>
            </div>
            <p className="text-secondary text-sm leading-relaxed">
              Upload resume or LinkedIn.
              <br />
              No formatting required.
            </p>
          </div>

          {/* Card 2: Match jobs */}
          <div className="bg-card relative overflow-hidden rounded-xl p-6 shadow-sm">
            <div
              className="absolute top-0 bottom-0 left-0 w-1"
              style={{
                background: 'linear-gradient(to bottom, #3B82F6, #14B8A6)',
              }}
            />
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <h3 className="text-primary text-lg font-medium">Match jobs</h3>
            </div>
            <p className="text-secondary text-sm leading-relaxed">
              Roles ranked by relevance.
              <br />
              Fewer, higher-quality matches.
            </p>
          </div>

          {/* Card 3: Generate CV */}
          <div className="bg-card relative overflow-hidden rounded-xl p-6 shadow-sm">
            <div
              className="absolute top-0 bottom-0 left-0 w-1"
              style={{
                background: 'linear-gradient(to bottom, #FBBF24, #22C55E)',
              }}
            />
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <h3 className="text-primary text-lg font-medium">Generate CV</h3>
            </div>
            <p className="text-secondary text-sm leading-relaxed">
              Tailored resume per role.
              <br />
              No one-click spam.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 text-center">
        <p className="text-muted text-sm">A personal job assistant for Product Israeli market.</p>
      </footer>
    </div>
  );
}
