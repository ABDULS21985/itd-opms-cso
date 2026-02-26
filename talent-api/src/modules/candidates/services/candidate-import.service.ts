import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { ProfileApprovalStatus, TalentUserType } from '../../../common/constants/status.constant';
import { generateUniqueSlug } from '../../../common/utils/slug.util';

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface CsvRow {
  fullName?: string;
  email?: string;
  city?: string;
  country?: string;
  phone?: string;
  bio?: string;
  yearsOfExperience?: string;
  primaryStacks?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class CandidateImportService {
  private readonly logger = new Logger(CandidateImportService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(TalentUser)
    private readonly userRepo: Repository<TalentUser>,
  ) {}

  async importFromCsv(
    buffer: Buffer,
    adminId: string,
  ): Promise<CsvImportResult> {
    const csvContent = buffer.toString('utf-8');
    const rows = this.parseCsv(csvContent);

    if (rows.length === 0) {
      return { imported: 0, skipped: 0, errors: [{ row: 0, reason: 'CSV file is empty or has no data rows' }] };
    }

    let imported = 0;
    let skipped = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 because row 1 is header, and we want 1-indexed
      const row = rows[i];

      try {
        const result = await this.processRow(row, rowNumber, adminId);
        if (result === 'imported') {
          imported++;
        } else if (result === 'skipped') {
          skipped++;
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          reason: (error as Error).message,
        });
      }
    }

    this.logger.log(
      `CSV import completed: ${imported} imported, ${skipped} skipped, ${errors.length} errors`,
    );

    return { imported, skipped, errors };
  }

  private async processRow(
    row: CsvRow,
    rowNumber: number,
    adminId: string,
  ): Promise<'imported' | 'skipped'> {
    const fullName = row.fullName?.trim();
    const email = row.email?.trim();

    if (!fullName) {
      throw new Error('Missing required field: fullName');
    }

    if (!email) {
      throw new Error('Missing required field: email');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    // Check if user with this email already exists
    const existingUser = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUser) {
      // Check if they already have a candidate profile
      const existingProfile = await this.profileRepo.findOne({
        where: { userId: existingUser.id },
      });

      if (existingProfile) {
        return 'skipped';
      }

      // User exists but has no profile - create profile for them
      await this.createProfileForUser(existingUser.id, row, adminId);
      return 'imported';
    }

    // Create a new TalentUser and CandidateProfile
    const externalUserId = `csv-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const user = this.userRepo.create({
      externalUserId,
      email,
      displayName: fullName,
      userType: TalentUserType.CANDIDATE,
      permissions: [],
    });

    const savedUser = await this.userRepo.save(user);
    await this.createProfileForUser(savedUser.id, row, adminId);

    return 'imported';
  }

  private async createProfileForUser(
    userId: string,
    row: CsvRow,
    adminId: string,
  ): Promise<void> {
    const fullName = row.fullName!.trim();
    const slug = await this.generateUniqueSlug(fullName);

    const yearsOfExperience = row.yearsOfExperience
      ? parseInt(row.yearsOfExperience, 10)
      : null;

    const primaryStacks = row.primaryStacks
      ? row.primaryStacks.split(';').map((s) => s.trim()).filter(Boolean)
      : null;

    const profile = this.profileRepo.create({
      userId,
      fullName,
      slug,
      city: row.city?.trim() || null,
      country: row.country?.trim() || null,
      phone: row.phone?.trim() || null,
      contactEmail: row.email?.trim() || null,
      bio: row.bio?.trim() || null,
      yearsOfExperience: yearsOfExperience !== null && !isNaN(yearsOfExperience)
        ? yearsOfExperience
        : null,
      primaryStacks,
      githubUrl: row.githubUrl?.trim() || null,
      linkedinUrl: row.linkedinUrl?.trim() || null,
      approvalStatus: ProfileApprovalStatus.DRAFT,
      adminNotes: `Imported via CSV by admin ${adminId}`,
    });

    await this.profileRepo.save(profile);
  }

  private async generateUniqueSlug(fullName: string): Promise<string> {
    let slug = generateUniqueSlug(fullName);
    let attempts = 0;

    while (attempts < 5) {
      const existing = await this.profileRepo.findOne({ where: { slug } });
      if (!existing) return slug;
      slug = generateUniqueSlug(fullName);
      attempts++;
    }

    slug = generateUniqueSlug(fullName, Date.now().toString(36));
    return slug;
  }

  // ──────────────────────────────────────────────
  // CSV parsing
  // ──────────────────────────────────────────────

  private parseCsv(content: string): CsvRow[] {
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map((h) =>
      this.normalizeHeader(h),
    );

    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: CsvRow = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        if (header) {
          row[header] = values[j] || '';
        }
      }

      // Skip completely empty rows
      const hasData = Object.values(row).some((v) => v && v.trim().length > 0);
      if (hasData) {
        rows.push(row);
      }
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            // End of quoted field
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current.trim());
    return result;
  }

  private normalizeHeader(header: string): string {
    // Convert common CSV header formats to camelCase property names
    const trimmed = header.trim().toLowerCase();

    const headerMap: Record<string, string> = {
      'full_name': 'fullName',
      'fullname': 'fullName',
      'full name': 'fullName',
      'name': 'fullName',
      'email': 'email',
      'email_address': 'email',
      'email address': 'email',
      'city': 'city',
      'country': 'country',
      'phone': 'phone',
      'phone_number': 'phone',
      'phone number': 'phone',
      'bio': 'bio',
      'biography': 'bio',
      'years_of_experience': 'yearsOfExperience',
      'years of experience': 'yearsOfExperience',
      'experience': 'yearsOfExperience',
      'primary_stacks': 'primaryStacks',
      'primary stacks': 'primaryStacks',
      'stacks': 'primaryStacks',
      'tech_stack': 'primaryStacks',
      'tech stack': 'primaryStacks',
      'github_url': 'githubUrl',
      'github url': 'githubUrl',
      'github': 'githubUrl',
      'linkedin_url': 'linkedinUrl',
      'linkedin url': 'linkedinUrl',
      'linkedin': 'linkedinUrl',
    };

    return headerMap[trimmed] || this.toCamelCase(trimmed);
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[_\s]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (_, char) => char.toLowerCase());
  }
}
