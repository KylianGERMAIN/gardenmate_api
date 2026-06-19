import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { UserPlantsService } from "@/modules/user-plants/user-plants.service";
import { NotificationsService } from "./notifications.service";

/**
 * Job planifié émettant les rappels d'arrosage.
 *
 * S'appuie sur le moteur de soin (via UserPlantsService) pour déterminer les
 * plantes en retard, et crée une notification idempotente par plante et par jour.
 */
@Injectable()
export class RemindersJob {
  private readonly logger = new Logger(RemindersJob.name);

  constructor(
    private readonly userPlantsService: UserPlantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Déclenche les rappels chaque jour à 8h. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendWateringReminders(): Promise<void> {
    const { users, reminders } = await this.run(new Date());
    this.logger.log(`Rappels d'arrosage : ${reminders} créé(s) pour ${users} utilisateur(s)`);
  }

  /**
   * Parcourt les utilisateurs possédant des plantes et crée un rappel par plante
   * dont l'arrosage est dépassé. Idempotent (déduplication en base) : rejouable
   * le même jour sans produire de doublon. Extrait du décorateur `@Cron` pour
   * être testable et déclenchable directement.
   */
  async run(now: Date): Promise<{ users: number; reminders: number }> {
    const userIds = await this.userPlantsService.findUserIdsWithPlants();
    let reminders = 0;

    for (const userId of userIds) {
      const overdue = await this.userPlantsService.collectOverdue(userId, now);
      for (const userPlant of overdue) {
        await this.notificationsService.createWateringReminder(userId, userPlant, now);
        reminders += 1;
      }
    }

    return { users: userIds.length, reminders };
  }
}
