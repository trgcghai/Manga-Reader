import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCoverPathToCoverKeyAndUrlToKey implements MigrationInterface {
  name = 'RenameCoverPathToCoverKeyAndUrlToKey1784387332858';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasCoverPath = await queryRunner.hasColumn('manga', 'coverPath');
    const hasCoverKey = await queryRunner.hasColumn('manga', 'coverKey');

    if (hasCoverPath && !hasCoverKey) {
      await queryRunner.query(
        `ALTER TABLE "manga" RENAME COLUMN "coverPath" TO "coverKey"`,
      );

      await queryRunner.query(`
        UPDATE "manga"
        SET "coverKey" = regexp_replace("coverKey", '^https?://[^/]+/[^/]+/', '')
        WHERE "coverKey" ~ '^https?://'
      `);
    }

    const hasUrl = await queryRunner.hasColumn('translation', 'url');
    const hasKey = await queryRunner.hasColumn('translation', 'key');

    if (hasUrl && !hasKey) {
      await queryRunner.query(
        `ALTER TABLE "translation" RENAME COLUMN "url" TO "key"`,
      );

      await queryRunner.query(`
        UPDATE "translation"
        SET "key" = regexp_replace("key", '^https?://[^/]+/[^/]+/', '')
        WHERE "key" ~ '^https?://'
      `);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
