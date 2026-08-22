import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const normalizeResult = (result) => ({
  changes: Number(result.changes),
  lastInsertRowid: Number(result.lastInsertRowid),
});

export const createSqliteAdapter = ({ databasePath, appPath }) => {
  const database = new DatabaseSync(databasePath);
  const migrationsDirectory = join(appPath, "database", "migrations");

  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );`);

  const appliedMigration = database.prepare("SELECT 1 FROM schema_migrations WHERE name = ?");
  const recordMigration = database.prepare("INSERT INTO schema_migrations (name) VALUES (?)");
  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrationFiles) {
    if (appliedMigration.get(name)) continue;
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(readFileSync(join(migrationsDirectory, name), "utf8"));
      recordMigration.run(name);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  return {
    all: async (sql, parameters = []) => database.prepare(sql).all(...parameters),
    get: async (sql, parameters = []) => database.prepare(sql).get(...parameters),
    run: async (sql, parameters = []) => normalizeResult(database.prepare(sql).run(...parameters)),
    close: () => database.close(),
  };
};
