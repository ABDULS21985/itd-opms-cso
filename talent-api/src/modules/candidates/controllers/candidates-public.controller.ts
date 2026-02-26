import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { CandidatesService } from '../services/candidates.service';
import { CandidateSearchService } from '../services/candidate-search.service';
import { SearchCandidatesDto } from '../dto/search-candidates.dto';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import {
  ProfileApprovalStatus,
  ProfileVisibility,
} from '../../../common/constants/status.constant';

/**
 * Fields that must be stripped from public responses.
 */
const PRIVATE_FIELDS: (keyof CandidateProfile)[] = [
  'phone',
  'contactEmail',
  'adminNotes',
  'internalRatings',
  'adminFlags',
];

function stripPrivateFields(
  profile: CandidateProfile,
): Partial<CandidateProfile> {
  const result = { ...profile };
  for (const field of PRIVATE_FIELDS) {
    delete (result as any)[field];
  }
  return result;
}

@ApiTags('Talents (Public)')
@Controller('talents')
export class CandidatesPublicController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly candidateSearchService: CandidateSearchService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search and browse approved candidates' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of approved public candidates',
  })
  async searchCandidates(@Query() query: SearchCandidatesDto) {
    const result = await this.candidateSearchService.searchCandidates(query);

    return {
      data: result.data.map(stripPrivateFields),
      meta: result.meta,
    };
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get a single public candidate profile by slug' })
  @ApiParam({ name: 'slug', description: 'Candidate profile slug' })
  @ApiResponse({
    status: 200,
    description: 'Public candidate profile',
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getPublicProfile(@Param('slug') slug: string) {
    const profile = await this.candidatesService.findBySlug(slug);

    // Only return if approved and public
    if (
      profile.approvalStatus !== ProfileApprovalStatus.APPROVED ||
      profile.visibilityLevel !== ProfileVisibility.PUBLIC
    ) {
      return {
        statusCode: 404,
        message: 'Profile not found',
      };
    }

    // Increment view count
    await this.candidatesService
      .updateProfile(profile.id, {} as any)
      .catch(() => {
        // Silently handle view increment failure
      });

    return stripPrivateFields(profile);
  }
}
