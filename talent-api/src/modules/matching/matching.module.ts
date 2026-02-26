import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchRecommendation } from './entities/match-recommendation.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { JobPost } from '../jobs/entities/job-post.entity';
import { EmployerOrg } from '../employers/entities/employer-org.entity';
import { MatchingScoringService } from './services/matching-scoring.service';
import { MatchingEngineService } from './services/matching-engine.service';
import {
  MatchingEmployerController,
  MatchingCandidateController,
  MatchingAdminController,
} from './controllers/matching.controller';
import { EmployersModule } from '../employers/employers.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchRecommendation,
      CandidateProfile,
      JobPost,
      EmployerOrg,
    ]),
    forwardRef(() => EmployersModule),
    forwardRef(() => CandidatesModule),
  ],
  controllers: [
    MatchingEmployerController,
    MatchingCandidateController,
    MatchingAdminController,
  ],
  providers: [MatchingScoringService, MatchingEngineService],
  exports: [MatchingEngineService, MatchingScoringService],
})
export class MatchingModule {}
