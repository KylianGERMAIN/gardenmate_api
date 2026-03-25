import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
    @ApiProperty({
      description: "id",
      example:
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    id: string;
  
    @ApiProperty({
      description: "email",
      example:
        "jean@hotmail.com",
    })
    email: string;
  
    @ApiProperty({
      description: "password",
      example:
        "test",
    })
    password: string;
  
    @ApiProperty({
      description: "createdAt",
      example: "2025-06-15T14:30:00.000Z",
    })
    createdAt?: string;

    @ApiProperty({
      description: "updatedAt",
      example: "2025-06-15T14:30:00.000Z",
    })
    updatedAt?: string;
  }
  