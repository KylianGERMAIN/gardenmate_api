import { UserDto } from "@/modules/users/dto/user.dto";
import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
    @ApiProperty({
      description: "accessToken",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTQ1ODg3MjE5Nn0.CA7eaHjIHz5NxeIJoFK9krqaeZrPLwmMmgI_XiQiIkQ",
    })
    accessToken: string;
  
    @ApiProperty({
      description: "refreshToken",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL2NhbGFuZGFyL3YxLyIsInN1YiI6InVzcl8xMjMiLCJpYXQiOjE0NTg3ODU3OTYsImV4cCI6MTQ1ODg3MjE5Nn0.CA7eaHjIHz5NxeIJoFK9krqaeZrPLwmMmgI_XiQiIkQ",
    })
    refreshToken: string;
  
    @ApiProperty({
      description: "user",
      example: {
        id: "123e4567-e89b-12d3-a456-426655440000",
        email: "john.doe@example.com",
        password: "test",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
      type: () => UserDto,
    })
    user: UserDto;
  
    @ApiProperty({
      description: "requestId",
      example: "308d075a-81e7-43bc-abf2-fab0226cd256",
    })
    requestId?: string;
  }
  