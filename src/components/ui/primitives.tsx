/**
 * Shared surfaces. Every one carries the design's ink border plus a hard offset
 * shadow; pressable ones move into their own shadow on :active.
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  dashed,
  shadow = "flat-2",
  ...rest
}: ComponentProps<"div"> & { dashed?: boolean; shadow?: "none" | "flat-1" | "flat-2" | "flat-3" }) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-[18px] border-2 border-ink bg-surface",
        dashed ? "border-dashed" : "border-solid",
        shadow !== "none" && shadow,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.1em] text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Display({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "div";
}) {
  return (
    <Tag className={cn("font-display font-semibold tracking-[-0.03em]", className)}>
      {children}
    </Tag>
  );
}

const CHIP = "inline-flex items-center gap-[5px] rounded-full border-[1.5px] border-ink px-[10px] py-[5px] text-[12px] font-semibold";

export function Chip({
  children,
  tone = "paper",
  className,
}: {
  children: ReactNode;
  tone?: "paper" | "soft" | "pass" | "ghost";
  className?: string;
}) {
  const tones = {
    paper: "bg-surface text-ink",
    soft: "bg-brand-soft text-ink",
    pass: "bg-pass-soft text-pass-deep border-pass",
    ghost: "bg-transparent text-muted border-muted-line",
  };
  return <span className={cn(CHIP, tones[tone], className)}>{children}</span>;
}

const BUTTON_BASE =
  "press inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-ink font-bold disabled:opacity-60";

const BUTTON_TONES = {
  primary: "bg-brand text-brand-ink hard-2 font-display text-[16.5px]",
  secondary: "bg-surface text-ink hard-2 text-[14px]",
  soft: "bg-brand-soft text-ink hard-1 text-[13.5px]",
  quiet: "border-muted-line bg-locked text-muted-3 text-[14px] shadow-none",
} as const;

export type ButtonTone = keyof typeof BUTTON_TONES;

export function Button({
  tone = "primary",
  className,
  ...rest
}: ComponentProps<"button"> & { tone?: ButtonTone }) {
  return (
    <button
      {...rest}
      className={cn(BUTTON_BASE, BUTTON_TONES[tone], "px-4 py-[14px]", className)}
    />
  );
}

export function ButtonLink({
  tone = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { tone?: ButtonTone }) {
  return (
    <Link
      {...rest}
      className={cn(BUTTON_BASE, BUTTON_TONES[tone], "px-4 py-[14px]", className)}
    />
  );
}

/** Square icon button — the back chevron and the card arrows. */
export function IconButton({
  className,
  ...rest
}: ComponentProps<"button">) {
  return (
    <button
      {...rest}
      className={cn(
        "press grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface hard-1",
        className,
      )}
    />
  );
}

export function IconButtonLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...rest}
      className={cn(
        "press grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface hard-1",
        className,
      )}
    />
  );
}

/** Circular completion ring — area cards and the result screen. */
export function ProgressRing({
  size,
  stroke,
  progress,
  color,
  children,
  className,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  children?: ReactNode;
  className?: string;
}) {
  const radius = size / 2 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="#FFFFFF"
          stroke="#1B1611"
          strokeWidth={size > 100 ? 2.5 : 2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.3,.9,.3,1)" }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      ) : null}
    </div>
  );
}

/** Avatar initials disc. Colour is derived from the name so it is stable. */
const AVATAR_COLORS = [
  "#FDBA74",
  "#A7D8C0",
  "#F9C6CE",
  "#C9D7F2",
  "#E8D9A8",
  "#C2E0EE",
];

export function avatarColor(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function initialsOf(name: string): string {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = 28,
  className,
  color,
}: {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 border-ink font-bold text-ink",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: color ?? avatarColor(name),
        fontSize: Math.max(10, size * 0.36),
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

/** The dashed note card used for the XP explainer and sign-in hint. */
export function NoteCard({
  children,
  className,
  tone = "soft",
}: {
  children: ReactNode;
  className?: string;
  tone?: "soft" | "cream";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-ink p-[14px] text-[12.5px] leading-[1.5] text-body-2",
        tone === "soft" ? "bg-brand-soft" : "bg-cream",
        className,
      )}
    >
      {children}
    </div>
  );
}
