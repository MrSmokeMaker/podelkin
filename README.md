# Рукоделие — DIY crafts PWA

Пошаговые мастер-классы по рукоделию с каталогом, запасами, списками покупок,
режимом мастера и API. Фронтенд и бэкенд — одно приложение Next.js (App Router),
TypeScript, Tailwind.

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

Фронтенд не изменён: страницы читают те же данные, что отдаёт API
(`src/data/mockData.ts` → `src/lib/db.ts`). API доступен внешним клиентам.

## API

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/health` | Проверка живости |
| GET | `/api/crafts?q&category&difficulty&maxTimeMin&sort` | Поиск с фасетами |
| GET | `/api/inventory` | Список запасов |
| POST | `/api/inventory` | Добавить/обновить позицию (upsert по названию) |
| DELETE | `/api/inventory/:id` | Удалить позицию |
| GET | `/api/available` | Обратный поиск: что можно делать прямо сейчас |
| GET | `/api/projects` · POST `/api/projects` | Список / создание проекта |
| GET | `/api/projects/:id` | Проект по id |
| PUT | `/api/projects/:id/step` | Отметить шаг, записать время |
| GET | `/api/stats` | Сводная статистика |

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
curl -s localhost:3000/api/stats
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

## PWA

Service worker (`public/sw.js`) кэширует app shell и статику; обрабатываются
только GET-запросы. POST/PUT/DELETE идут напрямую в сеть — кэш не мешает
мутациям.

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
