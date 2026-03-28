import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller({ path: "auth", version: "1" })
@ApiTags("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully", type: AuthResponseDto })
  @ApiResponse({ status: 400, description: "Bad request", type: ErrorResponseDTO })
  @ApiResponse({ status: 409, description: "Email already exists", type: ErrorResponseDTO })
  @Post("register")
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.createUser(registerDto);
  }

  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful", type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials", type: ErrorResponseDTO })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
