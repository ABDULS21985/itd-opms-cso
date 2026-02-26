import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmployersService } from '../services/employers.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { CandidateSearchService } from '../../candidates/services/candidate-search.service';
import { CandidatesService } from '../../candidates/services/candidates.service';
import { CvGeneratorService } from '../../candidates/services/cv-generator.service';
import { AuditService } from '../../audit/services/audit.service';
import { UploadService } from '../../upload/services/upload.service';
import { RegisterEmployerDto } from '../dto/register-employer.dto';
import { UpdateEmployerDto } from '../dto/update-employer.dto';
import { VerifyEmployerEmailDto } from '../dto/verify-email.dto';
import { SearchCandidatesDto } from '../../candidates/dto/search-candidates.dto';
import {
  EmployerVerificationStatus,
  AuditAction,
} from '../../../common/constants/status.constant';

@ApiTags('Employers - Self')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers')
export class EmployersSelfController {
  constructor(
    private readonly employersService: EmployersService,
    private readonly jobsService: JobsService,
    private readonly candidateSearchService: CandidateSearchService,
    private readonly candidatesService: CandidatesService,
    private readonly cvGeneratorService: CvGeneratorService,
    private readonly auditService: AuditService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new employer organization' })
  async register(
    @CurrentUser('id') userId: string,
    @Body() data: RegisterEmployerDto,
  ) {
    return this.employersService.register(userId, data);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user employer organization' })
  async getMyOrg(@CurrentUser('id') userId: string) {
    return this.employersService.getUserEmployerOrg(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user employer organization' })
  async updateMyOrg(
    @CurrentUser('id') userId: string,
    @Body() data: UpdateEmployerDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.employersService.updateOrg(org.id, data);
  }

  @Post('me/logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload employer logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadLogo(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const org = await this.employersService.getUserEmployerOrg(userId);
    const url = await this.uploadService.uploadProfilePhoto(file);
    await this.employersService.updateOrg(org.id, { logoUrl: url } as any);
    return { data: { url } };
  }

  // ──────────────────────────────────────────────
  // Email verification
  // ──────────────────────────────────────────────

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify employer email with verification code' })
  async verifyEmail(@Body() data: VerifyEmployerEmailDto) {
    return this.employersService.verifyEmail(data.email, data.code);
  }

  // ──────────────────────────────────────────────
  // Delete draft job
  // ──────────────────────────────────────────────

  @Delete('me/jobs/:id')
  @ApiOperation({ summary: 'Delete a draft job post' })
  async deleteDraftJob(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    await this.jobsService.deleteDraftJob(id, org.id);
    return { message: 'Draft job deleted successfully' };
  }

  // ──────────────────────────────────────────────
  // Candidate search (enhanced for verified employers)
  // ──────────────────────────────────────────────

  @Get('candidates')
  @ApiOperation({
    summary: 'Search candidates (enhanced view for verified employers)',
  })
  async searchCandidates(
    @CurrentUser('id') userId: string,
    @Query() filters: SearchCandidatesDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    const result = await this.candidateSearchService.searchCandidates(filters);

    const isVerified =
      org.verificationStatus === EmployerVerificationStatus.VERIFIED;

    // If employer is not verified, strip contactEmail from results
    if (!isVerified) {
      result.data = result.data.map((candidate) => {
        const { contactEmail, ...publicFields } = candidate as any;
        return publicFields;
      });
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // View candidate profile
  // ──────────────────────────────────────────────

  @Get('candidates/:id')
  @ApiOperation({
    summary: 'View candidate profile (additional fields for verified employers)',
  })
  async viewCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    const candidate = await this.candidatesService.findById(id);

    const isVerified =
      org.verificationStatus === EmployerVerificationStatus.VERIFIED;

    // Strip gated fields for unverified employers
    if (!isVerified) {
      const { contactEmail, phone, ...publicFields } = candidate as any;
      return publicFields;
    }

    return candidate;
  }

  // ──────────────────────────────────────────────
  // Download candidate CV (gated, audited)
  // ──────────────────────────────────────────────

  @Post('candidates/:id/cv')
  @ApiOperation({
    summary: 'Download candidate CV (verified employers only, audited)',
  })
  async downloadCandidateCv(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);

    if (org.verificationStatus !== EmployerVerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Only verified employers can download candidate CVs',
      );
    }

    // Create audit log entry
    await this.auditService.log({
      actorId: userId,
      actorEmail: userEmail,
      actorRole: 'employer',
      action: AuditAction.CV_DOWNLOADED,
      entityType: 'CandidateProfile',
      entityId: id,
      newValues: { employerOrgId: org.id, employerName: org.companyName },
    });

    // Try to get uploaded CV URL first
    const cvUrl = await this.cvGeneratorService.getCVDownloadUrl(id);
    if (cvUrl) {
      return { type: 'url', url: cvUrl };
    }

    // Fall back to generated CV
    const cvBuffer = await this.cvGeneratorService.generateCV(
      id,
      org.companyName,
    );
    const base64 = cvBuffer.toString('base64');

    return {
      type: 'generated',
      contentType: 'text/html',
      data: base64,
    };
  }
}
