import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile } from '../entities/candidate-profile.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { DocumentType } from '../../../common/constants/status.constant';

@Injectable()
export class CvGeneratorService {
  private readonly logger = new Logger(CvGeneratorService.name);

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepo: Repository<CandidateDocument>,
  ) {}

  // ──────────────────────────────────────────────
  // Generate HTML CV
  // ──────────────────────────────────────────────

  async generateCV(candidateId: string, requestedBy?: string): Promise<Buffer> {
    const profile = await this.profileRepo.findOne({
      where: { id: candidateId },
      relations: [
        'user',
        'primaryTrack',
        'tracks',
        'cohort',
        'candidateSkills',
        'candidateSkills.skill',
        'candidateProjects',
        'candidateDocuments',
      ],
    });

    if (!profile) {
      throw new NotFoundException(`Candidate profile with ID ${candidateId} not found`);
    }

    const html = this.buildHtml(profile, requestedBy);
    this.logger.log(`CV generated for candidate ${candidateId}`);
    return Buffer.from(html, 'utf-8');
  }

  // ──────────────────────────────────────────────
  // Check for uploaded CV
  // ──────────────────────────────────────────────

  async getCVDownloadUrl(candidateId: string): Promise<string | null> {
    const document = await this.documentRepo.findOne({
      where: {
        candidateId,
        documentType: DocumentType.CV_UPLOADED,
        isCurrent: true,
      },
      order: { createdAt: 'DESC' },
    });

    return document?.fileUrl ?? null;
  }

  // ──────────────────────────────────────────────
  // HTML builder
  // ──────────────────────────────────────────────

  private buildHtml(profile: CandidateProfile, requestedBy?: string): string {
    const skills = (profile.candidateSkills || [])
      .map((cs) => cs.skill?.name || cs.customTagName || '')
      .filter(Boolean);

    const tracks = (profile.tracks || [])
      .map((t) => t.name)
      .filter(Boolean);

    const primaryTrack = profile.primaryTrack?.name || '';

    const projects = profile.candidateProjects || [];

    const links: { label: string; url: string }[] = [];
    if (profile.githubUrl) links.push({ label: 'GitHub', url: profile.githubUrl });
    if (profile.linkedinUrl) links.push({ label: 'LinkedIn', url: profile.linkedinUrl });
    if (profile.portfolioUrl) links.push({ label: 'Portfolio', url: profile.portfolioUrl });
    if (profile.personalWebsite) links.push({ label: 'Website', url: profile.personalWebsite });

    const confidentialLine = requestedBy
      ? `<p style="color:#888;font-size:12px;text-align:center;margin-top:8px;">Confidential &mdash; Generated for ${this.escapeHtml(requestedBy)}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${this.escapeHtml(profile.fullName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; border-bottom: 3px solid #1E4DB7; padding-bottom: 24px; }
    .header-photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #1E4DB7; }
    .header-info h1 { color: #1E4DB7; font-size: 28px; margin-bottom: 4px; }
    .header-info p { color: #666; font-size: 14px; }
    .section { margin-bottom: 28px; }
    .section-title { color: #1E4DB7; font-size: 18px; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
    .bio { font-size: 15px; color: #444; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-tag { background: #e8edf7; color: #1E4DB7; padding: 4px 12px; border-radius: 16px; font-size: 13px; }
    .project { margin-bottom: 16px; }
    .project-title { font-size: 16px; font-weight: 600; color: #333; }
    .project-desc { font-size: 14px; color: #555; margin-top: 4px; }
    .project-tech { font-size: 13px; color: #888; margin-top: 4px; }
    .links-list { list-style: none; }
    .links-list li { margin-bottom: 6px; }
    .links-list a { color: #1E4DB7; text-decoration: none; font-size: 14px; }
    .meta-row { font-size: 14px; color: #555; margin-bottom: 4px; }
    .watermark { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #aaa; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${profile.photoUrl ? `<img src="${this.escapeHtml(profile.photoUrl)}" alt="Photo" class="header-photo" />` : ''}
      <div class="header-info">
        <h1>${this.escapeHtml(profile.fullName)}</h1>
        ${primaryTrack ? `<p>${this.escapeHtml(primaryTrack)}</p>` : ''}
        ${profile.city || profile.country ? `<p>${[profile.city, profile.country].filter(Boolean).map((v) => this.escapeHtml(v!)).join(', ')}</p>` : ''}
        ${profile.contactEmail ? `<p>${this.escapeHtml(profile.contactEmail)}</p>` : ''}
      </div>
    </div>

    ${profile.bio ? `
    <div class="section">
      <h2 class="section-title">About</h2>
      <p class="bio">${this.escapeHtml(profile.bio)}</p>
    </div>
    ` : ''}

    ${skills.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Skills</h2>
      <div class="skills-list">
        ${skills.map((s) => `<span class="skill-tag">${this.escapeHtml(s)}</span>`).join('\n        ')}
      </div>
    </div>
    ` : ''}

    ${tracks.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Tracks</h2>
      <div class="skills-list">
        ${tracks.map((t) => `<span class="skill-tag">${this.escapeHtml(t)}</span>`).join('\n        ')}
      </div>
    </div>
    ` : ''}

    ${profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined ? `
    <div class="section">
      <h2 class="section-title">Experience</h2>
      <p class="meta-row">Years of Experience: ${profile.yearsOfExperience}</p>
      ${profile.experienceAreas && profile.experienceAreas.length > 0 ? `<p class="meta-row">Areas: ${profile.experienceAreas.map((a) => this.escapeHtml(a)).join(', ')}</p>` : ''}
    </div>
    ` : ''}

    ${projects.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Projects</h2>
      ${projects.map((p) => `
      <div class="project">
        <div class="project-title">${this.escapeHtml(p.title)}</div>
        ${p.description ? `<div class="project-desc">${this.escapeHtml(p.description)}</div>` : ''}
        ${p.outcomeMetric ? `<div class="project-desc"><strong>Outcome:</strong> ${this.escapeHtml(p.outcomeMetric)}</div>` : ''}
        ${p.techStack && p.techStack.length > 0 ? `<div class="project-tech">Tech: ${p.techStack.map((t) => this.escapeHtml(t)).join(', ')}</div>` : ''}
        ${p.projectUrl ? `<div class="project-tech"><a href="${this.escapeHtml(p.projectUrl)}" style="color:#1E4DB7;">View Project</a></div>` : ''}
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${links.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Links</h2>
      <ul class="links-list">
        ${links.map((l) => `<li><a href="${this.escapeHtml(l.url)}">${this.escapeHtml(l.label)}: ${this.escapeHtml(l.url)}</a></li>`).join('\n        ')}
      </ul>
    </div>
    ` : ''}

    <div class="watermark">
      <p>Generated via African Tech Talent Portal</p>
      ${confidentialLine}
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
