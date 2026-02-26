import { IsString, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TalentUserType } from '../../../common/constants/status.constant';

export class LoginDto {
  @ApiProperty({ example: 'ada.okafor@talentportal.uat' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;

  @ApiProperty({ enum: ['candidate', 'employer', 'admin'], example: 'candidate' })
  @IsEnum(TalentUserType)
  userType!: TalentUserType;
}
