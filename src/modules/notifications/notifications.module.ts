import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationEntity } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { RemindersJob } from "./reminders.job";
import { UserPlantsModule } from "@/modules/user-plants/user-plants.module";

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), UserPlantsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, RemindersJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}
