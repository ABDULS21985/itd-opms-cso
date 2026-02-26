import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';

import { CandidateProfile } from './entities/candidate-profile.entity';
import { CandidateSkill } from './entities/candidate-skill.entity';
import { CandidateProject } from './entities/candidate-project.entity';
import { CandidateConsent } from './entities/candidate-consent.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { JobPost } from '../jobs/entities/job-post.entity';
import { TalentUser } from '../users/entities/talent-user.entity';

import { CandidatesService } from './services/candidates.service';
import { CandidateSearchService } from './services/candidate-search.service';
import { CandidateApprovalService } from './services/candidate-approval.service';
import { CandidateImportService } from './services/candidate-import.service';
import { CvGeneratorService } from './services/cv-generator.service';

import { CandidatesPublicController } from './controllers/candidates-public.controller';
import { CandidatesSelfController } from './controllers/candidates-self.controller';
import { CandidatesAdminController } from './controllers/candidates-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateProfile,
      CandidateSkill,
      CandidateProject,
      CandidateConsent,
      CandidateDocument,
      JobApplication,
      JobPost,
      TalentUser,
    ]),
    AuthModule,
    AuditModule,
    TaxonomyModule,
    NotificationsModule,
    UploadModule,
  ],
  controllers: [
    CandidatesPublicController,
    CandidatesSelfController,
    CandidatesAdminController,
  ],
  providers: [
    CandidatesService,
    CandidateSearchService,
    CandidateApprovalService,
    CandidateImportService,
    CvGeneratorService,
  ],
  exports: [CandidatesService, CandidateSearchService, CvGeneratorService],
})
export class CandidatesModule {}
