import { ApiProperty } from "@nestjs/swagger";
import { UserDto } from "@/modules/users/dto/user.dto";

export class AuthResponseDto {
  @ApiProperty({
    description: "Access token JWT (durée : 15 min)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTQ1ODg3MjE5Nn0.CA7eaHjIHz5NxeIJoFK9krqaeZrPLwmMmgI_XiQiIkQ",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh token JWT (durée : 7 jours)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTQ1ODg3MjE5Nn0.CA7eaHjIHz5NxeIJoFK9krqaeZrPLwmMmgI_XiQiIkQ",
  })
  refreshToken: string;

  @ApiProperty({
    description: "Utilisateur authentifié",
    example: {
      id: "123e4567-e89b-12d3-a456-426655440000",
      email: "john.doe@example.com",
      createdAt: "2024-01-15T00:00:00.000Z",
      updatedAt: "2024-01-15T00:00:00.000Z",
    },
    type: () => UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: "Identifiant unique de la requête (traçabilité)",
    example: "308d075a-81e7-43bc-abf2-fab0226cd256",
  })
  requestId?: string;
}
