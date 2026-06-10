import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

function toGlobPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function required(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('POSTGRES_PORT must be a valid TCP port number');
  }

  return port;
}

export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv,
): TypeOrmModuleOptions {
  const cwd = toGlobPath(process.cwd());
  const shared = {
    type: 'postgres' as const,
    entities: [`${cwd}/src/**/*.entity.ts`, `${cwd}/dist/**/*.entity.js`],
    migrations: [
      `${cwd}/src/database/migrations/*.ts`,
      `${cwd}/dist/database/migrations/*.js`,
    ],
    migrationsRun: false,
    synchronize: false,
    extra: poolConfig,
  };

  if (env.DATABASE_URL) {
    return {
      ...shared,
      url: env.DATABASE_URL,
    };
  }

  const host = required(
    env.POSTGRES_HOST,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const port = parsePort(env.POSTGRES_PORT);
  const username = required(
    env.POSTGRES_USER,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const password = required(
    env.POSTGRES_PASSWORD,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const database = required(
    env.POSTGRES_DB,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );

  return {
    ...shared,
    host,
    port,
    username,
    password,
    database,
  };
}
