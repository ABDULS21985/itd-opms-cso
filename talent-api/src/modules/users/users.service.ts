import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TalentUser } from './entities/talent-user.entity';
import { TalentUserRole } from './entities/talent-user-role.entity';
import { TalentPortalRole } from '../../common/constants/roles.constant';
import { TalentPermission } from '../../common/constants/permissions.constant';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, PaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(TalentUser)
    private readonly userRepo: Repository<TalentUser>,
    @InjectRepository(TalentUserRole)
    private readonly roleRepo: Repository<TalentUserRole>,
  ) {}

  async findById(id: string): Promise<TalentUser> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async findByExternalId(externalUserId: string): Promise<TalentUser> {
    const user = await this.userRepo.findOne({
      where: { externalUserId },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(
        `User with external id "${externalUserId}" not found`,
      );
    }
    return user;
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<{ data: TalentUser[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search } = pagination;
    const skip = (page - 1) * limit;

    const where: any[] | undefined = search
      ? [
          { email: ILike(`%${search}%`) },
          { displayName: ILike(`%${search}%`) },
        ]
      : undefined;

    const [data, total] = await this.userRepo.findAndCount({
      where,
      relations: ['roles'],
      order: { [sort]: order.toUpperCase() as 'ASC' | 'DESC' },
      skip,
      take: limit,
    });

    return { data, meta: new PaginationMeta(total, page, limit) };
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<TalentUser> {
    const user = await this.findById(id);
    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  async assignRole(
    userId: string,
    role: TalentPortalRole,
    assignedBy?: string,
  ): Promise<TalentUserRole> {
    const user = await this.findById(userId);

    const existing = await this.roleRepo.findOne({
      where: { userId: user.id, role },
    });
    if (existing) {
      return existing;
    }

    const userRole = this.roleRepo.create({
      userId: user.id,
      role,
      assignedBy: assignedBy ?? null,
      assignedAt: new Date(),
    });
    return this.roleRepo.save(userRole);
  }

  async removeRole(userId: string, role: TalentPortalRole): Promise<void> {
    const user = await this.findById(userId);
    const existing = await this.roleRepo.findOne({
      where: { userId: user.id, role },
    });
    if (!existing) {
      throw new NotFoundException(
        `Role "${role}" not found for user "${userId}"`,
      );
    }
    await this.roleRepo.remove(existing);
  }

  async getUserRoles(userId: string): Promise<TalentUserRole[]> {
    const user = await this.findById(userId);
    return this.roleRepo.find({ where: { userId: user.id } });
  }

  async updatePermissions(
    userId: string,
    permissions: TalentPermission[],
  ): Promise<TalentUser> {
    const user = await this.findById(userId);
    user.permissions = permissions;
    return this.userRepo.save(user);
  }
}
