import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { TalentPermission } from '../../../common/constants/permissions.constant';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../../../common/constants/status.constant';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/audit-logs')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles(
  TalentPortalRole.PLACEMENT_MANAGER,
  TalentPortalRole.SUPER_ADMIN,
)
export class AuditAdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(TalentPermission.ADMIN_VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: 'List audit logs with filters' })
  @ApiQuery({ name: 'actorId', required: false, description: 'Filter by actor (user) ID' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction, description: 'Filter by audit action' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g. CandidateProfile, EmployerOrg)' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit log entries',
  })
  async listAuditLogs(
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query() pagination?: PaginationDto,
  ) {
    const filters = {
      actorId,
      action,
      entityType,
      entityId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    const paginationDto: PaginationDto = {
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
      sort: pagination?.sort || 'createdAt',
      order: pagination?.order || 'desc',
    };

    const result = await this.auditService.findAll(filters, paginationDto);

    return result;
  }
}
