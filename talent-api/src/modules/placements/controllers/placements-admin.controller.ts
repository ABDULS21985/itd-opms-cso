import {
  Controller,
  Get,
  Post,
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
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { PlacementStatus } from '../../../common/constants/status.constant';
import { PlacementsService } from '../services/placements.service';
import { CreatePlacementDto } from '../dto/create-placement.dto';
import { UpdatePlacementDto, UpdatePlacementStatusDto } from '../dto/update-placement.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AdminSearchPlacementsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: PlacementStatus })
  @IsOptional()
  @IsEnum(PlacementStatus)
  status?: PlacementStatus;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Filter by employer ID' })
  @IsOptional()
  @IsString()
  employerId?: string;

  @ApiPropertyOptional({ description: 'Filter by managed-by user ID' })
  @IsOptional()
  @IsString()
  managedBy?: string;
}

@ApiTags('Placements - Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TalentPortalRole.SUPER_ADMIN, TalentPortalRole.PLACEMENT_MANAGER, TalentPortalRole.PLACEMENT_OFFICER)
@Controller('admin/placements')
export class PlacementsAdminController {
  constructor(private readonly placementsService: PlacementsService) {}

  @Get()
  @ApiOperation({ summary: 'List all placement records' })
  async findAll(@Query() query: AdminSearchPlacementsDto) {
    const { status, candidateId, employerId, managedBy, ...pagination } = query;
    return this.placementsService.findAll(
      { status, candidateId, employerId, managedBy },
      pagination,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a placement record by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.placementsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new placement record' })
  async create(@Body() data: CreatePlacementDto) {
    return this.placementsService.createPlacement(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a placement record' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdatePlacementDto,
  ) {
    return this.placementsService.updatePlacement(id, data);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update placement status with state machine validation' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePlacementStatusDto,
  ) {
    return this.placementsService.updateStatus(id, dto.status, adminId);
  }
}
