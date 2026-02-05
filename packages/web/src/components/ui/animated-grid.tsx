import { useEffect, useRef } from 'react';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vx: number;
  vy: number;
  angle: number;
  opacity: number;
  blueUntil: number;
  blueProgress: number; // 0 = gray, 1 = fully blue
}

export function AnimatedGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lines: Line[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initLines();
    };

    const initLines = () => {
      const lineCount = Math.floor((canvas.width * canvas.height) / 25000);
      lines = Array.from({ length: Math.min(lineCount, 50) }, () => createLine());
    };

    const createLine = (): Line => {
      const angle = Math.random() * Math.PI;
      const centerX = Math.random() * canvas.width;
      const centerY = Math.random() * canvas.height;
      const halfLength = Math.max(canvas.width, canvas.height) * 1.5;

      return {
        x1: centerX - Math.cos(angle) * halfLength,
        y1: centerY - Math.sin(angle) * halfLength,
        x2: centerX + Math.cos(angle) * halfLength,
        y2: centerY + Math.sin(angle) * halfLength,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        angle,
        opacity: 0.08 + Math.random() * 0.06,
        blueUntil: 0,
        blueProgress: 0,
      };
    };

    // Interpolate between two colors
    const lerpColor = (
      r1: number,
      g1: number,
      b1: number,
      r2: number,
      g2: number,
      b2: number,
      t: number
    ) => {
      return {
        r: Math.round(r1 + (r2 - r1) * t),
        g: Math.round(g1 + (g2 - g1) * t),
        b: Math.round(b1 + (b2 - b1) * t),
      };
    };

    const animate = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Count current blue lines (those with blueUntil in future)
      const blueCount = lines.filter((l) => l.blueUntil > now).length;
      const targetBlueCount = Math.floor(lines.length * 0.075);

      // If we need more blue lines, randomly turn some blue
      if (blueCount < targetBlueCount) {
        const grayLines = lines.filter((l) => l.blueUntil <= now && l.blueProgress < 0.1);
        if (grayLines.length > 0) {
          const randomLine = grayLines[Math.floor(Math.random() * grayLines.length)];
          randomLine.blueUntil = now + 5000 + Math.random() * 5000;
        }
      }

      lines.forEach((line) => {
        const shouldBeBlue = line.blueUntil > now;

        // Smooth transition (ease toward target)
        const transitionSpeed = 0.02; // Adjust for faster/slower transition
        if (shouldBeBlue) {
          line.blueProgress = Math.min(1, line.blueProgress + transitionSpeed);
        } else {
          line.blueProgress = Math.max(0, line.blueProgress - transitionSpeed);
        }

        // Gray: rgb(148, 163, 184)
        // Blue: rgb(59, 130, 246)
        const color = lerpColor(148, 163, 184, 59, 130, 246, line.blueProgress);
        const lineWidth = 1 + line.blueProgress; // 1 to 2

        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${line.opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        line.x1 += line.vx;
        line.y1 += line.vy;
        line.x2 += line.vx;
        line.y2 += line.vy;

        const centerX = (line.x1 + line.x2) / 2;
        const centerY = (line.y1 + line.y2) / 2;

        const margin = Math.max(canvas.width, canvas.height);
        if (centerX < -margin || centerX > canvas.width + margin) {
          line.vx *= -1;
        }
        if (centerY < -margin || centerY > canvas.height + margin) {
          line.vy *= -1;
        }

        if (Math.random() < 0.002) {
          line.vx += (Math.random() - 0.5) * 0.025;
          line.vy += (Math.random() - 0.5) * 0.025;

          const maxVel = 0.15;
          line.vx = Math.max(-maxVel, Math.min(maxVel, line.vx));
          line.vy = Math.max(-maxVel, Math.min(maxVel, line.vy));
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}
