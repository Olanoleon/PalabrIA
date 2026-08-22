/**
 * Confetti geometry, shared by the result screen and the celebration sheets.
 *
 * Deterministic from a seed rather than `Math.random`, for two reasons: server
 * and client must agree during hydration, and a re-render must not restart a
 * burst that is already half-way across the screen.
 *
 * Pure — no React, no DOM — so the burst can be reasoned about (and, if it ever
 * matters, tested) without mounting anything.
 */

const COLORS = ["#EA580C", "#15803D", "#F59E0B", "#FFFFFF", "#C2410C"];

/** A burst origin, in percentages of the containing box. */
export type Origin = { x: number; y: number };

export type ConfettiPiece = {
  id: string;
  style: Record<string, string | number>;
};

function seeded(seed: string) {
  let state = 0;
  for (const ch of seed) state = (state * 31 + ch.charCodeAt(0)) % 100_000;
  return (min: number, max: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return min + (state / 2147483648) * (max - min);
  };
}

/**
 * `count` pieces spread evenly across `origins`.
 *
 * One origin gives the single outward burst the result screen has always used;
 * several give the staggered, overlapping volleys a first level-up deserves.
 */
export function confettiPieces({
  seed,
  count,
  origins = [{ x: 50, y: 50 }],
  spread = [70, 145],
  delay = [0, 220],
}: {
  seed: string;
  count: number;
  origins?: Origin[];
  /** Min/max travel distance in px. */
  spread?: [number, number];
  /** Min/max animation delay in ms. */
  delay?: [number, number];
}): ConfettiPiece[] {
  const rand = seeded(seed);
  const perOrigin = Math.ceil(count / origins.length);

  return Array.from({ length: count }, (_, i) => {
    const origin = origins[Math.floor(i / perOrigin)] ?? origins[0];
    const withinOrigin = i % perOrigin;
    const angle =
      (withinOrigin / perOrigin) * Math.PI * 2 + rand(-0.16, 0.16);
    const distance = rand(spread[0], spread[1]);
    const round = i % 3 === 0;
    const width = round ? rand(7, 10) : rand(6, 11);

    return {
      id: `${origin.x}-${origin.y}-${i}`,
      style: {
        position: "absolute",
        left: `${origin.x}%`,
        top: `${origin.y}%`,
        width: `${width}px`,
        height: `${round ? width : rand(9, 15)}px`,
        marginLeft: `${-width / 2}px`,
        marginTop: "-6px",
        background: COLORS[i % COLORS.length],
        border: "1.5px solid #1B1611",
        borderRadius: round ? "50%" : "2px",
        pointerEvents: "none",
        opacity: 0,
        "--tx": `${Math.cos(angle) * distance * 0.95}px`,
        "--ty": `${Math.sin(angle) * distance * 0.62 + rand(30, 80)}px`,
        "--rot": `${rand(-540, 540)}deg`,
        animation: `burst ${rand(1000, 1650).toFixed(0)}ms cubic-bezier(.15,.75,.35,1) ${rand(delay[0], delay[1]).toFixed(0)}ms forwards`,
      },
    };
  });
}
