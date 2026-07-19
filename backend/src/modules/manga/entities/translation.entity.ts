import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Chapter } from './chapter.entity';
import { Language } from 'src/modules/language/entities/language.entity';
import { Translator } from 'src/modules/translator/entities/translator.entity';

@Entity()
@Unique(['chapter', 'language', 'translator'])
export class Translation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Chapter, (chapter) => chapter.translations, {
    onDelete: 'CASCADE',
  })
  chapter: Chapter;

  @ManyToOne(() => Language, {
    eager: true,
  })
  language: Language;

  @ManyToOne(() => Translator, {
    eager: true,
  })
  translator: Translator;

  @Column()
  url: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
