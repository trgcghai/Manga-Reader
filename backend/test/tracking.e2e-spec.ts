/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TrackingModule } from '../src/modules/tracking/tracking.module';
import { TrackingSource } from '../src/modules/tracking/entities/tracking-source.entity';
import { TrackingConfig } from '../src/modules/tracking/entities/tracking-config.entity';
import { FileService } from '../src/modules/file/file.service';
import { Manga } from '../src/modules/manga/entities/manga.entity';
import { Author } from '../src/modules/author/entities/author.entity';
import { Genre } from '../src/modules/genre/entities/genre.entity';
import { Translator } from '../src/modules/translator/entities/translator.entity';
import { Language } from 'src/modules/language/entities/language.entity';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Translation } from 'src/modules/manga/entities/translation.entity';

@Global()
@Module({
  providers: [{ provide: FileService, useValue: {} }],
  exports: [FileService],
})
class FileServiceMockModule {}

describe('TrackingSource CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let trackingSourceRepo: Repository<TrackingSource>;
  let mangaRepo: Repository<Manga>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,
          username: 'manga',
          password: 'manga',
          database: 'manga_reader_test',
          entities: [
            Manga,
            TrackingSource,
            TrackingConfig,
            Author,
            Genre,
            Chapter,
            Translation,
            Translator,
            Language,
          ],
          synchronize: true,
        }),
        TrackingModule,
        FileServiceMockModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    dataSource = moduleFixture.get(DataSource);
    trackingSourceRepo = moduleFixture.get(getRepositoryToken(TrackingSource));
    mangaRepo = moduleFixture.get(getRepositoryToken(Manga));
    await app.init();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE tracking_source, tracking_config, manga_authors, manga_genres, manga, author, genre CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /tracking-sources/:id', () => {
    it('deletes the source and returns 204 with empty body', async () => {
      const manga = await mangaRepo.save({
        title: 'Delete Target Manga',
        status: 'ongoing',
        alternativeTitles: ['Delete Target Manga'],
        authors: [],
        genres: [],
      } as any);

      const createRes = await request(app.getHttpServer())
        .post('/tracking-sources')
        .send({
          mangaId: manga.id,
          url: 'https://example.com/manga/delete-target',
          name: 'Delete Test Source',
        })
        .expect(201);

      const id = createRes.body.id as number;

      const res = await request(app.getHttpServer())
        .delete(`/tracking-sources/${id}`)
        .expect(204);

      expect(res.body).toEqual({});

      const check = await trackingSourceRepo.findOne({ where: { id } });
      expect(check).toBeNull();
    });

    it('returns 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .delete('/tracking-sources/99999')
        .expect(404);
    });

    it('deleted source no longer appears in list query', async () => {
      const manga = await mangaRepo.save({
        title: 'List Check Manga',
        status: 'ongoing',
        alternativeTitles: ['List Check Manga'],
        authors: [],
        genres: [],
      } as any);

      const createRes = await request(app.getHttpServer())
        .post('/tracking-sources')
        .send({
          mangaId: manga.id,
          url: 'https://example.com/manga/list-check',
          name: 'List Check Source',
        })
        .expect(201);

      const id = createRes.body.id as number;

      await request(app.getHttpServer())
        .delete(`/tracking-sources/${id}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/tracking-sources')
        .expect(200);

      const ids = (res.body.data as { id: number }[]).map((s) => s.id);
      expect(ids).not.toContain(id);
    });
  });
});
