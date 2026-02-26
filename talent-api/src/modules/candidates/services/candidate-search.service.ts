import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { SearchCandidatesDto } from '../dto/search-candidates.dto';
import {
  ProfileApprovalStatus,
  ProfileVisibility,
  ExperienceLevel,
} from '../../../common/constants/status.constant';
import { PaginationMeta } from '../../../common/dto/pagination.dto';

@Injectable()
export class CandidateSearchService {
  private readonly logger = new Logger(CandidateSearchService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
  ) {}

  async searchCandidates(
    filters: SearchCandidatesDto,
  ): Promise<{ data: CandidateProfile[]; meta: PaginationMeta }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const qb = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.primaryTrack', 'primaryTrack')
      .leftJoinAndSelect('profile.tracks', 'tracks')
      .leftJoinAndSelect('profile.cohort', 'cohort')
      .leftJoinAndSelect('profile.candidateSkills', 'candidateSkills')
      .leftJoinAndSelect('candidateSkills.skill', 'skillTag')
      .leftJoinAndSelect('profile.candidateProjects', 'candidateProjects');

    // Only return approved + public profiles
    qb.andWhere('profile.approvalStatus = :approvalStatus', {
      approvalStatus: ProfileApprovalStatus.APPROVED,
    });
    qb.andWhere('profile.visibilityLevel = :visibilityLevel', {
      visibilityLevel: ProfileVisibility.PUBLIC,
    });

    // Full-text search on name, bio, and skill names
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      qb.andWhere(
        `(
          profile.fullName ILIKE :searchTerm
          OR profile.bio ILIKE :searchTerm
          OR skillTag.name ILIKE :searchTerm
        )`,
        { searchTerm },
      );
    }

    // Filter by tracks (supports both UUIDs and track names)
    if (filters.tracks && filters.tracks.length > 0) {
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const areUuids = filters.tracks.every((t) => UUID_REGEX.test(t));

      if (areUuids) {
        qb.andWhere(
          `(
            profile.primaryTrackId IN (:...trackIds)
            OR tracks.id IN (:...trackIds)
          )`,
          { trackIds: filters.tracks },
        );
      } else {
        qb.andWhere(
          `(
            primaryTrack.name ILIKE ANY(:trackNames)
            OR tracks.name ILIKE ANY(:trackNames)
          )`,
          { trackNames: filters.tracks.map((t) => `%${t}%`) },
        );
      }
    }

    // Filter by skill IDs
    if (filters.skills && filters.skills.length > 0) {
      qb.andWhere('candidateSkills.skillId IN (:...skillIds)', {
        skillIds: filters.skills,
      });
    }

    // Filter by location (city or country)
    if (filters.location) {
      const locationTerm = `%${filters.location}%`;
      qb.andWhere(
        `(
          profile.city ILIKE :locationTerm
          OR profile.country ILIKE :locationTerm
        )`,
        { locationTerm },
      );
    }

    // Filter by availability
    if (filters.availability) {
      qb.andWhere('profile.availabilityStatus = :availability', {
        availability: filters.availability,
      });
    }

    // Filter by work mode
    if (filters.workMode) {
      qb.andWhere('profile.preferredWorkMode = :workMode', {
        workMode: filters.workMode,
      });
    }

    // Filter by experience level
    if (filters.experienceLevel) {
      const ranges = this.getExperienceRange(filters.experienceLevel);
      qb.andWhere(
        'profile.yearsOfExperience >= :minExp AND profile.yearsOfExperience <= :maxExp',
        { minExp: ranges.min, maxExp: ranges.max },
      );
    }

    // Filter by cohort
    if (filters.cohort) {
      qb.andWhere('profile.cohortId = :cohortId', {
        cohortId: filters.cohort,
      });
    }

    // Sorting
    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`profile.${sortField}`, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  private getExperienceRange(level: ExperienceLevel): {
    min: number;
    max: number;
  } {
    switch (level) {
      case ExperienceLevel.ENTRY:
        return { min: 0, max: 2 };
      case ExperienceLevel.MID:
        return { min: 3, max: 5 };
      case ExperienceLevel.SENIOR:
        return { min: 6, max: 50 };
      default:
        return { min: 0, max: 50 };
    }
  }
}
