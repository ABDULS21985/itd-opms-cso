import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalSetting } from './entities/portal-setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController, MaintenanceController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PortalSetting])],
  controllers: [SettingsController, MaintenanceController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
