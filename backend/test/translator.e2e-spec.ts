/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TranslatorModule } from '../src/modules/translator/translator.module';
import { Translator } from '../src/modules/translator/entities/translator.entity';

describe('Translator CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let translatorRepo: Repository<Translator>;

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
          entities: [Translator],
          synchronize: true,
        }),
        TranslatorModule,
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
    translatorRepo = moduleFixture.get(getRepositoryToken(Translator));
    await app.init();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE translator CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /translators', () => {
    it('should create a translator', async () => {
      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'Test Translator', note: 'Test note' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Translator');
      expect(res.body.note).toBe('Test note');
    });

    it('should create a translator without note', async () => {
      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'No Note Translator' })
        .expect(201);

      expect(res.body.name).toBe('No Note Translator');
      expect(res.body.note).toBe('-');
    });

    it('should return 400 for duplicate name', async () => {
      await translatorRepo.save({ name: 'Duplicate Translator' });

      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'Duplicate Translator' })
        .expect(400);

      expect(res.body.message).toBe(
        'Translator "Duplicate Translator" already exists',
      );
    });

    it('should return 400 for empty name', async () => {
      await request(app.getHttpServer())
        .post('/translators')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /translators', () => {
    it('should return paginated list with 3 seeded translators', async () => {
      await translatorRepo.save([
        { name: 'Translator A' },
        { name: 'Translator B' },
        { name: 'Translator C' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators')
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
    });

    it('should filter by search query', async () => {
      await translatorRepo.save([
        { name: 'Yoshihiro Togashi' },
        { name: 'Kentaro Miura' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators?search=Yoshihiro')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Yoshihiro Togashi');
    });

    it('should respect page and limit params', async () => {
      await translatorRepo.save([
        { name: 'Translator 1' },
        { name: 'Translator 2' },
        { name: 'Translator 3' },
        { name: 'Translator 4' },
        { name: 'Translator 5' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators?page=2&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.totalPages).toBe(3);
    });
  });

  describe('GET /translators/:id', () => {
    it('should return a translator by id', async () => {
      const translator = await translatorRepo.save({
        name: 'Unique Translator',
      });

      const res = await request(app.getHttpServer())
        .get(`/translators/${translator.id}`)
        .expect(200);

      expect(res.body.id).toBe(translator.id);
      expect(res.body.name).toBe('Unique Translator');
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer()).get('/translators/99999').expect(404);
    });
  });

  describe('PATCH /translators/:id', () => {
    it('should update translator name and note', async () => {
      const translator = await translatorRepo.save({
        name: 'Old Name',
        note: 'Old note',
      });

      const res = await request(app.getHttpServer())
        .patch(`/translators/${translator.id}`)
        .send({ name: 'New Name', note: 'New note' })
        .expect(200);

      expect(res.body.id).toBe(translator.id);
      expect(res.body.name).toBe('New Name');
      expect(res.body.note).toBe('New note');
    });

    it('should return 400 when new name is already taken', async () => {
      await translatorRepo.save({ name: 'Taken Name' });
      const translator = await translatorRepo.save({ name: 'To Update' });

      const res = await request(app.getHttpServer())
        .patch(`/translators/${translator.id}`)
        .send({ name: 'Taken Name' })
        .expect(400);

      expect(res.body.message).toBe('Translator "Taken Name" already exists');
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer())
        .patch('/translators/99999')
        .send({ name: 'Anything' })
        .expect(404);
    });
  });

  describe('DELETE /translators/:id', () => {
    it('should delete a translator', async () => {
      const translator = await translatorRepo.save({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/translators/${translator.id}`)
        .expect(200);

      const check = await translatorRepo.findOne({
        where: { id: translator.id },
      });
      expect(check).toBeNull();
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer())
        .delete('/translators/99999')
        .expect(404);
    });
  });
});
