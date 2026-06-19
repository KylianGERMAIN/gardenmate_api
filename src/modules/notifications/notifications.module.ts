import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationEntity } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { InternalRemindersController } from "./internal-reminders.controller";
import { RemindersJob } from "./reminders.job";
import { UserPlantsModule } from "@/modules/user-plants/user-plants.module";
import { InternalSecretGuard } from "@/common/guards/internal-secret.guard";

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), UserPlantsModule],
  controllers: [NotificationsController, InternalRemindersController],
  providers: [NotificationsService, RemindersJob, InternalSecretGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
