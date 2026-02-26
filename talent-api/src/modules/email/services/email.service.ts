import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('EMAIL_FROM', 'noreply@digibit.com.ng');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  // ──────────────────────────────────────────────
  // Core send methods
  // ──────────────────────────────────────────────

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async sendTemplatedEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    const compiled = this.getCompiledTemplate(template);
    const html = compiled(context);
    await this.sendMail({ to, subject, html });
  }

  // ──────────────────────────────────────────────
  // Candidate emails
  // ──────────────────────────────────────────────

  async sendWelcomeCandidate(email: string, name: string): Promise<void> {
    await this.sendTemplatedEmail(email, 'Welcome to African Tech Talent Portal', 'welcome-candidate', {
      name,
      actionUrl: this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng'),
    });
  }

  async sendCandidateInvite(
    email: string,
    name: string,
    trackName?: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      email,
      "You're Invited to African Tech Talent Portal",
      'candidate-invite',
      {
        name,
        trackName,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/register?invite=true`,
      },
    );
  }

  async sendCandidateApproved(email: string, name: string): Promise<void> {
    await this.sendTemplatedEmail(email, 'Your Profile Has Been Approved!', 'candidate-approved', {
      name,
      actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/profile`,
    });
  }

  async sendCandidateNeedsUpdate(
    email: string,
    name: string,
    notes: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      email,
      'Your Profile Needs Some Updates',
      'candidate-needs-update',
      {
        name,
        notes,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/profile/edit`,
      },
    );
  }

  // ──────────────────────────────────────────────
  // Employer emails
  // ──────────────────────────────────────────────

  async sendEmployerVerified(email: string, companyName: string): Promise<void> {
    await this.sendTemplatedEmail(
      email,
      'Your Organization Has Been Verified',
      'employer-verified',
      {
        companyName,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/employer/dashboard`,
      },
    );
  }

  // ──────────────────────────────────────────────
  // Intro request emails
  // ──────────────────────────────────────────────

  async sendIntroRequestCreated(
    email: string,
    candidateName: string,
    employerName: string,
    roleTitle: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      email,
      `New Intro Request: ${employerName} → ${candidateName}`,
      'intro-request-created',
      {
        candidateName,
        employerName,
        roleTitle,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/admin/intro-requests`,
      },
    );
  }

  async sendIntroRequestApproved(
    candidateEmail: string,
    candidateName: string,
    employerName: string,
    roleTitle: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      candidateEmail,
      'Your Intro Request Has Been Approved!',
      'intro-request-approved',
      {
        candidateName,
        employerName,
        roleTitle,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/intro-requests`,
      },
    );
  }

  // ──────────────────────────────────────────────
  // Job application emails
  // ──────────────────────────────────────────────

  async sendJobApplicationReceived(
    employerEmail: string,
    candidateName: string,
    jobTitle: string,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      employerEmail,
      `New Application: ${candidateName} for ${jobTitle}`,
      'job-application-received',
      {
        candidateName,
        jobTitle,
        actionUrl: `${this.configService.get<string>('APP_URL', 'https://talent.digibit.com.ng')}/employer/applications`,
      },
    );
  }

  // ──────────────────────────────────────────────
  // Template helpers
  // ──────────────────────────────────────────────

  private getCompiledTemplate(templateName: string): handlebars.TemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);

    try {
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const compiled = handlebars.compile(templateSource);
      this.templateCache.set(templateName, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(
        `Failed to load template "${templateName}": ${(error as Error).message}`,
      );
      // Fallback: return a simple template
      const fallback = handlebars.compile(
        '<html><body><p>{{message}}</p></body></html>',
      );
      return fallback;
    }
  }
}
