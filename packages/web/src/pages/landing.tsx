import { Link } from 'react-router-dom';

import { gridBg } from '@/assets';
import { Button, FeatureCard } from '@/components/ui';

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
            Find your next PM role —
            <br />
            without mass applying.
          </h1>

          <p className="text-secondary mt-8 text-lg leading-relaxed">
            A personal job assistant for Product Managers.
            <br />
            We analyze roles and explain why they fit you.
          </p>

          <Link to="/register" className="mt-10 inline-block">
            <Button className="w-auto px-8">Get started</Button>
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative px-4 pb-24">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Paste profile */}
          <FeatureCard
            icon="📋"
            title="Paste profile"
            description={
              <>
                Upload resume or LinkedIn.
                <br />
                No formatting required.
              </>
            }
            gradient="linear-gradient(to bottom, #3B82F6, #06B6D4)"
          />

          {/* Card 2: Match jobs */}
          <FeatureCard
            icon="🎯"
            title="Match jobs"
            description={
              <>
                Roles ranked by relevance.
                <br />
                Fewer, higher-quality matches.
              </>
            }
            gradient="linear-gradient(to bottom, #3B82F6, #14B8A6)"
          />

          {/* Card 3: Generate CV */}
          <FeatureCard
            icon="📄"
            title="Generate CV"
            description={
              <>
                Tailored resume per role.
                <br />
                No one-click spam.
              </>
            }
            gradient="linear-gradient(to bottom, #FBBF24, #22C55E)"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 text-center">
        <p className="text-muted text-sm">A personal job assistant for Product Managers.</p>
      </footer>
    </div>
  );
}
