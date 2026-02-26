import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IntroRequestsService } from '../services/intro-requests.service';
import { CandidateRespondDto } from '../dto/update-intro-request.dto';
import { CandidateIntroRequestsQueryDto } from '../dto/candidate-intro-requests-query.dto';
import { CandidatesService } from '../../candidates/services/candidates.service';

@ApiTags('Intro Requests - Candidate')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me/intro-requests')
export class IntroRequestsCandidateController {
  constructor(
    private readonly introRequestsService: IntroRequestsService,
    private readonly candidatesService: CandidatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get intro requests for current candidate' })
  async getMyRequests(
    @CurrentUser('id') userId: string,
    @Query() query: CandidateIntroRequestsQueryDto,
  ) {
    const profile = await this.candidatesService.findByUserId(userId);
    return this.introRequestsService.getCandidateRequests(profile.id, query, query.status);
  }

  @Put(':id/respond')
  @ApiOperation({ summary: 'Respond to an intro request' })
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CandidateRespondDto,
  ) {
    return this.introRequestsService.candidateRespond(id, dto.response);
  }
}
