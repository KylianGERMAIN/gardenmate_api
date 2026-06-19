import { Injectable } from "@nestjs/common";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";
import { UserPlantEntity } from "../entities/user-plant.entity";
import { CareStatus } from "../dto/care-recommendation.dto";

/** Évaluation du besoin de soin d'une plante (objet domaine, sans I/O). */
export interface CareAssessment {
  status: CareStatus;
  nextWateringDate: Date | null;
  adjustedIntervalDays: number | null;
  factors: { season: number; exposure: number };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fenêtre (en jours) sous laquelle un arrosage à venir est signalé "SOON". */
const SOON_WINDOW_DAYS = 2;

/**
 * Coefficient saisonnier par mois (index 0 = janvier). >1 = besoin accru (été),
 * <1 = besoin réduit (hiver). Divise la fréquence de base : plus le coefficient
 * est élevé, plus l'intervalle d'arrosage est court.
 */
// ponytail: hémisphère nord en dur. Upgrade A2 : déduire la saison de la géoloc
// utilisateur + l'évapotranspiration réelle (Open-Meteo).
const SEASON_COEFFICIENTS = [
  0.6, // janvier
  0.6, // février
  1.1, // mars
  1.1, // avril
  1.1, // mai
  1.3, // juin
  1.3, // juillet
  1.3, // août
  1.0, // septembre
  1.0, // octobre
  1.0, // novembre
  0.6, // décembre
];

/** Coefficient d'exposition par niveau d'ensoleillement. */
const EXPOSURE_COEFFICIENTS: Record<SunlightLevel, number> = {
  [SunlightLevel.FULL_SUN]: 1.2,
  [SunlightLevel.PARTIAL_SHADE]: 1.0,
  [SunlightLevel.SHADE]: 0.8,
};

/**
 * Moteur de soin : calcule le besoin d'arrosage d'une plante.
 *
 * Moteur de règles pur — aucune dépendance, aucun I/O, déterministe pour une
 * date donnée. Toute la logique métier vit ici, isolée et entièrement testable.
 */
@Injectable()
export class CareEngineService {
  /**
   * Évalue le besoin d'arrosage d'une UserPlant à une date de référence.
   * @param userPlant association dont la relation `plant` est chargée (eager)
   * @param now date de référence — injectée pour la testabilité
   */
  assess(userPlant: UserPlantEntity, now: Date): CareAssessment {
    const season = SEASON_COEFFICIENTS[now.getMonth()];
    const exposure = EXPOSURE_COEFFICIENTS[userPlant.plant.sunlightLevel];
    const factors = { season, exposure };

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

    const adjustedIntervalDays = Math.max(1, Math.round(baseFrequency / (season * exposure)));

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
