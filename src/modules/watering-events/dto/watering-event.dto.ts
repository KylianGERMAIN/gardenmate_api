import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class WateringEventDto {
  @ApiProperty({ example: "uuid-1" })
  id: string;

  @ApiProperty({ example: "user-plant-uuid" })
  userPlantId: string;

  @ApiProperty({ example: "2024-01-15T00:00:00.000Z" })
  @Transform(({ value }: { value: Date | string }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  wateredAt: string;

  @ApiProperty({ example: "Bonne journée d'arrosage", nullable: true })
  note: string | null;
}
