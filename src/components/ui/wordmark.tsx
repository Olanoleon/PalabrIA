export function Wordmark({ className }: { className?: string }) {
  return (
    <div
      className={
        "font-display text-[20px] font-bold tracking-[-0.03em] " + (className ?? "")
      }
    >
      Palabr<span className="text-brand">IA</span>
    </div>
  );
}
