import { Link } from 'react-router-dom';

import { plate1, plate2, plate3 } from '@/assets';
import { Button, FeatureCard } from '@/components/ui';

export function Landing() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-primary text-5xl leading-tight font-medium">
            Find your next role —
            <br />
            without mass applying.
          </h1>

          <p className="text-secondary mt-8 text-lg leading-relaxed">
            A personal job assistant for Israeli Market.
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
            title="Paste profile"
            description={
              <>
                Upload resume or LinkedIn.
                <br />
                No formatting required.
              </>
            }
            backgroundImage={plate1}
          />

          {/* Card 2: Match jobs */}
          <FeatureCard
            title="Match jobs"
            description={
              <>
                Roles ranked by relevance.
                <br />
                Fewer, higher-quality matches.
              </>
            }
            backgroundImage={plate2}
          />

          {/* Card 3: Generate CV */}
          <FeatureCard
            title="Generate CV"
            description={
              <>
                Tailored resume per role.
                <br />
                No one-click spam.
              </>
            }
            backgroundImage={plate3}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 text-center">
        <p className="text-muted text-sm">A personal job assistant for Israeli Market.</p>
      </footer>
    </div>
  );
}
