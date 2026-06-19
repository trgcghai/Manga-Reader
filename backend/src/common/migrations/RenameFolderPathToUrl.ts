import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameFolderPathToUrl implements MigrationInterface {
  name = 'RenameFolderPathToUrl1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasFolderPath = await queryRunner.hasColumn(
      'translation',
      'folderPath',
    );
    const hasUrl = await queryRunner.hasColumn('translation', 'url');

    if (hasFolderPath && !hasUrl) {
      await queryRunner.query(
        `ALTER TABLE "translation" RENAME COLUMN "folderPath" TO "url"`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
