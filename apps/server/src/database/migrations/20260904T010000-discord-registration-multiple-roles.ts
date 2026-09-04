import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Registration attempts expire after ten minutes. Clearing them avoids
  // carrying partially verified attempts across the rule schema change.
  await db.deleteFrom('discord_registration_attempts').execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .dropConstraint('discord_registration_configs_rule_unique')
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .addColumn('role_ids', sql`varchar[]`)
    .addColumn('role_match_mode', 'varchar', (col) =>
      col.notNull().defaultTo('any'),
    )
    .execute();

  await sql`
    UPDATE discord_registration_configs
    SET role_ids = ARRAY[role_id]::varchar[]
  `.execute(db);

  await db.schema
    .alterTable('discord_registration_configs')
    .alterColumn('role_ids', (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .dropColumn('role_id')
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .addUniqueConstraint('discord_registration_configs_rule_set_unique', [
      'workspace_id',
      'guild_id',
      'role_ids',
      'role_match_mode',
    ])
    .execute();

  await sql`
    ALTER TABLE discord_registration_configs
    ADD CONSTRAINT discord_registration_configs_role_ids_count_check
      CHECK (cardinality(role_ids) BETWEEN 1 AND 10),
    ADD CONSTRAINT discord_registration_configs_role_match_mode_check
      CHECK (role_match_mode IN ('any', 'all'))
  `.execute(db);

  await db.schema
    .alterTable('discord_registration_attempts')
    .addColumn('matched_config_id', 'uuid', (col) =>
      col.references('discord_registration_configs.id').onDelete('set null'),
    )
    .dropColumn('matched_guild_id')
    .dropColumn('matched_role_id')
    .execute();

  await db.schema
    .alterTable('discord_account_links')
    .addColumn('role_ids', sql`varchar[]`)
    .addColumn('role_match_mode', 'varchar', (col) =>
      col.notNull().defaultTo('any'),
    )
    .execute();

  await sql`
    UPDATE discord_account_links
    SET role_ids = ARRAY[role_id]::varchar[]
  `.execute(db);

  await db.schema
    .alterTable('discord_account_links')
    .alterColumn('role_ids', (col) => col.setNotNull())
    .dropColumn('role_id')
    .execute();

  await sql`
    ALTER TABLE discord_account_links
    ADD CONSTRAINT discord_account_links_role_ids_count_check
      CHECK (cardinality(role_ids) BETWEEN 1 AND 10),
    ADD CONSTRAINT discord_account_links_role_match_mode_check
      CHECK (role_match_mode IN ('any', 'all'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom('discord_registration_attempts').execute();

  await sql`
    ALTER TABLE discord_account_links
    DROP CONSTRAINT discord_account_links_role_ids_count_check,
    DROP CONSTRAINT discord_account_links_role_match_mode_check
  `.execute(db);

  await db.schema
    .alterTable('discord_account_links')
    .addColumn('role_id', 'varchar')
    .execute();

  await sql`
    UPDATE discord_account_links
    SET role_id = role_ids[1]
  `.execute(db);

  await db.schema
    .alterTable('discord_account_links')
    .alterColumn('role_id', (col) => col.setNotNull())
    .dropColumn('role_ids')
    .dropColumn('role_match_mode')
    .execute();

  await db.schema
    .alterTable('discord_registration_attempts')
    .addColumn('matched_guild_id', 'varchar')
    .addColumn('matched_role_id', 'varchar')
    .dropColumn('matched_config_id')
    .execute();

  await sql`
    ALTER TABLE discord_registration_configs
    DROP CONSTRAINT discord_registration_configs_role_ids_count_check,
    DROP CONSTRAINT discord_registration_configs_role_match_mode_check
  `.execute(db);

  await db.schema
    .alterTable('discord_registration_configs')
    .dropConstraint('discord_registration_configs_rule_set_unique')
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .addColumn('role_id', 'varchar')
    .execute();

  await sql`
    UPDATE discord_registration_configs
    SET role_id = role_ids[1]
  `.execute(db);

  await db.schema
    .alterTable('discord_registration_configs')
    .alterColumn('role_id', (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .dropColumn('role_ids')
    .dropColumn('role_match_mode')
    .execute();

  await db.schema
    .alterTable('discord_registration_configs')
    .addUniqueConstraint('discord_registration_configs_rule_unique', [
      'workspace_id',
      'guild_id',
      'role_id',
    ])
    .execute();
}
