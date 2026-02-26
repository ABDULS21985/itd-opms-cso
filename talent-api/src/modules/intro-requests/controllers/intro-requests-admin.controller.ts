import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { IntroRequestsService } from '../services/intro-requests.service';
import { DeclineIntroRequestDto } from '../dto/update-intro-request.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { IntroRequestStatus } from '../../../common/constants/status.constant';

@ApiTags('Intro Requests - Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TalentPortalRole.SUPER_ADMIN, TalentPortalRole.PLACEMENT_MANAGER, TalentPortalRole.PLACEMENT_OFFICER)
@Controller('admin/intro-requests')
export class IntroRequestsAdminController {
  constructor(
    private readonly introRequestsService: IntroRequestsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all intro requests (admin)' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: IntroRequestStatus,
    @Query('employerId') employerId?: string,
    @Query('candidateId') candidateId?: string,
  ) {
    return this.introRequestsService.getAllRequests(
      { status, employerId, candidateId },
      pagination,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an intro request by ID (admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.introRequestsService.findById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an intro request' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.introRequestsService.approveRequest(id, adminId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an intro request' })
  async decline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: DeclineIntroRequestDto,
  ) {
    return this.introRequestsService.declineRequest(id, adminId, dto.reason);
  }

  @Post(':id/request-info')
  @ApiOperation({ summary: 'Request more info for an intro request' })
  async requestMoreInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.introRequestsService.requestMoreInfo(id, adminId);
  }
}
