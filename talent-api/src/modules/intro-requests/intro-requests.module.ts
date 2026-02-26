import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntroRequest } from './entities/intro-request.entity';
import { IntroRequestsService } from './services/intro-requests.service';
import { IntroRequestsEmployerController } from './controllers/intro-requests-employer.controller';
import { IntroRequestsCandidateController } from './controllers/intro-requests-candidate.controller';
import { IntroRequestsAdminController } from './controllers/intro-requests-admin.controller';
import { EmployersModule } from '../employers/employers.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntroRequest]),
    EmployersModule,
    CandidatesModule,
  ],
  controllers: [
    IntroRequestsEmployerController,
    IntroRequestsCandidateController,
    IntroRequestsAdminController,
  ],
  providers: [IntroRequestsService],
  exports: [IntroRequestsService],
})
export class IntroRequestsModule {}
