import { gridBg } from '@/assets';
import { cn } from '@/utils';

interface GridBackgroundProps {
  className?: string;
}

export const GridBackground = ({ className }: GridBackgroundProps) => {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 opacity-[0.03] invert', className)}
      style={{
        backgroundImage: `url(${gridBg}`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    />
  );
};
