import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
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
import { Request, Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CandidatesService } from '../services/candidates.service';
import { CvGeneratorService } from '../services/cv-generator.service';
import { UploadService } from '../../upload/services/upload.service';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import {
  UpdateSkillsDto,
  CreateProjectDto,
  UpdateProjectDto,
  GrantConsentDto,
} from '../dto/approve-candidate.dto';
import { ApplyJobDto } from '../../jobs/dto/apply-job.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Candidate Self-Service')
@ApiBearerAuth('JWT-auth')
@Controller('me')
export class CandidatesSelfController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly cvGeneratorService: CvGeneratorService,
    private readonly uploadService: UploadService,
  ) {}

  // ──────────────────────────────────────────────
  // Current User (works for all user types)
  // ──────────────────────────────────────────────

  @Get('user')
  @ApiOperation({ summary: 'Get current authenticated user info (all roles)' })
  @ApiResponse({ status: 200, description: 'The authenticated user info' })
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }

  // ──────────────────────────────────────────────
  // Profile
  // ──────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get own candidate profile' })
  @ApiResponse({ status: 200, description: 'The candidate profile' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    return { data: profile };
  }

  @Post('profile')
  @ApiOperation({ summary: 'Create own candidate profile' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    const profile = await this.candidatesService.createProfile(userId, dto);
    return { data: profile };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own candidate profile (creates if not exists)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @CurrentUser('displayName') displayName: string,
    @Body() dto: UpdateProfileDto,
  ) {
    try {
      const existing = await this.candidatesService.findByUserId(userId);
      const profile = await this.candidatesService.updateProfile(
        existing.id,
        dto,
      );
      return { data: profile };
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Auto-create profile on first update for users who registered before auto-creation
        const createPayload = {
          fullName: dto.fullName || displayName || 'Unnamed',
          ...dto,
        };
        const profile = await this.candidatesService.createProfile(
          userId,
          createPayload as any,
        );
        return { data: profile };
      }
      throw error;
    }
  }

  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadPhoto(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @CurrentUser('displayName') displayName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    let profile: any;
    try {
      profile = await this.candidatesService.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Auto-create profile if it doesn't exist yet
        profile = await this.candidatesService.createProfile(userId, {
          fullName: displayName || 'Unnamed',
        } as any);
      } else {
        throw error;
      }
    }
    const url = await this.uploadService.uploadProfilePhoto(file);
    await this.candidatesService.updateProfilePhoto(profile.id, url);
    return { data: { url } };
  }

  @Delete('profile/photo')
  @ApiOperation({ summary: 'Remove profile photo' })
  @ApiResponse({ status: 200, description: 'Profile photo removed' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async removePhoto(@CurrentUser('id') userId: string) {
    const existing = await this.candidatesService.findByUserId(userId);
    const profile = await this.candidatesService.removeProfilePhoto(
      existing.id,
    );
    return { data: profile };
  }

  @Get('profile/preview')
  @ApiOperation({ summary: 'Get public preview of own profile' })
  @ApiResponse({
    status: 200,
    description: 'Public preview of candidate profile',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfilePreview(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    const preview = this.candidatesService.getPublicPreview(profile);
    return { data: preview };
  }

  @Post('profile/submit')
  @ApiOperation({ summary: 'Submit profile for review' })
  @ApiResponse({ status: 200, description: 'Profile submitted for review' })
  @ApiResponse({
    status: 400,
    description: 'Profile cannot be submitted in current status',
  })
  async submitForReview(@CurrentUser('id') userId: string) {
    const existing = await this.candidatesService.findByUserId(userId);
    const profile = await this.candidatesService.submitForReview(existing.id);
    return { data: profile };
  }

  @Get('profile/strength')
  @ApiOperation({ summary: 'Get profile strength score (0-100)' })
  @ApiResponse({ status: 200, description: 'Profile strength score' })
  async getProfileStrength(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    const strength = this.candidatesService.calculateProfileStrength(profile);
    return {
      data: {
        strength,
        maxScore: 100,
      },
    };
  }

  // ──────────────────────────────────────────────
  // CV Generation & Download
  // ──────────────────────────────────────────────

  @Get('cv/generate')
  @ApiOperation({ summary: 'Generate CV PDF from profile data' })
  @ApiResponse({ status: 200, description: 'Generated CV PDF' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async generateCv(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const pdfBuffer = await this.cvGeneratorService.generateCV(profile.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="cv-${profile.slug}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('cv/download')
  @ApiOperation({ summary: 'Download current CV (uploaded or generated)' })
  @ApiResponse({ status: 200, description: 'CV file or redirect URL' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async downloadCv(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);

    // Check for uploaded CV first
    const uploadedCvUrl = await this.cvGeneratorService.getCVDownloadUrl(
      profile.id,
    );

    if (uploadedCvUrl) {
      return res.json({
        data: {
          type: 'uploaded',
          url: uploadedCvUrl,
        },
      });
    }

    // Fall back to generating CV on the fly
    const pdfBuffer = await this.cvGeneratorService.generateCV(profile.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cv-${profile.slug}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // ──────────────────────────────────────────────
  // Skills
  // ──────────────────────────────────────────────

  @Put('skills')
  @ApiOperation({ summary: 'Update candidate skills' })
  @ApiResponse({ status: 200, description: 'Skills updated' })
  async updateSkills(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSkillsDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const skills = await this.candidatesService.updateSkills(profile.id, dto);
    return { data: skills };
  }

  // ──────────────────────────────────────────────
  // Projects
  // ──────────────────────────────────────────────

  @Get('projects')
  @ApiOperation({ summary: 'List own projects' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async getProjects(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    const projects = await this.candidatesService.getProjects(profile.id);
    return { data: projects };
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a new project (max 3)' })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({
    status: 400,
    description: 'Maximum projects reached or invalid data',
  })
  async createProject(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const project = await this.candidatesService.createProject(
      profile.id,
      dto,
    );
    return { data: project };
  }

  @Put('projects/:projectId')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const project = await this.candidatesService.updateProject(
      profile.id,
      projectId,
      dto,
    );
    return { data: project };
  }

  @Delete('projects/:projectId')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    await this.candidatesService.deleteProject(profile.id, projectId);
    return { message: 'Project deleted successfully' };
  }

  // ──────────────────────────────────────────────
  // Documents
  // ──────────────────────────────────────────────

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const existing = await this.candidatesService.findByUserId(userId);
    const url = await this.uploadService.uploadDocument(file);
    const document = await this.candidatesService.addDocument(existing.id, {
      fileName: file.originalname,
      fileUrl: url,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
    return { data: document };
  }

  // ──────────────────────────────────────────────
  // Consents
  // ──────────────────────────────────────────────

  @Get('consents')
  @ApiOperation({ summary: 'Get consent records' })
  @ApiResponse({ status: 200, description: 'List of consent records' })
  async getConsents(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    const consents = await this.candidatesService.getConsents(profile.id);
    return { data: consents };
  }

  @Post('consents')
  @ApiOperation({ summary: 'Grant or revoke a consent' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async grantConsent(
    @CurrentUser('id') userId: string,
    @Body() dto: GrantConsentDto,
    @Req() req: Request,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const consent = await this.candidatesService.grantConsent(
      profile.id,
      dto,
      ip,
      userAgent,
    );
    return { data: consent };
  }

  // ──────────────────────────────────────────────
  // Job Applications
  // ──────────────────────────────────────────────

  @Get('applications')
  @ApiOperation({ summary: 'List my job applications' })
  @ApiResponse({ status: 200, description: 'Paginated list of applications' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getMyApplications(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const result = await this.candidatesService.getMyApplications(
      profile.id,
      pagination,
    );
    return result;
  }

  @Post('jobs/:jobId/apply')
  @ApiOperation({ summary: 'Apply to a job' })
  @ApiParam({ name: 'jobId', description: 'Job post ID' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({
    status: 400,
    description: 'Already applied or invalid application',
  })
  @ApiResponse({
    status: 403,
    description:
      'Profile strength too low, not approved, or missing required consents',
  })
  @ApiResponse({ status: 404, description: 'Job or profile not found' })
  async applyToJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyJobDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const application = await this.candidatesService.applyToJob(
      profile.id,
      jobId,
      dto.coverNote,
      dto.cvDocumentId,
    );
    return { data: application };
  }

  @Put('applications/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw a job application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application withdrawn' })
  @ApiResponse({
    status: 400,
    description: 'Application cannot be withdrawn in current status',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdrawApplication(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const application = await this.candidatesService.withdrawApplication(
      profile.id,
      id,
    );
    return { data: application };
  }

  // ──────────────────────────────────────────────
  // Settings
  // ──────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get visibility and notification settings' })
  @ApiResponse({ status: 200, description: 'Current settings' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getSettings(@CurrentUser('id') userId: string) {
    const profile = await this.candidatesService.findByUserId(userId);
    const settings = this.candidatesService.getSettings(profile);
    return settings;
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update visibility and notification settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    const settings = await this.candidatesService.updateSettings(
      profile.id,
      dto,
    );
    return settings;
  }

}
