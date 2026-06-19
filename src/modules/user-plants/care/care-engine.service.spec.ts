import { CareEngineService } from "./care-engine.service";
import { CareStatus } from "../dto/care-recommendation.dto";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";
import { UserPlantEntity } from "../entities/user-plant.entity";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-15T12:00:00.000Z");

/** Construit une UserPlant minimale pour le moteur (seule la relation `plant` compte). */
function buildUserPlant(opts: {
  wateringFrequency: number | null;
  sunlightLevel?: SunlightLevel;
  lastWateredAt: Date | null;
}): UserPlantEntity {
  return {
    id: "up",
    userId: "u",
    plantId: "p",
    plantedAt: null,
    lastWateredAt: opts.lastWateredAt,
    user: {} as never,
    plant: {
      id: "p",
      name: "Test",
      sunlightLevel: opts.sunlightLevel ?? SunlightLevel.PARTIAL_SHADE,
      wateringFrequency: opts.wateringFrequency,
    } as never,
  };
}

describe("CareEngineService", () => {
  const engine = new CareEngineService();

  it("NO_SCHEDULE si la plante n'a pas de fréquence", () => {
    const a = engine.assess(buildUserPlant({ wateringFrequency: null, lastWateredAt: NOW }), 1.0, NOW);

    expect(a.status).toBe(CareStatus.NO_SCHEDULE);
    expect(a.nextWateringDate).toBeNull();
    expect(a.adjustedIntervalDays).toBeNull();
  });

  it("OVERDUE et arrosage immédiat si jamais arrosée", () => {
    const a = engine.assess(buildUserPlant({ wateringFrequency: 7, lastWateredAt: null }), 1.0, NOW);

    expect(a.status).toBe(CareStatus.OVERDUE);
    expect(a.nextWateringDate).toEqual(NOW);
  });

  it("raccourcit l'intervalle avec une forte demande et plein soleil", () => {
    const a = engine.assess(
      buildUserPlant({
        wateringFrequency: 10,
        sunlightLevel: SunlightLevel.FULL_SUN,
        lastWateredAt: NOW,
      }),
      1.3,
      NOW,
    );

    // 10 / (1.3 × 1.2) = 6.41 → 6
    expect(a.adjustedIntervalDays).toBe(6);
    expect(a.factors).toEqual({ demand: 1.3, exposure: 1.2 });
  });

  it("allonge l'intervalle avec une faible demande à l'ombre", () => {
    const a = engine.assess(
      buildUserPlant({
        wateringFrequency: 10,
        sunlightLevel: SunlightLevel.SHADE,
        lastWateredAt: NOW,
      }),
      0.6,
      NOW,
    );

    // 10 / (0.6 × 0.8) = 20.83 → 21
    expect(a.adjustedIntervalDays).toBe(21);
  });

  it("OVERDUE quand le prochain arrosage est dépassé", () => {
    const last = new Date(NOW.getTime() - 30 * MS_PER_DAY);
    const a = engine.assess(
      buildUserPlant({
        wateringFrequency: 7,
        sunlightLevel: SunlightLevel.FULL_SUN,
        lastWateredAt: last,
      }),
      1.3,
      NOW,
    );

    expect(a.status).toBe(CareStatus.OVERDUE);
  });

  it("OK quand le prochain arrosage est lointain", () => {
    // Intervalle (freq 10, demande 1.3, plein soleil) = 6 j ; arrosé hier → +5 j > fenêtre SOON.
    const last = new Date(NOW.getTime() - 1 * MS_PER_DAY);
    const a = engine.assess(
      buildUserPlant({
        wateringFrequency: 10,
        sunlightLevel: SunlightLevel.FULL_SUN,
        lastWateredAt: last,
      }),
      1.3,
      NOW,
    );

    expect(a.status).toBe(CareStatus.OK);
  });

  it("SOON quand le prochain arrosage est imminent", () => {
    // Intervalle 6 j ; arrosé il y a 5 j → prochain à +1 j ≤ fenêtre SOON (2 j).
    const last = new Date(NOW.getTime() - 5 * MS_PER_DAY);
    const a = engine.assess(
      buildUserPlant({
        wateringFrequency: 10,
        sunlightLevel: SunlightLevel.FULL_SUN,
        lastWateredAt: last,
      }),
      1.3,
      NOW,
    );

    expect(a.status).toBe(CareStatus.SOON);
  });
});
