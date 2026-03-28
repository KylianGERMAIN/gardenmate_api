import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";

@Entity("watering_events")
export class WateringEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_plant_id" })
  userPlantId: string;

  @CreateDateColumn({ type: "timestamptz", name: "watered_at" })
  wateredAt: Date;

  @Column({ type: "varchar", length: 500, nullable: true })
  note: string | null;

  @ManyToOne(() => UserPlantEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_plant_id" })
  userPlant: UserPlantEntity;
}
