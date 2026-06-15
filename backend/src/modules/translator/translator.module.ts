import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import { TranslatorRepository } from 'src/modules/translator/translator.repository';
import { TranslatorService } from './translator.service';
import { TranslatorController } from './translator.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Translator])],
  controllers: [TranslatorController],
  providers: [TranslatorService, TranslatorRepository],
  exports: [TranslatorService, TranslatorRepository],
})
export class TranslatorModule {}
