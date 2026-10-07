"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    /* В dev-превью cache-first воркер раздаёт устаревшие чанки после
       пересборки и ломает страницу — там офлайн-кэш не нужен. */
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* оффлайн-кэш недоступен — приложение работает как обычно */
    });
  }, []);

  return null;
}
