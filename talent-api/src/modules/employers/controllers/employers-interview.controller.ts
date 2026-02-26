import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InterviewService } from '../services/interview.service';
import { EmployersService } from '../services/employers.service';
import { ScheduleInterviewDto } from '../dto/schedule-interview.dto';
import { UpdateInterviewDto } from '../dto/update-interview.dto';
import { InterviewStatus } from '../../../common/constants/status.constant';

@ApiTags('Employer - Interviews')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer/interviews')
export class EmployersInterviewController {
  constructor(
    private readonly interviewService: InterviewService,
    private readonly employersService: EmployersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Schedule an interview' })
  async schedule(
    @CurrentUser('id') userId: string,
    @Body() data: ScheduleInterviewDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.interviewService.schedule(org.id, userId, data);
  }

  @Get()
  @ApiOperation({ summary: 'List interviews' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: InterviewStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.interviewService.findByEmployer(org.id, { status, from, to, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.interviewService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update interview' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateInterviewDto,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.interviewService.update(id, data);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel interview' })
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    return this.interviewService.cancel(id, reason);
  }

  @Get(':id/ics')
  @ApiOperation({ summary: 'Download ICS calendar invite' })
  async downloadIcs(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    await this.employersService.getUserEmployerOrg(userId);
    const interview = await this.interviewService.findById(id);
    const ics = this.interviewService.generateIcs(interview);

    res.set({
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="interview-${id}.ics"`,
    });
    res.send(ics);
  }
}
