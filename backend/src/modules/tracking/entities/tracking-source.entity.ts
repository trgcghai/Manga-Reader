import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Manga } from '../../manga/entities/manga.entity';

@Entity()
@Unique(['manga', 'name'])
@Unique(['manga', 'url'])
export class TrackingSource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Manga, { onDelete: 'CASCADE' })
  manga: Manga;

  @Column()
  url: string;

  @Column()
  name: string;

  @Column({ nullable: true, default: null })
  latestChapterNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
