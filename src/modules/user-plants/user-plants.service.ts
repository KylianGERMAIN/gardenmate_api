import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { UserPlantEntity } from "./entities/user-plant.entity";
import { UserPlantDto } from "./dto/user-plant.dto";
import { AssignPlantDto } from "./dto/assign-plant.dto";
import type { UpdateUserPlantDto } from "./dto/update-user-plant.dto";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class UserPlantsService {
  constructor(
    @InjectRepository(UserPlantEntity)
    private readonly userPlantRepository: Repository<UserPlantEntity>,
  ) {}

  /**
   * Assigne une plante à un utilisateur.
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire
   * @throws {NotFoundException} si la plante référencée n'existe pas (FK violation)
   */
  async assign(userId: string, dto: AssignPlantDto, requester: JwtAccessPayload): Promise<UserPlantDto> {
    this.assertOwner(requester, userId);

    const userPlant = this.userPlantRepository.create({
      userId,
      plantId: dto.plantId,
      plantedAt: dto.plantedAt ? new Date(dto.plantedAt) : null,
      lastWateredAt: dto.lastWateredAt ? new Date(dto.lastWateredAt) : null,
    });

    try {
      const saved = await this.userPlantRepository.save(userPlant);
      const withRelation = await this.findUserPlantOrThrow(saved.id);
      return plainToInstance(UserPlantDto, withRelation);
    } catch (err: unknown) {
      const pg = err as { code?: string };
      if (pg.code === "23503") throw new NotFoundException("Plant not found");
      throw err;
    }
  }

  /**
   * Liste les plantes d'un utilisateur avec le détail de la plante.
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire
   */
  async findAll(userId: string, requester: JwtAccessPayload): Promise<UserPlantDto[]> {
    this.assertOwner(requester, userId);

    const userPlants = await this.userPlantRepository.find({ where: { userId } });

    return userPlants.map((up) => plainToInstance(UserPlantDto, up));
  }

  /**
   * Retourne les plantes d'un utilisateur nécessitant un arrosage.
   * Une plante a besoin d'eau si `wateringFrequency` est définie et que `lastWateredAt`
   * est null ou dépasse la fréquence recommandée.
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async findNeedingWater(userId: string, requester: JwtAccessPayload): Promise<UserPlantDto[]> {
    this.assertAdminOrOwner(requester, userId);

    const userPlants = await this.userPlantRepository.find({ where: { userId } });

    const now = Date.now();

    const filtered = userPlants.filter((up) => {
      const freq = up.plant?.wateringFrequency;
      if (!freq) return false;
      if (!up.lastWateredAt) return true;
      const msPerDay = 24 * 60 * 60 * 1000;
      return now - up.lastWateredAt.getTime() >= freq * msPerDay;
    });

    return filtered.map((up) => plainToInstance(UserPlantDto, up));
  }

  /**
   * Met à jour les dates `plantedAt` et/ou `lastWateredAt` d'une UserPlant.
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire
   * @throws {NotFoundException} si la UserPlant n'existe pas ou n'appartient pas à l'utilisateur
   * @throws {BadRequestException} si aucun champ n'est fourni
   */
  async update(
    userId: string,
    userPlantId: string,
    dto: UpdateUserPlantDto,
    requester: JwtAccessPayload,
  ): Promise<UserPlantDto> {
    this.assertOwner(requester, userId);

    if (dto.plantedAt === undefined && dto.lastWateredAt === undefined) {
      throw new BadRequestException("At least one field (plantedAt or lastWateredAt) is required");
    }

    const userPlant = await this.userPlantRepository.findOne({
      where: { id: userPlantId, userId },
    });

    if (!userPlant) throw new NotFoundException("UserPlant not found");

    if (dto.plantedAt !== undefined) {
      userPlant.plantedAt = dto.plantedAt ? new Date(dto.plantedAt) : null;
    }
    if (dto.lastWateredAt !== undefined) {
      userPlant.lastWateredAt = dto.lastWateredAt ? new Date(dto.lastWateredAt) : null;
    }

    const saved = await this.userPlantRepository.save(userPlant);
    const withRelation = await this.findUserPlantOrThrow(saved.id);
    return plainToInstance(UserPlantDto, withRelation);
  }

  /**
   * Supprime l'association entre un utilisateur et une plante.
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire
   * @throws {NotFoundException} si la UserPlant n'existe pas
   */
  async remove(userId: string, userPlantId: string, requester: JwtAccessPayload): Promise<UserPlantDto> {
    this.assertOwner(requester, userId);

    const userPlant = await this.userPlantRepository.findOne({
      where: { id: userPlantId, userId },
    });

    if (!userPlant) throw new NotFoundException("UserPlant not found");

    const snapshot = plainToInstance(UserPlantDto, { ...userPlant, id: userPlantId });
    await this.userPlantRepository.remove(userPlant);
    return snapshot;
  }

  /** Récupère une UserPlant par ID ou lève NotFoundException. */
  private async findUserPlantOrThrow(id: string): Promise<UserPlantEntity> {
    const userPlant = await this.userPlantRepository.findOne({ where: { id } });
    if (!userPlant) throw new NotFoundException("UserPlant not found");
    return userPlant;
  }

  /** Vérifie que le demandeur est le propriétaire de la ressource. */
  private assertOwner(requester: JwtAccessPayload, userId: string): void {
    if (requester.sub !== userId) throw new ForbiddenException("Insufficient permissions");
  }

  /** Vérifie que le demandeur est ADMIN ou le propriétaire de la ressource. */
  private assertAdminOrOwner(requester: JwtAccessPayload, userId: string): void {
    if (requester.role !== UserRole.ADMIN && requester.sub !== userId) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }
}
