# Рукоделие — DIY crafts PWA

Пошаговые мастер-классы по рукоделию с каталогом, запасами, списками покупок,
режимом мастера, API и архитектурой монетизации (тарифы Free / Premium / Admin).
Фронтенд и бэкенд — одно приложение Next.js (App Router), TypeScript, Tailwind.

## Запуск

```bash
bun install
cp .env.example .env.local   # необязательно: значения по умолчанию уже рабочие
bun run dev                  # фронтенд + API на http://localhost:3000
```

Продакшен-сборка:

```bash
bun run build
bun run start
```

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `PORT` | `3000` | Порт dev-сервера |
| `LANG` | `ru` | Язык интерфейса и локаль поиска |
| `MONETIZATION_MODE` | `local` | Режим тарифов: `local` \| `staging` \| `production`. В `staging` позже подключаются тестовые платежи провайдера |
| `DEFAULT_ROLE` | `free` | Роль по умолчанию, когда в запросе нет `?role=` или `x-user-role` |
| `ENABLE_OFFLINE_SYNC` | `false` | Офлайн-синхронизация Premium (предкэш топ-50 поделок и проектов). Пока `false`, запуск только ручным mock-сигналом (см. PWA) |
| `DATABASE_URL` | — | Зарезервировано для PostgreSQL + Prisma; сейчас не используется |

## Стек и отличия от исходного ТЗ

Исходное ТЗ предполагало Node.js + Express + PostgreSQL + Prisma. Среда
выполнения не имеет доступа к сети, поэтому новые пакеты установить нельзя,
а превью рендерит только Next.js. По оговорке ТЗ о fallback использованы
эквиваленты с тем же контрактом API:

| По ТЗ | Реализовано здесь |
|---|---|
| Express-сервер | Route Handlers Next.js (`src/app/api/**/route.ts`) в том же процессе |
| PostgreSQL + Prisma | Слой данных в памяти `src/lib/db.ts` с моделями Craft, PriceBookItem, InventoryItem, Project, Board, Synonym |
| Миграции + seed | Сид выполняется при старте модуля: 15 поделок, 41 позиция прайс-бука, 40 позиций запасов, 3 проекта, 5 досок, 6 синонимов |
| tsvector + trigram | Нормализация (ё→е, нижний регистр, чистка пунктуации) + расширение синонимов + ранжирование по полям (`src/lib/search.ts`) |
| zod | Ручная валидация тела запросов с понятными сообщениями об ошибках |
| `server/middleware/auth.middleware.ts` | `src/lib/auth.ts` — тот же мок-слой аутентификации |
| `server/utils/featureFlags.ts` | `src/lib/feature-flags.ts` — тот же движок фича-флагов |
| `server/routes/*.ts` | Route Handlers: `/api/stats`, `/api/export/*`, `/api/boards` |
| `frontend/hooks`, `frontend/pages` | `src/hooks/use-feature-flags.ts`, App Router-страницы `/stats`, `/export`, `/boards` |

## API

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/health` | все | Проверка живости |
| GET | `/api/crafts?q&category&difficulty&maxTimeMin&sort` | все | Поиск с фасетами |
| GET | `/api/inventory` | все | Список запасов |
| POST | `/api/inventory` | все | Добавить/обновить позицию (upsert по названию) |
| DELETE | `/api/inventory/:id` | все | Удалить позицию |
| GET | `/api/available` | все | Обратный поиск: что можно делать прямо сейчас |
| GET · POST | `/api/projects` | все | Список / создание проекта |
| GET | `/api/projects/:id` | все | Проект по id |
| PUT | `/api/projects/:id/step` | все | Отметить шаг, записать время |
| GET | `/api/stats?role=free\|premium` | все | Free — базовые поля; premium — плюс разбивки, экономия, тренды |
| GET | `/api/export/summary.txt` | все | Базовая текстовая сводка |
| GET | `/api/export/detailed.csv` | premium | CSV: время по шагам, стоимость материалов, отклонение от плана |
| GET · POST | `/api/boards` | все | Доски; POST проверяет лимит тарифа |

Роль в мок-аутентификации передаётся через `?role=` или заголовок `x-user-role`
(`free` | `premium` | `admin`); без них действует `DEFAULT_ROLE`.

Примеры:

```bash
curl -s "localhost:3000/api/crafts?q=свеча"           # синоним «свечка» тоже найдёт
curl -s "localhost:3000/api/crafts?category=Дерево&sort=time"
curl -s "localhost:3000/api/available" | head -c 600
curl -s -X POST localhost:3000/api/projects \
  -H "content-type: application/json" \
  -d '{"craftSlug":"amigurumi-kotenok"}'
curl -s -X PUT localhost:3000/api/projects/prj-03/step \
  -H "content-type: application/json" \
  -d '{"stepIndex":3,"minutesSpent":35}'
curl -s "localhost:3000/api/stats"                    # free: только базовые поля
curl -s "localhost:3000/api/stats?role=premium"       # + разбивки и тренды
curl -s "localhost:3000/api/export/summary.txt" -o summary.txt
curl -s "localhost:3000/api/export/detailed.csv?role=premium" -o detailed.csv
curl -s -X POST "localhost:3000/api/boards?role=free" \
  -H "content-type: application/json" \
  -d '{"title":"Подарки"}'                            # 403 после 3 досок
```

Поиск возвращает фасеты по категориям и сложности, посчитанные по текстовому
совпадению (до фильтров). Каждый результат несёт `baseCost` и
`missingPrices` — материалы без цены видны явно.

## Калькулятор стоимости

`src/lib/cost-calculator.ts` — чистая функция: материалы поделки × прайс-бук.
Конвертация единиц через таблицу соответствий (г→кг, мл→л, см→м; штучные
единицы без конверсии). `computeBaseCost` бросает `CostError` с понятным
текстом, если цены нет или единицы несовместимы; `collectCost` собирает всё,
что удалось посчитать, и перечисляет материалы без цены. Каждый источник
цены содержит дату актуализации прайса.

## Монетизация

### Тарифы

| Возможность | Free | Premium | Admin |
|---|---|---|---|
| Поиск, каталог, режим мастера | ✓ | ✓ | ✓ |
| Базовая статистика (`totalCrafts`, `avgTime`, `avgCost`, `mostUsedMaterial`) | ✓ | ✓ | ✓ |
| Сохранение 1 проекта / неограниченно | 1 | ∞ | ∞ |
| Экспорт сводки `.txt` | ✓ | ✓ | ✓ |
| Расширенная аналитика (стоимость по категориям, время по сложности, экономия, тренды материалов) | — | ✓ | ✓ |
| Экспорт `.csv` (пошаговое время, стоимость, отклонение от плана) | — | ✓ | ✓ |
| Офлайн-синхронизация (предкэш топ-50 поделок и проектов) | — | ✓ | ✓ |
| Доски | до 3 | до 20 | до 20 |
| Приоритетная поддержка (плейсхолдер) | — | ✓ | ✓ |
| Управление сидом | — | — | ✓ |

Пример цен (плейсхолдеры): Free — 0 ₽; Premium — 199 ₽/мес или 1 490 ₽/год
(скидка ~38%); годовая подписка показывает баннер экономии. A/B-тесты цены
и paywall'а проводятся по `MONETIZATION_MODE=staging`: события
`upgrade_click` (клик по заблокированному элементу) и `plan_view`
(просмотр страницы «Экспорт»/«Доски») отправляются в аналитику, когда
подключён реальный провайдер.

### Как работает гейтинг

- **Сервер.** `src/lib/feature-flags.ts` — карта «роль → фичи», `resolveFeatures(role)`
  возвращает `{ allowed, blocked }`. `src/lib/auth.ts` — мок-аутентификация:
  `getAuthUser(request)` определяет роль и возвращает пользователя
  `{ id, role, features, boardLimit }`. Эндпоинты проверяют
  `features.allowed.includes(...)` и отдают 403 с понятным сообщением.
- **Клиент.** `useFeatureFlags()` (`src/hooks/use-feature-flags.ts`) читает ту же
  статическую карту; демо-роль берётся из `localStorage["rukodelie-role"]`,
  по умолчанию `free`. Элементы закрывают через `has("feature")`:
  не прячем, а показываем с `PremiumBadge` (`src/components/premium-badge.tsx`)
  и `disabled`-состоянием. Бейдж — золотисто-розовый градиент с иконкой короны
  и всплывающей подсказкой.
- **Проверить Premium в превью:** в консоли браузера выполнить
  `localStorage.setItem("rukodelie-role", "premium"); location.reload()`
  (вернуть: `localStorage.removeItem("rukodelie-role")`).

### Где что лежит

| Файл | Роль |
|---|---|
| `src/lib/feature-flags.ts` | Карта тарифов, лимиты досок, `resolveFeatures` |
| `src/lib/auth.ts` | Мок-аутентификация → объект пользователя |
| `src/app/api/stats/route.ts` | Базовые поля всем, расширенные — premium |
| `src/app/api/export/summary.txt/route.ts` | `.txt` для всех |
| `src/app/api/export/detailed.csv/route.ts` | `.csv` только premium |
| `src/app/api/boards/route.ts` | Лимиты досок 3/20, понятные ошибки 403 |
| `src/hooks/use-feature-flags.ts` | Клиентские флаги (`has`, `boardLimit`, `role`) |
| `src/components/premium-badge.tsx` | Бейдж с подсказкой |
| `src/app/stats/_components/stats-advanced.tsx` | Расширенная секция: premium-данные или locked-карточки |
| `src/app/export/_components/export-client.tsx` | Кнопки `.txt` / `.csv` с гейтингом |
| `src/app/boards/_components/boards-client.tsx` | Визуальный лимит 3 досок + locked-карточки |

## PWA

Service worker (`public/sw.js`) кэширует app shell и статику; обрабатываются
только GET-запросы. POST/PUT/DELETE идут напрямую в сеть — кэш не мешает
мутациям.

**Тест офлайна:** DevTools → Application → Service Workers → Offline
(или остановить `bun run dev`): навигация по посещённым страницам работает
из кэша, мутации честно падают с сообщением об ошибке сети.

**Стратегии кэша по тарифам:**

- **Free** — только app shell и статика (кэш `rukodelie-v2`, core-страницы
  при установке + cache-first с фоновым обновлением для всех GET).
- **Premium** — дополнительно предкэш топ-50 поделок (`/api/crafts`,
  страницы `/craft/<slug>`) и недавних проектов (`/api/projects`).
  Пока `ENABLE_OFFLINE_SYNC=false`, сигнал отправляется вручную:

```js
navigator.serviceWorker.controller.postMessage({
  type: "RUKODELIE_SYNC",
  premium: true,
});
```

Free-клиент, отправивший такой сигнал, получит ответ
`{ type: "RUKODELIE_SYNC_RESULT", premium: false }` и ничего не предкэширует.
Когда появится реальная сессия, сигнал будет отправляться автоматически
из клиентского кода при `has("offlineSync")`.

## Расширяемость

- **Реальная авторизация (JWT/OAuth).** Единственная точка — `getAuthUser`
  в `src/lib/auth.ts`: заменить чтение `?role=` на проверку подписи токена
  и загрузку пользователя из БД; вернуть тот же `{ id, role, features,
  boardLimit }`. Все эндпоинты и фронтенд продолжат работать без правок.
- **Платёжный провайдер.** Добавить Route Handlers `src/app/api/billing/*`
  (создание сессии оплаты, вебхук). Вебхук по `MONETIZATION_MODE`:
  `staging` — тестовые платежи, `production` — боевые. Успешная оплата
  меняет `role` пользователя в БД; фича-флаги пересчитываются из карты,
  UI подхватит роль автоматически.
- **Расширение stats API.** Новые premium-поля добавляются в ветку
  `advancedStats` в `src/app/api/stats/route.ts`; тип `PremiumStats`
  в `stats-advanced.tsx` дополняется теми же полями.
- **Новая фича.** Добавить значение в `Feature` и в `ROLE_FEATURES`
  (`src/lib/feature-flags.ts`) → проверить на сервере через
  `getAuthUser(request).features.allowed` → закрыть в UI через
  `has("feature")` + `PremiumBadge` + `disabled`-состояние.

## Contributing

Структура:

```
src/
  app/                  # страницы и API (App Router)
    api/                # Route Handlers: crafts, inventory, projects, stats, export, boards
    catalog/ stats/ export/ boards/ inventory/ build/   # страницы
    [route]/_components # компоненты конкретной страницы
  components/           # общие UI (craft-card, premium-badge, toast, site-nav…)
  hooks/                # use-feature-flags и др.
  lib/                  # feature-flags, auth, db, search, cost-calculator, crafts
  data/mockData.ts      # сид-данные
public/sw.js            # service worker
```

Правила, чтобы не сломать Free-тариф:

1. Новые возможности по умолчанию попадают в `free`; premium-фичи — только
   через фича-флаг, `PremiumBadge` и `disabled`-состояние (не прятать
   полностью — пользователь должен видеть, что продаётся).
2. Все серверные проверки дублируются: UI-гейтинг — это UX, а не защита;
   доступ решает `getAuthUser` на сервере.
3. Тексты интерфейса и ошибок — на русском, тон дружелюбный.
4. Цвета — пастельные токены темы (`clay-soft`, `sand-soft`, `sage-soft`,
   `mist-soft`, `blush-soft`), layout mobile-first, цели касания от 48px.
5. Мутации через API не кэшируются service worker'ом (только GET).

## Ограничения и миграция на PostgreSQL

- Слой данных живёт в памяти процесса: мутации сбрасываются при перезапуске
  сервера. Каталог, прайс-бук, запасы, доски и три демо-проекта пересоздаются
  из сида.
- Для переноса на PostgreSQL достаточно заменить функции `src/lib/db.ts` на
  Prisma-запросы (схема моделей совпадает), поднять базу
  (`docker run -e POSTGRES_PASSWORD=rukodelie -p 5432:5432 postgres:16`),
  задать `DATABASE_URL`, выполнить `npx prisma migrate dev` и
  `npx prisma db seed`. Поисковый конвейер заменяется на
  `ts_rank` + `similarity()` — контракт `/api/crafts` сохранится.
