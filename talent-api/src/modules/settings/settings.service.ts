import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortalSetting } from './entities/portal-setting.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

export interface PortalSettingsResponse {
  portalName: string;
  portalDescription: string;
  contactEmail: string;
  brandColor: string;
  timezone: string;
  dateFormat: string;
  defaultVisibility: string;
  autoApproveCandidates: boolean;
  autoApproveEmployers: boolean;
  autoApproveJobs: boolean;
  reviewSlaHours: number;
  flaggedKeywords: string;
  emailNotifications: {
    newCandidate: boolean;
    newEmployer: boolean;
    newJob: boolean;
    newApplication: boolean;
    newIntroRequest: boolean;
  };
  digestFrequency: string;
  auditLogRetention: string;
  deletedRecordsRetention: string;
}

const DEFAULT_SETTINGS: Record<string, { value: string; valueType: string; description: string }> = {
  portalName: { value: 'African Tech Talent Portal', valueType: 'string', description: 'Name of the portal' },
  portalDescription: { value: 'A talent matching platform', valueType: 'string', description: 'Description of the portal' },
  contactEmail: { value: 'admin@talentportal.com', valueType: 'string', description: 'Contact email for the portal' },
  brandColor: { value: '#1E4DB7', valueType: 'string', description: 'Brand color for the portal UI' },
  timezone: { value: 'Africa/Lagos', valueType: 'string', description: 'Default timezone for the portal' },
  dateFormat: { value: 'DD/MM/YYYY', valueType: 'string', description: 'Default date display format' },
  defaultVisibility: { value: 'private', valueType: 'string', description: 'Default visibility for new candidate profiles' },
  autoApproveCandidates: { value: 'false', valueType: 'boolean', description: 'Automatically approve new candidate profiles' },
  autoApproveEmployers: { value: 'false', valueType: 'boolean', description: 'Automatically verify new employer registrations' },
  autoApproveJobs: { value: 'false', valueType: 'boolean', description: 'Automatically approve new job postings' },
  reviewSlaHours: { value: '24', valueType: 'number', description: 'Target hours to review new submissions' },
  flaggedKeywords: { value: '', valueType: 'string', description: 'Comma-separated keywords that trigger content review' },
  emailNotifications: {
    value: JSON.stringify({
      newCandidate: true,
      newEmployer: true,
      newJob: true,
      newApplication: true,
      newIntroRequest: true,
    }),
    valueType: 'json',
    description: 'Email notification settings',
  },
  digestFrequency: { value: 'realtime', valueType: 'string', description: 'Email digest frequency' },
  auditLogRetention: { value: '90', valueType: 'string', description: 'Audit log retention period in days' },
  deletedRecordsRetention: { value: '30', valueType: 'string', description: 'Deleted records retention period in days' },
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(PortalSetting)
    private readonly settingsRepo: Repository<PortalSetting>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.settingsRepo.findOne({ where: { key } });
      if (!existing) {
        const setting = this.settingsRepo.create({
          key,
          value: config.value,
          valueType: config.valueType,
          description: config.description,
        });
        await this.settingsRepo.save(setting);
      }
    }
  }

  async getAll(): Promise<PortalSettingsResponse> {
    const settings = await this.settingsRepo.find();
    const map = new Map<string, PortalSetting>();
    for (const s of settings) {
      map.set(s.key, s);
    }

    return {
      portalName: this.getValue(map, 'portalName', 'string') as string,
      portalDescription: this.getValue(map, 'portalDescription', 'string') as string,
      contactEmail: this.getValue(map, 'contactEmail', 'string') as string,
      brandColor: this.getValue(map, 'brandColor', 'string') as string,
      timezone: this.getValue(map, 'timezone', 'string') as string,
      dateFormat: this.getValue(map, 'dateFormat', 'string') as string,
      defaultVisibility: this.getValue(map, 'defaultVisibility', 'string') as string,
      autoApproveCandidates: this.getValue(map, 'autoApproveCandidates', 'boolean') as boolean,
      autoApproveEmployers: this.getValue(map, 'autoApproveEmployers', 'boolean') as boolean,
      autoApproveJobs: this.getValue(map, 'autoApproveJobs', 'boolean') as boolean,
      reviewSlaHours: this.getValue(map, 'reviewSlaHours', 'number') as number,
      flaggedKeywords: this.getValue(map, 'flaggedKeywords', 'string') as string,
      emailNotifications: this.getValue(map, 'emailNotifications', 'json') as PortalSettingsResponse['emailNotifications'],
      digestFrequency: this.getValue(map, 'digestFrequency', 'string') as string,
      auditLogRetention: this.getValue(map, 'auditLogRetention', 'string') as string,
      deletedRecordsRetention: this.getValue(map, 'deletedRecordsRetention', 'string') as string,
    };
  }

  async update(dto: UpdateSettingsDto): Promise<PortalSettingsResponse> {
    const updates: Array<{ key: string; value: string; valueType: string }> = [];

    if (dto.portalName !== undefined) {
      updates.push({ key: 'portalName', value: dto.portalName, valueType: 'string' });
    }
    if (dto.portalDescription !== undefined) {
      updates.push({ key: 'portalDescription', value: dto.portalDescription, valueType: 'string' });
    }
    if (dto.contactEmail !== undefined) {
      updates.push({ key: 'contactEmail', value: dto.contactEmail, valueType: 'string' });
    }
    if (dto.brandColor !== undefined) {
      updates.push({ key: 'brandColor', value: dto.brandColor, valueType: 'string' });
    }
    if (dto.timezone !== undefined) {
      updates.push({ key: 'timezone', value: dto.timezone, valueType: 'string' });
    }
    if (dto.dateFormat !== undefined) {
      updates.push({ key: 'dateFormat', value: dto.dateFormat, valueType: 'string' });
    }
    if (dto.defaultVisibility !== undefined) {
      updates.push({ key: 'defaultVisibility', value: dto.defaultVisibility, valueType: 'string' });
    }
    if (dto.autoApproveCandidates !== undefined) {
      updates.push({ key: 'autoApproveCandidates', value: String(dto.autoApproveCandidates), valueType: 'boolean' });
    }
    if (dto.autoApproveEmployers !== undefined) {
      updates.push({ key: 'autoApproveEmployers', value: String(dto.autoApproveEmployers), valueType: 'boolean' });
    }
    if (dto.autoApproveJobs !== undefined) {
      updates.push({ key: 'autoApproveJobs', value: String(dto.autoApproveJobs), valueType: 'boolean' });
    }
    if (dto.reviewSlaHours !== undefined) {
      updates.push({ key: 'reviewSlaHours', value: String(dto.reviewSlaHours), valueType: 'number' });
    }
    if (dto.flaggedKeywords !== undefined) {
      updates.push({ key: 'flaggedKeywords', value: dto.flaggedKeywords, valueType: 'string' });
    }
    if (dto.emailNotifications !== undefined) {
      updates.push({ key: 'emailNotifications', value: JSON.stringify(dto.emailNotifications), valueType: 'json' });
    }
    if (dto.digestFrequency !== undefined) {
      updates.push({ key: 'digestFrequency', value: dto.digestFrequency, valueType: 'string' });
    }
    if (dto.auditLogRetention !== undefined) {
      updates.push({ key: 'auditLogRetention', value: dto.auditLogRetention, valueType: 'string' });
    }
    if (dto.deletedRecordsRetention !== undefined) {
      updates.push({ key: 'deletedRecordsRetention', value: dto.deletedRecordsRetention, valueType: 'string' });
    }

    for (const u of updates) {
      await this.settingsRepo.upsert(
        { key: u.key, value: u.value, valueType: u.valueType },
        { conflictPaths: ['key'] },
      );
    }

    return this.getAll();
  }

  async clearCache(): Promise<{ message: string }> {
    // In a production system this would clear Redis/in-memory caches
    return { message: 'Cache cleared successfully' };
  }

  async seedData(): Promise<{ message: string }> {
    await this.seedDefaults();
    return { message: 'Default settings seeded successfully' };
  }

  private getValue(
    map: Map<string, PortalSetting>,
    key: string,
    type: string,
  ): string | boolean | number | Record<string, unknown> {
    const setting = map.get(key);
    if (!setting) {
      const def = DEFAULT_SETTINGS[key];
      if (def) {
        return this.parseValue(def.value, def.valueType);
      }
      return '';
    }
    return this.parseValue(setting.value, type);
  }

  private parseValue(value: string, type: string): string | boolean | number | Record<string, unknown> {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      default:
        return value;
    }
  }
}
