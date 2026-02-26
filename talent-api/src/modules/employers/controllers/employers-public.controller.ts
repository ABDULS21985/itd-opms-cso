import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EmployersService } from '../services/employers.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Employers - Public')
@Controller('employers/public')
@Public()
export class EmployersPublicController {
  constructor(private readonly employersService: EmployersService) {}

  @Get()
  @ApiOperation({ summary: 'List verified employer organizations' })
  @ApiResponse({ status: 200, description: 'List of verified employers' })
  async listVerifiedEmployers(@Query() pagination: PaginationDto) {
    return this.employersService.findVerified(pagination);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get employer by slug' })
  @ApiParam({ name: 'slug', description: 'Employer URL slug' })
  @ApiResponse({ status: 200, description: 'Employer details' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async getBySlug(@Param('slug') slug: string) {
    return this.employersService.findBySlug(slug);
  }
}
