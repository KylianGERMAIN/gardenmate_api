import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { PlantDto } from "@/modules/plants/dto/plant.dto";

export class UserPlantDto {
  @ApiProperty({ example: "uuid-1" })
  id: string;

  @ApiProperty({ example: "user-uuid" })
  userId: string;

  @ApiProperty({ example: "plant-uuid" })
  plantId: string;

  @ApiProperty({ example: "2024-01-15T00:00:00.000Z", nullable: true })
  @Transform(({ value }: { value: Date | string | null }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  plantedAt: string | null;

  @ApiProperty({ example: "2024-01-15T00:00:00.000Z", nullable: true })
  @Transform(({ value }: { value: Date | string | null }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  lastWateredAt: string | null;

  @ApiProperty({ type: () => PlantDto })
  plant: PlantDto;
}
