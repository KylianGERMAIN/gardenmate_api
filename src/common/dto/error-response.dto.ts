import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDTO {
  @ApiProperty({
    description: "HTTP status code of the error",
    example: 409,
  })
  statusCode: number;

  @ApiProperty({
    description: "HTTP error name",
    example: "Conflict",
  })
  error: string;

  @ApiProperty({
    description: "Error message returned by the application",
    example: "Email already exists",
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message: string | string[];

  @ApiProperty({
    description: "Unique request identifier (for tracing and logs)",
    example: "308d075a-81e7-43bc-abf2-fab0226cd256",
  })
  requestId: string;

  @ApiProperty({
    description: "Error date and time in ISO 8601 format",
    example: "2025-02-13T14:30:00.000Z",
    format: "date-time",
  })
  timestamp: string;

  @ApiProperty({
    description: "Request path that triggered the error",
    example: "/api/v1/auth/register",
  })
  path: string;
}
