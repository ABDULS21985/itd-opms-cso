import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityService } from '../services/activity.service';
import { EmployersService } from '../services/employers.service';

@ApiTags('Employer - Activity')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer/activity')
export class EmployersActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly employersService: EmployersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get activity feed' })
  async getFeed(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.activityService.findByEmployer(org.id, page, limit);
  }

  @Get('candidate/:candidateId')
  @ApiOperation({ summary: 'Get activity for a specific candidate' })
  async getCandidateActivity(
    @CurrentUser('id') userId: string,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.activityService.findByEntity('candidate', candidateId, org.id, page, limit);
  }
}
