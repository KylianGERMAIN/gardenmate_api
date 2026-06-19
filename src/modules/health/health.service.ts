import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

/** Résultat d'un contrôle de disponibilité. */
export interface ReadinessResult {
  status: "ok";
  database: "up";
}

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Contrôle de *readiness* : l'application est-elle prête à servir du trafic ?
   * Vérifie la connexion base via un `SELECT 1`.
   * @throws {ServiceUnavailableException} (503) si la base est injoignable
   */
  async checkReadiness(): Promise<ReadinessResult> {
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "down" });
    }

    return { status: "ok", database: "up" };
  }
}
