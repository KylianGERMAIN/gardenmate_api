import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { plainToInstance } from "class-transformer";
import { WateringEventEntity } from "./entities/watering-event.entity";
import { WateringEventDto } from "./dto/watering-event.dto";
import type { CreateWateringEventDto } from "./dto/create-watering-event.dto";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class WateringEventsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enregistre un arrosage de façon transactionnelle :
   * - Met à jour `lastWateredAt` sur la UserPlant
   * - Crée un `WateringEvent`
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire de la UserPlant
   * @throws {NotFoundException} si la UserPlant n'existe pas ou n'appartient pas à l'utilisateur
   */
  async water(
    userId: string,
    userPlantId: string,
    dto: CreateWateringEventDto,
    requester: JwtAccessPayload,
  ): Promise<WateringEventDto> {
    if (requester.sub !== userId) throw new ForbiddenException("Insufficient permissions");

    return this.dataSource.transaction(async (manager) => {
      const userPlant = await manager.findOne(UserPlantEntity, {
        where: { id: userPlantId, userId },
      });

      if (!userPlant) throw new NotFoundException("UserPlant not found");

      const now = new Date();
      userPlant.lastWateredAt = now;
      await manager.save(userPlant);

      const event = manager.create(WateringEventEntity, {
        userPlantId,
        note: dto.note ?? null,
      });

      const saved = await manager.save(event);

      return plainToInstance(WateringEventDto, saved);
    });
  }
}
