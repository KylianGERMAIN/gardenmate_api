import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "@/modules/users/entities/user.entity";
import { PlantEntity } from "@/modules/plants/entities/plant.entity";

@Entity("user_plants")
export class UserPlantEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "plant_id" })
  plantId: string;

  @Column({ type: "timestamptz", nullable: true, name: "planted_at" })
  plantedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "last_watered_at" })
  lastWateredAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @ManyToOne(() => PlantEntity, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "plant_id" })
  plant: PlantEntity;
}
