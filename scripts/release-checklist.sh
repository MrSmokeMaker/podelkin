#!/usr/bin/env sh
# Чек-лист перед релизом. Запуск: bun run release:check
# Выводит OK/FAIL по каждому шагу; ненулевой код выхода — если есть FAIL.
set -u

PASS=0
FAIL=0

ok() { echo "OK   — $1"; PASS=$((PASS + 1)); }
bad() { echo "FAIL — $1"; FAIL=$((FAIL + 1)); }

echo "=== Release checklist: Рукоделие ==="

# 1. Переменные окружения: .env.example содержит все ключи монетизации
for var in MONETIZATION_MODE DEFAULT_ROLE ENABLE_OFFLINE_SYNC; do
  if grep -q "^$var=" .env.example 2>/dev/null; then
    ok ".env.example: $var объявлена"
  else
    bad ".env.example: нет $var"
  fi
done

# 2. Данные в памяти — миграции БД не нужны (PostgreSQL зарезервирован)
if grep -q "DATABASE_URL" .env.example 2>/dev/null; then
  ok "DATABASE_URL задокументирована (миграции не требуются: слой данных in-memory)"
else
  bad ".env.example: нет зарезервированной DATABASE_URL"
fi

# 3. Сид-данные на месте
if [ -f src/data/mockData.ts ]; then
  ok "Сид-данные найдены (src/data/mockData.ts)"
else
  bad "Нет src/data/mockData.ts — сид упадёт при старте"
fi

# 4. Сборка проходит
if bun run build > /tmp/rukodelie-build.log 2>&1; then
  ok "bun run build прошёл успешно"
else
  bad "bun run build упал — см. /tmp/rukodelie-build.log"
fi

# 5. PWA manifest: валидный JSON с обязательными полями
if node -e '
  const m = require("./public/manifest.json");
  for (const k of ["name", "short_name", "start_url", "display", "icons"]) {
    if (!m[k]) { console.error("нет поля " + k); process.exit(1); }
  }
  if (!Array.isArray(m.icons) || m.icons.length === 0) {
    console.error("icons пуст"); process.exit(1);
  }
' 2>/dev/null; then
  ok "public/manifest.json валиден (name, short_name, start_url, display, icons)"
else
  bad "public/manifest.json отсутствует или неполный"
fi

# 6. Service worker: кэш-версия поднята (менять при каждом релизе)
if grep -q 'const CACHE = "rukodelie-' public/sw.js 2>/dev/null; then
  ok "public/sw.js: кэш-версия объявлена"
else
  bad "public/sw.js: не найдено объявление CACHE"
fi

echo "=== Итого: $PASS OK, $FAIL FAIL ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Готово к релизу."
