import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WateringEventsService } from "./watering-events.service";
import { WateringEventDto } from "./dto/watering-event.dto";
import { CreateWateringEventDto } from "./dto/create-watering-event.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@ApiBearerAuth()
@ApiTags("watering-events")
@Controller({ path: "users/:userId/plants/:userPlantId/water", version: "1" })
export class WateringEventsController {
  constructor(private readonly wateringEventsService: WateringEventsService) {}

  @ApiOperation({ summary: "Record a watering event for a user plant (owner only)" })
  @ApiResponse({ status: 201, type: WateringEventDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "UserPlant not found", type: ErrorResponseDTO })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  water(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("userPlantId", ParseUUIDPipe) userPlantId: string,
    @Body() dto: CreateWateringEventDto,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<WateringEventDto> {
    return this.wateringEventsService.water(userId, userPlantId, dto, user);
  }
}
