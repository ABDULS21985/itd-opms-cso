import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmployerEmailDto {
  @ApiProperty({ description: 'Email address to verify' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Verification code sent to the email' })
  @IsString()
  @MinLength(4)
  code!: string;
}
