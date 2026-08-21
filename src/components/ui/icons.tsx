/**
 * Icons, transcribed from the design source. All 24x24 stroke icons unless
 * noted, so they share one visual weight.
 */
type Props = { size?: number; className?: string };

function Stroke({
  d,
  size = 21,
  className,
  strokeWidth = 1.9,
}: Props & { d: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export const PathIcon = (p: Props) => (
  <Stroke
    {...p}
    d="M6.2 19.6a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8M17.8 8.8a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8M8.6 17.2c4-.5 7-1.8 7-4.6 0-2.6-2.6-3.4-2.6-5.4"
  />
);

export const BoardIcon = (p: Props) => (
  <Stroke {...p} d="M5 20V11M12 20V4M19 20v-6M3.5 20h17" />
);

export const PaymentIcon = (p: Props) => (
  <Stroke
    {...p}
    d="M3.5 8.5h17v9a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5v-9M3.5 8.5l2-3.2A1.5 1.5 0 016.8 4.5h10.4a1.5 1.5 0 011.3.8l2 3.2M8 13h4"
  />
);

export const ProfileIcon = (p: Props) => (
  <Stroke {...p} d="M12 4.8a3.5 3.5 0 100 7 3.5 3.5 0 000-7M5 20c1.5-3.4 4-5.1 7-5.1s5.5 1.7 7 5.1" />
);

export const TrophyIcon = (p: Props) => (
  <Stroke
    {...p}
    strokeWidth={1.7}
    d="M9 3h6l-1.6 5h-2.8L9 3M12 9.2a5 5 0 100 10 5 5 0 000-10M12 11.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9"
  />
);

export const SignOutIcon = (p: Props) => (
  <Stroke {...p} d="M14.5 4.5H6.5A1.5 1.5 0 005 6v12a1.5 1.5 0 001.5 1.5h8M15 8.5l3.5 3.5L15 15.5M18.5 12H10" />
);

export const HelpIcon = (p: Props) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    aria-hidden="true"
  >
    <path d="M9 8.5a3 3 0 116 0c0 2-3 2.2-3 4.2M12 16.6v.9" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const CheckIcon = ({ size = 12, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const FlameIcon = ({ size = 13, className }: Props) => (
  <svg width={(size * 12) / 13} height={size} viewBox="0 0 12 14" fill="none" className={className} aria-hidden="true">
    <path
      d="M6 1C6 1 9.5 4 9.5 7.5C9.5 10 8 13 6 13C4 13 2.5 10 2.5 7.5C2.5 6 3.5 5 3.5 5C3.5 7 4.5 7.5 5 7.5C5.8 7.5 6 6 6 1Z"
      fill="currentColor"
    />
  </svg>
);

export const SpeakerIcon = ({ size = 15, className }: Props) => (
  <svg width={size} height={(size * 14) / 16} viewBox="0 0 16 14" fill="none" className={className} aria-hidden="true">
    <path d="M1 5h3l4-3.5v11L4 9H1V5z" fill="currentColor" />
    <path d="M11 4.5c1 1.4 1 3.6 0 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ChevronRight = ({ size = 15, className }: Props) => (
  <svg width={(size * 8) / 14} height={size} viewBox="0 0 8 14" fill="none" className={className} aria-hidden="true">
    <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ChevronLeft = ({ size = 16, className }: Props) => (
  <svg width={(size * 12) / 20} height={size} viewBox="0 0 12 20" fill="none" className={className} aria-hidden="true">
    <path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const ChevronRightBig = ({ size = 16, className }: Props) => (
  <svg width={(size * 12) / 20} height={size} viewBox="0 0 12 20" fill="none" className={className} aria-hidden="true">
    <path d="M2 2l8 8-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const ChevronDown = ({ size = 9, className }: Props) => (
  <svg width={(size * 14) / 9} height={size} viewBox="0 0 14 9" fill="none" className={className} aria-hidden="true">
    <path d="M1 7.5L7 1.5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlayIcon = ({ size = 20, className }: Props) => (
  <svg width={(size * 18) / 20} height={size} viewBox="0 0 18 20" className={className} aria-hidden="true">
    <path d="M3 2l13 8-13 8V2z" fill="currentColor" />
  </svg>
);

export const CopyIcon = (p: Props) => (
  <Stroke {...p} size={p.size ?? 16} strokeWidth={1.8} d="M9 9V6.5A1.5 1.5 0 0110.5 5h7A1.5 1.5 0 0119 6.5v7a1.5 1.5 0 01-1.5 1.5H15M5 10.5A1.5 1.5 0 016.5 9h7A1.5 1.5 0 0115 10.5v7A1.5 1.5 0 0113.5 19h-7A1.5 1.5 0 015 17.5v-7z" />
);

/**
 * Sparkles — the conventional mark for an AI action. Two four-pointed stars,
 * drawn in the same stroke weight as the rest of the set.
 */
export const SparkleIcon = ({ size = 16, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M10 3.5l1.5 4.1 4.1 1.5-4.1 1.5L10 14.7l-1.5-4.1L4.4 9.1l4.1-1.5L10 3.5z" />
    <path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </svg>
);

export const AreaGlyph = ({ iconKey, size = 22 }: { iconKey: string; size?: number }) => {
  const paths: Record<string, string> = {
    body: "M12 3.5a2 2 0 100 4 2 2 0 000-4M8 9h8M12 9v6M9.5 20l2.5-4 2.5 4",
    food: "M7 3v7a2.5 2.5 0 005 0V3M9.5 3v5M17 3c-1.4 1.6-1.4 4.4 0 6v12M12 15v6",
    sparkle: "M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8L12 3.5z",
  };
  return <Stroke d={paths[iconKey] ?? paths.sparkle} size={size} strokeWidth={1.8} />;
};
