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
import { EmployersService } from '../services/employers.service';
import { EmployerVerificationService } from '../services/employer-verification.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { AuditService } from '../../audit/services/audit.service';
import { RejectEmployerDto, SuspendEmployerDto } from '../dto/verify-employer.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EmployerVerificationStatus } from '../../../common/constants/status.constant';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AdminSearchEmployersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by company name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by verification status', enum: EmployerVerificationStatus })
  @IsOptional()
  @IsEnum(EmployerVerificationStatus)
  verificationStatus?: EmployerVerificationStatus;
}

@ApiTags('Employers - Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TalentPortalRole.SUPER_ADMIN, TalentPortalRole.PLACEMENT_MANAGER)
@Controller('admin/employers')
export class EmployersAdminController {
  constructor(
    private readonly employersService: EmployersService,
    private readonly verificationService: EmployerVerificationService,
    private readonly jobsService: JobsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get employer stats by verification status' })
  async getStats() {
    return this.employersService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List all employer organizations with search and pagination' })
  async findAll(@Query() query: AdminSearchEmployersDto) {
    const { search, verificationStatus, ...pagination } = query;
    return this.employersService.findAllPaginated(search, pagination, verificationStatus);
  }

  @Get(':id/jobs')
  @ApiOperation({ summary: 'Get jobs for an employer (admin)' })
  async getEmployerJobs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.jobsService.getEmployerJobs(id, pagination);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get audit history for an employer (admin)' })
  async getAudit(@Param('id', ParseUUIDPipe) id: string) {
    const { data } = await this.auditService.findAll(
      { entityType: 'EmployerOrg', entityId: id },
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
  @ApiOperation({ summary: 'Get employer organization by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employersService.findById(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify an employer organization' })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.verificationService.verifyEmployer(id, adminId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an employer organization' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectEmployerDto,
  ) {
    return this.verificationService.rejectEmployer(id, adminId, dto.reason);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend an employer organization' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SuspendEmployerDto,
  ) {
    return this.verificationService.suspendEmployer(id, adminId, dto.reason);
  }
}
