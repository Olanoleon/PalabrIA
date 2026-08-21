import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";

/**
 * Where am I. The console has only two levels of content, but without this the
 * area list and a single area were indistinguishable.
 */
export function Breadcrumb({
  trail,
}: {
  trail: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav
      aria-label="Ruta"
      className="flex flex-wrap items-center gap-2 text-[12px] font-semibold"
    >
      {trail.map((step, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={step.label} className="flex items-center gap-2">
            {step.href && !last ? (
              <Link
                href={step.href}
                className="text-muted-2 underline decoration-muted-line underline-offset-2 hover:text-ink"
              >
                {step.label}
              </Link>
            ) : (
              <span className={last ? "text-ink" : "text-muted-2"}>{step.label}</span>
            )}
            {!last ? <ChevronRight size={10} className="text-muted-3" /> : null}
          </span>
        );
      })}
    </nav>
  );
}
