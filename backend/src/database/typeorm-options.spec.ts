import { buildTypeOrmOptions } from './typeorm-options';

describe('buildTypeOrmOptions', () => {
  it('uses DATABASE_URL when provided', () => {
    const options = buildTypeOrmOptions({
      DATABASE_URL: 'postgres://manga:manga@127.0.0.1:5432/manga_reader',
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgres://manga:manga@127.0.0.1:5432/manga_reader',
      synchronize: false,
      migrationsRun: false,
      extra: {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    });
  });

  it('falls back to POSTGRES_* variables', () => {
    const options = buildTypeOrmOptions({
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'manga',
      POSTGRES_PASSWORD: 'manga',
      POSTGRES_DB: 'manga_reader',
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      username: 'manga',
      password: 'manga',
      database: 'manga_reader',
    });
  });

  it('throws when the fallback env vars are missing', () => {
    expect(() => buildTypeOrmOptions({} as NodeJS.ProcessEnv)).toThrow(
      'Either DATABASE_URL or the POSTGRES_* variables must be set',
    );
  });
});
