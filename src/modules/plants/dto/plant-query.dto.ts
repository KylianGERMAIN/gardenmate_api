import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";

export class PlantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SunlightLevel })
  @IsOptional()
  @IsEnum(SunlightLevel)
  sunlightLevel?: SunlightLevel;

  @ApiPropertyOptional({ example: "rose" })
  @IsOptional()
  @IsString()
  name?: string;
}
