import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { plainToInstance } from "class-transformer";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UserEntity } from "../users/entities/user.entity";
import { UserDto } from "../users/dto/user.dto";
import { TokenService } from "../token/token.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly tokenService: TokenService,
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
   * Génère la réponse auth commune : tokens + user mappé sans password.
   */
  private async buildAuthResponse(user: UserEntity): Promise<AuthResponseDto> {
    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
    );

    const { password: _password, ...userWithoutPassword } = user;

    return plainToInstance(AuthResponseDto, {
      accessToken,
      refreshToken,
      user: plainToInstance(UserDto, userWithoutPassword),
    });
  }
}
