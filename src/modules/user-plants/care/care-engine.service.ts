import { Injectable } from "@nestjs/common";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";
import { UserPlantEntity } from "../entities/user-plant.entity";
import { CareStatus } from "../dto/care-recommendation.dto";

/** Évaluation du besoin de soin d'une plante (objet domaine, sans I/O). */
export interface CareAssessment {
  status: CareStatus;
  nextWateringDate: Date | null;
  adjustedIntervalDays: number | null;
  factors: { demand: number; exposure: number };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fenêtre (en jours) sous laquelle un arrosage à venir est signalé "SOON". */
const SOON_WINDOW_DAYS = 2;

/** Coefficient d'exposition par niveau d'ensoleillement. */
const EXPOSURE_COEFFICIENTS: Record<SunlightLevel, number> = {
  [SunlightLevel.FULL_SUN]: 1.2,
  [SunlightLevel.PARTIAL_SHADE]: 1.0,
  [SunlightLevel.SHADE]: 0.8,
};

/**
 * Moteur de soin : calcule le besoin d'arrosage d'une plante.
 *
 * Moteur de règles pur — aucune dépendance, aucun I/O, déterministe. Le
 * coefficient de demande en eau (météo réelle ou saison) lui est fourni en
 * entrée : le moteur ignore d'où il vient, ce qui le garde entièrement testable.
 */
@Injectable()
export class CareEngineService {
  /**
   * Évalue le besoin d'arrosage d'une UserPlant.
   * @param userPlant association dont la relation `plant` est chargée (eager)
   * @param demandCoefficient coefficient de demande en eau (>1 = besoin accru)
   * @param now date de référence — injectée pour la testabilité
   */
  assess(userPlant: UserPlantEntity, demandCoefficient: number, now: Date): CareAssessment {
    const exposure = EXPOSURE_COEFFICIENTS[userPlant.plant.sunlightLevel];
    const factors = { demand: demandCoefficient, exposure };

    const baseFrequency = userPlant.plant.wateringFrequency;

    // Pas de fréquence recommandée pour l'espèce : aucun calcul possible.
    if (!baseFrequency) {
      return {
        status: CareStatus.NO_SCHEDULE,
        nextWateringDate: null,
        adjustedIntervalDays: null,
        factors,
      };
    }

    const adjustedIntervalDays = Math.max(
      1,
      Math.round(baseFrequency / (demandCoefficient * exposure)),
    );

    // Jamais arrosée : à arroser sans délai.
    if (!userPlant.lastWateredAt) {
      return { status: CareStatus.OVERDUE, nextWateringDate: now, adjustedIntervalDays, factors };
    }

    const nextWateringDate = new Date(
      userPlant.lastWateredAt.getTime() + adjustedIntervalDays * MS_PER_DAY,
    );
    const msUntilNext = nextWateringDate.getTime() - now.getTime();

    let status: CareStatus;
    if (msUntilNext <= 0) {
      status = CareStatus.OVERDUE;
    } else if (msUntilNext <= SOON_WINDOW_DAYS * MS_PER_DAY) {
      status = CareStatus.SOON;
    } else {
      status = CareStatus.OK;
    }

    return { status, nextWateringDate, adjustedIntervalDays, factors };
  }
}
