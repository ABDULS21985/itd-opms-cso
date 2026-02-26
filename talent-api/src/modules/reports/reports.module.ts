import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './services/reports.service';
import { ReportExportService } from './services/report-export.service';
import { ReportsAdminController } from './controllers/reports-admin.controller';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerOrg } from '../employers/entities/employer-org.entity';
import { JobPost } from '../jobs/entities/job-post.entity';
import { JobSkill } from '../jobs/entities/job-skill.entity';
import { PlacementRecord } from '../placements/entities/placement-record.entity';
import { IntroRequest } from '../intro-requests/entities/intro-request.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateProfile,
      EmployerOrg,
      JobPost,
      JobSkill,
      PlacementRecord,
      IntroRequest,
      AuditLog,
    ]),
  ],
  controllers: [ReportsAdminController],
  providers: [ReportsService, ReportExportService],
  exports: [ReportsService, ReportExportService],
})
export class ReportsModule {}
