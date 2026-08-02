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
  let trackingConfigRepo: Repository<TrackingConfig>;
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
    trackingConfigRepo = moduleFixture.get(getRepositoryToken(TrackingConfig));
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

  describe('GET /tracking-sources/config', () => {
    it('returns 200 with config when one exists', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .get('/tracking-sources/config')
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('02:00');
      expect(res.body.updatedAt).toBeDefined();
    });

    it('auto-creates and returns default config when none exists', async () => {
      const res = await request(app.getHttpServer())
        .get('/tracking-sources/config')
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('00:00');
      expect(res.body.updatedAt).toBeDefined();
    });
  });

  describe('PATCH /tracking-sources/config', () => {
    it('updates frequency and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ frequency: 'weekly' })
        .expect(200);

      expect(res.body.frequency).toBe('weekly');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('02:00');
      expect(res.body.updatedAt).toBeDefined();
    });

    it('updates interval and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ interval: 3 })
        .expect(200);

      expect(res.body.interval).toBe(3);
      expect(res.body.frequency).toBe('daily');
      expect(res.body.runAt).toBe('02:00');
    });

    it('updates runAt and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '23:59' })
        .expect(200);

      expect(res.body.runAt).toBe('23:59');
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
    });

    it('returns 400 for invalid frequency', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ frequency: 'hourly' })
        .expect(400);
    });

    it('returns 400 for interval < 1', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ interval: 0 })
        .expect(400);
    });

    it('returns 400 for invalid runAt format', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '9:00' })
        .expect(400);
    });

    it('auto-creates config merged over defaults when none exists', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '23:59' })
        .expect(200);

      expect(res.body.runAt).toBe('23:59');
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
    });

    it('returns 400 for runAt 24:00', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '24:00' })
        .expect(400);
    });
  });

  describe('PATCH /tracking-sources/:id route guard', () => {
    it('still routes to the update handler, not the config handler', async () => {
      const manga = await mangaRepo.save({
        title: 'Patch Guard Manga',
        status: 'ongoing',
        alternativeTitles: ['Patch Guard Manga'],
        authors: [],
        genres: [],
      } as any);

      const createRes = await request(app.getHttpServer())
        .post('/tracking-sources')
        .send({
          mangaId: manga.id,
          url: 'https://example.com/manga/patch-guard',
          name: 'Patch Guard Source',
        })
        .expect(201);

      const id = createRes.body.id as number;

      const res = await request(app.getHttpServer())
        .patch(`/tracking-sources/${id}`)
        .send({ name: 'Renamed Source' })
        .expect(200);

      expect(res.body.name).toBe('Renamed Source');
      expect(res.body.id).toBe(id);
    });
  });
});
