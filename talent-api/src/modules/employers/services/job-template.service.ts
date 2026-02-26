import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JobPostTemplate } from '../entities/job-post-template.entity';
import { JobPost } from '../../jobs/entities/job-post.entity';
import { SkillTag } from '../../taxonomy/entities/skill-tag.entity';
import { CreateJobTemplateDto } from '../dto/create-job-template.dto';

@Injectable()
export class JobTemplateService {
  private readonly logger = new Logger(JobTemplateService.name);

  constructor(
    @InjectRepository(JobPostTemplate)
    private readonly templateRepo: Repository<JobPostTemplate>,
    @InjectRepository(JobPost)
    private readonly jobRepo: Repository<JobPost>,
    @InjectRepository(SkillTag)
    private readonly skillTagRepo: Repository<SkillTag>,
  ) {}

  async create(
    employerId: string,
    data: CreateJobTemplateDto,
  ): Promise<JobPostTemplate> {
    const template = this.templateRepo.create({
      employerId,
      name: data.name,
      templateData: data.templateData,
    });
    const saved = await this.templateRepo.save(template);
    this.logger.log(`Job template created: ${saved.id}`);
    return saved;
  }

  async findByEmployer(employerId: string): Promise<JobPostTemplate[]> {
    return this.templateRepo.find({
      where: { employerId },
      order: { createdAt: 'DESC' },
    });
  }

  async seedDefaultTemplates(employerId: string): Promise<void> {
    const existing = await this.templateRepo.count({ where: { employerId } });
    if (existing > 0) return;

    // Copy templates from any existing employer that has them
    const donor = await this.templateRepo
      .createQueryBuilder('t')
      .select('t.employer_id', 'employerId')
      .groupBy('t.employer_id')
      .limit(1)
      .getRawOne();

    if (!donor) return;

    const templates = await this.templateRepo.find({
      where: { employerId: donor.employerId },
    });

    const newTemplates = templates.map((t) =>
      this.templateRepo.create({
        employerId,
        name: t.name,
        templateData: t.templateData,
      }),
    );

    await this.templateRepo.save(newTemplates);
    this.logger.log(`Seeded ${newTemplates.length} default templates for employer ${employerId}`);
  }

  async findById(
    id: string,
    employerId: string,
  ): Promise<JobPostTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id, employerId },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async delete(id: string, employerId: string): Promise<void> {
    const template = await this.findById(id, employerId);
    await this.templateRepo.remove(template);
    this.logger.log(`Job template deleted: ${id}`);
  }

  async suggestSkills(jobTitle: string): Promise<SkillTag[]> {
    if (!jobTitle || jobTitle.length < 2) return [];

    const keywords = jobTitle.toLowerCase().split(/\s+/);
    const suggestions: SkillTag[] = [];

    for (const keyword of keywords) {
      if (keyword.length < 2) continue;
      const skills = await this.skillTagRepo.find({
        where: { name: ILike(`%${keyword}%`), isActive: true },
        take: 10,
        order: { usageCount: 'DESC' },
      });
      for (const skill of skills) {
        if (!suggestions.some((s) => s.id === skill.id)) {
          suggestions.push(skill);
        }
      }
    }

    return suggestions.slice(0, 20);
  }

  async detectSimilar(
    employerId: string,
    title: string,
  ): Promise<JobPost[]> {
    if (!title || title.length < 3) return [];

    return this.jobRepo.find({
      where: { employerId, title: ILike(`%${title}%`) },
      take: 5,
      order: { createdAt: 'DESC' },
    });
  }
}
