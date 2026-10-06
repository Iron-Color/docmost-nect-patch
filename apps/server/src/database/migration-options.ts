// Upstream and downstream migrations have independent timestamps. An official
// installation can already have newer upstream migrations, and an older fork
// can be missing earlier upstream migrations. Keep existing names/history and
// apply only pending migrations in name order. Missing migration files still fail.
export const migrationOptions = {
  allowUnorderedMigrations: true,
} as const;
