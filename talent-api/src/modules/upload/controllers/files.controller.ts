import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { UploadService } from '../services/upload.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Get(':folder/:filename')
  @ApiOperation({ summary: 'Serve uploaded file (public)' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const key = `${folder}/${filename}`;

    try {
      const { stream, contentType } = await this.uploadService.getFileStream(key);

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });

      stream.pipe(res);
    } catch (error) {
      this.logger.warn(`File not found: ${key}`);
      res.status(404).json({ message: 'File not found' });
    }
  }
}
