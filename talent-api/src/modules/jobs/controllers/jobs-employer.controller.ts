import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JobsService } from '../services/jobs.service';
import { EmployersService } from '../../employers/services/employers.service';
import { JobTemplateService } from '../../employers/services/job-template.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { CreateJobTemplateDto } from '../../employers/dto/create-job-template.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Jobs - Employer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers/me/jobs')
export class JobsEmployerController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly employersService: EmployersService,
    private readonly jobTemplateService: JobTemplateService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job post' })
  async createJob(
    @CurrentUser('id') userId: string,
    @Body() data: CreateJobDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.createJob(org.id, userId, data);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List job post templates' })
  async getTemplates(@CurrentUser('id') userId: string) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.findByEmployer(org.id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Save a job post template' })
  async createTemplate(
    @CurrentUser('id') userId: string,
    @Body() data: CreateJobTemplateDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.create(org.id, data);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get a job post template' })
  async getTemplate(
    @CurrentUser('id') userId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.findById(templateId, org.id);
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete a job post template' })
  async deleteTemplate(
    @CurrentUser('id') userId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.delete(templateId, org.id);
  }

  @Get('suggest-skills')
  @ApiOperation({ summary: 'Suggest skills for a job title' })
  async suggestSkills(
    @CurrentUser('id') userId: string,
    @Query('title') title: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.suggestSkills(title);
  }

  @Get('detect-similar')
  @ApiOperation({ summary: 'Detect similar existing job posts' })
  async detectSimilar(
    @CurrentUser('id') userId: string,
    @Query('title') title: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobTemplateService.detectSimilar(org.id, title);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs for current employer' })
  async getMyJobs(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.getEmployerJobs(org.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific job by ID' })
  async getJob(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a job post' })
  async updateJob(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateJobDto,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.updateJob(id, data);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Submit a job for review' })
  async publishJob(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.publishJob(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a published job' })
  async closeJob(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.closeJob(id);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Get applications for a job' })
  async getApplications(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.jobsService.getApplicationsForJob(id, pagination);
  }
}
