"use client";

import * as React from "react";

/**
 * Custom hook that automatically re-fetches data when:
 * 1. The user switches back to the tab or unlocks phone screen (visibilitychange)
 * 2. Window gets focus
 * 3. Periodic background poll every `intervalMs` (default: 15s) while window is active
 */
export function useAutoRefresh(callback: () => void | Promise<void>, intervalMs = 15000) {
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        savedCallback.current();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    let timer: NodeJS.Timeout | null = null;
    if (intervalMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          savedCallback.current();
        }
      }, intervalMs);
    }

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);
}
