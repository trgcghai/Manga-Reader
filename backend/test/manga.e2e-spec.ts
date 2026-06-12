/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MangaModule } from '../src/modules/manga/manga.module';
import { Manga } from '../src/modules/manga/entities/manga.entity';
import { Author } from '../src/modules/author/entities/author.entity';
import { Genre } from '../src/modules/genre/entities/genre.entity';
import { Chapter } from '../src/modules/chapter/entities/chapter.entity';
import { Translation } from '../src/modules/chapter/entities/translation.entity';
import { Translator } from '../src/modules/translator/entities/translator.entity';
import { Language } from '../src/modules/translator/entities/language.entity';

describe('Manga CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let mangaRepo: Repository<Manga>;
  let authorRepo: Repository<Author>;
  let genreRepo: Repository<Genre>;

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
            Author,
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
    dataSource = moduleFixture.get(DataSource);
    mangaRepo = moduleFixture.get(getRepositoryToken(Manga));
    authorRepo = moduleFixture.get(getRepositoryToken(Author));
    genreRepo = moduleFixture.get(getRepositoryToken(Genre));
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

  describe('POST /mangas', () => {
    it('should create a manga with authors and genres', async () => {
      const res = await request(app.getHttpServer())
        .post('/mangas')
        .send({
          title: 'Berserk',
          status: 'ongoing',
          authors: ['Kentaro Miura'],
          genres: ['Fantasy', 'Dark Fantasy'],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Berserk');
      expect(res.body.status).toBe('ongoing');
      expect(res.body.alternativeTitles).toEqual(['Berserk']);
      expect(res.body.authors).toHaveLength(1);
      expect(res.body.authors[0].name).toBe('Kentaro Miura');
      expect(res.body.genres).toHaveLength(2);
      expect(
        res.body.genres.map((g: { name: string }) => g.name).sort(),
      ).toEqual(['Dark Fantasy', 'Fantasy']);
    });

    it('should reuse existing authors and genres by name', async () => {
      await authorRepo.save({ name: 'Existing Author' });
      await genreRepo.save({ name: 'Existing Genre' });

      const res = await request(app.getHttpServer())
        .post('/mangas')
        .send({
          title: 'Reuse Test',
          status: 'ongoing',
          authors: ['Existing Author'],
          genres: ['Existing Genre'],
        })
        .expect(201);

      expect(res.body.authors).toHaveLength(1);
      expect(res.body.authors[0].name).toBe('Existing Author');
      expect(res.body.genres).toHaveLength(1);
      expect(res.body.genres[0].name).toBe('Existing Genre');

      const allAuthors = await authorRepo.count();
      expect(allAuthors).toBe(1);

      const allGenres = await genreRepo.count();
      expect(allGenres).toBe(1);
    });
  });

  describe('GET /mangas', () => {
    it('should return paginated mangas with relations', async () => {
      const author = await authorRepo.save({ name: 'Author A' });
      const genre = await genreRepo.save({ name: 'Genre A' });
      await mangaRepo.save({
        title: 'Manga A',
        status: 'ongoing',
        alternativeTitles: ['Manga A'],
        authors: [author],
        genres: [genre],
      } as any);

      const res = await request(app.getHttpServer()).get('/mangas').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].authors).toHaveLength(1);
      expect(res.body.data[0].genres).toHaveLength(1);
    });

    it('should return empty list when no mangas', async () => {
      const res = await request(app.getHttpServer()).get('/mangas').expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /mangas/:id', () => {
    it('should return a manga by id with relations', async () => {
      const oda = await authorRepo.save({ name: 'Oda' });
      const shonen = await genreRepo.save({ name: 'Shonen' });
      const created = await mangaRepo.save({
        title: 'One Piece',
        status: 'ongoing',
        alternativeTitles: ['One Piece'],
        authors: [oda],
        genres: [shonen],
      } as Manga);

      const res = await request(app.getHttpServer())
        .get(`/mangas/${created.id}`)
        .expect(200);

      expect(res.body.title).toBe('One Piece');
      expect(res.body.authors[0].name).toBe('Oda');
      expect(res.body.genres[0].name).toBe('Shonen');
    });

    it('should return 404 for non-existent manga', async () => {
      await request(app.getHttpServer()).get('/mangas/99999').expect(404);
    });
  });

  describe('PATCH /mangas/:id', () => {
    it('should update scalar fields', async () => {
      const created = await mangaRepo.save({
        title: 'Original Title',
        status: 'ongoing',
        alternativeTitles: ['Original Title'],
        authors: [],
        genres: [],
      } as unknown as Manga);

      const res = await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({ title: 'Updated Title', status: 'completed' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('completed');
    });

    it('should update authors list — replacing old ones', async () => {
      const oldAuthor = await authorRepo.save({ name: 'Old Author' });
      const created = await mangaRepo.save({
        title: 'Author Update Test',
        status: 'ongoing',
        alternativeTitles: ['Author Update Test'],
        authors: [oldAuthor],
        genres: [],
      } as unknown as Manga);

      const res = await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({ authors: ['New Author'] })
        .expect(200);

      expect(res.body.authors).toHaveLength(1);
      expect(res.body.authors[0].name).toBe('New Author');
    });

    it('should update with same authors (no duplicate key violation)', async () => {
      const existingAuthor = await authorRepo.save({ name: 'Shared Author' });
      const existingGenre = await genreRepo.save({ name: 'Shared Genre' });
      const created = await mangaRepo.save({
        title: 'Duplicate Fix Test',
        status: 'ongoing',
        alternativeTitles: ['Duplicate Fix Test'],
        authors: [existingAuthor],
        genres: [existingGenre],
      } as unknown as Manga);

      const res1 = await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({
          title: 'Updated v1',
          authors: ['Shared Author'],
          genres: ['Shared Genre'],
        })
        .expect(200);

      expect(res1.body.authors).toHaveLength(1);
      expect(res1.body.authors[0].name).toBe('Shared Author');
      expect(res1.body.genres).toHaveLength(1);

      const res2 = await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({
          title: 'Updated v2',
          authors: ['Shared Author'],
          genres: ['Shared Genre'],
        })
        .expect(200);

      expect(res2.body.authors).toHaveLength(1);
      expect(res2.body.authors[0].name).toBe('Shared Author');

      const manga = await mangaRepo.findOne({
        where: { id: created.id },
        relations: ['authors', 'genres'],
      });
      expect(manga!.authors).toHaveLength(1);
      expect(manga!.genres).toHaveLength(1);
    });

    it('should mix existing and new authors in same update', async () => {
      await authorRepo.save({ name: 'Existing One' });
      const created = await mangaRepo.save({
        title: 'Mix Authors',
        status: 'ongoing',
        alternativeTitles: ['Mix Authors'],
        authors: [],
        genres: [],
      } as unknown as Manga);

      const res = await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({
          authors: ['Existing One', 'Brand New'],
        })
        .expect(200);

      expect(res.body.authors).toHaveLength(2);
      const names: string[] = res.body.authors
        .map((a: { name: string }) => a.name)
        .sort();
      expect(names).toEqual(['Brand New', 'Existing One']);

      const totalAuthors = await authorRepo.count();
      expect(totalAuthors).toBe(2);
    });

    it('should return 400 for empty body', async () => {
      const created = await mangaRepo.save({
        title: 'No Update',
        status: 'ongoing',
        alternativeTitles: ['No Update'],
        authors: [],
        genres: [],
      } as any);

      await request(app.getHttpServer())
        .patch(`/mangas/${created.id}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent manga', async () => {
      await request(app.getHttpServer())
        .patch('/mangas/99999')
        .send({ title: 'Nope' })
        .expect(404);
    });
  });

  describe('DELETE /mangas/:id', () => {
    it('should delete an existing manga', async () => {
      const created = await mangaRepo.save({
        title: 'To Delete',
        status: 'ongoing',
        alternativeTitles: ['To Delete'],
        authors: [],
        genres: [],
      } as any);

      await request(app.getHttpServer())
        .delete(`/mangas/${created.id}`)
        .expect(200);

      const check = await mangaRepo.findOne({ where: { id: created.id } });
      expect(check).toBeNull();
    });

    it('should return 404 for non-existent manga', async () => {
      await request(app.getHttpServer()).delete('/mangas/99999').expect(404);
    });
  });
});
