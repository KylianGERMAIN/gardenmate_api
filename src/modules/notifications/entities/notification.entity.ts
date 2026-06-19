import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "@/modules/users/entities/user.entity";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";

/** Type de notification émise par le système. */
export enum NotificationType {
  WATERING_REMINDER = "WATERING_REMINDER",
}

@Entity("notifications")
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "uuid", nullable: true, name: "user_plant_id" })
  userPlantId: string | null;

  @Column({ type: "enum", enum: NotificationType })
  type: NotificationType;

  @Column()
  message: string;

  @Column({ default: false, name: "is_read" })
  isRead: boolean;

  /** Clé d'idempotence (unique) : empêche les doublons d'une même notif récurrente. */
  @Column({ type: "varchar", unique: true, nullable: true, name: "dedupe_key" })
  dedupeKey: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @ManyToOne(() => UserPlantEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_plant_id" })
  userPlant: UserPlantEntity | null;
}
