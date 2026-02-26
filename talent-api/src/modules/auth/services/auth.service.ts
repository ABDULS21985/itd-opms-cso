import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { TalentUserRole } from '../../users/entities/talent-user-role.entity';
import {
  TalentUserType,
  ProfileApprovalStatus,
} from '../../../common/constants/status.constant';
import { TalentPortalRole } from '../../../common/constants/roles.constant';
import { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import { generateUniqueSlug } from '../../../common/utils/slug.util';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(TalentUser)
    private readonly userRepo: Repository<TalentUser>,
    @InjectRepository(TalentUserRole)
    private readonly roleRepo: Repository<TalentUserRole>,
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last active
    await this.userRepo.update(user.id, { lastActiveAt: new Date() });

    const token = this.signToken(user);
    return { token };
  }

  async register(dto: RegisterDto): Promise<{ token: string }> {
    // Check if email is already taken
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const externalUserId = `local-${crypto.randomUUID()}`;

    const user = this.userRepo.create({
      externalUserId,
      email: dto.email,
      passwordHash,
      displayName: dto.fullName || dto.contactName || null,
      userType: dto.userType,
      permissions: [],
    });

    const saved = await this.userRepo.save(user);

    // Assign default role based on user type
    const defaultRole =
      dto.userType === TalentUserType.EMPLOYER
        ? TalentPortalRole.EMPLOYER_ADMIN
        : TalentPortalRole.CANDIDATE;

    const role = this.roleRepo.create({
      userId: saved.id,
      role: defaultRole,
      assignedAt: new Date(),
    });
    await this.roleRepo.save(role);

    // Auto-create CandidateProfile for candidate registrations
    if (dto.userType === TalentUserType.CANDIDATE && dto.fullName) {
      const slug = generateUniqueSlug(dto.fullName);
      const profile = this.profileRepo.create({
        userId: saved.id,
        fullName: dto.fullName,
        slug,
        contactEmail: dto.email,
        approvalStatus: ProfileApprovalStatus.DRAFT,
      });
      await this.profileRepo.save(profile);
    }

    this.logger.log(
      `User registered: ${saved.email} (${dto.userType}) id=${saved.id}`,
    );

    const token = this.signToken(saved);
    return { token };
  }

  private signToken(user: TalentUser): string {
    const secret =
      this.configService.get<string>('jwt.accessSecret') || 'development-secret';
    const issuer = this.configService.get<string>('jwt.issuer') || 'digiweb';
    const audience =
      this.configService.get<string>('jwt.audience') || 'digiweb-api';

    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.externalUserId,
        email: user.email,
        iss: issuer,
        aud: audience,
        iat: now,
        exp: now + 30 * 86400, // 30 days
      }),
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }
}
