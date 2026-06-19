import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "@/modules/users/entities/user.entity";
import { TokenModule } from "@/modules/token/token.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshTokenService } from "./refresh-token.service";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    PassportModule,
    TokenModule,
  ],
  exports: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RefreshTokenService],
})
export class AuthModule {}
