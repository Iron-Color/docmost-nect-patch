// Run against a disposable PostgreSQL service, never the application database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Kysely, Migrator, FileMigrationProvider, sql } = require('kysely');
const { PostgresJSDialect } = require('kysely-postgres-js');
const postgres = require('postgres');
const { migrationOptions } = require('../dist/database/migration-options');

const downstream = new Set([
  '20260903T000000-add-user-owned-spaces',
  '20260903T020000-discord-registration',
  '20260904T010000-discord-registration-multiple-roles',
]);
const upstream096 = new Set([
  '20260902T121326-siem-destinations',
  '20260904T171920-public-spaces',
]);

async function main() {
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  assert.equal(url.pathname, '/docmost_migration_tests', 'Use the dedicated disposable test database');
  const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const migrations = await new FileMigrationProvider({
    fs, path, migrationFolder: path.join(__dirname, '../dist/database/migrations'),
  }).getMigrations();
  for (const name of [...downstream, ...upstream096]) assert.ok(migrations[name], name);
  const subset = (exclude) => Object.fromEntries(Object.entries(migrations).filter(([name]) => !exclude.has(name)));
  const provider = (items) => ({ getMigrations: async () => items });
  const migrate = async (db, items, options = {}) => {
    const result = await new Migrator({ db, provider: provider(items), ...options }).migrateToLatest();
    if (result.error) throw result.error;
    return result;
  };
  const history = (db) => db.selectFrom('kysely_migration').selectAll().orderBy('name').execute();

  try {
    for (const fixture of ['official-0.96', 'fork-0.95', 'fresh']) {
      const databaseName = 'docmost_migration_test_' + randomBytes(6).toString('hex');
      // databaseName is generated exclusively from this fixed prefix and hex.
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const client = postgres(url.toString(), { database: databaseName, max: 1, onnotice: () => {} });
      const db = new Kysely({ dialect: new PostgresJSDialect({ postgres: client }) });
      try {
        let existing = [];
        let page;
        let space;
        if (fixture !== 'fresh') {
          await migrate(db, fixture === 'official-0.96' ? subset(downstream) : subset(upstream096));
          existing = await history(db);
          const workspace = await db.insertInto('workspaces').values({ name: 'Migration fixture', hostname: 'upgrade-fixture' }).returning('id').executeTakeFirstOrThrow();
          const user = await db.insertInto('users').values({ name: 'Fixture user', email: 'upgrade@example.invalid', workspace_id: workspace.id }).returning('id').executeTakeFirstOrThrow();
          space = await db.insertInto('spaces').values({ name: 'Keep this space', slug: 'keep-space', workspace_id: workspace.id, creator_id: user.id,
            ...(fixture === 'fork-0.95' ? { is_user_owned: true } : {}),
          }).returning('id').executeTakeFirstOrThrow();
          page = await db.insertInto('pages').values({ title: 'Keep this page', slug_id: 'keep-page', space_id: space.id, workspace_id: workspace.id, creator_id: user.id, text_content: 'Preserve existing content' }).returning('id').executeTakeFirstOrThrow();
          // Reproduce the production failure before enabling the fork policy.
          const strict = await new Migrator({ db, provider: provider(migrations) }).migrateToLatest();
          assert.match(String(strict.error), /corrupted migrations: expected previously executed migration/);
          assert.deepEqual(await history(db), existing, 'Failure must happen before any migration executes');
        }
        const upgraded = await migrate(db, migrations, migrationOptions);
        const expected = fixture === 'fresh' ? Object.keys(migrations) : fixture === 'official-0.96' ? [...downstream] : [...upstream096];
        assert.deepEqual(upgraded.results.map(item => item.migrationName).sort(), expected.sort());
        const after = await history(db);
        for (const item of existing) assert.deepEqual(after.find(row => row.name === item.name), item, 'Previously applied history must remain unchanged');
        assert.equal(after.length, Object.keys(migrations).length);
        assert.equal(new Set(after.map(item => item.name)).size, after.length);
        const tables = await db.introspection.getTables();
        assert.ok(tables.find(table => table.name === 'spaces').columns.some(column => column.name === 'is_user_owned'));
        assert.ok(tables.find(table => table.name === 'discord_registration_configs').columns.some(column => column.name === 'role_ids'));
        assert.ok(tables.some(table => table.name === 'siem_destinations'));
        assert.ok(tables.some(table => table.name === 'public_spaces'));
        if (page) {
          const kept = await db.selectFrom('pages').select(['title', 'text_content']).where('id', '=', page.id).executeTakeFirstOrThrow();
          assert.deepEqual(kept, { title: 'Keep this page', text_content: 'Preserve existing content' });
          assert.equal((await db.selectFrom('spaces').select('is_user_owned').where('id', '=', space.id).executeTakeFirstOrThrow()).is_user_owned, fixture === 'fork-0.95');
        }
        assert.deepEqual((await migrate(db, migrations, migrationOptions)).results, [], 'Restart must not rerun migrations');
        const missing = { ...migrations };
        delete missing[Object.keys(migrations).sort()[0]];
        const invalid = await new Migrator({ db, provider: provider(missing), ...migrationOptions }).migrateToLatest();
        assert.match(String(invalid.error), /previously executed migration .* is missing/);
        assert.deepEqual(await history(db), after);
        console.log(`PASS ${fixture}: real PostgreSQL migration, data/history preservation, repeat startup, missing-file protection`);
      } finally {
        await db.destroy();
        await admin.unsafe(`DROP DATABASE "${databaseName}"`);
      }
    }
  } finally {
    await admin.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
