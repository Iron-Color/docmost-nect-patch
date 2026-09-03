import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('discord_registration_configs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('label', 'varchar', (col) => col.notNull())
    .addColumn('guild_id', 'varchar', (col) => col.notNull())
    .addColumn('role_id', 'varchar', (col) => col.notNull())
    .addColumn('creator_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('discord_registration_configs_rule_unique', [
      'workspace_id',
      'guild_id',
      'role_id',
    ])
    .execute();

  await db.schema
    .createIndex('discord_registration_configs_workspace_id_idx')
    .on('discord_registration_configs')
    .column('workspace_id')
    .execute();

  await db.schema
    .createTable('discord_registration_attempts')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('state_hash', 'varchar', (col) => col.unique())
    .addColumn('registration_token_hash', 'varchar', (col) => col.unique())
    .addColumn('discord_user_id', 'varchar', (col) => col)
    .addColumn('discord_email', 'varchar', (col) => col)
    .addColumn('discord_name', 'varchar', (col) => col)
    .addColumn('matched_guild_id', 'varchar', (col) => col)
    .addColumn('matched_role_id', 'varchar', (col) => col)
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('verified_at', 'timestamptz', (col) => col)
    .addColumn('completed_at', 'timestamptz', (col) => col)
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('discord_registration_attempts_workspace_id_idx')
    .on('discord_registration_attempts')
    .column('workspace_id')
    .execute();
  await db.schema
    .createIndex('discord_registration_attempts_expires_at_idx')
    .on('discord_registration_attempts')
    .column('expires_at')
    .execute();

  await db.schema
    .createTable('discord_account_links')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('discord_user_id', 'varchar', (col) => col.notNull())
    .addColumn('guild_id', 'varchar', (col) => col.notNull())
    .addColumn('role_id', 'varchar', (col) => col.notNull())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('discord_account_links_user_unique', ['user_id'])
    .addUniqueConstraint('discord_account_links_workspace_user_unique', [
      'workspace_id',
      'discord_user_id',
    ])
    .execute();

  await db.schema
    .createIndex('discord_account_links_workspace_id_idx')
    .on('discord_account_links')
    .column('workspace_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('discord_account_links').execute();
  await db.schema.dropTable('discord_registration_attempts').execute();
  await db.schema.dropTable('discord_registration_configs').execute();
}
