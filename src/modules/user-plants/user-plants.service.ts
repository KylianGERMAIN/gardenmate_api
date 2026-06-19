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
import { CareRecommendationDto, CareStatus } from "./dto/care-recommendation.dto";
import { CareEngineService, type CareAssessment } from "./care/care-engine.service";
import { WeatherService } from "./weather/weather.service";
import { UsersService } from "@/modules/users/users.service";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class UserPlantsService {
  /** Ordre de tri du plan de soin : du plus urgent au moins urgent. */
  private static readonly STATUS_ORDER: Record<CareStatus, number> = {
    [CareStatus.OVERDUE]: 0,
    [CareStatus.SOON]: 1,
    [CareStatus.OK]: 2,
    [CareStatus.NO_SCHEDULE]: 3,
  };

  constructor(
    @InjectRepository(UserPlantEntity)
    private readonly userPlantRepository: Repository<UserPlantEntity>,
    private readonly careEngine: CareEngineService,
    private readonly weatherService: WeatherService,
    private readonly usersService: UsersService,
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
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async findAll(userId: string, requester: JwtAccessPayload): Promise<UserPlantDto[]> {
    this.assertAdminOrOwner(requester, userId);

    const userPlants = await this.userPlantRepository.find({ where: { userId } });

    return userPlants.map((up) => plainToInstance(UserPlantDto, up));
  }

  /**
   * Retourne les plantes d'un utilisateur dont l'arrosage est dépassé (statut OVERDUE),
   * d'après le moteur de soin.
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async findNeedingWater(userId: string, requester: JwtAccessPayload): Promise<UserPlantDto[]> {
    this.assertAdminOrOwner(requester, userId);

    const { assessments } = await this.buildAssessments(userId, new Date());

    return assessments
      .filter(({ assessment }) => assessment.status === CareStatus.OVERDUE)
      .map(({ userPlant }) => plainToInstance(UserPlantDto, userPlant));
  }

  /**
   * Calcule le plan de soin d'un utilisateur : une recommandation d'arrosage par
   * plante, triée du plus urgent au moins urgent.
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async getCarePlan(userId: string, requester: JwtAccessPayload): Promise<CareRecommendationDto[]> {
    this.assertAdminOrOwner(requester, userId);

    const { assessments, source } = await this.buildAssessments(userId, new Date());

    return assessments
      .map(({ userPlant, assessment }) => this.toRecommendation(userPlant, assessment, source))
      .sort(
        (a, b) =>
          UserPlantsService.STATUS_ORDER[a.status] - UserPlantsService.STATUS_ORDER[b.status],
      );
  }

  /**
   * Évalue toutes les plantes d'un utilisateur via le moteur de soin, le coefficient
   * de demande en eau étant résolu une seule fois (météo réelle ou repli saisonnier).
   * Source unique de calcul partagée par `findNeedingWater` et `getCarePlan`.
   */
  private async buildAssessments(
    userId: string,
    now: Date,
  ): Promise<{
    assessments: { userPlant: UserPlantEntity; assessment: CareAssessment }[];
    source: "weather" | "season";
  }> {
    const location = await this.usersService.findLocation(userId);
    const { coefficient, source } = await this.weatherService.getWaterDemand(location, now);
    const userPlants = await this.userPlantRepository.find({ where: { userId } });

    return {
      source,
      assessments: userPlants.map((userPlant) => ({
        userPlant,
        assessment: this.careEngine.assess(userPlant, coefficient, now),
      })),
    };
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
   * Met à jour `lastWateredAt` sur toutes les plantes d'un utilisateur.
   * @throws {ForbiddenException} si le demandeur n'est pas le propriétaire
   */
  async waterAll(userId: string, requester: JwtAccessPayload): Promise<UserPlantDto[]> {
    this.assertOwner(requester, userId);

    const now = new Date();
    await this.userPlantRepository.update({ userId }, { lastWateredAt: now });

    const userPlants = await this.userPlantRepository.find({ where: { userId } });

    return userPlants.map((up) => plainToInstance(UserPlantDto, up));
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

  /** Mappe une UserPlant et son évaluation vers le DTO de recommandation. */
  private toRecommendation(
    userPlant: UserPlantEntity,
    assessment: CareAssessment,
    source: "weather" | "season",
  ): CareRecommendationDto {
    return plainToInstance(CareRecommendationDto, {
      userPlantId: userPlant.id,
      plantId: userPlant.plantId,
      plantName: userPlant.plant.name,
      status: assessment.status,
      nextWateringDate: assessment.nextWateringDate?.toISOString() ?? null,
      adjustedIntervalDays: assessment.adjustedIntervalDays,
      factors: { ...assessment.factors, source },
    });
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
