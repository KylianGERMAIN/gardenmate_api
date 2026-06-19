import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

/** Coordonnées géographiques d'un utilisateur. */
export class UpdateLocationDto {
  @ApiProperty({ example: 48.8566, description: "Latitude (-90 à 90)" })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 2.3522, description: "Longitude (-180 à 180)" })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
