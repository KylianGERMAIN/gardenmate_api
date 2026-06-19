import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { plainToInstance } from "class-transformer";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RefreshTokenService } from "./refresh-token.service";
import { UserEntity } from "../users/entities/user.entity";
import { UserDto } from "../users/dto/user.dto";
import { TokenService } from "../token/token.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Crée un nouvel utilisateur et retourne une paire de tokens JWT.
   * @throws {ConflictException} si l'email est déjà utilisé
   */
  async createUser(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let user: UserEntity;
    try {
      user = await this.userRepository.save({
        email: registerDto.email,
        password: hashedPassword,
      });
    } catch (err: unknown) {
      const pg = err as { code?: string };
      if (pg.code === "23505") throw new ConflictException("Email already exists");
      throw err;
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Authentifie un utilisateur et retourne une paire de tokens JWT.
   * @throws {UnauthorizedException} si l'email est inconnu ou le mot de passe incorrect
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Émet une nouvelle paire de tokens par rotation : consomme le refresh token
   * fourni et en émet un nouveau dans la même famille.
   * @throws {UnauthorizedException} si le refresh token est invalide, expiré, réutilisé,
   *   ou si l'utilisateur n'existe plus
   */
  async refresh(refreshDto: RefreshDto): Promise<AuthResponseDto> {
    const { userId, familyId } = await this.refreshTokenService.rotate(refreshDto.refreshToken);

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      await this.refreshTokenService.revokeFamily(familyId);
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    return this.buildAuthResponse(user, familyId);
  }

  /**
   * Déconnecte l'utilisateur en révoquant la famille du refresh token fourni.
   * @throws {UnauthorizedException} si le refresh token est invalide ou expiré
   */
  async logout(refreshDto: RefreshDto): Promise<void> {
    await this.refreshTokenService.revokeByToken(refreshDto.refreshToken);
  }

  /**
   * Génère la réponse auth commune : access token + refresh token (émis dans la
   * famille fournie, ou une nouvelle famille pour une nouvelle session) + user sans password.
   */
  private async buildAuthResponse(user: UserEntity, familyId?: string): Promise<AuthResponseDto> {
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await this.refreshTokenService.issue(user.id, familyId ?? randomUUID());

    const { password: _password, ...userWithoutPassword } = user;

    return plainToInstance(AuthResponseDto, {
      accessToken,
      refreshToken,
      user: plainToInstance(UserDto, userWithoutPassword),
    });
  }
}
