import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HiringPipeline, DEFAULT_PIPELINE_STAGES } from '../entities/hiring-pipeline.entity';
import { PipelineCandidate } from '../entities/pipeline-candidate.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { MatchRecommendation } from '../../matching/entities/match-recommendation.entity';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { ActivityService } from './activity.service';
import { ActivityType } from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS, CandidateStageMovedEvent } from '../../notifications/events/notification.events';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @InjectRepository(HiringPipeline)
    private readonly pipelineRepo: Repository<HiringPipeline>,
    @InjectRepository(PipelineCandidate)
    private readonly pipelineCandidateRepo: Repository<PipelineCandidate>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    @InjectRepository(MatchRecommendation)
    private readonly matchRecRepo: Repository<MatchRecommendation>,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    employerId: string,
    userId: string,
    data: CreatePipelineDto,
  ): Promise<HiringPipeline> {
    const pipeline = this.pipelineRepo.create({
      employerId,
      createdBy: userId,
      name: data.name,
      description: data.description || null,
      stages: data.stages || DEFAULT_PIPELINE_STAGES,
      isDefault: data.isDefault || false,
    });

    if (pipeline.isDefault) {
      await this.pipelineRepo.update(
        { employerId, isDefault: true },
        { isDefault: false },
      );
    }

    const saved = await this.pipelineRepo.save(pipeline);
    this.logger.log(`Pipeline created: ${saved.id} for employer ${employerId}`);
    return saved;
  }

  async findAllByEmployer(employerId: string): Promise<HiringPipeline[]> {
    return this.pipelineRepo.find({
      where: { employerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(
    id: string,
    employerId: string,
  ): Promise<HiringPipeline & { stageCounts: Record<string, number> }> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id, employerId },
      relations: [
        'candidates',
        'candidates.candidate',
        'candidates.candidate.candidateSkills',
        'candidates.candidate.candidateSkills.skill',
      ],
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    const stageCounts: Record<string, number> = {};
    for (const stage of pipeline.stages) {
      stageCounts[stage.id] = (pipeline.candidates || []).filter(
        (c) => c.stageId === stage.id,
      ).length;
    }

    return { ...pipeline, stageCounts };
  }

  async addCandidate(
    pipelineId: string,
    employerId: string,
    candidateId: string,
    userId: string,
    stageId?: string,
    matchScore?: number,
    notes?: string,
  ): Promise<PipelineCandidate> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, employerId },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const existing = await this.pipelineCandidateRepo.findOne({
      where: { pipelineId, candidateId },
    });
    if (existing) {
      throw new ConflictException('Candidate is already in this pipeline');
    }

    const targetStageId = stageId || pipeline.stages[0]?.id;
    if (!targetStageId || !pipeline.stages.some((s) => s.id === targetStageId)) {
      throw new BadRequestException('Invalid stage ID');
    }

    // Auto-populate match score from recommendations if not provided
    let resolvedMatchScore = matchScore ?? null;
    if (resolvedMatchScore === null) {
      const bestMatch = await this.matchRecRepo.findOne({
        where: { candidateId, employerId },
        order: { overallScore: 'DESC' },
      });
      if (bestMatch) {
        resolvedMatchScore = bestMatch.overallScore;
      }
    }

    const pipelineCandidate = this.pipelineCandidateRepo.create({
      pipelineId,
      candidateId,
      stageId: targetStageId,
      addedBy: userId,
      matchScore: resolvedMatchScore,
      notes: notes || null,
    });

    const saved = await this.pipelineCandidateRepo.save(pipelineCandidate);

    await this.activityService.log(
      employerId,
      userId,
      ActivityType.STAGE_MOVED,
      'candidate',
      candidateId,
      `Added ${candidate.fullName} to pipeline "${pipeline.name}"`,
    );

    this.logger.log(
      `Candidate ${candidateId} added to pipeline ${pipelineId}`,
    );
    return saved;
  }

  async moveCandidate(
    pipelineId: string,
    candidateId: string,
    newStageId: string,
    employerId: string,
    userId: string,
  ): Promise<PipelineCandidate> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, employerId },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    if (!pipeline.stages.some((s) => s.id === newStageId)) {
      throw new BadRequestException('Invalid target stage ID');
    }

    const pipelineCandidate = await this.pipelineCandidateRepo.findOne({
      where: { pipelineId, candidateId },
      relations: ['candidate'],
    });
    if (!pipelineCandidate) {
      throw new NotFoundException('Candidate is not in this pipeline');
    }

    const fromStage = pipeline.stages.find((s) => s.id === pipelineCandidate.stageId);
    const toStage = pipeline.stages.find((s) => s.id === newStageId);

    pipelineCandidate.stageId = newStageId;
    pipelineCandidate.movedAt = new Date();
    const saved = await this.pipelineCandidateRepo.save(pipelineCandidate);

    await this.activityService.log(
      employerId,
      userId,
      ActivityType.STAGE_MOVED,
      'candidate',
      candidateId,
      `Moved ${pipelineCandidate.candidate?.fullName || 'candidate'} from "${fromStage?.name}" to "${toStage?.name}"`,
    );

    this.eventEmitter.emit(NOTIFICATION_EVENTS.CANDIDATE_STAGE_MOVED, {
      userId,
      candidateName: pipelineCandidate.candidate?.fullName || 'candidate',
      pipelineName: pipeline.name,
      fromStage: fromStage?.name || 'unknown',
      toStage: toStage?.name || 'unknown',
    } as CandidateStageMovedEvent);

    this.logger.log(
      `Candidate ${candidateId} moved to stage ${newStageId} in pipeline ${pipelineId}`,
    );
    return saved;
  }

  async removeCandidate(
    pipelineId: string,
    candidateId: string,
    employerId: string,
  ): Promise<void> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, employerId },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    const result = await this.pipelineCandidateRepo.delete({
      pipelineId,
      candidateId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Candidate is not in this pipeline');
    }

    this.logger.log(
      `Candidate ${candidateId} removed from pipeline ${pipelineId}`,
    );
  }

  async updateStages(
    pipelineId: string,
    employerId: string,
    stages: { id: string; name: string; order: number; color: string }[],
  ): Promise<HiringPipeline> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, employerId },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    pipeline.stages = stages;
    return this.pipelineRepo.save(pipeline);
  }
}
