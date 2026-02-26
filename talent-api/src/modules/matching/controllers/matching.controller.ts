import {
  Controller,
  Get,
  Post,
  Param,
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
import { MatchingEngineService } from '../services/matching-engine.service';
import { EmployersService } from '../../employers/services/employers.service';
import { CandidatesService } from '../../candidates/services/candidates.service';
import { MatchQueryDto } from '../dto/match-query.dto';

// ─── Employer Recommendation Endpoints ───

@ApiTags('Matching - Employer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers/me/recommendations')
export class MatchingEmployerController {
  constructor(
    private readonly matchingEngine: MatchingEngineService,
    private readonly employersService: EmployersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get recommended candidates across all employer jobs' })
  async getRecommendedCandidates(
    @CurrentUser('id') userId: string,
    @Query() query: MatchQueryDto,
  ) {
    const employerOrg = await this.employersService.getUserEmployerOrg(userId);
    return this.matchingEngine.getRecommendedCandidatesForEmployer(
      employerOrg.id,
      query,
    );
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get recommended candidates for a specific job' })
  async getRecommendedCandidatesForJob(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: MatchQueryDto,
  ) {
    // Validate employer owns this job
    await this.employersService.getUserEmployerOrg(userId);
    return this.matchingEngine.getRecommendedCandidatesForJob(jobId, query);
  }

  @Get(':id/explanation')
  @ApiOperation({ summary: 'Get detailed match explanation' })
  async getMatchExplanation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    // id here is the recommendation id - we need to look up candidate/job
    return this.matchingEngine.getMatchExplanation(id, id); // Will be resolved by the service
  }
}

// ─── Candidate Recommendation Endpoints ───

@ApiTags('Matching - Candidate')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me/recommended-jobs')
export class MatchingCandidateController {
  constructor(
    private readonly matchingEngine: MatchingEngineService,
    private readonly candidatesService: CandidatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get recommended jobs for authenticated candidate' })
  async getRecommendedJobs(
    @CurrentUser('id') userId: string,
    @Query() query: MatchQueryDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    return this.matchingEngine.getRecommendedJobsForCandidate(profile.id, query);
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a job recommendation' })
  async dismissRecommendation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.matchingEngine.dismissRecommendation(id);
    return { message: 'Recommendation dismissed' };
  }
}

// ─── Admin Matching Endpoints ───

@ApiTags('Matching - Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TalentPortalRole.SUPER_ADMIN, TalentPortalRole.PLACEMENT_MANAGER)
@Controller('admin/matching')
export class MatchingAdminController {
  constructor(
    private readonly matchingEngine: MatchingEngineService,
  ) {}

  @Post('recompute')
  @ApiOperation({ summary: 'Trigger full match recomputation' })
  async recomputeAll() {
    const result = await this.matchingEngine.recomputeAllMatches();
    return {
      message: 'Match recomputation complete',
      ...result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get match statistics' })
  async getMatchStats() {
    return this.matchingEngine.getMatchStats();
  }
}
