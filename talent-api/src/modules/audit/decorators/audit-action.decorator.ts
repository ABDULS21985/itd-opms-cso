import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../../common/constants/status.constant';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditLog = (action: AuditAction) => SetMetadata(AUDIT_ACTION_KEY, action);
