import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { TalentPermission } from '../../../common/constants/permissions.constant';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class AssignRolesDto {
  @ApiProperty({
    enum: TalentPortalRole,
    isArray: true,
    example: [TalentPortalRole.PLACEMENT_OFFICER],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(TalentPortalRole, { each: true })
  roles!: TalentPortalRole[];
}

export class UpdatePermissionsDto {
  @ApiProperty({
    enum: TalentPermission,
    isArray: true,
    example: [TalentPermission.PLACEMENT_APPROVE_PROFILE],
  })
  @IsArray()
  @IsEnum(TalentPermission, { each: true })
  permissions!: TalentPermission[];
}
