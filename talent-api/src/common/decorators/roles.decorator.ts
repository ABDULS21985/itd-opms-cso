import { SetMetadata } from '@nestjs/common';
import { TalentPortalRole } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TalentPortalRole[]) => SetMetadata(ROLES_KEY, roles);
