import { Injectable, Logger } from "@nestjs/common";
import { UserPlantsService } from "@/modules/user-plants/user-plants.service";
import { NotificationsService } from "./notifications.service";

/**
 * Logique des rappels d'arrosage.
 *
 * Déclenchée par un scheduler **externe** (GitHub Actions cron → endpoint interne)
 * plutôt qu'un cron in-process : ça survit aux mises en veille de l'hébergeur gratuit
 * et découple le scheduling de l'uptime de l'application.
 */
@Injectable()
export class RemindersJob {
  private readonly logger = new Logger(RemindersJob.name);

  constructor(
    private readonly userPlantsService: UserPlantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Parcourt les utilisateurs possédant des plantes et crée un rappel par plante
   * dont l'arrosage est dépassé. Idempotent (déduplication en base) : rejouable
   * le même jour sans produire de doublon.
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

    this.logger.log(`Rappels d'arrosage : ${reminders} créé(s) pour ${userIds.length} utilisateur(s)`);
    return { users: userIds.length, reminders };
  }
}
