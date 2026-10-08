"use client";

import { useEffect } from "react";

/* InvalidStateError от браузерных API (хранилища, кэш, установка PWA) — шум
   окружения: встроенное превью, приватный режим, партиционированные cookies.
   Приложение не может на это повлиять, поэтому гасим только эту ошибку;
   все остальные по-прежнему всплывают. */
function isEnvironmentNoise(reason: unknown): boolean {
  if (!(reason instanceof DOMException)) return false;
  return (
    reason.name === "InvalidStateError" ||
    reason.message === "The object is in an invalid state."
  );
}

/* Слушатели вешаются на уровне модуля — до первого рендера React,
   чтобы перехватить ошибку, возникающую в самый ранний момент загрузки. */
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (isEnvironmentNoise(event.reason)) {
      event.preventDefault();
      console.debug("Podelkin: браузер отклонил фоновую операцию —", event.reason.message);
    }
  });
  window.addEventListener("error", (event) => {
    if (isEnvironmentNoise(event.error)) {
      event.preventDefault();
      console.debug("Podelkin: браузер отклонил фоновую операцию —", event.error.message);
    }
  });
}

export function PwaRegister() {
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
