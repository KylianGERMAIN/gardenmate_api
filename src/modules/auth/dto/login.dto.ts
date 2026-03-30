import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: "Email de l'utilisateur",
    example: "kylian@hotmail.com",
    format: "email",
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: "Abcd95470*",
  })
  password: string;
}
