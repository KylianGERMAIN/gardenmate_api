import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UserDto } from "./dto/user.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ErrorResponseDTO } from "@/common/dto/error-response.dto";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@ApiBearerAuth()
@ApiTags("users")
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Get a user by ID (admin or owner)" })
  @ApiResponse({ status: 200, description: "User found", type: UserDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "User not found", type: ErrorResponseDTO })
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserDto> {
    return this.usersService.findById(id, user);
  }

  @ApiOperation({ summary: "Delete a user by ID (admin or owner)" })
  @ApiResponse({ status: 200, description: "User deleted", type: UserDto })
  @ApiResponse({ status: 403, description: "Forbidden", type: ErrorResponseDTO })
  @ApiResponse({ status: 404, description: "User not found", type: ErrorResponseDTO })
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<UserDto> {
    return this.usersService.remove(id, user);
  }
}
