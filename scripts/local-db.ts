#!/usr/bin/env bun
/* Локальная PostgreSQL для разработки (embedded-postgres, без прав админа).
   Запуск: bun run db:local
   Данные хранятся в .pgdata/ (исключена из git). После запуска:
   bun run db:push && bun run db:seed */

import EmbeddedPostgres from "embedded-postgres";

const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
  } catch {
    /* уже инициализирована — просто стартуем */
  }
  await pg.start();
  try {
    await pg.createDatabase("podelkin");
  } catch {
    /* база уже существует */
  }
  console.log("PostgreSQL запущен: postgresql://postgres:postgres@localhost:5432/podelkin");
  console.log("Схема: bun run db:push · Сид: bun run db:seed · Остановка: Ctrl+C");

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error("Не удалось запустить PostgreSQL:", error);
  process.exit(1);
});
