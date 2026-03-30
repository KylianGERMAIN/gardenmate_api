import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";

export class CreatePlantDto {
  @ApiProperty({ example: "Rose" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: SunlightLevel, example: SunlightLevel.FULL_SUN })
  @IsEnum(SunlightLevel)
  sunlightLevel: SunlightLevel;

  @ApiProperty({ example: 3, nullable: true, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  wateringFrequency?: number | null;
}
