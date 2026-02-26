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
import { CandidateNoteService } from '../services/candidate-note.service';
import { EmployersService } from '../services/employers.service';
import { CreateCandidateNoteDto } from '../dto/create-candidate-note.dto';

@ApiTags('Employer - Notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer/notes')
export class EmployersNotesController {
  constructor(
    private readonly noteService: CandidateNoteService,
    private readonly employersService: EmployersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a candidate note' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() data: CreateCandidateNoteDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.noteService.create(org.id, userId, data);
  }

  @Get('candidate/:candidateId')
  @ApiOperation({ summary: 'Get notes for a candidate' })
  async findByCandidateId(
    @CurrentUser('id') userId: string,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.noteService.findByCandidateForOrg(candidateId, org.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a note' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
  ) {
    return this.noteService.update(id, userId, content);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.noteService.delete(id, userId);
  }
}
