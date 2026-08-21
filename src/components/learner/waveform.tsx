import { cn } from "@/lib/cn";

const BARS = [0, 1, 2, 3, 4, 5, 6];

/**
 * The seven-bar waveform. Dimmed at rest, animated while speaking — the design
 * ties this to the audio state rather than showing a static graphic.
 */
export function Waveform({
  active,
  className,
  height = 22,
  grow,
}: {
  active: boolean;
  className?: string;
  height?: number;
  grow?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-[3px] transition-opacity duration-200",
        active ? "opacity-100" : "opacity-[0.28]",
        className,
      )}
      style={{ height }}
      aria-hidden="true"
    >
      {BARS.map((index) => (
        <div
          key={index}
          className={cn("origin-bottom rounded-sm bg-ink", grow ? "flex-1" : "w-1")}
          style={{
            height,
            animation: active
              ? `wave ${0.52 + (index % 3) * 0.16}s ease-in-out ${index * 0.07}s infinite`
              : "none",
            transform: active ? undefined : "scaleY(0.28)",
          }}
        />
      ))}
    </div>
  );
}
