import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";

export class PlantQueryDto {
  @ApiPropertyOptional({ enum: SunlightLevel })
  @IsOptional()
  @IsEnum(SunlightLevel)
  sunlightLevel?: SunlightLevel;

  @ApiPropertyOptional({ example: "rose" })
  @IsOptional()
  @IsString()
  name?: string;
}
