import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TalentPortalRole } from '../../common/constants/roles.constant';
import { UsersService } from './users.service';
import { AssignRolesDto, UpdatePermissionsDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TalentUser } from './entities/talent-user.entity';
import { TalentUserRole } from './entities/talent-user-role.entity';

@ApiTags('Admin – Users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles(TalentPortalRole.PLACEMENT_MANAGER, TalentPortalRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List portal users (paginated)' })
  async listUsers(
    @Query() pagination: PaginationDto,
  ): Promise<{ data: TalentUser[]; meta: any }> {
    return this.usersService.findAll(pagination);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Assign roles to a user' })
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser('id') assignedBy: string,
  ): Promise<TalentUserRole[]> {
    const results: TalentUserRole[] = [];
    for (const role of dto.roles) {
      const userRole = await this.usersService.assignRole(id, role, assignedBy);
      results.push(userRole);
    }
    return results;
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Update permissions for a user' })
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<TalentUser> {
    return this.usersService.updatePermissions(id, dto.permissions);
  }
}
