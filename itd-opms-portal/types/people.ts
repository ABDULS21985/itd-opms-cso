/* ====================================================================== */
/*  People & Workforce Types                                               */
/* ====================================================================== */

export interface SkillCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  id: string;
  tenantId: string;
  userId: string;
  skillId: string;
  proficiencyLevel: string;
  certified: boolean;
  certificationName?: string;
  certificationExpiry?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSkillRequirement {
  id: string;
  tenantId: string;
  roleType: string;
  skillId: string;
  requiredLevel: string;
  createdAt: string;
}

export interface SkillGapEntry {
  skillName: string;
  requiredLevel: string;
  currentLevel: string;
}

export interface PeopleChecklistTemplate {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  roleType?: string;
  tasks: Array<{ title: string; description?: string; assigneeRole?: string; dueDays?: number; required?: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PeopleChecklist {
  id: string;
  tenantId: string;
  templateId?: string;
  userId: string;
  type: string;
  status: string;
  completionPct: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTask {
  id: string;
  checklistId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  evidenceDocId?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Roster {
  id: string;
  tenantId: string;
  teamId?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  shifts: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRecord {
  id: string;
  tenantId: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityAllocation {
  id: string;
  tenantId: string;
  userId: string;
  projectId?: string;
  allocationPct: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  provider?: string;
  type: string;
  status: string;
  completedAt?: string;
  expiryDate?: string;
  certificateDocId?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}
