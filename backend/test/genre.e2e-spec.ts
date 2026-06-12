/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MangaModule } from '../src/modules/manga/manga.module';
import { Genre } from '../src/modules/genre/entities/genre.entity';
import { Manga } from '../src/modules/manga/entities/manga.entity';
import { Author } from '../src/modules/author/entities/author.entity';
import { Chapter } from '../src/modules/chapter/entities/chapter.entity';
import { Translation } from '../src/modules/chapter/entities/translation.entity';
import { Translator } from '../src/modules/translator/entities/translator.entity';
import { Language } from '../src/modules/translator/entities/language.entity';

describe('Genre CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let genreRepo: Repository<Genre>;
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
            Author,
            Manga,
            Genre,
            Chapter,
            Translation,
            Translator,
            Language,
          ],
          synchronize: true,
        }),
        MangaModule,
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
    genreRepo = moduleFixture.get(getRepositoryToken(Genre));
    mangaRepo = moduleFixture.get(getRepositoryToken(Manga));
    await app.init();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE manga_authors, manga_genres, manga, author, genre CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /genres', () => {
    it('should create a genre', async () => {
      const res = await request(app.getHttpServer())
        .post('/genres')
        .send({ name: 'Fantasy' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Fantasy');
    });

    it('should return 400 for duplicate name', async () => {
      await genreRepo.save({ name: 'Duplicate Genre' });

      const res = await request(app.getHttpServer())
        .post('/genres')
        .send({ name: 'Duplicate Genre' })
        .expect(400);

      expect(res.body.message).toBe('Genre "Duplicate Genre" already exists');
    });

    it('should return 400 for empty name', async () => {
      await request(app.getHttpServer())
        .post('/genres')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /genres', () => {
    it('should return paginated list with 3 seeded genres', async () => {
      await genreRepo.save([
        { name: 'Action' },
        { name: 'Fantasy' },
        { name: 'Comedy' },
      ]);

      const res = await request(app.getHttpServer()).get('/genres').expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.data[0]).toHaveProperty('mangaCount');
    });

    it('should filter by search query', async () => {
      await genreRepo.save([
        { name: 'Action' },
        { name: 'Fantasy' },
        { name: 'Romance' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/genres?search=fan')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Fantasy');
      expect(res.body.total).toBe(1);
    });

    it('should respect page and limit params', async () => {
      await genreRepo.save([
        { name: 'Genre 1' },
        { name: 'Genre 2' },
        { name: 'Genre 3' },
        { name: 'Genre 4' },
        { name: 'Genre 5' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/genres?page=2&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.totalPages).toBe(3);
    });
  });

  describe('GET /genres/:id', () => {
    it('should return a genre by id', async () => {
      const genre = await genreRepo.save({ name: 'Fantasy' });

      const res = await request(app.getHttpServer())
        .get(`/genres/${genre.id}`)
        .expect(200);

      expect(res.body.id).toBe(genre.id);
      expect(res.body.name).toBe('Fantasy');
    });

    it('should return 404 for non-existent genre', async () => {
      await request(app.getHttpServer()).get('/genres/99999').expect(404);
    });
  });

  describe('PATCH /genres/:id', () => {
    it('should update genre name', async () => {
      const genre = await genreRepo.save({ name: 'Old Name' });

      const res = await request(app.getHttpServer())
        .patch(`/genres/${genre.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.id).toBe(genre.id);
      expect(res.body.name).toBe('New Name');
    });

    it('should return 400 when new name is already taken', async () => {
      await genreRepo.save({ name: 'Taken Name' });
      const genre = await genreRepo.save({ name: 'Genre To Update' });

      const res = await request(app.getHttpServer())
        .patch(`/genres/${genre.id}`)
        .send({ name: 'Taken Name' })
        .expect(400);

      expect(res.body.message).toBe('Genre "Taken Name" already exists');
    });

    it('should return 404 for non-existent genre', async () => {
      await request(app.getHttpServer())
        .patch('/genres/99999')
        .send({ name: 'Anything' })
        .expect(404);
    });
  });

  describe('DELETE /genres/:id', () => {
    it('should delete a genre', async () => {
      const genre = await genreRepo.save({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/genres/${genre.id}`)
        .expect(200);

      const check = await genreRepo.findOne({ where: { id: genre.id } });
      expect(check).toBeNull();
    });

    it('should delete genre linked to manga and remove association', async () => {
      const author = await dataSource
        .getRepository(Author)
        .save({ name: 'Author' });
      const genre = await genreRepo.save({ name: 'Linked Genre' });
      await mangaRepo.save({
        title: 'Linked Manga',
        status: 'ongoing',
        alternativeTitles: ['Linked Manga'],
        authors: [author],
        genres: [genre],
      } as any);

      let manga = await mangaRepo.findOne({
        where: { title: 'Linked Manga' },
        relations: ['genres'],
      });
      expect(manga!.genres).toHaveLength(1);

      await request(app.getHttpServer())
        .delete(`/genres/${genre.id}`)
        .expect(200);

      manga = await mangaRepo.findOne({
        where: { title: 'Linked Manga' },
        relations: ['genres'],
      });
      expect(manga).not.toBeNull();
      expect(manga!.genres).toHaveLength(0);
    });

    it('should return 404 for non-existent genre', async () => {
      await request(app.getHttpServer()).delete('/genres/99999').expect(404);
    });
  });
});
