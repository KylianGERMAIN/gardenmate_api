import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum SunlightLevel {
  FULL_SUN = "FULL_SUN",
  PARTIAL_SHADE = "PARTIAL_SHADE",
  SHADE = "SHADE",
}

@Entity("plants")
export class PlantEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  name: string;

  @Column({ type: "enum", enum: SunlightLevel, name: "sunlight_level" })
  sunlightLevel: SunlightLevel;

  /** Fréquence d'arrosage recommandée en jours (null = pas de recommandation). */
  @Column({ type: "int", nullable: true, name: "watering_frequency" })
  wateringFrequency: number | null;
}
