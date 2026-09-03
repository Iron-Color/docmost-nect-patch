import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('spaces')
    .addColumn('is_user_owned', 'boolean', (col) =>
      col.notNull().defaultTo(false),
    )
    .execute();

  await db.schema
    .createIndex('idx_spaces_user_owned_creator')
    .on('spaces')
    .columns(['creator_id', 'is_user_owned'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('idx_spaces_user_owned_creator')
    .ifExists()
    .execute();
  await db.schema.alterTable('spaces').dropColumn('is_user_owned').execute();
}
