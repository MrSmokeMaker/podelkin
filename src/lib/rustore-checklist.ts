/* Чек-лист готовности PWA к упаковке и публикации в RuStore.
   Только для локальной проверки перед сборкой — НЕ импортировать в продакшн-страницы.
   Запуск: импортировать runRustoreChecklist в dev-сборке и вызвать из консоли. */

export interface ChecklistItem {
  level: "error" | "warning" | "ok";
  message: string;
}

export interface RustoreChecklistResult {
  status: "ready" | "warnings" | "not-ready";
  headline: "✅ Готово" | "⚠️ Есть предупреждения" | "❌ Не готово";
  items: ChecklistItem[];
  missingManifestFields: string[];
  missingFiles: string[];
}

interface ManifestEntry {
  src?: unknown;
}

interface ManifestLike {
  name?: unknown;
  short_name?: unknown;
  start_url?: unknown;
  display?: unknown;
  icons?: unknown;
  screenshots?: unknown;
}

const REQUIRED_FIELDS = ["name", "short_name", "start_url"] as const;

export async function runRustoreChecklist(): Promise<RustoreChecklistResult> {
  const items: ChecklistItem[] = [];
  const missingManifestFields: string[] = [];
  const missingFiles: string[] = [];

  /* 1. Манифест: берём адрес из <link rel="manifest">, как это делает браузер */
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const manifestUrl = link?.href ?? null;
  let manifest: ManifestLike | null = null;

  if (!manifestUrl) {
    items.push({
      level: "error",
      message: 'Тег <link rel="manifest"> не найден на странице',
    });
  } else {
    try {
      const res = await fetch(manifestUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = (await res.json()) as ManifestLike;
      items.push({ level: "ok", message: `Манифест загружен: ${manifestUrl}` });
    } catch {
      items.push({ level: "error", message: `Манифест не загрузился: ${manifestUrl}` });
    }
  }

  /* 2. Обязательные поля манифеста */
  if (manifest) {
    for (const field of REQUIRED_FIELDS) {
      const value = manifest[field];
      if (typeof value !== "string" || value.trim() === "") {
        missingManifestFields.push(field);
      }
    }
    if (manifest.display !== "standalone") {
      missingManifestFields.push("display=standalone");
    }
    const icons = Array.isArray(manifest.icons) ? (manifest.icons as ManifestEntry[]) : [];
    if (icons.length < 2) {
      missingManifestFields.push("минимум 2 иконки");
    }

    if (missingManifestFields.length > 0) {
      items.push({
        level: "error",
        message: `В манифесте нет обязательного: ${missingManifestFields.join(", ")}`,
      });
    } else {
      items.push({
        level: "ok",
        message: `Обязательные поля на месте, иконок: ${icons.length}`,
      });
    }
  }

  /* 3. Service Worker */
  if (!("serviceWorker" in navigator)) {
    items.push({
      level: "warning",
      message: "Service Worker не поддерживается этим браузером",
    });
  } else if (!navigator.serviceWorker.controller) {
    items.push({
      level: "warning",
      message:
        "Service Worker пока не контролирует страницу — перезагрузите её после первой регистрации (в dev-превью воркер разрегистрируется намеренно)",
    });
  } else {
    items.push({ level: "ok", message: "Service Worker активен и контролирует страницу" });
  }

  /* 4. HTTPS (localhost — разрешённое исключение для разработки) */
  if (window.location.protocol === "https:") {
    items.push({ level: "ok", message: "Протокол HTTPS" });
  } else if (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) {
    items.push({
      level: "warning",
      message: "HTTP допустим только на localhost — для публикации обязателен HTTPS",
    });
  } else {
    items.push({
      level: "error",
      message: "Нет HTTPS: PWA, установка и упаковка в стор работать не будут",
    });
  }

  /* 5. Файлы иконок и скриншотов из манифеста */
  if (manifest) {
    const baseUrl = manifestUrl ?? window.location.href;
    const iconSrcs = srcList(manifest.icons);
    const screenshotSrcs = srcList(manifest.screenshots);
    const allSrcs = [...new Set([...iconSrcs, ...screenshotSrcs])];

    if (allSrcs.length === 0) {
      items.push({
        level: "warning",
        message: "В манифесте не указаны ни иконки, ни скриншоты",
      });
    }

    const checks = await Promise.all(
      allSrcs.map(async (src) => ({ src, exists: await fileExists(new URL(src, baseUrl).href) }))
    );
    for (const { src, exists } of checks) {
      if (exists) continue;
      missingFiles.push(src);
      items.push({ level: "error", message: `Файл из манифеста не найден: ${src}` });
    }
    const found = checks.length - missingFiles.length;
    if (checks.length > 0 && missingFiles.length === 0) {
      items.push({
        level: "ok",
        message: `Файлы из манифеста на месте: ${found}/${checks.length}`,
      });
    }
  }

  const hasError = items.some((item) => item.level === "error");
  const hasWarning = items.some((item) => item.level === "warning");
  const status = hasError ? "not-ready" : hasWarning ? "warnings" : "ready";
  const headline =
    status === "ready" ? "✅ Готово" : status === "warnings" ? "⚠️ Есть предупреждения" : "❌ Не готово";

  console.log(`RuStore checklist — ${headline}`);
  for (const item of items) {
    const mark = item.level === "ok" ? "✅" : item.level === "warning" ? "⚠️" : "❌";
    console.log(`${mark} ${item.message}`);
  }

  return { status, headline, items, missingManifestFields, missingFiles };
}

function srcList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry && typeof entry === "object" ? (entry as ManifestEntry).src : null))
    .filter((src): src is string => typeof src === "string" && src.length > 0);
}

async function fileExists(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    const get = await fetch(url, { cache: "no-store" });
    return get.ok;
  } catch {
    return false;
  }
}
