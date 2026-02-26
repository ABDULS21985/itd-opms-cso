import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { TalentPermission } from '../../../common/constants/permissions.constant';
import { CandidatesService } from '../services/candidates.service';
import { CandidateSearchService } from '../services/candidate-search.service';
import { CandidateApprovalService } from '../services/candidate-approval.service';
import { CandidateImportService } from '../services/candidate-import.service';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import { SearchCandidatesDto } from '../dto/search-candidates.dto';
import {
  RejectCandidateDto,
  SuspendCandidateDto,
  UpdateAdminNotesDto,
  UpdateInternalRatingsDto,
  UpdateAdminFlagsDto,
  UpdateAdminDataDto,
  UpdateVisibilityDto,
} from '../dto/approve-candidate.dto';
import { InviteCandidateDto } from '../dto/invite-candidate.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin - Candidates')
@ApiBearerAuth('JWT-auth')
@Controller('admin/candidates')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles(
  TalentPortalRole.PLACEMENT_OFFICER,
  TalentPortalRole.PLACEMENT_MANAGER,
  TalentPortalRole.SUPER_ADMIN,
)
export class CandidatesAdminController {
  private readonly logger = new Logger(CandidatesAdminController.name);

  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly candidateSearchService: CandidateSearchService,
    private readonly candidateApprovalService: CandidateApprovalService,
    private readonly candidateImportService: CandidateImportService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────
  // Bulk import and invite
  // ──────────────────────────────────────────────

  @Post('import')
  @Permissions(TalentPermission.PLACEMENT_BULK_IMPORT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk import candidate profiles from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import results with counts of imported, skipped, and errors',
  })
  @ApiResponse({ status: 400, description: 'Invalid CSV file' })
  async importCandidates(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') adminId: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (
      file.mimetype !== 'text/csv' &&
      file.mimetype !== 'application/vnd.ms-excel' &&
      !file.originalname.endsWith('.csv')
    ) {
      throw new BadRequestException(
        'File must be a CSV. Received: ' + file.mimetype,
      );
    }

    const result = await this.candidateImportService.importFromCsv(
      file.buffer,
      adminId,
    );

    this.logger.log(
      `CSV import by admin ${adminId}: imported=${result.imported}, skipped=${result.skipped}, errors=${result.errors.length}`,
    );

    return result;
  }

  @Post('invite')
  @Permissions(TalentPermission.PLACEMENT_BULK_IMPORT)
  @ApiOperation({ summary: 'Send invite link to a candidate via email' })
  @ApiResponse({ status: 201, description: 'Invite email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or name' })
  async inviteCandidate(
    @Body() dto: InviteCandidateDto,
    @CurrentUser('id') adminId: string,
  ) {
    await this.emailService.sendCandidateInvite(
      dto.email,
      dto.name,
      dto.trackId,
    );

    this.logger.log(
      `Invite sent to ${dto.email} by admin ${adminId}`,
    );

    return {
      message: 'Invite email sent successfully',
      email: dto.email,
      name: dto.name,
    };
  }

  // ──────────────────────────────────────────────
  // Listing and details
  // ──────────────────────────────────────────────

  @Get()
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'List all candidate profiles with filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all candidate profiles',
  })
  async listCandidates(@Query() query: SearchCandidatesDto) {
    // Admin search returns all profiles regardless of approval/visibility
    const result =
      await this.candidateSearchService.searchCandidates(query);
    return result;
  }

  @Get(':id/audit')
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Get audit history for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Audit history entries' })
  async getCandidateAudit(@Param('id') id: string) {
    const { data } = await this.auditService.findAll(
      { entityType: 'CandidateProfile', entityId: id },
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
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Get full candidate profile details' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Full candidate profile' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getCandidateDetail(@Param('id') id: string) {
    const profile = await this.candidatesService.findById(id);
    return profile;
  }

  // ──────────────────────────────────────────────
  // Approval workflow
  // ──────────────────────────────────────────────

  @Post(':id/approve')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Approve a candidate profile' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Profile approved' })
  @ApiResponse({ status: 400, description: 'Profile already approved' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async approveProfile(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const profile = await this.candidateApprovalService.approveProfile(
      id,
      adminId,
    );
    return { data: profile };
  }

  @Post(':id/reject')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Reject a candidate profile with reason' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Profile rejected (set to NEEDS_UPDATE)',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async rejectProfile(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectCandidateDto,
  ) {
    const profile = await this.candidateApprovalService.rejectProfile(
      id,
      adminId,
      dto.reason,
    );
    return { data: profile };
  }

  @Post(':id/request-update')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Request profile update from candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Profile set to NEEDS_UPDATE with reason',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async requestUpdate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectCandidateDto,
  ) {
    const profile = await this.candidateApprovalService.rejectProfile(
      id,
      adminId,
      dto.reason,
    );
    return { data: profile };
  }

  @Post(':id/suspend')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Suspend a candidate profile' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Profile suspended' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async suspendProfile(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SuspendCandidateDto,
  ) {
    const profile = await this.candidateApprovalService.suspendProfile(
      id,
      adminId,
      dto.reason,
    );
    return { data: profile };
  }

  @Post(':id/archive')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Archive a candidate profile' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Profile archived' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async archiveProfile(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const profile = await this.candidateApprovalService.archiveProfile(
      id,
      adminId,
    );
    return { data: profile };
  }

  // ──────────────────────────────────────────────
  // Admin metadata management
  // ──────────────────────────────────────────────

  @Put(':id')
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Update admin data (notes, ratings, flags) for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Admin data updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateAdminData(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDataDto,
  ) {
    let profile;
    if (dto.adminNotes !== undefined) {
      profile = await this.candidateApprovalService.updateAdminNotes(id, dto.adminNotes);
    }
    if (dto.internalRatings !== undefined) {
      profile = await this.candidateApprovalService.updateInternalRatings(id, dto.internalRatings);
    }
    if (dto.adminFlags !== undefined) {
      profile = await this.candidateApprovalService.updateAdminFlags(id, dto.adminFlags);
    }
    if (!profile) {
      profile = await this.candidatesService.findById(id);
    }
    return profile;
  }

  @Put(':id/notes')
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Update admin notes for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Admin notes updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateNotes(
    @Param('id') id: string,
    @Body() dto: UpdateAdminNotesDto,
  ) {
    const profile = await this.candidateApprovalService.updateAdminNotes(
      id,
      dto.adminNotes,
    );
    return { data: profile };
  }

  @Put(':id/ratings')
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Update internal ratings for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Internal ratings updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateRatings(
    @Param('id') id: string,
    @Body() dto: UpdateInternalRatingsDto,
  ) {
    const profile = await this.candidateApprovalService.updateInternalRatings(
      id,
      dto.internalRatings,
    );
    return { data: profile };
  }

  @Put(':id/flags')
  @Permissions(TalentPermission.CANDIDATE_READ_PRIVATE)
  @ApiOperation({ summary: 'Update admin flags for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Admin flags updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateFlags(
    @Param('id') id: string,
    @Body() dto: UpdateAdminFlagsDto,
  ) {
    const profile = await this.candidateApprovalService.updateAdminFlags(
      id,
      dto.adminFlags,
    );
    return { data: profile };
  }

  @Put(':id/visibility')
  @Permissions(TalentPermission.PLACEMENT_APPROVE_PROFILE)
  @ApiOperation({ summary: 'Update visibility level for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Visibility updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    const profile = await this.candidateApprovalService.updateVisibility(
      id,
      dto.visibilityLevel,
    );
    return { data: profile };
  }
}
