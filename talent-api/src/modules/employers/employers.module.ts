import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployerOrg } from './entities/employer-org.entity';
import { EmployerUser } from './entities/employer-user.entity';
import { Shortlist } from './entities/shortlist.entity';
import { HiringPipeline } from './entities/hiring-pipeline.entity';
import { PipelineCandidate } from './entities/pipeline-candidate.entity';
import { Interview } from './entities/interview.entity';
import { EmployerActivityLog } from './entities/activity-log.entity';
import { CandidateNote } from './entities/candidate-note.entity';
import { JobPostTemplate } from './entities/job-post-template.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { TalentUser } from '../users/entities/talent-user.entity';
import { JobPost } from '../jobs/entities/job-post.entity';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { SkillTag } from '../taxonomy/entities/skill-tag.entity';
import { MatchRecommendation } from '../matching/entities/match-recommendation.entity';
import { EmployersService } from './services/employers.service';
import { EmployerVerificationService } from './services/employer-verification.service';
import { ShortlistsService } from './services/shortlists.service';
import { PipelineService } from './services/pipeline.service';
import { InterviewService } from './services/interview.service';
import { ActivityService } from './services/activity.service';
import { CandidateNoteService } from './services/candidate-note.service';
import { AnalyticsService } from './services/analytics.service';
import { JobTemplateService } from './services/job-template.service';
import { EmployersPublicController } from './controllers/employers-public.controller';
import { EmployersSelfController } from './controllers/employers-self.controller';
import { EmployersAdminController } from './controllers/employers-admin.controller';
import { EmployersShortlistsController } from './controllers/employers-shortlists.controller';
import { EmployersPipelineController } from './controllers/employers-pipeline.controller';
import { EmployersInterviewController } from './controllers/employers-interview.controller';
import { EmployersAnalyticsController } from './controllers/employers-analytics.controller';
import { EmployersTeamController } from './controllers/employers-team.controller';
import { EmployersActivityController } from './controllers/employers-activity.controller';
import { EmployersNotesController } from './controllers/employers-notes.controller';
import { JobsModule } from '../jobs/jobs.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { AuditModule } from '../audit/audit.module';
import { UploadModule } from '../upload/upload.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployerOrg,
      EmployerUser,
      Shortlist,
      HiringPipeline,
      PipelineCandidate,
      Interview,
      EmployerActivityLog,
      CandidateNote,
      JobPostTemplate,
      CandidateProfile,
      TalentUser,
      JobPost,
      JobApplication,
      SkillTag,
      MatchRecommendation,
    ]),
    forwardRef(() => JobsModule),
    CandidatesModule,
    AuditModule,
    UploadModule,
    TaxonomyModule,
  ],
  controllers: [
    EmployersPublicController,
    EmployersSelfController,
    EmployersAdminController,
    EmployersShortlistsController,
    EmployersPipelineController,
    EmployersInterviewController,
    EmployersAnalyticsController,
    EmployersTeamController,
    EmployersActivityController,
    EmployersNotesController,
  ],
  providers: [
    EmployersService,
    EmployerVerificationService,
    ShortlistsService,
    PipelineService,
    InterviewService,
    ActivityService,
    CandidateNoteService,
    AnalyticsService,
    JobTemplateService,
  ],
  exports: [EmployersService, JobTemplateService],
})
export class EmployersModule {}
