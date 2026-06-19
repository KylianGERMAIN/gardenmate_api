import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { NotificationEntity, NotificationType } from "./entities/notification.entity";
import { NotificationDto } from "./dto/notification.dto";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  /**
   * Crée un rappel d'arrosage pour une plante, de façon idempotente : au plus un
   * rappel par plante et par jour (idempotence garantie par la contrainte unique
   * sur `dedupe_key`). Usage système (appelé par le job), sans contrôle d'autorisation.
   */
  async createWateringReminder(
    userId: string,
    userPlant: UserPlantEntity,
    now: Date,
  ): Promise<void> {
    const dedupeKey = `watering:${userPlant.id}:${this.dayStamp(now)}`;

    const notification = this.notificationRepository.create({
      userId,
      userPlantId: userPlant.id,
      type: NotificationType.WATERING_REMINDER,
      message: `${userPlant.plant.name} a besoin d'eau.`,
      dedupeKey,
    });

    try {
      await this.notificationRepository.save(notification);
    } catch (err: unknown) {
      const pg = err as { code?: string };
      // 23505 = doublon sur dedupe_key : rappel déjà émis aujourd'hui, on ignore.
      if (pg.code === "23505") return;
      throw err;
    }
  }

  /**
   * Liste les notifications d'un utilisateur, des plus récentes aux plus anciennes.
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async findAll(userId: string, requester: JwtAccessPayload): Promise<NotificationDto[]> {
    this.assertAdminOrOwner(requester, userId);

    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return notifications.map((n) => plainToInstance(NotificationDto, n));
  }

  /**
   * Marque une notification comme lue.
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   * @throws {NotFoundException} si la notification n'existe pas pour cet utilisateur
   */
  async markAsRead(
    userId: string,
    notificationId: string,
    requester: JwtAccessPayload,
  ): Promise<NotificationDto> {
    this.assertAdminOrOwner(requester, userId);

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) throw new NotFoundException("Notification not found");

    notification.isRead = true;
    const saved = await this.notificationRepository.save(notification);

    return plainToInstance(NotificationDto, saved);
  }

  /** Estampille de jour (UTC, YYYY-MM-DD) pour la clé d'idempotence. */
  private dayStamp(now: Date): string {
    return now.toISOString().slice(0, 10);
  }

  /** Vérifie que le demandeur est ADMIN ou le propriétaire de la ressource. */
  private assertAdminOrOwner(requester: JwtAccessPayload, userId: string): void {
    if (requester.role !== UserRole.ADMIN && requester.sub !== userId) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }
}
