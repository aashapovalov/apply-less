interface FeatureCardProps {
  title: string;
  description: React.ReactNode;
  backgroundImage: string;
}

export function FeatureCard({ title, description, backgroundImage }: FeatureCardProps) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-border-light bg-white shadow-md transition-all duration-300 ease-out hover:shadow-xl hover:shadow-black/10">
      {/* Background image layer - cropped 1px from top */}
      <div
        className="absolute -top-px right-0 bottom-0 left-0 bg-cover bg-center transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-95"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Content overlay */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6">
        <div className="transform transition-transform duration-300 ease-out group-hover:-translate-y-1">
          <h3 className="text-primary mb-2 text-xl font-semibold">{title}</h3>
          <p className="text-secondary text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
