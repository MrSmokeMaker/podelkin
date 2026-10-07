"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* оффлайн-кэш недоступен — приложение работает как обычно */
      });
    }
  }, []);

  return null;
}
