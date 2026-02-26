import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillTag } from './entities/skill-tag.entity';
import { Track } from './entities/track.entity';
import { Cohort } from './entities/cohort.entity';
import { Location } from './entities/location.entity';
import { SkillTrackAssociation } from './entities/skill-track-association.entity';
import { TaxonomyService } from './services/taxonomy.service';
import { TaxonomyPublicController } from './controllers/taxonomy-public.controller';
import { TaxonomyAdminController } from './controllers/taxonomy-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SkillTag, Track, Cohort, Location, SkillTrackAssociation])],
  controllers: [TaxonomyPublicController, TaxonomyAdminController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
