import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmployersService } from '../services/employers.service';
import { EmployerUser } from '../entities/employer-user.entity';
import { TalentUser } from '../../users/entities/talent-user.entity';
import { InviteTeamMemberDto } from '../dto/invite-team-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { EmployerUserRole } from '../../../common/constants/status.constant';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification.events';

@ApiTags('Employer - Team')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employers/me/team')
export class EmployersTeamController {
  private readonly logger = new Logger(EmployersTeamController.name);

  constructor(
    private readonly employersService: EmployersService,
    @InjectRepository(EmployerUser)
    private readonly employerUserRepo: Repository<EmployerUser>,
    @InjectRepository(TalentUser)
    private readonly userRepo: Repository<TalentUser>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List team members' })
  async getMembers(@CurrentUser('id') userId: string) {
    const org = await this.employersService.getUserEmployerOrg(userId);
    return this.employersService.getOrgMembers(org.id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a team member' })
  async invite(
    @CurrentUser('id') userId: string,
    @Body() data: InviteTeamMemberDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(userId);

    // Check inviter has admin/owner role
    const inviter = await this.employerUserRepo.findOne({
      where: { userId, orgId: org.id },
    });
    if (!inviter || (inviter.role !== EmployerUserRole.OWNER && inviter.role !== EmployerUserRole.ADMIN)) {
      throw new ForbiddenException('Only admins and owners can invite team members');
    }

    // Find user by email
    const targetUser = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (!targetUser) {
      throw new NotFoundException('No user found with this email. They need to register first.');
    }

    // Check if already a member
    const existing = await this.employerUserRepo.findOne({
      where: { userId: targetUser.id, orgId: org.id },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = this.employerUserRepo.create({
      userId: targetUser.id,
      orgId: org.id,
      contactName: data.contactName || targetUser.displayName || '',
      role: data.role || EmployerUserRole.MEMBER,
    });
    const saved = await this.employerUserRepo.save(member);

    // Notify invited user
    this.eventEmitter.emit(NOTIFICATION_EVENTS.TEAM_INVITE, {
      userId: targetUser.id,
      companyName: org.companyName,
      invitedBy: inviter.contactName,
    });

    this.logger.log(`User ${targetUser.id} invited to org ${org.id}`);
    return saved;
  }

  @Put(':userId/role')
  @ApiOperation({ summary: 'Update team member role' })
  async updateRole(
    @CurrentUser('id') currentUserId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() data: UpdateMemberRoleDto,
  ) {
    const org = await this.employersService.getUserEmployerOrg(currentUserId);

    const currentMember = await this.employerUserRepo.findOne({
      where: { userId: currentUserId, orgId: org.id },
    });
    if (!currentMember || currentMember.role !== EmployerUserRole.OWNER) {
      throw new ForbiddenException('Only the owner can change member roles');
    }

    if (data.role === EmployerUserRole.OWNER) {
      throw new ForbiddenException('Cannot assign owner role. Transfer ownership instead.');
    }

    const targetMember = await this.employerUserRepo.findOne({
      where: { userId: targetUserId, orgId: org.id },
    });
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this organization');
    }
    if (targetMember.role === EmployerUserRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role');
    }

    targetMember.role = data.role;
    return this.employerUserRepo.save(targetMember);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove team member' })
  async remove(
    @CurrentUser('id') currentUserId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const org = await this.employersService.getUserEmployerOrg(currentUserId);

    const currentMember = await this.employerUserRepo.findOne({
      where: { userId: currentUserId, orgId: org.id },
    });
    if (!currentMember || (currentMember.role !== EmployerUserRole.OWNER && currentMember.role !== EmployerUserRole.ADMIN)) {
      throw new ForbiddenException('Only admins and owners can remove team members');
    }

    const targetMember = await this.employerUserRepo.findOne({
      where: { userId: targetUserId, orgId: org.id },
    });
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this organization');
    }
    if (targetMember.role === EmployerUserRole.OWNER) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    await this.employerUserRepo.remove(targetMember);
    this.logger.log(`User ${targetUserId} removed from org ${org.id}`);
    return { message: 'Member removed successfully' };
  }
}
