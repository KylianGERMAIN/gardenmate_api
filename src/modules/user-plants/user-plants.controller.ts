import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserPlantsService } from "./user-plants.service";
import { UserPlantDto } from "./dto/user-plant.dto";
import { AssignPlantDto } from "./dto/assign-plant.dto";
import { UpdateUserPlantDto } from "./dto/update-user-plant.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@ApiBearerAuth()
@ApiTags("user-plants")
@Controller({ path: "users/:userId/plants", version: "1" })
export class UserPlantsController {
  constructor(private readonly userPlantsService: UserPlantsService) {}

  @ApiOperation({ summary: "Assign a plant to a user (owner only)" })
  @ApiResponse({ status: 201, type: UserPlantDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "Plant not found", type: ErrorResponseDTO })
  @Post()
  assign(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: AssignPlantDto,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto> {
    return this.userPlantsService.assign(userId, dto, user);
  }

  @ApiOperation({ summary: "List user plants (owner only)" })
  @ApiResponse({ status: 200, type: [UserPlantDto] })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @Get()
  findAll(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto[]> {
    return this.userPlantsService.findAll(userId, user);
  }

  @ApiOperation({ summary: "List plants needing water (admin or owner)" })
  @ApiResponse({ status: 200, type: [UserPlantDto] })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @Get("needing-water")
  findNeedingWater(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto[]> {
    return this.userPlantsService.findNeedingWater(userId, user);
  }

  @ApiOperation({ summary: "Water all plants at once (owner only)" })
  @ApiResponse({ status: 200, type: [UserPlantDto] })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @Post("water-all")
  @HttpCode(HttpStatus.OK)
  waterAll(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto[]> {
    return this.userPlantsService.waterAll(userId, user);
  }

  @ApiOperation({ summary: "Update a user plant dates (owner only)" })
  @ApiResponse({ status: 200, type: UserPlantDto })
  @ApiResponse({ status: 400, description: "Bad request", type: ErrorResponseDTO })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDTO })
  @Patch(":userPlantId")
  @HttpCode(HttpStatus.OK)
  update(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("userPlantId", ParseUUIDPipe) userPlantId: string,
    @Body() dto: UpdateUserPlantDto,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto> {
    return this.userPlantsService.update(userId, userPlantId, dto, user);
  }

  @ApiOperation({ summary: "Remove a plant from a user's garden (owner only)" })
  @ApiResponse({ status: 200, type: UserPlantDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDTO })
  @Delete(":userPlantId")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("userPlantId", ParseUUIDPipe) userPlantId: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserPlantDto> {
    return this.userPlantsService.remove(userId, userPlantId, user);
  }
}
