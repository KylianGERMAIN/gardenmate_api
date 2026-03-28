import { ApiProperty } from "@nestjs/swagger";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";

export class PlantDto {
  @ApiProperty({ example: "uuid-1" })
  id: string;

  @ApiProperty({ example: "Rose" })
  name: string;

  @ApiProperty({ enum: SunlightLevel, example: SunlightLevel.FULL_SUN })
  sunlightLevel: SunlightLevel;

  @ApiProperty({ example: 3, nullable: true })
  wateringFrequency: number | null;
}
