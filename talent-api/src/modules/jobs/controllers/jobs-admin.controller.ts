import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { JobsService } from '../services/jobs.service';
import { JobModerationService } from '../services/job-moderation.service';
import { AuditService } from '../../audit/services/audit.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminSearchJobsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by job title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by employer ID' })
  @IsOptional()
  @IsString()
  employerId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class RejectJobDto {
  reason?: string;
}

@ApiTags('Jobs - Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TalentPortalRole.SUPER_ADMIN, TalentPortalRole.PLACEMENT_MANAGER)
@Controller('admin/jobs')
export class JobsAdminController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly moderationService: JobModerationService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all jobs (admin)' })
  async findAll(@Query() query: AdminSearchJobsDto) {
    const { search, employerId, status, ...pagination } = query;
    return this.jobsService.findAllForAdmin(pagination, { employerId, search, status });
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Get applications for a job (admin)' })
  async getApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.jobsService.getApplicationsForJob(id, pagination);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get audit history for a job (admin)' })
  async getAudit(@Param('id', ParseUUIDPipe) id: string) {
    const { data } = await this.auditService.findAll(
      { entityType: 'JobPost', entityId: id },
      { limit: 50, page: 1 },
    );
    return data.map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: log.actorEmail,
      performedAt: log.createdAt,
      details: log.reason,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID (admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a job post' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.moderationService.approveJob(id, adminId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a job post' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectJobDto,
  ) {
    return this.moderationService.rejectJob(id, adminId, dto.reason);
  }
}
