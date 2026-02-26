import {
  Controller,
  Get,
  Put,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { TalentPortalRole } from '../../common/constants/roles.constant';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@Roles(TalentPortalRole.SUPER_ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all portal settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Update portal settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}

@ApiTags('Admin - Maintenance')
@ApiBearerAuth()
@Controller('admin/maintenance')
@Roles(TalentPortalRole.SUPER_ADMIN)
export class MaintenanceController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('clear-cache')
  @ApiOperation({ summary: 'Clear server-side caches' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    return this.settingsService.clearCache();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default data' })
  @ApiResponse({ status: 200, description: 'Data seeded' })
  async seedData() {
    return this.settingsService.seedData();
  }
}
