import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { NotificationType } from "../entities/notification.entity";

/** Notification telle qu'exposée en réponse API. */
export class NotificationDto {
  @ApiProperty({ example: "notif-uuid" })
  id: string;

  @ApiProperty({ example: "up-uuid", nullable: true })
  userPlantId: string | null;

  @ApiProperty({ enum: NotificationType, example: NotificationType.WATERING_REMINDER })
  type: NotificationType;

  @ApiProperty({ example: "Ficus lyrata a besoin d'eau." })
  message: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: "2026-06-19T08:00:00.000Z" })
  @Transform(({ value }: { value: Date | string }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  createdAt: string;
}
