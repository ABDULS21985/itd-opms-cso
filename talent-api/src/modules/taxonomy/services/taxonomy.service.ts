import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { SkillTag } from '../entities/skill-tag.entity';
import { Track } from '../entities/track.entity';
import { Cohort } from '../entities/cohort.entity';
import { Location } from '../entities/location.entity';
import { SkillTrackAssociation } from '../entities/skill-track-association.entity';
import { CandidateSkill } from '../../candidates/entities/candidate-skill.entity';
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
import { generateSlug } from '../../../common/utils/slug.util';

@Injectable()
export class TaxonomyService {
  constructor(
    @InjectRepository(SkillTag)
    private readonly skillRepo: Repository<SkillTag>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(Cohort)
    private readonly cohortRepo: Repository<Cohort>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(SkillTrackAssociation)
    private readonly skillTrackRepo: Repository<SkillTrackAssociation>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Stats ─────────────────────────────────────────────────────────────

  async getTaxonomyStats() {
    const [skills, tracks, cohorts, locations] = await Promise.all([
      this.skillRepo.find(),
      this.trackRepo.find(),
      this.cohortRepo.find(),
      this.locationRepo.find(),
    ]);

    return {
      totalSkills: skills.length,
      activeSkills: skills.filter((s) => s.isActive).length,
      inactiveSkills: skills.filter((s) => !s.isActive).length,
      totalTracks: tracks.length,
      activeTracks: tracks.filter((t) => t.isActive).length,
      totalCohorts: cohorts.length,
      activeCohorts: cohorts.filter((c) => c.isActive).length,
      totalLocations: locations.length,
      activeLocations: locations.filter((l) => l.isActive).length,
    };
  }

  // ── Skills ────────────────────────────────────────────────────────────

  async findAllSkills(active?: boolean): Promise<SkillTag[]> {
    const where: Record<string, any> = {};
    if (active !== undefined) {
      where.isActive = active;
    }
    return this.skillRepo.find({ where, order: { name: 'ASC' } });
  }

  async createSkill(data: CreateSkillDto): Promise<SkillTag> {
    const skill = this.skillRepo.create({
      ...data,
      slug: generateSlug(data.name),
    });
    return this.skillRepo.save(skill);
  }

  async updateSkill(id: string, data: UpdateSkillDto): Promise<SkillTag> {
    const skill = await this.skillRepo.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException(`Skill with id "${id}" not found`);
    }
    if (data.name) {
      skill.slug = generateSlug(data.name);
    }
    Object.assign(skill, data);
    return this.skillRepo.save(skill);
  }

  async deactivateSkill(id: string): Promise<SkillTag> {
    const skill = await this.skillRepo.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException(`Skill with id "${id}" not found`);
    }
    skill.isActive = false;
    return this.skillRepo.save(skill);
  }

  async mergeSkills(dto: MergeSkillsDto): Promise<SkillTag> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify all source skills exist
      const sourceSkills = await this.skillRepo.find({
        where: { id: In(dto.sourceIds) },
      });
      if (sourceSkills.length !== dto.sourceIds.length) {
        throw new BadRequestException('One or more source skills not found');
      }

      // Create the target skill
      const targetSkill = this.skillRepo.create({
        name: dto.targetName,
        slug: generateSlug(dto.targetName),
        category: dto.targetCategory || sourceSkills[0].category,
        isActive: true,
        usageCount: 0,
      });
      const saved = await queryRunner.manager.save(targetSkill);

      // Reassign candidate_skills from source to target
      await queryRunner.query(
        `UPDATE candidate_skills SET skill_id = $1
         WHERE skill_id = ANY($2)
         AND candidate_id NOT IN (
           SELECT candidate_id FROM candidate_skills WHERE skill_id = $1
         )`,
        [saved.id, dto.sourceIds],
      );

      // Delete duplicate references (candidates who already had the target skill)
      await queryRunner.query(
        `DELETE FROM candidate_skills WHERE skill_id = ANY($1)`,
        [dto.sourceIds],
      );

      // Deactivate source skills
      await queryRunner.manager.update(SkillTag, { id: In(dto.sourceIds) }, { isActive: false });

      // Update usage count
      const countResult = await queryRunner.query(
        `SELECT COUNT(*) FROM candidate_skills WHERE skill_id = $1`,
        [saved.id],
      );
      saved.usageCount = parseInt(countResult[0]?.count || '0', 10);
      await queryRunner.manager.save(saved);

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reorderSkills(dto: ReorderDto): Promise<void> {
    // Skills don't have displayOrder — we'll use this for category-level ordering
    // For now, just acknowledge the reorder request
    for (const item of dto.items) {
      await this.skillRepo.update(item.id, {});
    }
  }

  async bulkImportSkills(dto: BulkImportSkillsDto): Promise<{
    imported: number;
    skipped: number;
    errors: { name: string; message: string }[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: { name: string; message: string }[] = [];

    for (const skillData of dto.skills) {
      try {
        const existing = await this.skillRepo.findOne({
          where: { name: skillData.name },
        });
        if (existing) {
          skipped++;
          continue;
        }
        const skill = this.skillRepo.create({
          name: skillData.name,
          slug: generateSlug(skillData.name),
          category: skillData.category,
        });
        await this.skillRepo.save(skill);
        imported++;
      } catch (err: any) {
        errors.push({ name: skillData.name, message: err.message || 'Unknown error' });
      }
    }

    return { imported, skipped, errors };
  }

  async getSkillCoOccurrence(
    skillId: string,
  ): Promise<{ skillId: string; skillName: string; coOccurrenceCount: number }[]> {
    const skill = await this.skillRepo.findOne({ where: { id: skillId } });
    if (!skill) throw new NotFoundException(`Skill "${skillId}" not found`);

    const results = await this.dataSource.query(
      `SELECT st2.skill_id as "skillId", s.name as "skillName", COUNT(*) as "coOccurrenceCount"
       FROM candidate_skills cs1
       JOIN candidate_skills st2 ON cs1.candidate_id = st2.candidate_id AND cs1.skill_id != st2.skill_id
       JOIN skill_tags s ON s.id = st2.skill_id AND s.is_active = true
       WHERE cs1.skill_id = $1
       GROUP BY st2.skill_id, s.name
       ORDER BY "coOccurrenceCount" DESC
       LIMIT 20`,
      [skillId],
    );

    return results.map((r: any) => ({
      skillId: r.skillId,
      skillName: r.skillName,
      coOccurrenceCount: parseInt(r.coOccurrenceCount, 10),
    }));
  }

  async getSkillUsageTrend(
    skillId: string,
  ): Promise<{ month: string; count: number }[]> {
    const skill = await this.skillRepo.findOne({ where: { id: skillId } });
    if (!skill) throw new NotFoundException(`Skill "${skillId}" not found`);

    const results = await this.dataSource.query(
      `SELECT TO_CHAR(cs.created_at, 'YYYY-MM') as month, COUNT(*) as count
       FROM candidate_skills cs
       WHERE cs.skill_id = $1
         AND cs.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(cs.created_at, 'YYYY-MM')
       ORDER BY month ASC`,
      [skillId],
    );

    return results.map((r: any) => ({
      month: r.month,
      count: parseInt(r.count, 10),
    }));
  }

  // ── Tracks ────────────────────────────────────────────────────────────

  async findAllTracks(active?: boolean): Promise<Track[]> {
    const where: Record<string, any> = {};
    if (active !== undefined) {
      where.isActive = active;
    }
    return this.trackRepo.find({ where, order: { displayOrder: 'ASC', name: 'ASC' } });
  }

  async createTrack(data: CreateTrackDto): Promise<Track> {
    const track = this.trackRepo.create({
      ...data,
      slug: generateSlug(data.name),
    });
    return this.trackRepo.save(track);
  }

  async updateTrack(id: string, data: UpdateTrackDto): Promise<Track> {
    const track = await this.trackRepo.findOne({ where: { id } });
    if (!track) {
      throw new NotFoundException(`Track with id "${id}" not found`);
    }
    if (data.name) {
      track.slug = generateSlug(data.name);
    }
    Object.assign(track, data);
    return this.trackRepo.save(track);
  }

  async deactivateTrack(id: string): Promise<Track> {
    const track = await this.trackRepo.findOne({ where: { id } });
    if (!track) throw new NotFoundException(`Track "${id}" not found`);
    track.isActive = false;
    return this.trackRepo.save(track);
  }

  async reorderTracks(dto: ReorderDto): Promise<void> {
    for (const item of dto.items) {
      await this.trackRepo.update(item.id, { displayOrder: item.displayOrder });
    }
  }

  async getTrackSkills(trackId: string): Promise<SkillTag[]> {
    const track = await this.trackRepo.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException(`Track "${trackId}" not found`);

    const associations = await this.skillTrackRepo.find({
      where: { trackId },
      relations: ['skill'],
      order: { displayOrder: 'ASC' },
    });

    return associations.map((a) => a.skill);
  }

  async setTrackSkills(trackId: string, dto: SkillTrackAssociationDto): Promise<SkillTag[]> {
    const track = await this.trackRepo.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException(`Track "${trackId}" not found`);

    // Remove existing associations
    await this.skillTrackRepo.delete({ trackId });

    // Create new associations
    const associations = dto.skillIds.map((skillId, index) =>
      this.skillTrackRepo.create({
        trackId,
        skillId,
        displayOrder: index,
      }),
    );

    if (associations.length > 0) {
      await this.skillTrackRepo.save(associations);
    }

    return this.getTrackSkills(trackId);
  }

  // ── Cohorts ───────────────────────────────────────────────────────────

  async findAllCohorts(active?: boolean): Promise<Cohort[]> {
    const where: Record<string, any> = {};
    if (active !== undefined) {
      where.isActive = active;
    }
    return this.cohortRepo.find({ where, order: { name: 'ASC' } });
  }

  async createCohort(data: CreateCohortDto): Promise<Cohort> {
    const cohort = this.cohortRepo.create({
      ...data,
      slug: generateSlug(data.name),
    });
    return this.cohortRepo.save(cohort);
  }

  async updateCohort(id: string, data: UpdateCohortDto): Promise<Cohort> {
    const cohort = await this.cohortRepo.findOne({ where: { id } });
    if (!cohort) {
      throw new NotFoundException(`Cohort with id "${id}" not found`);
    }
    if (data.name) {
      cohort.slug = generateSlug(data.name);
    }
    Object.assign(cohort, data);
    return this.cohortRepo.save(cohort);
  }

  async deactivateCohort(id: string): Promise<Cohort> {
    const cohort = await this.cohortRepo.findOne({ where: { id } });
    if (!cohort) throw new NotFoundException(`Cohort "${id}" not found`);
    cohort.isActive = false;
    return this.cohortRepo.save(cohort);
  }

  async getCohortCandidates(cohortId: string): Promise<any[]> {
    const cohort = await this.cohortRepo.findOne({ where: { id: cohortId } });
    if (!cohort) throw new NotFoundException(`Cohort "${cohortId}" not found`);

    const results = await this.dataSource.query(
      `SELECT cp.id, cp.full_name as "fullName", cp.email, cp.profile_status as "profileStatus"
       FROM candidate_profiles cp
       WHERE cp.cohort_id = $1
       ORDER BY cp.full_name ASC`,
      [cohortId],
    );

    return results;
  }

  // ── Locations ─────────────────────────────────────────────────────────

  async findAllLocations(active?: boolean): Promise<Location[]> {
    const where: Record<string, any> = {};
    if (active !== undefined) {
      where.isActive = active;
    }
    return this.locationRepo.find({ where, order: { city: 'ASC' } });
  }

  async createLocation(data: CreateLocationDto): Promise<Location> {
    const location = this.locationRepo.create(data);
    return this.locationRepo.save(location);
  }

  async updateLocation(id: string, data: UpdateLocationDto): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }
    Object.assign(location, data);
    return this.locationRepo.save(location);
  }

  async deactivateLocation(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) throw new NotFoundException(`Location "${id}" not found`);
    location.isActive = false;
    return this.locationRepo.save(location);
  }

  async getLocationTree(): Promise<any[]> {
    const locations = await this.locationRepo.find({ order: { country: 'ASC', city: 'ASC' } });

    const grouped: Record<string, {
      country: string;
      countryCode: string | null;
      cities: typeof locations;
    }> = {};

    for (const loc of locations) {
      if (!grouped[loc.country]) {
        grouped[loc.country] = {
          country: loc.country,
          countryCode: loc.countryCode,
          cities: [],
        };
      }
      grouped[loc.country].cities.push(loc);
    }

    return Object.values(grouped).map((group) => ({
      country: group.country,
      countryCode: group.countryCode,
      totalCities: group.cities.length,
      activeCities: group.cities.filter((c) => c.isActive).length,
      locations: group.cities,
    }));
  }

  // ── Export ─────────────────────────────────────────────────────────────

  async exportTaxonomy(
    type: 'skills' | 'tracks' | 'cohorts' | 'locations',
    format: 'csv' | 'json',
  ): Promise<string> {
    let data: any[];

    switch (type) {
      case 'skills':
        data = await this.findAllSkills();
        break;
      case 'tracks':
        data = await this.findAllTracks();
        break;
      case 'cohorts':
        data = await this.findAllCohorts();
        break;
      case 'locations':
        data = await this.findAllLocations();
        break;
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers.map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
