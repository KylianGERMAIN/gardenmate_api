import { ServiceUnavailableException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { HealthService } from "./health.service";

const mockDataSource = { query: jest.fn() };

describe("HealthService", () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: DataSource, useValue: mockDataSource }],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest.clearAllMocks();
  });

  it("retourne ok quand la base répond", async () => {
    mockDataSource.query.mockResolvedValue([{ "?column?": 1 }]);

    await expect(service.checkReadiness()).resolves.toEqual({ status: "ok", database: "up" });
    expect(mockDataSource.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("lève ServiceUnavailableException (503) quand la base est injoignable", async () => {
    mockDataSource.query.mockRejectedValue(new Error("connection refused"));

    await expect(service.checkReadiness()).rejects.toThrow(ServiceUnavailableException);
  });
});
