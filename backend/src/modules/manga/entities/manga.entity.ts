import { MangaStatus } from 'src/common/enum';
import { Chapter } from 'src/modules/chapter/entities/chapter.entity';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity()
@Index(['title'], { unique: true })
export class Manga {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', array: true, nullable: true })
  alternativeTitles: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Author, (author) => author.mangas)
  @JoinTable({
    name: 'manga_authors',
    joinColumn: { name: 'manga_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'author_id', referencedColumnName: 'id' },
  })
  authors: Author[];

  @ManyToMany(() => Genre, (genre) => genre.mangas)
  @JoinTable({
    name: 'manga_genres',
    joinColumn: { name: 'manga_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];

  @Column({
    type: 'enum',
    enum: MangaStatus,
  })
  status: MangaStatus;

  @Column({ nullable: true })
  coverPath?: string;

  @OneToMany(() => Chapter, (chapter) => chapter.manga)
  chapters: Chapter[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
