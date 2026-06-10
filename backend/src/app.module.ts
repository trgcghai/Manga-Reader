import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST')!,
        port: +configService.get<number>('DB_PORT')!,
        username: configService.get<string>('DB_USERNAME')!,
        password: configService.get<string>('DB_PASSWORD')!,
        database: configService.get<string>('DB_NAME')!,
        entities: [],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI')!,
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          stores: [new KeyvRedis(configService.get<string>('REDIS_URL'))],
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
