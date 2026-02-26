import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { ReportExportService } from '../services/report-export.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  TalentPortalRole.PLACEMENT_OFFICER,
  TalentPortalRole.PLACEMENT_MANAGER,
  TalentPortalRole.SUPER_ADMIN,
)
export class ReportsAdminController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportService: ReportExportService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard stats overview' })
  getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('candidates')
  @ApiOperation({ summary: 'Get candidate statistics by track/status' })
  async getCandidateReports() {
    const [byTrack, byStatus] = await Promise.all([
      this.reportsService.getCandidatesByTrack(),
      this.reportsService.getCandidatesByStatus(),
    ]);
    return { byTrack, byStatus };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get job posting metrics' })
  getJobReports() {
    return this.reportsService.getJobsByStatus();
  }

  @Get('placements')
  @ApiOperation({ summary: 'Get placement funnel metrics' })
  getPlacementReports() {
    return this.reportsService.getPlacementsByStatus();
  }

  @Get('employers')
  @ApiOperation({ summary: 'Get employer engagement KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Employer engagement metrics including totals, verification status, sector breakdown, and activity counts',
  })
  async getEmployerReports() {
    return this.reportsService.getEmployerReport();
  }

  @Get('time-metrics')
  @ApiOperation({ summary: 'Get time-to-intro and time-to-placement metrics' })
  @ApiResponse({
    status: 200,
    description: 'Average time metrics for the intro-to-placement funnel',
  })
  async getTimeMetrics() {
    return this.reportsService.getTimeMetrics();
  }

  @Get('skills-demand')
  @ApiOperation({ summary: 'Get most demanded skills from job postings' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top skills to return (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of most demanded skills ordered by frequency',
  })
  async getSkillsDemand(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100);
    return this.reportsService.getSkillsDemand(safeLimit);
  }

  // ──────────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────────

  @Post('export')
  @ApiOperation({ summary: 'Export report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 400, description: 'Invalid export type or format' })
  async exportReport(
    @Body() body: { type: string; format: 'csv'; filters?: any },
    @Res() res: Response,
  ) {
    if (body.format !== 'csv') {
      throw new BadRequestException('Only CSV format is currently supported');
    }

    let csv: string;
    let filename: string;

    switch (body.type) {
      case 'overview':
        csv = await this.reportExportService.exportOverviewReport();
        filename = 'overview-report.csv';
        break;
      case 'candidates':
        csv = await this.reportExportService.exportCandidatesReport(body.filters);
        filename = 'candidates-report.csv';
        break;
      case 'placements':
        csv = await this.reportExportService.exportPlacementsReport(body.filters);
        filename = 'placements-report.csv';
        break;
      case 'jobs':
        csv = await this.reportExportService.exportJobsReport(body.filters);
        filename = 'jobs-report.csv';
        break;
      case 'employers':
        csv = await this.reportExportService.exportEmployersReport(body.filters);
        filename = 'employers-report.csv';
        break;
      case 'introRequests':
        csv = await this.reportExportService.exportIntroRequestsReport(body.filters);
        filename = 'intro-requests-report.csv';
        break;
      case 'auditLogs':
        csv = await this.reportExportService.exportAuditLogsReport(body.filters);
        filename = 'audit-logs-report.csv';
        break;
      default:
        throw new BadRequestException(
          'Invalid report type. Must be one of: overview, candidates, placements, jobs, employers, introRequests, auditLogs',
        );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
