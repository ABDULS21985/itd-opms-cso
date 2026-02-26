import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { TaxonomyService } from '../services/taxonomy.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  CreateTrackDto,
  UpdateTrackDto,
  CreateCohortDto,
  UpdateCohortDto,
  CreateLocationDto,
  UpdateLocationDto,
  MergeSkillsDto,
  ReorderDto,
  BulkImportSkillsDto,
  SkillTrackAssociationDto,
} from '../dto/manage-taxonomy.dto';
import { SkillTag } from '../entities/skill-tag.entity';
import { Track } from '../entities/track.entity';
import { Cohort } from '../entities/cohort.entity';
import { Location } from '../entities/location.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/taxonomy')
@Roles(TalentPortalRole.PLACEMENT_MANAGER, TalentPortalRole.SUPER_ADMIN)
export class TaxonomyAdminController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // ── Stats ─────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get taxonomy dashboard stats' })
  async getStats() {
    return this.taxonomyService.getTaxonomyStats();
  }

  // ── Skills ────────────────────────────────────────────────────────────

  @Get('skills')
  @ApiOperation({ summary: 'List all skills (admin – includes inactive)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async listSkills(
    @Query('active') active?: string,
  ): Promise<SkillTag[]> {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.taxonomyService.findAllSkills(isActive);
  }

  @Post('skills')
  @ApiOperation({ summary: 'Create a new skill tag' })
  async createSkill(@Body() dto: CreateSkillDto): Promise<SkillTag> {
    return this.taxonomyService.createSkill(dto);
  }

  @Put('skills/:id')
  @ApiOperation({ summary: 'Update a skill tag' })
  async updateSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillTag> {
    return this.taxonomyService.updateSkill(id, dto);
  }

  @Delete('skills/:id')
  @ApiOperation({ summary: 'Deactivate a skill tag' })
  async deactivateSkill(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SkillTag> {
    return this.taxonomyService.deactivateSkill(id);
  }

  @Post('skills/merge')
  @ApiOperation({ summary: 'Merge multiple skills into one' })
  async mergeSkills(@Body() dto: MergeSkillsDto): Promise<SkillTag> {
    return this.taxonomyService.mergeSkills(dto);
  }

  @Put('skills/reorder')
  @ApiOperation({ summary: 'Reorder skills' })
  async reorderSkills(@Body() dto: ReorderDto): Promise<void> {
    return this.taxonomyService.reorderSkills(dto);
  }

  @Post('skills/import')
  @ApiOperation({ summary: 'Bulk import skills' })
  async importSkills(@Body() dto: BulkImportSkillsDto) {
    return this.taxonomyService.bulkImportSkills(dto);
  }

  @Get('skills/:id/co-occurrence')
  @ApiOperation({ summary: 'Get co-occurring skills for a given skill' })
  async getSkillCoOccurrence(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomyService.getSkillCoOccurrence(id);
  }

  @Get('skills/:id/usage-trend')
  @ApiOperation({ summary: 'Get monthly usage trend for a skill' })
  async getSkillUsageTrend(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomyService.getSkillUsageTrend(id);
  }

  // ── Tracks ────────────────────────────────────────────────────────────

  @Get('tracks')
  @ApiOperation({ summary: 'List all tracks (admin – includes inactive)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async listTracks(
    @Query('active') active?: string,
  ): Promise<Track[]> {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.taxonomyService.findAllTracks(isActive);
  }

  @Post('tracks')
  @ApiOperation({ summary: 'Create a new track' })
  async createTrack(@Body() dto: CreateTrackDto): Promise<Track> {
    return this.taxonomyService.createTrack(dto);
  }

  @Put('tracks/:id')
  @ApiOperation({ summary: 'Update a track' })
  async updateTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrackDto,
  ): Promise<Track> {
    return this.taxonomyService.updateTrack(id, dto);
  }

  @Delete('tracks/:id')
  @ApiOperation({ summary: 'Deactivate a track' })
  async deactivateTrack(@Param('id', ParseUUIDPipe) id: string): Promise<Track> {
    return this.taxonomyService.deactivateTrack(id);
  }

  @Put('tracks/reorder')
  @ApiOperation({ summary: 'Reorder tracks' })
  async reorderTracks(@Body() dto: ReorderDto): Promise<void> {
    return this.taxonomyService.reorderTracks(dto);
  }

  @Get('tracks/:id/skills')
  @ApiOperation({ summary: 'Get skills associated with a track' })
  async getTrackSkills(@Param('id', ParseUUIDPipe) id: string): Promise<SkillTag[]> {
    return this.taxonomyService.getTrackSkills(id);
  }

  @Put('tracks/:id/skills')
  @ApiOperation({ summary: 'Set skills associated with a track' })
  async setTrackSkills(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SkillTrackAssociationDto,
  ): Promise<SkillTag[]> {
    return this.taxonomyService.setTrackSkills(id, dto);
  }

  // ── Cohorts ───────────────────────────────────────────────────────────

  @Get('cohorts')
  @ApiOperation({ summary: 'List all cohorts (admin – includes inactive)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async listCohorts(
    @Query('active') active?: string,
  ): Promise<Cohort[]> {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.taxonomyService.findAllCohorts(isActive);
  }

  @Post('cohorts')
  @ApiOperation({ summary: 'Create a new cohort' })
  async createCohort(@Body() dto: CreateCohortDto): Promise<Cohort> {
    return this.taxonomyService.createCohort(dto);
  }

  @Put('cohorts/:id')
  @ApiOperation({ summary: 'Update a cohort' })
  async updateCohort(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCohortDto,
  ): Promise<Cohort> {
    return this.taxonomyService.updateCohort(id, dto);
  }

  @Delete('cohorts/:id')
  @ApiOperation({ summary: 'Deactivate a cohort' })
  async deactivateCohort(@Param('id', ParseUUIDPipe) id: string): Promise<Cohort> {
    return this.taxonomyService.deactivateCohort(id);
  }

  @Get('cohorts/:id/candidates')
  @ApiOperation({ summary: 'Get candidates in a cohort' })
  async getCohortCandidates(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomyService.getCohortCandidates(id);
  }

  // ── Locations ─────────────────────────────────────────────────────────

  @Get('locations')
  @ApiOperation({ summary: 'List all locations (admin – includes inactive)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async listLocations(
    @Query('active') active?: string,
  ): Promise<Location[]> {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.taxonomyService.findAllLocations(isActive);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create a new location' })
  async createLocation(@Body() dto: CreateLocationDto): Promise<Location> {
    return this.taxonomyService.createLocation(dto);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update a location' })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<Location> {
    return this.taxonomyService.updateLocation(id, dto);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Deactivate a location' })
  async deactivateLocation(@Param('id', ParseUUIDPipe) id: string): Promise<Location> {
    return this.taxonomyService.deactivateLocation(id);
  }

  @Get('locations/tree')
  @ApiOperation({ summary: 'Get hierarchical location tree (grouped by country)' })
  async getLocationTree() {
    return this.taxonomyService.getLocationTree();
  }

  // ── Export ────────────────────────────────────────────────────────────

  @Get('export')
  @ApiOperation({ summary: 'Export taxonomy data' })
  @ApiQuery({ name: 'type', required: true, enum: ['skills', 'tracks', 'cohorts', 'locations'] })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  async exportTaxonomy(
    @Query('type') type: 'skills' | 'tracks' | 'cohorts' | 'locations',
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const data = await this.taxonomyService.exportTaxonomy(type, format);
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const ext = format === 'json' ? 'json' : 'csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=taxonomy-${type}.${ext}`);
    res.send(data);
  }
}
