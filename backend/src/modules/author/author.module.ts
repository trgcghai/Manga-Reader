import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from 'src/modules/author/entities/author.entity';
import { AuthorRepository } from 'src/modules/author/author.repository';
import { AuthorService } from 'src/modules/author/author.service';
import { AuthorController } from 'src/modules/author/author.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  controllers: [AuthorController],
  providers: [AuthorService, AuthorRepository],
  exports: [AuthorService, AuthorRepository],
})
export class AuthorModule {}
