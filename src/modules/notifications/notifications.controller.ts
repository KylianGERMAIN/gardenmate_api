import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { NotificationDto } from "./dto/notification.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import { PaginatedDto } from "@/common/dto/paginated.dto";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@ApiBearerAuth()
@ApiTags("notifications")
@Controller({ path: "users/:userId/notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: "List a user's notifications, paginated (admin or owner)" })
  @ApiResponse({ status: 200, type: PaginatedDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @Get()
  findAll(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedDto<NotificationDto>> {
    return this.notificationsService.findAll(userId, user, query);
  }

  @ApiOperation({ summary: "Mark a notification as read (admin or owner)" })
  @ApiResponse({ status: 200, type: NotificationDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDTO })
  @Patch(":notificationId/read")
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(userId, notificationId, user);
  }
}
