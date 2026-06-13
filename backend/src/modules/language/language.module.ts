import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from 'src/modules/language/entities/language.entity';
import { LanguageRepository } from 'src/modules/language/language.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { LanguageController } from 'src/modules/language/language.controller';
import { LanguageSeedService } from 'src/common/seed/language.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Language])],
  controllers: [LanguageController],
  providers: [LanguageService, LanguageRepository, LanguageSeedService],
  exports: [LanguageService],
})
export class LanguageModule {}
