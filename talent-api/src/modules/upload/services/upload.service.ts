import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly endpoint: string;
  private readonly useLocalStorage: boolean;
  private readonly localUploadDir: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('storage.endpoint', '');
    this.bucket = this.configService.get<string>('storage.bucket', '');
    this.prefix = this.configService.get<string>('storage.prefix', 'talent-portal/');
    this.appUrl = this.configService.get<string>('APP_URL', `http://localhost:${this.configService.get<number>('PORT', 4002)}`);

    // Fall back to local disk storage when S3 upload fails
    this.useLocalStorage = false;
    this.localUploadDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.localUploadDir, { recursive: true });

    this.s3 = new S3Client({
      endpoint: this.endpoint || undefined,
      region: this.configService.get<string>('storage.region', 'us-east-005'),
      credentials: {
        accessKeyId: this.configService.get<string>('storage.keyId', ''),
        secretAccessKey: this.configService.get<string>('storage.applicationKey', ''),
      },
      forcePathStyle: true,
    });
  }

  // ──────────────────────────────────────────────
  // Local file storage (fallback)
  // ──────────────────────────────────────────────

  private async uploadFileLocal(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    const uuid = randomUUID();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${uuid}-${sanitizedName}`;

    const dir = path.join(this.localUploadDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(this.localUploadDir, key);
    fs.writeFileSync(filePath, file.buffer);

    const url = `${this.appUrl}/api/v1/files/${key}`;
    this.logger.log(`File saved locally: ${filePath}`);
    return { url, key };
  }

  private deleteFileLocal(key: string): void {
    const filePath = path.join(this.localUploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Local file deleted: ${filePath}`);
    }
  }

  // ──────────────────────────────────────────────
  // Core upload / delete
  // ──────────────────────────────────────────────

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    // Try S3 first, fall back to local storage
    if (this.bucket && this.endpoint) {
      try {
        const uuid = randomUUID();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `${folder}/${uuid}-${sanitizedName}`;
        const s3Key = `${this.prefix}${fileKey}`;

        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await this.s3.send(command);

        const url = `${this.appUrl}/api/v1/files/${fileKey}`;
        this.logger.log(`File uploaded to S3: ${s3Key}`);
        return { url, key: s3Key };
      } catch (error) {
        this.logger.warn(
          `S3 upload failed, falling back to local storage: ${(error as Error).message}`,
        );
      }
    }

    // Local fallback
    return this.uploadFileLocal(file, folder);
  }

  async deleteFile(key: string): Promise<void> {
    if (this.bucket && this.endpoint) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        await this.s3.send(command);
        this.logger.log(`File deleted from S3: ${key}`);
        return;
      } catch (error) {
        this.logger.warn(
          `S3 delete failed, trying local: ${(error as Error).message}`,
        );
      }
    }

    this.deleteFileLocal(key);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.bucket && this.endpoint) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return getSignedUrl(this.s3, command, { expiresIn });
    }

    // For local files, return the API proxy URL
    return `${this.appUrl}/api/v1/files/${key}`;
  }

  // ──────────────────────────────────────────────
  // File streaming (for proxy endpoint)
  // ──────────────────────────────────────────────

  async getFileStream(
    key: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    // Try S3 first
    if (this.bucket && this.endpoint) {
      try {
        const s3Key = `${this.prefix}${key}`;
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        });
        const response = await this.s3.send(command);
        return {
          stream: response.Body as Readable,
          contentType: response.ContentType || 'application/octet-stream',
        };
      } catch (error) {
        this.logger.warn(`S3 fetch failed for key ${key}: ${(error as Error).message}`);
      }
    }

    // Local fallback
    const filePath = path.join(this.localUploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return {
      stream: fs.createReadStream(filePath),
      contentType: mimeMap[ext] || 'application/octet-stream',
    };
  }

  // ──────────────────────────────────────────────
  // Profile photo upload
  // ──────────────────────────────────────────────

  async uploadProfilePhoto(file: Express.Multer.File): Promise<string> {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, WebP',
      );
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 2MB limit');
    }

    // Resize to max 400x400
    const resizedBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const resizedFile: Express.Multer.File = {
      ...file,
      buffer: resizedBuffer,
      size: resizedBuffer.length,
    };

    const { url } = await this.uploadFile(resizedFile, 'photos');
    return url;
  }

  // ──────────────────────────────────────────────
  // Document upload
  // ──────────────────────────────────────────────

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: PDF, DOCX',
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const { url } = await this.uploadFile(file, 'documents');
    return url;
  }
}
