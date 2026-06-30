import { useMemo, type CSSProperties } from 'react';
import './NightSkyBackground.css';

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
};

const SHOOTING_STARS = [
  { id: 0, x: 18, y: 8, delay: 2.5, cycle: 14 },
  { id: 1, x: 62, y: 14, delay: 8, cycle: 18 },
  { id: 2, x: 80, y: 6, delay: 14, cycle: 16 },
] as const;

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function generateStars(count: number): Star[] {
  const rand = seededRandom(42);
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: rand() * 100,
    y: rand() * 62,
    size: 0.9 + rand() * 1.3,
    opacity: 0.22 + rand() * 0.43,
    delay: rand() * 6,
    duration: 3 + rand() * 4,
  }));
}

export function NightSkyBackground() {
  const stars = useMemo(() => generateStars(16), []);

  return (
    <div className="lp-sky" aria-hidden="true">
      <div className="lp-sky__lift" />
      <div className="lp-sky__pool lp-sky__pool--1" />
      <div className="lp-sky__pool lp-sky__pool--2" />
      <div className="lp-sky__pool lp-sky__pool--3" />

      {stars.map((star) => (
        <span
          key={star.id}
          className="lp-sky__star"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              '--star-opacity': star.opacity,
              '--star-delay': `${star.delay}s`,
              '--star-duration': `${star.duration}s`,
            } as CSSProperties
          }
        />
      ))}

      {SHOOTING_STARS.map((star) => (
        <span
          key={star.id}
          className="lp-sky__shooting-star"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              '--shoot-delay': `${star.delay}s`,
              '--shoot-cycle': `${star.cycle}s`,
            } as CSSProperties
          }
        />
      ))}

      <div className="lp-sky__moon">
        <div className="lp-sky__moon-pulse" />
        <div className="lp-sky__moon-glow" />
        <div className="lp-sky__moon-disc" />
      </div>
    </div>
  );
}
