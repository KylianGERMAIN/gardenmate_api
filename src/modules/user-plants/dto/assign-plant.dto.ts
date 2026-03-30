import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class AssignPlantDto {
  @ApiProperty({ example: "plant-uuid" })
  @IsUUID()
  plantId: string;

  @ApiPropertyOptional({ example: "2024-01-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  plantedAt?: string;

  @ApiPropertyOptional({ example: "2024-01-10T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  lastWateredAt?: string;
}
