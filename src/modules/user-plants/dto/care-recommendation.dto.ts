import { ApiProperty } from "@nestjs/swagger";

/** Niveau d'urgence d'arrosage calculé par le moteur de soin. */
export enum CareStatus {
  /** Arrosage dépassé : à faire maintenant. */
  OVERDUE = "OVERDUE",
  /** Arrosage imminent (dans la fenêtre proche). */
  SOON = "SOON",
  /** Aucun arrosage requis pour l'instant. */
  OK = "OK",
  /** Pas de fréquence renseignée pour l'espèce : aucun calcul possible. */
  NO_SCHEDULE = "NO_SCHEDULE",
}

/** Coefficients appliqués par le moteur, exposés pour transparence. */
export class CareFactorsDto {
  @ApiProperty({ example: 1.3, description: "Coefficient saisonnier appliqué" })
  season: number;

  @ApiProperty({ example: 1.2, description: "Coefficient d'exposition appliqué" })
  exposure: number;
}

/** Recommandation d'arrosage pour une plante du jardin d'un utilisateur. */
export class CareRecommendationDto {
  @ApiProperty({ example: "up-uuid" })
  userPlantId: string;

  @ApiProperty({ example: "plant-uuid" })
  plantId: string;

  @ApiProperty({ example: "Ficus lyrata" })
  plantName: string;

  @ApiProperty({ enum: CareStatus, example: CareStatus.OVERDUE })
  status: CareStatus;

  @ApiProperty({
    example: "2026-06-21T00:00:00.000Z",
    nullable: true,
    description: "Date estimée du prochain arrosage (null si NO_SCHEDULE)",
  })
  nextWateringDate: string | null;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: "Intervalle d'arrosage ajusté en jours (null si NO_SCHEDULE)",
  })
  adjustedIntervalDays: number | null;

  @ApiProperty({ type: CareFactorsDto })
  factors: CareFactorsDto;
}
