import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { CandidateSkill } from '../entities/candidate-skill.entity';
import { CandidateProject } from '../entities/candidate-project.entity';
import { CandidateConsent } from '../entities/candidate-consent.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { JobApplication } from '../../jobs/entities/job-application.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateSkillsDto,
  GrantConsentDto,
} from '../dto/approve-candidate.dto';
import {
  ProfileApprovalStatus,
  ProfileVisibility,
  ConsentType,
  ApplicationStatus,
  JobStatus,
  DocumentType,
} from '../../../common/constants/status.constant';
import { PaginationDto, PaginationMeta } from '../../../common/dto/pagination.dto';
import { generateUniqueSlug } from '../../../common/utils/slug.util';
import { NOTIFICATION_EVENTS, NewCandidateEvent } from '../../notifications/events/notification.events';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(CandidateSkill)
    private readonly skillRepo: Repository<CandidateSkill>,
    @InjectRepository(CandidateProject)
    private readonly projectRepo: Repository<CandidateProject>,
    @InjectRepository(CandidateConsent)
    private readonly consentRepo: Repository<CandidateConsent>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepo: Repository<CandidateDocument>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRepository(JobPost)
    private readonly jobPostRepo: Repository<JobPost>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────
  // Profile CRUD
  // ──────────────────────────────────────────────

  async createProfile(
    userId: string,
    data: CreateProfileDto,
  ): Promise<CandidateProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Candidate profile already exists for this user');
    }

    const slug = await this.generateUniqueSlug(data.fullName);

    const profile = this.profileRepo.create({
      ...data,
      userId,
      slug,
      approvalStatus: ProfileApprovalStatus.DRAFT,
    });

    const saved = await this.profileRepo.save(profile);
    saved.profileStrength = this.calculateProfileStrength(saved);
    await this.profileRepo.update(saved.id, {
      profileStrength: saved.profileStrength,
    });

    this.logger.log(`Profile created for user ${userId} with slug ${slug}`);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_CANDIDATE, {
      adminUserIds: [],
      candidateName: data.fullName,
      candidateEmail: data.contactEmail || '',
    } as NewCandidateEvent);

    return this.findById(saved.id);
  }

  async updateProfile(
    id: string,
    data: UpdateProfileDto,
  ): Promise<CandidateProfile> {
    const profile = await this.findById(id);

    // If updating fullName, regenerate slug
    if (data.fullName && data.fullName !== profile.fullName) {
      (data as any).slug = await this.generateUniqueSlug(data.fullName);
    }

    Object.assign(profile, data);
    const saved = await this.profileRepo.save(profile);

    // Recalculate strength after update
    const fullProfile = await this.findById(saved.id);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(saved.id, { profileStrength: strength });

    this.logger.log(`Profile ${id} updated`);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<CandidateProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: [
        'user',
        'primaryTrack',
        'tracks',
        'cohort',
        'candidateSkills',
        'candidateSkills.skill',
        'candidateProjects',
        'candidateDocuments',
        'candidateConsents',
      ],
    });

    if (!profile) {
      throw new NotFoundException(`Candidate profile with ID ${id} not found`);
    }

    return profile;
  }

  async findByUserId(userId: string): Promise<CandidateProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: [
        'user',
        'primaryTrack',
        'tracks',
        'cohort',
        'candidateSkills',
        'candidateSkills.skill',
        'candidateProjects',
        'candidateDocuments',
        'candidateConsents',
      ],
    });

    if (!profile) {
      throw new NotFoundException(
        `Candidate profile not found for user ${userId}`,
      );
    }

    return profile;
  }

  async findBySlug(slug: string): Promise<CandidateProfile> {
    const profile = await this.profileRepo.findOne({
      where: { slug },
      relations: [
        'primaryTrack',
        'tracks',
        'cohort',
        'candidateSkills',
        'candidateSkills.skill',
        'candidateProjects',
      ],
    });

    if (!profile) {
      throw new NotFoundException(
        `Candidate profile with slug "${slug}" not found`,
      );
    }

    return profile;
  }

  // ──────────────────────────────────────────────
  // Submission workflow
  // ──────────────────────────────────────────────

  async submitForReview(id: string): Promise<CandidateProfile> {
    const profile = await this.findById(id);

    if (
      profile.approvalStatus !== ProfileApprovalStatus.DRAFT &&
      profile.approvalStatus !== ProfileApprovalStatus.NEEDS_UPDATE
    ) {
      throw new BadRequestException(
        `Cannot submit profile with status "${profile.approvalStatus}". Profile must be in DRAFT or NEEDS_UPDATE status.`,
      );
    }

    profile.approvalStatus = ProfileApprovalStatus.SUBMITTED;
    const saved = await this.profileRepo.save(profile);

    this.logger.log(`Profile ${id} submitted for review`);
    return saved;
  }

  // ──────────────────────────────────────────────
  // Profile strength calculation
  // ──────────────────────────────────────────────

  calculateProfileStrength(profile: CandidateProfile): number {
    let score = 0;

    // fullName: 10
    if (profile.fullName && profile.fullName.trim().length > 0) {
      score += 10;
    }

    // photo: 5
    if (profile.photoUrl) {
      score += 5;
    }

    // bio: 10
    if (profile.bio && profile.bio.trim().length > 0) {
      score += 10;
    }

    // location: 5 (city or country)
    if (profile.city || profile.country) {
      score += 5;
    }

    // skills: 15 (need 3+)
    if (
      profile.candidateSkills &&
      profile.candidateSkills.length >= 3
    ) {
      score += 15;
    }

    // primaryTrack: 10
    if (profile.primaryTrackId) {
      score += 10;
    }

    // portfolioLinks: 10 (need 1+ of github, linkedin, portfolio, personalWebsite)
    const portfolioLinks = [
      profile.githubUrl,
      profile.linkedinUrl,
      profile.portfolioUrl,
      profile.personalWebsite,
    ].filter(Boolean);
    if (portfolioLinks.length >= 1) {
      score += 10;
    }

    // availability: 5
    if (profile.availabilityStatus) {
      score += 5;
    }

    // workMode: 5
    if (profile.preferredWorkMode) {
      score += 5;
    }

    // yearsOfExperience: 5
    if (
      profile.yearsOfExperience !== null &&
      profile.yearsOfExperience !== undefined
    ) {
      score += 5;
    }

    // projects: 10 (need 1+)
    if (
      profile.candidateProjects &&
      profile.candidateProjects.length >= 1
    ) {
      score += 10;
    }

    // consent: 10
    if (
      profile.candidateConsents &&
      profile.candidateConsents.some((c) => c.granted)
    ) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // ──────────────────────────────────────────────
  // Skills management
  // ──────────────────────────────────────────────

  async updateSkills(
    profileId: string,
    dto: UpdateSkillsDto,
  ): Promise<CandidateSkill[]> {
    const profile = await this.findById(profileId);

    // Remove existing skills
    await this.skillRepo.delete({ candidateId: profile.id });

    // Create new skills
    const skills = dto.skillIds.map((skillId) =>
      this.skillRepo.create({
        candidateId: profile.id,
        skillId,
      }),
    );

    const saved = await this.skillRepo.save(skills);

    // Recalculate profile strength
    const fullProfile = await this.findById(profile.id);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profile.id, { profileStrength: strength });

    this.logger.log(
      `Skills updated for profile ${profileId}: ${dto.skillIds.length} skills`,
    );
    return saved;
  }

  // ──────────────────────────────────────────────
  // Projects management
  // ──────────────────────────────────────────────

  async getProjects(profileId: string): Promise<CandidateProject[]> {
    return this.projectRepo.find({
      where: { candidateId: profileId },
      order: { displayOrder: 'ASC' },
    });
  }

  async createProject(
    profileId: string,
    dto: CreateProjectDto,
  ): Promise<CandidateProject> {
    const profile = await this.findById(profileId);

    // Enforce max 3 projects
    const existingCount = await this.projectRepo.count({
      where: { candidateId: profile.id },
    });
    if (existingCount >= 3) {
      throw new BadRequestException(
        'Maximum of 3 projects allowed. Please remove an existing project first.',
      );
    }

    const project = this.projectRepo.create({
      ...dto,
      candidateId: profile.id,
    });

    const saved = await this.projectRepo.save(project);

    // Recalculate profile strength
    const fullProfile = await this.findById(profile.id);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profile.id, { profileStrength: strength });

    this.logger.log(`Project created for profile ${profileId}`);
    return saved;
  }

  async updateProject(
    profileId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<CandidateProject> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, candidateId: profileId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project ${projectId} not found for profile ${profileId}`,
      );
    }

    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async deleteProject(profileId: string, projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, candidateId: profileId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project ${projectId} not found for profile ${profileId}`,
      );
    }

    await this.projectRepo.remove(project);

    // Recalculate profile strength
    const fullProfile = await this.findById(profileId);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profileId, { profileStrength: strength });

    this.logger.log(
      `Project ${projectId} deleted from profile ${profileId}`,
    );
  }

  // ──────────────────────────────────────────────
  // Consents management
  // ──────────────────────────────────────────────

  async getConsents(profileId: string): Promise<CandidateConsent[]> {
    return this.consentRepo.find({
      where: { candidateId: profileId },
      order: { createdAt: 'DESC' },
    });
  }

  async grantConsent(
    profileId: string,
    dto: GrantConsentDto,
    ip?: string,
    userAgent?: string,
  ): Promise<CandidateConsent> {
    const profile = await this.findById(profileId);

    const consentType = dto.consentType as ConsentType;

    // Revoke any existing consent of the same type
    await this.consentRepo.update(
      { candidateId: profile.id, consentType, granted: true },
      { granted: false, revokedAt: new Date() },
    );

    const consent = this.consentRepo.create({
      candidateId: profile.id,
      consentType,
      granted: dto.granted !== false,
      grantedAt: new Date(),
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });

    const saved = await this.consentRepo.save(consent);

    // Recalculate profile strength
    const fullProfile = await this.findById(profile.id);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profile.id, { profileStrength: strength });

    this.logger.log(
      `Consent "${consentType}" ${dto.granted !== false ? 'granted' : 'revoked'} for profile ${profileId}`,
    );
    return saved;
  }

  // ──────────────────────────────────────────────
  // Documents (placeholder for upload service)
  // ──────────────────────────────────────────────

  async getDocuments(profileId: string): Promise<CandidateDocument[]> {
    return this.documentRepo.find({
      where: { candidateId: profileId },
      order: { createdAt: 'DESC' },
    });
  }

  async addDocument(
    profileId: string,
    data: {
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
    },
  ): Promise<CandidateDocument> {
    const profile = await this.findById(profileId);
    const document = this.documentRepo.create({
      candidateId: profile.id,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      documentType: DocumentType.OTHER,
    });
    return this.documentRepo.save(document);
  }

  async deleteDocument(profileId: string, documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, candidateId: profileId },
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    await this.documentRepo.remove(document);
  }

  async updateProfilePhoto(profileId: string, url: string): Promise<void> {
    await this.profileRepo.update(profileId, { photoUrl: url });
    // Recalculate profile strength after photo update
    const fullProfile = await this.findById(profileId);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profileId, { profileStrength: strength });
    this.logger.log(`Profile photo updated for profile ${profileId}`);
  }

  // ──────────────────────────────────────────────
  // Profile Photo
  // ──────────────────────────────────────────────

  async removeProfilePhoto(profileId: string): Promise<CandidateProfile> {
    const profile = await this.findById(profileId);
    profile.photoUrl = null;
    await this.profileRepo.save(profile);

    // Recalculate profile strength after removing photo
    const fullProfile = await this.findById(profileId);
    const strength = this.calculateProfileStrength(fullProfile);
    await this.profileRepo.update(profileId, { profileStrength: strength });

    this.logger.log(`Profile photo removed for profile ${profileId}`);
    return this.findById(profileId);
  }

  // ──────────────────────────────────────────────
  // Public Preview
  // ──────────────────────────────────────────────

  getPublicPreview(profile: CandidateProfile): Partial<CandidateProfile> {
    const result = { ...profile };
    const privateFields: (keyof CandidateProfile)[] = [
      'phone',
      'contactEmail',
      'adminNotes',
      'internalRatings',
      'adminFlags',
    ];
    for (const field of privateFields) {
      delete (result as any)[field];
    }
    return result;
  }

  // ──────────────────────────────────────────────
  // Settings
  // ──────────────────────────────────────────────

  getSettings(profile: CandidateProfile): {
    visibilityLevel: ProfileVisibility;
    notificationPreferences: Record<string, boolean>;
  } {
    return {
      visibilityLevel: profile.visibilityLevel,
      notificationPreferences: profile.notificationPreferences || {
        notifyJobMatches: true,
        notifyApplicationUpdates: true,
        notifyIntroRequests: true,
      },
    };
  }

  async updateSettings(
    profileId: string,
    dto: UpdateSettingsDto,
  ): Promise<{
    visibilityLevel: ProfileVisibility;
    notificationPreferences: Record<string, boolean>;
  }> {
    const profile = await this.findById(profileId);

    if (dto.visibilityLevel !== undefined) {
      profile.visibilityLevel = dto.visibilityLevel;
    }

    const currentPrefs = profile.notificationPreferences || {
      notifyJobMatches: true,
      notifyApplicationUpdates: true,
      notifyIntroRequests: true,
    };

    if (dto.notifyJobMatches !== undefined) {
      currentPrefs.notifyJobMatches = dto.notifyJobMatches;
    }
    if (dto.notifyApplicationUpdates !== undefined) {
      currentPrefs.notifyApplicationUpdates = dto.notifyApplicationUpdates;
    }
    if (dto.notifyIntroRequests !== undefined) {
      currentPrefs.notifyIntroRequests = dto.notifyIntroRequests;
    }

    profile.notificationPreferences = currentPrefs;
    await this.profileRepo.save(profile);

    this.logger.log(`Settings updated for profile ${profileId}`);
    return this.getSettings(profile);
  }

  // ──────────────────────────────────────────────
  // Job Applications (candidate-facing)
  // ──────────────────────────────────────────────

  async getMyApplications(
    candidateId: string,
    pagination: PaginationDto,
  ): Promise<{ data: JobApplication[]; meta: PaginationMeta }> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const [data, total] = await this.applicationRepo.findAndCount({
      where: { candidateId },
      relations: ['job', 'job.employer'],
      order: {
        [pagination.sort || 'createdAt']:
          pagination.order === 'asc' ? 'ASC' : 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: new PaginationMeta(total, page, limit),
    };
  }

  async applyToJob(
    candidateId: string,
    jobId: string,
    coverNote?: string,
    cvDocumentId?: string,
  ): Promise<JobApplication> {
    const profile = await this.findById(candidateId);

    // Validate profile strength >= 70
    if (profile.profileStrength < 70) {
      throw new ForbiddenException(
        'Profile strength must be at least 70% to apply for jobs',
      );
    }

    // Validate approval status
    if (profile.approvalStatus !== ProfileApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'Your profile must be approved before applying for jobs',
      );
    }

    // Validate all required consents are granted
    const requiredConsents = [
      ConsentType.DATA_PROCESSING,
      ConsentType.PUBLIC_LISTING,
    ];
    const grantedConsents = (profile.candidateConsents || [])
      .filter((c) => c.granted)
      .map((c) => c.consentType);

    const missingConsents = requiredConsents.filter(
      (rc) => !grantedConsents.includes(rc),
    );
    if (missingConsents.length > 0) {
      throw new ForbiddenException(
        `Required consents not granted: ${missingConsents.join(', ')}`,
      );
    }

    // Validate job exists and is published
    const job = await this.jobPostRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job post with ID ${jobId} not found`);
    }
    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Can only apply to published jobs');
    }

    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Check not already applied
    const existingApplication = await this.applicationRepo.findOne({
      where: { jobId, candidateId },
    });
    if (existingApplication) {
      throw new BadRequestException('You have already applied to this job');
    }

    const application = this.applicationRepo.create({
      jobId,
      candidateId,
      coverNote: coverNote || null,
      cvDocumentId: cvDocumentId || null,
      status: ApplicationStatus.SUBMITTED,
    });

    const saved = await this.applicationRepo.save(application);

    // Increment application count on the job
    await this.jobPostRepo.increment({ id: jobId }, 'applicationCount', 1);

    this.logger.log(
      `Candidate ${candidateId} applied to job ${jobId}`,
    );
    return saved;
  }

  async withdrawApplication(
    candidateId: string,
    applicationId: string,
  ): Promise<JobApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, candidateId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException(
        `Application ${applicationId} not found for this candidate`,
      );
    }

    if (
      application.status !== ApplicationStatus.SUBMITTED &&
      application.status !== ApplicationStatus.VIEWED
    ) {
      throw new BadRequestException(
        `Cannot withdraw application with status "${application.status}". Only SUBMITTED or VIEWED applications can be withdrawn.`,
      );
    }

    application.status = ApplicationStatus.WITHDRAWN;
    const saved = await this.applicationRepo.save(application);

    this.logger.log(
      `Application ${applicationId} withdrawn by candidate ${candidateId}`,
    );
    return saved;
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  private async generateUniqueSlug(fullName: string): Promise<string> {
    let slug = generateUniqueSlug(fullName);
    let attempts = 0;

    while (attempts < 5) {
      const existing = await this.profileRepo.findOne({ where: { slug } });
      if (!existing) return slug;
      slug = generateUniqueSlug(fullName);
      attempts++;
    }

    // Fallback: append timestamp
    slug = generateUniqueSlug(fullName, Date.now().toString(36));
    return slug;
  }
}
