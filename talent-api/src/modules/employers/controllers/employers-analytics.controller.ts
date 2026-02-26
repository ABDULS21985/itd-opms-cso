import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AnalyticsService } from '../services/analytics.service';
import { EmployersService } from '../services/employers.service';

@ApiTags('Employer - Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer/analytics')
export class EmployersAnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly employersService: EmployersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get employer hiring analytics' })
  async getAnalytics(@CurrentUser('id') userId: string) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.analyticsService.getEmployerAnalytics(org.id);
  }
}
