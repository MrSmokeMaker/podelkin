# Podelkin — DIY crafts PWA

«Podelkin» превращает хобби в систему: пошаговые мастер-классы с калькулятором
стоимости и списками покупок помогают сэкономить деньги и время, а запасы, доски
настроения и статистика мастерской показывают, на что уходит бюджет и как растёт
мастерство — от первой свечи до серийных подарков своими руками.

## Стек и почему он такой

- **Next.js 16 (App Router) + React 19 + TypeScript** — фронтенд и API в одном
  процессе: один деплой, общие типы между страницами и Route Handlers,
  типобезопасность от сида до UI.
- **Tailwind CSS** — консистентный пастельный дизайн на токенах темы
  (`paper`, `ink`, `clay-soft`…): одинаковые отступы, радиусы и цвета во всех
  компонентах без ручной CSS-работы.
- **shadcn/ui + lucide-react** — доступные готовые компоненты и иконки вместо
  самописных: меньше багов в a11y и мобильных жестах.
- **Слой данных в памяти (`src/lib/db.ts`)** — fallback вместо PostgreSQL +
  Prisma (в среде нет сети для установки пакетов): тот же контракт моделей
  (Craft, PriceBookItem, InventoryItem, Project, Board, Synonym), замена на
  Prisma — переписать один файл (см. «Миграция на PostgreSQL»). Каталог
  «Поделок» — соседний `src/lib/catalog-db.ts`, тоже в памяти.
- **PWA (manifest + service worker)** — установка на телефон и офлайн-доступ
  к посещённым страницам; для Premium — предкэш топ-50 поделок.

## Запуск

Локально (нужен [bun](https://bun.sh); PostgreSQL не требуется — данные в памяти):

1. `bun install` — установить зависимости.
2. `cp .env.example .env.local` — создать env (необязательно: значения по
   умолчанию уже рабочие).
3. Миграции и сид не нужны: слой данных в памяти сидируется при старте
   (15 поделок, 41 позиция прайс-бука, 40 запасов, 3 проекта, 5 досок,
   6 синонимов).
4. `bun run dev` — фронтенд + API на `http://localhost:3000`.
5. Продакшен: `bun run build && bun run start`.
6. Проверка перед релизом: `bun run release:check`.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `PORT` | `3000` | Порт dev-сервера |
| `LANG` | `ru` | Язык интерфейса и локаль поиска |
| `MONETIZATION_MODE` | `local` | Режим тарифов: `local` \| `staging` \| `production` |
| `DEFAULT_ROLE` | `free` | Роль по умолчанию без `?role=` / `x-user-role` |
| `ENABLE_OFFLINE_SYNC` | `false` | Офлайн-синхронизация Premium (предкэш топ-50) |
| `DATABASE_URL` | — | Зарезервировано для PostgreSQL + Prisma |

## Отличия от исходного ТЗ

ТЗ предполагало React + Vite + Express + Prisma + PostgreSQL. Среда без сети не
позволяет ставить новые пакеты, а превью рендерит только Next.js, поэтому
использованы эквиваленты с тем же контрактом API:

| По ТЗ | Реализовано здесь |
|---|---|
| Vite + React | Next.js App Router + React 19 (тот же стек-уровень, плюс SSR/SSG) |
| Express-сервер | Route Handlers `src/app/api/**/route.ts` в том же процессе |
| PostgreSQL + Prisma | In-memory слой `src/lib/db.ts` (миграция — см. ниже) |
| `server/middleware/auth.middleware.ts` | `src/lib/auth.ts` |
| `server/utils/featureFlags.ts` | `src/lib/feature-flags.ts` |
| zod-валидация | Ручная валидация тел запросов с понятными ошибками |

## API

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/health` | все | Проверка живости |
| GET | `/api/crafts?q&category&difficulty&maxTimeMin&sort` | все | Поиск с фасетами |
| POST | `/api/crafts/from-ai?role=` | все | AI-черновик мастер-класса по текстовому описанию (квота на день) |
| POST | `/api/drafts/:id/approve` | все | Одобрить черновик → готовая поделка с картинкой |
| GET | `/api/source-search?q=` | все | Живой поиск по 1001zagotovka.ru и only-paper.ru |
| GET · POST | `/api/catalog` | все | «Поделки»: GET — список; POST FormData — вручную; POST JSON `{url}` — импорт со страницы-источника |
| GET · POST · DELETE | `/api/inventory[/:id]` | все | Запасы (upsert по названию, DELETE — по id) |
| GET | `/api/available` | все | Что можно сделать прямо сейчас |
| GET · POST | `/api/projects` | все | Проекты; GET `/api/projects/:id` — один проект |
| PUT | `/api/projects/:id/step` | все | Отметить шаг, записать время |
| GET | `/api/stats?role=free\|premium` | все | Free — базовые поля; premium — разбивки, экономия, тренды |
| GET | `/api/stats/ai` | все | Счётчики LLM/картинок и остаток дневной квоты |
| GET | `/api/export/summary.txt` | все | Текстовая сводка |
| GET | `/api/export/detailed.csv` | premium | CSV: время по шагам, стоимость, отклонение |
| GET · POST | `/api/boards` | все | Доски; POST проверяет лимит тарифа |
| GET | `/api/diag/image-provider` | все | Диагностика провайдера картинок |

Роль в мок-аутентификации — `?role=` или заголовок `x-user-role`
(`free` | `premium` | `admin`); без них действует `DEFAULT_ROLE`.

```bash
curl -s "localhost:3000/api/crafts?q=свеча"           # синоним «свечка» тоже найдёт
curl -s "localhost:3000/api/stats?role=premium"       # расширенная аналитика
curl -s "localhost:3000/api/export/detailed.csv?role=premium" -o detailed.csv
curl -s -X POST "localhost:3000/api/boards?role=free" \
  -H "content-type: application/json" -d '{"title":"Подарки"}'   # 403 после 3 досок
curl -s "localhost:3000/api/source-search?q=матрёшка"           # варианты с двух сайтов-источников
curl -s -X POST localhost:3000/api/catalog \
  -H "content-type: application/json" \
  -d '{"url":"https://1001zagotovka.ru/catalog/matrioshka-15"}'  # импорт МК в «Поделки» без AI
```

## Генерация и импорт мастер-классов

Страница «Генерация» (`/generate`) — два независимых сценария.

**С нуля (AI):** текстовый промпт → POST `/api/crafts/from-ai` строит черновик
(шаги, материалы, инструменты, промпт для картинки); при провале валидации —
ровно один автоматический повтор, повтор темы за сутки берётся из кэша и не
списывает квоту. «Одобрить и создать» → POST `/api/drafts/:id/approve` —
поделка с отрисованной картинкой.

**Из источника (без AI и без квоты):** в поле ссылки можно вставить URL
мастер-класса или вводить слова — сработает живой поиск (`/api/source-search`,
debounce 400 мс) по 1001zagotovka.ru и only-paper.ru. Кнопка «Из источника»
отправляет URL на POST `/api/catalog` (JSON):

1. сервер скачивает страницу (таймаут 15 с; принимаются только два домена-источника);
2. эвристиками, без ИИ, достаёт заголовок (og:title/h1), итоговое фото
   (og:image или первый крупный img), пошаговую инструкцию (самый длинный
   нумерованный список либо содержательные абзацы), блок материалов
   «Вам понадобится» и время работы;
3. фото сохраняется в `uploads/crafts/` и раздаётся через `/img/[filename]`;
4. поделка сразу попадает в «Поделки» (`src/lib/catalog-db.ts`); сложность
   оценивается по числу шагов, на странице `/podelki/[id]` появляется
   секция «Инструкция».

Повторный импорт той же страницы возвращает уже созданную запись — без
дубликатов. Реальное скачивание страниц работает только там, где есть интернет:
в превью доступна лишь валидация ссылок, полный сценарий проверяйте на хостинге.

## PWA

**Установка на телефон:** открыть сайт в мобильном браузере → «Добавить на
главный экран» (iOS Safari: Поделиться → На экран «Домой»; Android Chrome:
меню → «Установить приложение»). После установки приложение открывается без
адресной строки.

**Офлайн-поведение:** service worker (`public/sw.js`) кэширует app shell
(главная, каталог, запасы, доски, экспорт, статистика) и статику; посещённые
страницы работают из кэша. Обрабатываются только GET-запросы — POST/PUT/DELETE
идут напрямую в сеть, кэш не мешает мутациям; офлайн мутация честно падает
с сообщением о сети.

**Стратегия кэша:**

- **Shell (все тарифы)** — core-страницы предкэшируются при установке
  (cache `rukodelie-v2`), далее cache-first с фоновым обновлением.
- **Premium pre-cache** — по сигналу `RUKODELIE_SYNC { premium: true }`
  дозагружаются топ-50 поделок (`/api/crafts`, страницы `/craft/<slug>`) и
  проекты (`/api/projects`). Free-клиент на такой сигнал ничего не кэширует.
  Пока `ENABLE_OFFLINE_SYNC=false`, сигнал отправляется вручную:

```js
navigator.serviceWorker.controller.postMessage({
  type: "RUKODELIE_SYNC",
  premium: true,
});
```

**Тест офлайна:** DevTools → Application → Service Workers → Offline.

## Монетизация

### Тарифы (пример цен — плейсхолдеры)

| | Basic (Free) | Premium | Family |
|---|---|---|---|
| Цена | 0 ₽ | 199 ₽/мес · 1 490 ₽/год (−38%) | 349 ₽/мес |
| Поиск, каталог, режим мастера | ✓ | ✓ | ✓ |
| Базовая статистика и экспорт `.txt` | ✓ | ✓ | ✓ |
| Проекты | 1 | ∞ | ∞ |
| Доски | до 3 | до 20 | до 20 на участника + общие |
| Расширенная аналитика, экспорт `.csv` | — | ✓ | ✓ |
| Офлайн-синхронизация (топ-50) | — | ✓ | ✓ |
| Приоритетная поддержка (плейсхолдер) | — | ✓ | ✓ |
| Управление сидом (admin) | — | — | — |

### Подключение платежей

Точка интеграции — Route Handlers `src/app/api/billing/*`: создание сессии
оплаты и вебхук. **Stripe**: `checkout.sessions.create` → вебхук
`checkout.session.completed` меняет `role` пользователя в БД. **YooKassa**:
создание платежа через API магазина → вебхук `payment.succeeded`. Вебхук
должен проверять подпись и по `MONETIZATION_MODE` выбирать тестовый/боевой
контур (`staging`/`production`). После смены роли фича-флаги пересчитываются
из карты `src/lib/feature-flags.ts` — UI подхватывает тариф автоматически.

### Как работает гейтинг

- **Сервер.** `resolveFeatures(role)` возвращает `{ allowed, blocked }`;
  `getAuthUser(request)` (`src/lib/auth.ts`) определяет роль и возвращает
  `{ id, role, features, boardLimit }`. Эндпоинты проверяют
  `features.allowed.includes(...)` и отдают 403 с понятным сообщением.
- **Клиент.** `useFeatureFlags()` читает ту же статическую карту; демо-роль —
  `localStorage["rukodelie-role"]` (по умолчанию `free`). Закрытые возможности
  не прячем: показываем с `PremiumBadge` и `disabled`-состоянием.
  Проверить Premium в превью: `localStorage.setItem("rukodelie-role",
  "premium"); location.reload()`.

A/B-тесты цены и paywall'а (события `upgrade_click`, `plan_view`) — в
`docs/monetization-plan.md`.

## Contributing

- **Новая поделка** — добавить запись в `src/data/mockData.ts` (материалы с
  ценами должны быть в прайс-буке, иначе `baseCost` честно покажет
  `missingPrices`).
- **Новая поделка в «Поделках»** — запись в `src/lib/catalog-db.ts` или импорт
  по ссылке со страницы «Генерация» (см. раздел выше).
- **Расширение stats API** — premium-поля в ветку `advancedStats`
  (`src/app/api/stats/route.ts`), тип `PremiumStats` в
  `stats-advanced.tsx` дополнить теми же полями.
- **Новая premium-фича** — значение в `Feature` и `ROLE_FEATURES`
  (`src/lib/feature-flags.ts`) → серверная проверка через `getAuthUser` →
  в UI `has("feature")` + `PremiumBadge` + `disabled` (не прятать —
  пользователь должен видеть, что продаётся).
- Подробнее — `CONTRIBUTING.md` (процесс PR, код-стайл, чек-лист).

## License

MIT — см. текст лицензии в выпуске. Все данные в репозитории (поделки,
прайс-бук, запасы) — демонстрационные образцы, не для коммерческого
использования как фактические расценки.

## Ограничения и миграция на PostgreSQL

- Слой данных живёт в памяти: мутации сбрасываются при перезапуске, сид
  пересоздаётся при старте модуля. Скачанные фото импорта остаются на диске
  (`uploads/crafts`), а ссылки на них — в памяти: после перезапуска записи
  «Поделок» пропадают, файлы можно подчистить.
- Для переноса: заменить функции `src/lib/db.ts` на Prisma-запросы (схема
  моделей совпадает), поднять базу
  (`docker run -e POSTGRES_PASSWORD=rukodelie -p 5432:5432 postgres:16`),
  задать `DATABASE_URL`, выполнить `npx prisma migrate dev && npx prisma db
  seed`. Поисковый конвейер заменяется на `ts_rank` + `similarity()` —
  контракт `/api/crafts` сохранится.
