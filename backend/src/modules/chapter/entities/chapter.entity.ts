import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Translation } from './translation.entity';
import { Manga } from 'src/modules/manga/entities/manga.entity';

@Entity()
@Unique(['manga', 'number'])
export class Chapter {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Manga, (manga) => manga.chapters, {
    onDelete: 'CASCADE',
  })
  manga: Manga;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  number: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @OneToMany(() => Translation, (t) => t.chapter)
  translations: Translation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
