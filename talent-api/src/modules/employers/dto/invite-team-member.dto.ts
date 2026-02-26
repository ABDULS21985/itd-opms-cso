import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployerUserRole } from '../../../common/constants/status.constant';

export class InviteTeamMemberDto {
  @ApiProperty({ description: 'Email of the person to invite' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Role to assign', enum: EmployerUserRole })
  @IsOptional()
  @IsEnum(EmployerUserRole)
  role?: EmployerUserRole;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;
}
