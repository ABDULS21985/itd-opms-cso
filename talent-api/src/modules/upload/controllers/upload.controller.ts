import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { UploadService } from '../services/upload.service';

@ApiTags('Upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // ──────────────────────────────────────────────
  // Profile photo
  // ──────────────────────────────────────────────

  @Post('photo')
  @Roles(TalentPortalRole.CANDIDATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload profile photo (candidate)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const url = await this.uploadService.uploadProfilePhoto(file);
    return { url };
  }

  // ──────────────────────────────────────────────
  // Document
  // ──────────────────────────────────────────────

  @Post('document')
  @Roles(TalentPortalRole.CANDIDATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload document (candidate)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const url = await this.uploadService.uploadDocument(file);
    return {
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  // ──────────────────────────────────────────────
  // Employer logo
  // ──────────────────────────────────────────────

  @Post('employer-logo')
  @Roles(TalentPortalRole.EMPLOYER_ADMIN, TalentPortalRole.EMPLOYER_MEMBER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload employer logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Logo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadEmployerLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const url = await this.uploadService.uploadProfilePhoto(file);
    return { url };
  }
}
