import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDTO {
  @ApiProperty({
    description: "HTTP status code of the error",
    example: 500,
  })
  statusCode: number;

  @ApiProperty({
    description: "Error date and time in ISO 8601 format",
    example: "2025-02-13T14:30:00.000Z",
    format: "date-time",
  })
  timestamp: string;

  @ApiProperty({
    description: "Request path that triggered the error",
    example: "/api/auth/login",
  })
  path: string;

  @ApiProperty({
    description: "Error message returned by the application",
    example: "Unauthorized",
  })
  message: string;

  @ApiProperty({
    description: "Unique request identifier (for tracing and logs)",
    example: "308d075a-81e7-43bc-abf2-fab0226cd256",
  })
  requestId: string;
}
