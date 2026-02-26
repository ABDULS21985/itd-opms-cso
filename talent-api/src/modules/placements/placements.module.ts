import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacementRecord } from './entities/placement-record.entity';
import { PlacementsService } from './services/placements.service';
import { PlacementsAdminController } from './controllers/placements-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlacementRecord])],
  controllers: [PlacementsAdminController],
  providers: [PlacementsService],
  exports: [PlacementsService],
})
export class PlacementsModule {}
