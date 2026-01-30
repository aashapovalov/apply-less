interface FeatureCardProps {
  icon: string;
  title: string;
  description: React.ReactNode;
  gradient: string;
}

export function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="bg-card relative overflow-hidden rounded-xl p-6 shadow-sm">
      <div className="absolute top-0 bottom-0 left-0 w-1" style={{ background: gradient }} />
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-primary text-lg font-medium">{title}</h3>
      </div>
      <p className="text-secondary text-sm leading-relaxed">{description}</p>
    </div>
  );
}
