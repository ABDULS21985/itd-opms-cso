import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shortlist } from '../entities/shortlist.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { CreateShortlistDto } from '../dto/create-shortlist.dto';
import { UpdateShortlistDto } from '../dto/update-shortlist.dto';

@Injectable()
export class ShortlistsService {
  private readonly logger = new Logger(ShortlistsService.name);

  constructor(
    @InjectRepository(Shortlist)
    private readonly shortlistRepo: Repository<Shortlist>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
  ) {}

  async findAllByEmployer(employerId: string): Promise<Shortlist[]> {
    return this.shortlistRepo.find({
      where: { employerId },
      relations: ['candidates'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, employerId: string): Promise<Shortlist> {
    const shortlist = await this.shortlistRepo.findOne({
      where: { id, employerId },
      relations: ['candidates', 'candidates.primaryTrack', 'candidates.candidateSkills', 'candidates.candidateSkills.skill'],
    });
    if (!shortlist) {
      throw new NotFoundException(`Shortlist with ID ${id} not found`);
    }
    return shortlist;
  }

  async create(
    employerId: string,
    userId: string,
    data: CreateShortlistDto,
  ): Promise<Shortlist> {
    const shortlist = this.shortlistRepo.create({
      employerId,
      createdBy: userId,
      name: data.name,
      description: data.description || null,
      candidates: [],
    });

    const saved = await this.shortlistRepo.save(shortlist);
    this.logger.log(`Shortlist created: ${saved.id} for employer ${employerId}`);
    return saved;
  }

  async update(
    id: string,
    employerId: string,
    data: UpdateShortlistDto,
  ): Promise<Shortlist> {
    const shortlist = await this.findById(id, employerId);

    if (data.name !== undefined) {
      shortlist.name = data.name;
    }
    if (data.description !== undefined) {
      shortlist.description = data.description || null;
    }

    const saved = await this.shortlistRepo.save(shortlist);
    this.logger.log(`Shortlist updated: ${saved.id}`);
    return saved;
  }

  async delete(id: string, employerId: string): Promise<void> {
    const shortlist = await this.findById(id, employerId);
    await this.shortlistRepo.remove(shortlist);
    this.logger.log(`Shortlist deleted: ${id} for employer ${employerId}`);
  }

  async addCandidate(
    shortlistId: string,
    employerId: string,
    candidateId: string,
  ): Promise<Shortlist> {
    const shortlist = await this.findById(shortlistId, employerId);

    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const alreadyAdded = shortlist.candidates.some((c) => c.id === candidateId);
    if (alreadyAdded) {
      throw new ConflictException('Candidate is already in this shortlist');
    }

    shortlist.candidates.push(candidate);
    const saved = await this.shortlistRepo.save(shortlist);

    this.logger.log(
      `Candidate ${candidateId} added to shortlist ${shortlistId}`,
    );
    return saved;
  }

  async removeCandidate(
    shortlistId: string,
    employerId: string,
    candidateId: string,
  ): Promise<Shortlist> {
    const shortlist = await this.findById(shortlistId, employerId);

    const candidateIndex = shortlist.candidates.findIndex(
      (c) => c.id === candidateId,
    );
    if (candidateIndex === -1) {
      throw new NotFoundException('Candidate is not in this shortlist');
    }

    shortlist.candidates.splice(candidateIndex, 1);
    const saved = await this.shortlistRepo.save(shortlist);

    this.logger.log(
      `Candidate ${candidateId} removed from shortlist ${shortlistId}`,
    );
    return saved;
  }
}
