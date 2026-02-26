import { Module } from '@nestjs/common';
import { UploadService } from './services/upload.service';
import { UploadController } from './controllers/upload.controller';
import { FilesController } from './controllers/files.controller';

@Module({
  providers: [UploadService],
  controllers: [UploadController, FilesController],
  exports: [UploadService],
})
export class UploadModule {}
