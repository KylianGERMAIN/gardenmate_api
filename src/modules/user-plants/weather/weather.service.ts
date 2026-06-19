import { Injectable, Logger } from "@nestjs/common";
import type { UserLocation } from "@/modules/users/users.service";

/** Coefficient de demande en eau et sa provenance. */
export interface WaterDemand {
  coefficient: number;
  source: "weather" | "season";
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
/** Évapotranspiration de référence (mm/jour) pour laquelle le coefficient vaut 1. */
const ET0_REFERENCE = 3.5;
const COEF_MIN = 0.4;
const COEF_MAX = 1.6;

/** Coefficient saisonnier de secours par mois (index 0 = janvier). */
// ponytail: fallback hémisphère nord en dur, utilisé sans géoloc ou si l'API échoue.
const SEASON_COEFFICIENTS = [0.6, 0.6, 1.1, 1.1, 1.1, 1.3, 1.3, 1.3, 1.0, 1.0, 1.0, 0.6];

/**
 * Fournit le coefficient de demande en eau d'une localisation à partir de
 * l'évapotranspiration réelle (Open-Meteo), avec cache et repli saisonnier.
 *
 * Couche d'intégration externe : c'est le seul endroit du moteur de soin qui
 * fait de l'I/O réseau. Le calcul lui-même reste dans `CareEngineService`.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, { coefficient: number; expiresAt: number }>();

  /**
   * Calcule le coefficient de demande en eau pour une localisation et une date.
   * Sans localisation, ou si Open-Meteo échoue/timeout, retombe sur le coefficient
   * saisonnier — la fonctionnalité reste disponible en mode dégradé.
   */
  async getWaterDemand(location: UserLocation | null, now: Date): Promise<WaterDemand> {
    if (!location) {
      return { coefficient: this.seasonalCoefficient(now), source: "season" };
    }

    const cached = this.readCache(location, now);
    if (cached !== null) {
      return { coefficient: cached, source: "weather" };
    }

    try {
      const et0 = await this.fetchAverageEt0(location);
      const coefficient = this.clamp(et0 / ET0_REFERENCE);
      this.writeCache(location, coefficient, now);
      return { coefficient, source: "weather" };
    } catch (err) {
      this.logger.warn(`Open-Meteo indisponible, repli saisonnier: ${String(err)}`);
      return { coefficient: this.seasonalCoefficient(now), source: "season" };
    }
  }

  /** Récupère l'ET0 FAO moyen (jours passés + aujourd'hui) via Open-Meteo. */
  private async fetchAverageEt0(location: UserLocation): Promise<number> {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      daily: "et0_fao_evapotranspiration",
      past_days: "3",
      forecast_days: "1",
      timezone: "auto",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = (await res.json()) as {
        daily?: { et0_fao_evapotranspiration?: (number | null)[] };
      };
      const values = (body.daily?.et0_fao_evapotranspiration ?? []).filter(
        (v): v is number => typeof v === "number",
      );
      if (values.length === 0) throw new Error("Aucune donnée ET0");

      return values.reduce((sum, v) => sum + v, 0) / values.length;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Coefficient saisonnier de secours pour la date courante. */
  private seasonalCoefficient(now: Date): number {
    return SEASON_COEFFICIENTS[now.getMonth()];
  }

  /** Borne le coefficient dans [COEF_MIN, COEF_MAX]. */
  private clamp(value: number): number {
    return Math.min(COEF_MAX, Math.max(COEF_MIN, value));
  }

  private cacheKey(location: UserLocation): string {
    return `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
  }

  private readCache(location: UserLocation, now: Date): number | null {
    const entry = this.cache.get(this.cacheKey(location));
    if (!entry || entry.expiresAt <= now.getTime()) return null;
    return entry.coefficient;
  }

  private writeCache(location: UserLocation, coefficient: number, now: Date): void {
    this.cache.set(this.cacheKey(location), {
      coefficient,
      expiresAt: now.getTime() + CACHE_TTL_MS,
    });
  }
}
