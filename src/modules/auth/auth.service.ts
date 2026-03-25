import { Injectable } from "@nestjs/common";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { UserDto } from "../users/dto/user.dto";
import { Repository } from "typeorm";
import { UserEntity } from "../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
      ) {}

    public async createUser(registerUser):Promise<AuthResponseDto> {
        let authResponse:AuthResponseDto = new AuthResponseDto

        const user = await this.userRepository.save(registerUser);

        const { password, ...userWithoutPassword } = user;

        authResponse.user = userWithoutPassword

        return authResponse;
    }
}
