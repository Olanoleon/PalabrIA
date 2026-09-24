"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renders the page while a background regeneration is running.
 *
 * The work outlives the request that started it, so nothing pushes its result
 * back to whoever is looking: this asks the server again until the unit stops
 * reporting itself as regenerating.
 */
export function RegenerationWatch({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), every);
    return () => clearInterval(id);
  }, [router, every]);
  return null;
}
