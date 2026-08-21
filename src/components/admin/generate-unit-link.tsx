import Link from "next/link";
import { SparkleIcon } from "@/components/ui/icons";

/**
 * Entry point to AI unit generation. Purple rather than the brand orange so an
 * action that spends money on a model call never sits in the same visual class
 * as an ordinary save.
 */
export function GenerateUnitLink({
  areaId,
  base,
}: {
  areaId: string;
  base: "/admin" | "/super";
}) {
  return (
    <Link
      href={`${base}/content/${areaId}/generate`}
      className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ai px-[14px] py-[9px] text-[13px] font-bold text-ai-ink hard-1"
    >
      <SparkleIcon size={16} />
      Crear unidad con IA
    </Link>
  );
}
