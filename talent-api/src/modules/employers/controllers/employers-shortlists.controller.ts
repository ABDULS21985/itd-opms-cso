import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmployersService } from '../services/employers.service';
import { ShortlistsService } from '../services/shortlists.service';
import { CreateShortlistDto } from '../dto/create-shortlist.dto';
import { UpdateShortlistDto } from '../dto/update-shortlist.dto';
import { AddShortlistCandidateDto } from '../dto/add-shortlist-candidate.dto';

@ApiTags('Employers - Shortlists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers/me/shortlists')
export class EmployersShortlistsController {
  constructor(
    private readonly employersService: EmployersService,
    private readonly shortlistsService: ShortlistsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all saved shortlists for current employer' })
  async listShortlists(@CurrentUser('id') userId: string) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.findAllByEmployer(org.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shortlist by ID' })
  async getShortlist(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.findById(id, org.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shortlist' })
  async createShortlist(
    @CurrentUser('id') userId: string,
    @Body() data: CreateShortlistDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.create(org.id, userId, data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a shortlist' })
  async updateShortlist(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateShortlistDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.update(id, org.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shortlist' })
  async deleteShortlist(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    await this.shortlistsService.delete(id, org.id);
    return { message: 'Shortlist deleted successfully' };
  }

  @Post(':id/candidates')
  @ApiOperation({ summary: 'Add a candidate to a shortlist' })
  async addCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: AddShortlistCandidateDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.addCandidate(id, org.id, data.candidateId);
  }

  @Delete(':id/candidates/:candidateId')
  @ApiOperation({ summary: 'Remove a candidate from a shortlist' })
  async removeCandidate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.shortlistsService.removeCandidate(id, org.id, candidateId);
  }
}
