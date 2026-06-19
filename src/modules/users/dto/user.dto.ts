import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { UserRole } from "@/modules/users/entities/user.entity";

export class UserDto {
  @ApiProperty({
    description: "id",
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  })
  id: string;

  @ApiProperty({
    description: "email",
    example: "jean@hotmail.com",
  })
  email: string;

  @ApiProperty({ description: "Rôle de l'utilisateur", enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ description: "Latitude", example: 48.8566, nullable: true })
  latitude?: number | null;

  @ApiProperty({ description: "Longitude", example: 2.3522, nullable: true })
  longitude?: number | null;

  @ApiProperty({
    description: "createdAt",
    example: "2025-06-15T14:30:00.000Z",
  })
  @Transform(({ value }: { value: Date | string }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  createdAt?: string;

  @ApiProperty({
    description: "updatedAt",
    example: "2025-06-15T14:30:00.000Z",
  })
  @Transform(({ value }: { value: Date | string }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  updatedAt?: string;
}
