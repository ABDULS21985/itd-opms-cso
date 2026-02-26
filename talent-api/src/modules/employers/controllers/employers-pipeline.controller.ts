import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PipelineService } from '../services/pipeline.service';
import { EmployersService } from '../services/employers.service';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { AddPipelineCandidateDto } from '../dto/add-pipeline-candidate.dto';
import { MovePipelineCandidateDto } from '../dto/move-pipeline-candidate.dto';
import { UpdatePipelineStagesDto } from '../dto/update-pipeline-stages.dto';

@ApiTags('Employer - Pipelines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer/pipelines')
export class EmployersPipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly employersService: EmployersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a hiring pipeline' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() data: CreatePipelineDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.create(org.id, userId, data);
  }

  @Get()
  @ApiOperation({ summary: 'List all pipelines' })
  async findAll(@CurrentUser('id') userId: string) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.findAllByEmployer(org.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline with candidates and stage counts' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.findById(id, org.id);
  }

  @Put(':id/stages')
  @ApiOperation({ summary: 'Update pipeline stages' })
  async updateStages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdatePipelineStagesDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.updateStages(id, org.id, data.stages);
  }

  @Post(':id/candidates')
  @ApiOperation({ summary: 'Add candidate to pipeline' })
  async addCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: AddPipelineCandidateDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.addCandidate(
      id,
      org.id,
      data.candidateId,
      userId,
      data.stageId,
      data.matchScore,
      data.notes,
    );
  }

  @Put(':id/candidates/:candidateId/move')
  @ApiOperation({ summary: 'Move candidate between stages' })
  async moveCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() data: MovePipelineCandidateDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.moveCandidate(
      id,
      candidateId,
      data.stageId,
      org.id,
      userId,
    );
  }

  @Delete(':id/candidates/:candidateId')
  @ApiOperation({ summary: 'Remove candidate from pipeline' })
  async removeCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.pipelineService.removeCandidate(id, candidateId, org.id);
  }
}
