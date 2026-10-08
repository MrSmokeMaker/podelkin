"use client";

import { useEffect } from "react";

/* InvalidStateError от браузерных API (хранилища, кэш, установка PWA) — шум
   окружения: встроенное превью, приватный режим, партиционированные cookies.
   Приложение не может на это повлиять, поэтому гасим только эту ошибку;
   все остальные по-прежнему всплывают. */
function isEnvironmentNoise(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === "InvalidStateError";
}

export function PwaRegister() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isEnvironmentNoise(event.reason)) {
        event.preventDefault();
        console.debug("Podelkin: браузер отклонил фоновую операцию —", event.reason.message);
      }
    };
    const onError = (event: ErrorEvent) => {
      if (isEnvironmentNoise(event.error)) {
        event.preventDefault();
        console.debug("Podelkin: браузер отклонил фоновую операцию —", event.error.message);
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    /* В dev-превью cache-first воркер раздаёт устаревшие чанки после
       пересборки и ломает страницу — там офлайн-кэш не нужен. */
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.allSettled(registrations.map((registration) => registration.unregister()))
        )
        .catch(() => {
          /* хранилище недоступно — регистрировать нечего */
        });
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.allSettled(keys.map((key) => caches.delete(key))))
          .catch(() => {
            /* кэш недоступен — чистить нечего */
          });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* оффлайн-кэш недоступен — приложение работает как обычно */
    });
  }, []);

  return null;
}
