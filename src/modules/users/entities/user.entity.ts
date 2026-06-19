import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 60 })
  password: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /** Latitude de l'utilisateur (pour la météo du moteur de soin). */
  @Column({ type: "double precision", nullable: true })
  latitude: number | null;

  /** Longitude de l'utilisateur (pour la météo du moteur de soin). */
  @Column({ type: "double precision", nullable: true })
  longitude: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
