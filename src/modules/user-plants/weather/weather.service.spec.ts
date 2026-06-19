import { WeatherService } from "./weather.service";

const NOW = new Date("2026-07-15T12:00:00.000Z");
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

describe("WeatherService", () => {
  let service: WeatherService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new WeatherService();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => fetchMock.mockRestore());

  /** Simule une réponse Open-Meteo avec les valeurs ET0 fournies. */
  function mockEt0Once(values: (number | null)[]): void {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daily: { et0_fao_evapotranspiration: values } }),
    } as unknown as Response);
  }

  it("repli saisonnier sans localisation, sans appel réseau", async () => {
    const res = await service.getWaterDemand(null, NOW);

    expect(res.source).toBe("season");
    expect(typeof res.coefficient).toBe("number");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calcule le coefficient depuis l'ET0 réel", async () => {
    mockEt0Once([4.2, 4.2, 4.2, 4.2]); // moyenne 4.2 / 3.5 (référence) = 1.2

    const res = await service.getWaterDemand(PARIS, NOW);

    expect(res.source).toBe("weather");
    expect(res.coefficient).toBeCloseTo(1.2, 5);
  });

  it("borne le coefficient quand l'ET0 est très élevé", async () => {
    mockEt0Once([20, 20]); // 20 / 3.5 = 5.7 → plafonné à 1.6

    const res = await service.getWaterDemand(PARIS, NOW);

    expect(res.coefficient).toBe(1.6);
  });

  it("repli saisonnier si l'API échoue", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const res = await service.getWaterDemand(PARIS, NOW);

    expect(res.source).toBe("season");
  });

  it("met en cache : un seul appel réseau pour deux requêtes identiques", async () => {
    mockEt0Once([4.2, 4.2]);

    await service.getWaterDemand(PARIS, NOW);
    await service.getWaterDemand(PARIS, NOW);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recharge après expiration du cache (TTL dépassé)", async () => {
    mockEt0Once([4.2, 4.2]);
    mockEt0Once([4.2, 4.2]);
    const later = new Date(NOW.getTime() + 7 * 60 * 60 * 1000); // +7 h > TTL 6 h

    await service.getWaterDemand(PARIS, NOW);
    await service.getWaterDemand(PARIS, later);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("décale la saison pour l'hémisphère sud en repli", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const north = { latitude: 48.86, longitude: 2.35 };
    const south = { latitude: -33.87, longitude: 151.21 };

    const resNorth = await service.getWaterDemand(north, NOW); // juillet, été nord
    const resSouth = await service.getWaterDemand(south, NOW); // juillet, hiver sud

    expect(resNorth.source).toBe("season");
    expect(resSouth.source).toBe("season");
    expect(resSouth.coefficient).toBeLessThan(resNorth.coefficient);
  });
});
