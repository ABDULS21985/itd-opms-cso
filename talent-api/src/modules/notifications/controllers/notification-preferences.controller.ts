import { Controller, Get, Put, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@ApiTags('Notification Preferences')
@ApiBearerAuth('JWT-auth')
@Controller('me/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    const prefs = await this.preferencesService.getPreferences(userId);
    return { data: prefs };
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Updated notification preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const prefs = await this.preferencesService.updatePreferences(userId, dto);
    return { data: prefs };
  }
}
