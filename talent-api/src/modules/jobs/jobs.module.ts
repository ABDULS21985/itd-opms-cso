import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPost } from './entities/job-post.entity';
import { JobSkill } from './entities/job-skill.entity';
import { JobApplication } from './entities/job-application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { JobsService } from './services/jobs.service';
import { JobModerationService } from './services/job-moderation.service';
import { JobAutoPublishService } from './services/job-auto-publish.service';
import { JobsPublicController } from './controllers/jobs-public.controller';
import { JobsEmployerController } from './controllers/jobs-employer.controller';
import { JobsAdminController } from './controllers/jobs-admin.controller';
import { EmployersModule } from '../employers/employers.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPost, JobSkill, JobApplication, CandidateProfile]),
    forwardRef(() => EmployersModule),
    AuditModule,
  ],
  controllers: [
    JobsPublicController,
    JobsEmployerController,
    JobsAdminController,
  ],
  providers: [JobsService, JobModerationService, JobAutoPublishService],
  exports: [JobsService],
})
export class JobsModule {}
