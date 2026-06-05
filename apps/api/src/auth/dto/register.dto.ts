import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex@taskflow.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Alex Doe', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
