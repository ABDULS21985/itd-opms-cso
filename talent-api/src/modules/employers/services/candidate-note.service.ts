import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CandidateNote } from '../entities/candidate-note.entity';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { CreateCandidateNoteDto } from '../dto/create-candidate-note.dto';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@Injectable()
export class CandidateNoteService {
  private readonly logger = new Logger(CandidateNoteService.name);

  constructor(
    @InjectRepository(CandidateNote)
    private readonly noteRepo: Repository<CandidateNote>,
    @InjectRepository(CandidateProfile)
    private readonly candidateRepo: Repository<CandidateProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    employerId: string,
    userId: string,
    data: CreateCandidateNoteDto,
  ): Promise<CandidateNote> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: data.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${data.candidateId} not found`);
    }

    const note = this.noteRepo.create({
      employerId,
      candidateId: data.candidateId,
      authorId: userId,
      content: data.content,
      mentionedUserIds: data.mentionedUserIds || null,
    });

    const saved = await this.noteRepo.save(note);

    // Notify mentioned users
    if (data.mentionedUserIds?.length) {
      for (const mentionedUserId of data.mentionedUserIds) {
        this.eventEmitter.emit(NOTIFICATION_EVENTS.MENTION_IN_NOTE, {
          userId: mentionedUserId,
          mentionedBy: userId,
          candidateName: candidate.fullName,
          candidateId: data.candidateId,
        });
      }
    }

    this.logger.log(`Note created for candidate ${data.candidateId} by user ${userId}`);
    return saved;
  }

  async findByCandidateForOrg(
    candidateId: string,
    employerId: string,
  ): Promise<CandidateNote[]> {
    return this.noteRepo.find({
      where: { candidateId, employerId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    noteId: string,
    userId: string,
    content: string,
  ): Promise<CandidateNote> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }
    if (note.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    note.content = content;
    return this.noteRepo.save(note);
  }

  async delete(noteId: string, userId: string): Promise<void> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }
    if (note.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.noteRepo.remove(note);
    this.logger.log(`Note ${noteId} deleted by user ${userId}`);
  }
}
