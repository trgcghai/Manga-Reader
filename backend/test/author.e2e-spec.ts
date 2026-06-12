/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MangaModule } from '../src/modules/manga/manga.module';
import { Author } from '../src/modules/author/entities/author.entity';
import { Manga } from '../src/modules/manga/entities/manga.entity';
import { Genre } from '../src/modules/genre/entities/genre.entity';
import { Chapter } from '../src/modules/chapter/entities/chapter.entity';
import { Translation } from '../src/modules/chapter/entities/translation.entity';
import { Translator } from '../src/modules/translator/entities/translator.entity';
import { Language } from '../src/modules/translator/entities/language.entity';

describe('Author CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authorRepo: Repository<Author>;
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
    authorRepo = moduleFixture.get(getRepositoryToken(Author));
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

  describe('POST /authors', () => {
    it('should create an author', async () => {
      const res = await request(app.getHttpServer())
        .post('/authors')
        .send({ name: 'Rumiko Takahashi' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Rumiko Takahashi');
    });

    it('should return 400 for duplicate name', async () => {
      await authorRepo.save({ name: 'Duplicate Author' });

      const res = await request(app.getHttpServer())
        .post('/authors')
        .send({ name: 'Duplicate Author' })
        .expect(400);

      expect(res.body.message).toBe('Author "Duplicate Author" already exists');
    });

    it('should return 400 for empty name', async () => {
      await request(app.getHttpServer())
        .post('/authors')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /authors', () => {
    it('should return paginated list with 3 seeded authors', async () => {
      await authorRepo.save([
        { name: 'Author A' },
        { name: 'Author B' },
        { name: 'Author C' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/authors')
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.data[0]).toHaveProperty('mangaCount');
    });

    it('should filter by search query', async () => {
      await authorRepo.save([
        { name: 'Yoshihiro Togashi' },
        { name: 'Kentaro Miura' },
        { name: 'Hiromu Arakawa' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/authors?search=Yoshihiro')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Yoshihiro Togashi');
      expect(res.body.total).toBe(1);
    });

    it('should respect page and limit params', async () => {
      await authorRepo.save([
        { name: 'Author 1' },
        { name: 'Author 2' },
        { name: 'Author 3' },
        { name: 'Author 4' },
        { name: 'Author 5' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/authors?page=2&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.totalPages).toBe(3);
    });
  });

  describe('GET /authors/:id', () => {
    it('should return an author by id', async () => {
      const author = await authorRepo.save({ name: 'Naoki Urasawa' });

      const res = await request(app.getHttpServer())
        .get(`/authors/${author.id}`)
        .expect(200);

      expect(res.body.id).toBe(author.id);
      expect(res.body.name).toBe('Naoki Urasawa');
    });

    it('should return 404 for non-existent author', async () => {
      await request(app.getHttpServer()).get('/authors/99999').expect(404);
    });
  });

  describe('PATCH /authors/:id', () => {
    it('should update author name', async () => {
      const author = await authorRepo.save({ name: 'Old Name' });

      const res = await request(app.getHttpServer())
        .patch(`/authors/${author.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.id).toBe(author.id);
      expect(res.body.name).toBe('New Name');
    });

    it('should return 400 when new name is already taken', async () => {
      await authorRepo.save({ name: 'Taken Name' });
      const author = await authorRepo.save({ name: 'Author To Update' });

      const res = await request(app.getHttpServer())
        .patch(`/authors/${author.id}`)
        .send({ name: 'Taken Name' })
        .expect(400);

      expect(res.body.message).toBe('Author "Taken Name" already exists');
    });

    it('should return 404 for non-existent author', async () => {
      await request(app.getHttpServer())
        .patch('/authors/99999')
        .send({ name: 'Anything' })
        .expect(404);
    });
  });

  describe('DELETE /authors/:id', () => {
    it('should delete an author', async () => {
      const author = await authorRepo.save({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/authors/${author.id}`)
        .expect(200);

      const check = await authorRepo.findOne({ where: { id: author.id } });
      expect(check).toBeNull();
    });

    it('should delete author linked to manga and remove association', async () => {
      const author = await authorRepo.save({ name: 'Linked Author' });
      await mangaRepo.save({
        title: 'Linked Manga',
        status: 'ongoing',
        alternativeTitles: ['Linked Manga'],
        authors: [author],
        genres: [],
      } as any);

      let manga = await mangaRepo.findOne({
        where: { title: 'Linked Manga' },
        relations: ['authors'],
      });
      expect(manga!.authors).toHaveLength(1);

      await request(app.getHttpServer())
        .delete(`/authors/${author.id}`)
        .expect(200);

      manga = await mangaRepo.findOne({
        where: { title: 'Linked Manga' },
        relations: ['authors'],
      });
      expect(manga).not.toBeNull();
      expect(manga!.authors).toHaveLength(0);
    });

    it('should return 404 for non-existent author', async () => {
      await request(app.getHttpServer()).delete('/authors/99999').expect(404);
    });
  });
});
