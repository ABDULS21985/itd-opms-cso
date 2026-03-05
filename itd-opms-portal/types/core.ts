/* =============================================================================
   Core TypeScript Types — ITD-OPMS Portal
   ============================================================================= */

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  tenantName?: string;
  avatarUrl?: string;
  photoUrl?: string;
  department?: string;
  jobTitle?: string;
  office?: string;
  unit?: string;
  phone?: string;
  orgUnitId?: string;
  orgLevel?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  tenantId: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
  message?: string;
}

/* =============================================================================
   Notification Types
   ============================================================================= */

export interface Notification {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  channelPreferences: Record<string, boolean>;
  digestFrequency: "immediate" | "daily" | "weekly";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  disabledTypes: string[];
}
