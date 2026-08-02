import { TrackingFrequency } from 'src/common/constants/tracking.constant';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TrackingConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TrackingFrequency,
    default: TrackingFrequency.DAILY,
  })
  frequency: TrackingFrequency;

  @Column({ type: 'int', default: 1 })
  interval: number;

  @Column()
  runAt: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
