import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PlantsService } from "./plants.service";
import { PlantDto } from "./dto/plant.dto";
import { CreatePlantDto } from "./dto/create-plant.dto";
import { PlantQueryDto } from "./dto/plant-query.dto";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/modules/users/entities/user.entity";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";

@ApiBearerAuth()
@ApiTags("plants")
@Controller({ path: "plants", version: "1" })
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @ApiOperation({ summary: "List plants (authenticated)" })
  @ApiResponse({ status: 200, type: [PlantDto] })
  @Get()
  findAll(@Query() query: PlantQueryDto): Promise<PlantDto[]> {
    return this.plantsService.findAll(query);
  }

  @ApiOperation({ summary: "Create a plant (admin only)" })
  @ApiResponse({ status: 201, type: PlantDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 409, description: "Conflict", type: ErrorResponseDTO })
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePlantDto): Promise<PlantDto> {
    return this.plantsService.create(dto);
  }

  @ApiOperation({ summary: "Delete a plant (admin only)" })
  @ApiResponse({ status: 200, type: PlantDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "Not found", type: ErrorResponseDTO })
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<PlantDto> {
    return this.plantsService.remove(id);
  }
}
