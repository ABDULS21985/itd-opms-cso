import { SetMetadata } from '@nestjs/common';
import { TalentPermission } from '../constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: TalentPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
