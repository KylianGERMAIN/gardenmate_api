import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { UserEntity } from "@/modules/users/entities/user.entity";

/**
 * Refresh token persisté pour permettre rotation et révocation.
 * L'`id` est le `jti` du JWT ; le token en clair n'est jamais stocké (seul son hash).
 */
@Entity("refresh_tokens")
export class RefreshTokenEntity {
  /** Identifiant = `jti` du JWT refresh. */
  @PrimaryColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  /** SHA-256 du token refresh (jamais le token en clair). */
  @Column({ name: "token_hash" })
  tokenHash: string;

  /** Famille de rotation : tous les tokens issus d'une même session la partagent. */
  @Index()
  @Column({ type: "uuid", name: "family_id" })
  familyId: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
