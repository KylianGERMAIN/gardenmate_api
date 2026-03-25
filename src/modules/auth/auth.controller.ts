import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller({ path: "auth", version: "1" })
@ApiTags("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDTO,
  })
  @ApiResponse({
    status: 409,
    description: "Email already exists",
    type: ErrorResponseDTO,
  })
  @Post("register")
  register(@Body() registerDto: RegisterDto): boolean {
    return true;
  }
}
