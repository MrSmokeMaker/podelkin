/* Офлайн-каталог в IndexedDB: последний ответ /api/catalog живёт на устройстве,
   чтобы список поделок открывался без сети. Хранилище best-effort: любая ошибка
   (приватный режим, закрытое соединение) не должна падать на странице. */
const DB_NAME = "rukodelie-podelki";
const STORE = "catalog";
const KEY = "items";

/* Одно соединение на страницу: параллельные open/close создают гонку,
   на которой IndexedDB бросает InvalidStateError. */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function saveCatalogOffline(items: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(items, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* не критично: офлайн-копия просто не обновится */
  }
}

export async function loadCatalogOffline<T>(): Promise<T | null> {
  try {
    const db = await openDb();
    const result = await new Promise<T | null>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    return result;
  } catch {
    return null;
  }
}
