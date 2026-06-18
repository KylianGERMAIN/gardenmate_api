import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, ValidateIf } from "class-validator";

export class UpdateUserPlantDto {
  @ApiPropertyOptional({ example: "2024-01-01T00:00:00.000Z", nullable: true })
  @IsOptional()
  @ValidateIf((o: UpdateUserPlantDto) => o.plantedAt !== null)
  @IsDateString()
  plantedAt?: string | null;

  @ApiPropertyOptional({ example: "2024-01-10T00:00:00.000Z", nullable: true })
  @IsOptional()
  @ValidateIf((o: UpdateUserPlantDto) => o.lastWateredAt !== null)
  @IsDateString()
  lastWateredAt?: string | null;
}
