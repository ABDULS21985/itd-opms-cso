import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { TaxonomyService } from '../services/taxonomy.service';
import { SkillTag } from '../entities/skill-tag.entity';
import { Track } from '../entities/track.entity';
import { Cohort } from '../entities/cohort.entity';
import { Location } from '../entities/location.entity';

@ApiTags('Taxonomy')
@Controller('taxonomy')
@Public()
export class TaxonomyPublicController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get('skills')
  @ApiOperation({ summary: 'List all active skills' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async getSkills(
    @Query('active') active?: string,
  ): Promise<SkillTag[]> {
    const isActive = active !== undefined ? active === 'true' : true;
    return this.taxonomyService.findAllSkills(isActive);
  }

  @Get('tracks')
  @ApiOperation({ summary: 'List all active tracks' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async getTracks(
    @Query('active') active?: string,
  ): Promise<Track[]> {
    const isActive = active !== undefined ? active === 'true' : true;
    return this.taxonomyService.findAllTracks(isActive);
  }

  @Get('cohorts')
  @ApiOperation({ summary: 'List all active cohorts' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async getCohorts(
    @Query('active') active?: string,
  ): Promise<Cohort[]> {
    const isActive = active !== undefined ? active === 'true' : true;
    return this.taxonomyService.findAllCohorts(isActive);
  }

  @Get('locations')
  @ApiOperation({ summary: 'List all active locations' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async getLocations(
    @Query('active') active?: string,
  ): Promise<Location[]> {
    const isActive = active !== undefined ? active === 'true' : true;
    return this.taxonomyService.findAllLocations(isActive);
  }
}
