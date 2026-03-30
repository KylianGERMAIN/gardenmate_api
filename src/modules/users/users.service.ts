import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { UserEntity, UserRole } from "./entities/user.entity";
import { UserDto } from "./dto/user.dto";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Retourne un utilisateur par son ID.
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async findById(id: string, requester: JwtAccessPayload): Promise<UserDto> {
    this.assertAdminOrOwner(requester, id);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) throw new NotFoundException("User not found");

    return this.toUserDto(user);
  }

  /**
   * Supprime un utilisateur par son ID.
   * @throws {NotFoundException} si l'utilisateur n'existe pas
   * @throws {ForbiddenException} si le demandeur n'est ni admin ni le propriétaire
   */
  async remove(id: string, requester: JwtAccessPayload): Promise<UserDto> {
    this.assertAdminOrOwner(requester, id);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) throw new NotFoundException("User not found");

    await this.userRepository.remove(user);

    return this.toUserDto({ ...user, id });
  }

  /** Mappe un `UserEntity` vers `UserDto` en excluant le mot de passe. */
  private toUserDto(user: UserEntity): UserDto {
    const { password: _password, ...safeUser } = user;
    return plainToInstance(UserDto, safeUser);
  }

  /** Vérifie que le demandeur est ADMIN ou le propriétaire de la ressource. */
  private assertAdminOrOwner(requester: JwtAccessPayload, resourceOwnerId: string): void {
    if (requester.role !== UserRole.ADMIN && requester.sub !== resourceOwnerId) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }
}
