import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from 'src/modules/genre/entities/genre.entity';
import { GenreRepository } from 'src/modules/genre/genre.repository';
import { GenreService } from 'src/modules/genre/genre.service';
import { GenreController } from 'src/modules/genre/genre.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Genre])],
  controllers: [GenreController],
  providers: [GenreService, GenreRepository],
  exports: [GenreService, GenreRepository],
})
export class GenreModule {}
