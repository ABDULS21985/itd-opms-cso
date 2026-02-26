import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmployerUserRole } from '../../../common/constants/status.constant';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'New role to assign', enum: EmployerUserRole })
  @IsEnum(EmployerUserRole)
  role!: EmployerUserRole;
}
