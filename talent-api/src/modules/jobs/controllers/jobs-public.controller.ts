import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { JobsService } from '../services/jobs.service';
import { SearchJobsDto } from '../dto/search-jobs.dto';

@ApiTags('Jobs - Public')
@Controller('jobs')
export class JobsPublicController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search published jobs' })
  async searchJobs(@Query() filters: SearchJobsDto) {
    return this.jobsService.searchJobs(filters);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get a published job by slug' })
  async getJobBySlug(@Param('slug') slug: string) {
    return this.jobsService.findBySlug(slug);
  }
}
