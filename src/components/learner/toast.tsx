"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastApi = { say: (message: string) => void };

const ToastContext = createContext<ToastApi>({ say: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/** The design's dark pill that rises from the bottom and clears after 2.6s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  const api = useMemo(() => ({ say }), [say]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-[18px] bottom-[86px] z-90 mx-auto max-w-[424px] animate-rise rounded-2xl bg-ink px-[15px] py-[13px] text-[13px] font-medium leading-[1.45] text-paper"
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
