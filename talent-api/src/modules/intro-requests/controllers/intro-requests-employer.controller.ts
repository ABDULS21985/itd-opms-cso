import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IntroRequestsService } from '../services/intro-requests.service';
import { EmployersService } from '../../employers/services/employers.service';
import { CreateIntroRequestDto } from '../dto/create-intro-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Intro Requests - Employer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers/intro-requests')
export class IntroRequestsEmployerController {
  constructor(
    private readonly introRequestsService: IntroRequestsService,
    private readonly employersService: EmployersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get intro requests for current employer' })
  async getMyRequests(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.introRequestsService.getEmployerRequests(org.id, pagination);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new intro request' })
  async createRequest(
    @CurrentUser('id') userId: string,
    @Body() data: CreateIntroRequestDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.introRequestsService.createRequest(
      org.id,
      userId,
      data.candidateId,
      data,
    );
  }
}
