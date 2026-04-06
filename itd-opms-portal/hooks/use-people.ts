import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  SkillCategory,
  Skill,
  UserSkill,
  RoleSkillRequirement,
  SkillGapEntry,
  PeopleChecklistTemplate,
  PeopleChecklist,
  ChecklistTask,
  Roster,
  LeaveRecord,
  CapacityAllocation,
  TrainingRecord,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Skill Categories — Queries                                          */
/* ================================================================== */

/**
 * GET /people/skills/categories - list skill categories.
 */
export function useSkillCategories(parentId?: string) {
  return useQuery({
    queryKey: ["skill-categories", parentId],
    queryFn: () =>
      apiClient.get<SkillCategory[]>("/people/skills/categories", {
        parent_id: parentId,
      }),
  });
}

/**
 * GET /people/skills/categories/{id} - single skill category.
 */
export function useSkillCategory(id: string | undefined) {
  return useQuery({
    queryKey: ["skill-category", id],
    queryFn: () =>
      apiClient.get<SkillCategory>(`/people/skills/categories/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Skill Categories — Mutations                                        */
/* ================================================================== */

/**
 * POST /people/skills/categories - create a skill category.
 */
export function useCreateSkillCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SkillCategory>) =>
      apiClient.post<SkillCategory>("/people/skills/categories", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast.success("Skill category created successfully");
    },
    onError: () => {
      toast.error("Failed to create skill category");
    },
  });
}

/**
 * PUT /people/skills/categories/{id} - update a skill category.
 */
export function useUpdateSkillCategory(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SkillCategory>) =>
      apiClient.put<SkillCategory>(`/people/skills/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      queryClient.invalidateQueries({ queryKey: ["skill-category", id] });
      toast.success("Skill category updated successfully");
    },
    onError: () => {
      toast.error("Failed to update skill category");
    },
  });
}

/**
 * DELETE /people/skills/categories/{id} - delete a skill category.
 */
export function useDeleteSkillCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/skills/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast.success("Skill category deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete skill category");
    },
  });
}

/* ================================================================== */
/*  Skills — Queries                                                    */
/* ================================================================== */

/**
 * GET /people/skills - paginated list of skills.
 */
export function useSkills(page = 1, limit = 20, categoryId?: string) {
  return useQuery({
    queryKey: ["skills", page, limit, categoryId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Skill>>("/people/skills", {
        page,
        limit,
        category_id: categoryId,
      }),
  });
}

/**
 * GET /people/skills/{id} - single skill detail.
 */
export function useSkill(id: string | undefined) {
  return useQuery({
    queryKey: ["skill", id],
    queryFn: () => apiClient.get<Skill>(`/people/skills/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Skills — Mutations                                                  */
/* ================================================================== */

/**
 * POST /people/skills - create a skill.
 */
export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Skill>) =>
      apiClient.post<Skill>("/people/skills", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill created successfully");
    },
    onError: () => {
      toast.error("Failed to create skill");
    },
  });
}

/**
 * PUT /people/skills/{id} - update a skill.
 */
export function useUpdateSkill(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Skill>) =>
      apiClient.put<Skill>(`/people/skills/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skill", id] });
      toast.success("Skill updated successfully");
    },
    onError: () => {
      toast.error("Failed to update skill");
    },
  });
}

/**
 * DELETE /people/skills/{id} - delete a skill.
 */
export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/people/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete skill");
    },
  });
}

/* ================================================================== */
/*  User Skills — Queries                                               */
/* ================================================================== */

/**
 * GET /people/skills/user-skills/{userId} - skills for a user.
 */
export function useUserSkills(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-skills", userId],
    queryFn: () =>
      apiClient.get<UserSkill[]>(`/people/skills/user-skills/${userId}`),
    enabled: !!userId,
  });
}

/**
 * GET /people/skills/user-skills/by-skill/{skillId} - users with a skill.
 */
export function useUsersBySkill(
  skillId: string | undefined,
  proficiency?: string,
) {
  return useQuery({
    queryKey: ["users-by-skill", skillId, proficiency],
    queryFn: () =>
      apiClient.get<UserSkill[]>(
        `/people/skills/user-skills/by-skill/${skillId}`,
        { proficiency },
      ),
    enabled: !!skillId,
  });
}

/* ================================================================== */
/*  User Skills — Mutations                                             */
/* ================================================================== */

/**
 * POST /people/skills/user-skills - create a user skill.
 */
export function useCreateUserSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UserSkill>) =>
      apiClient.post<UserSkill>("/people/skills/user-skills", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-skills", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["users-by-skill"] });
      toast.success("User skill added successfully");
    },
    onError: () => {
      toast.error("Failed to add user skill");
    },
  });
}

/**
 * PUT /people/skills/user-skills/{id} - update a user skill.
 */
export function useUpdateUserSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<UserSkill> & { id: string }) =>
      apiClient.put<UserSkill>(`/people/skills/user-skills/${id}`, body),
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["users-by-skill"] });
      toast.success("User skill updated successfully");
    },
    onError: () => {
      toast.error("Failed to update user skill");
    },
  });
}

/**
 * DELETE /people/skills/user-skills/{id} - delete a user skill.
 */
export function useDeleteUserSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/skills/user-skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["users-by-skill"] });
      toast.success("User skill removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove user skill");
    },
  });
}

/**
 * PUT /people/skills/user-skills/{id}/verify - verify a user skill.
 */
export function useVerifyUserSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put(`/people/skills/user-skills/${id}/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["users-by-skill"] });
      toast.success("User skill verified");
    },
    onError: () => {
      toast.error("Failed to verify user skill");
    },
  });
}

/* ================================================================== */
/*  Skill Requirements — Queries                                        */
/* ================================================================== */

/**
 * GET /people/skills/requirements/{roleType} - skill requirements for a role.
 */
export function useRoleSkillRequirements(roleType: string | undefined) {
  return useQuery({
    queryKey: ["role-skill-requirements", roleType],
    queryFn: () =>
      apiClient.get<RoleSkillRequirement[]>(
        `/people/skills/requirements/${roleType}`,
      ),
    enabled: !!roleType,
  });
}

/* ================================================================== */
/*  Skill Requirements — Mutations                                      */
/* ================================================================== */

/**
 * POST /people/skills/requirements - create a role skill requirement.
 */
export function useCreateRoleSkillRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RoleSkillRequirement>) =>
      apiClient.post<RoleSkillRequirement>(
        "/people/skills/requirements",
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["role-skill-requirements", variables.roleType],
      });
      toast.success("Skill requirement added");
    },
    onError: () => {
      toast.error("Failed to add skill requirement");
    },
  });
}

/**
 * DELETE /people/skills/requirements/{id} - delete a role skill requirement.
 */
export function useDeleteRoleSkillRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/skills/requirements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["role-skill-requirements"],
      });
      toast.success("Skill requirement removed");
    },
    onError: () => {
      toast.error("Failed to remove skill requirement");
    },
  });
}

/* ================================================================== */
/*  Skill Gap Analysis                                                  */
/* ================================================================== */

/**
 * GET /people/skills/requirements/{roleType}/gap/{userId} - gap analysis.
 */
export function useSkillGapAnalysis(
  roleType: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["skill-gap-analysis", roleType, userId],
    queryFn: () =>
      apiClient.get<SkillGapEntry[]>(
        `/people/skills/requirements/${roleType}/gap/${userId}`,
      ),
    enabled: !!roleType && !!userId,
  });
}

/* ================================================================== */
/*  Checklist Templates — Queries                                       */
/* ================================================================== */

/**
 * GET /people/checklists/templates - list checklist templates.
 */
export function useChecklistTemplates(type?: string, roleType?: string) {
  return useQuery({
    queryKey: ["checklist-templates", type, roleType],
    queryFn: () =>
      apiClient.get<PeopleChecklistTemplate[]>(
        "/people/checklists/templates",
        { type, role_type: roleType },
      ),
  });
}

/**
 * GET /people/checklists/templates/{id} - single checklist template.
 */
export function useChecklistTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["checklist-template", id],
    queryFn: () =>
      apiClient.get<PeopleChecklistTemplate>(
        `/people/checklists/templates/${id}`,
      ),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Checklist Templates — Mutations                                     */
/* ================================================================== */

/**
 * POST /people/checklists/templates - create a checklist template.
 */
export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PeopleChecklistTemplate>) =>
      apiClient.post<PeopleChecklistTemplate>(
        "/people/checklists/templates",
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast.success("Checklist template created successfully");
    },
    onError: () => {
      toast.error("Failed to create checklist template");
    },
  });
}

/**
 * PUT /people/checklists/templates/{id} - update a checklist template.
 */
export function useUpdateChecklistTemplate(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PeopleChecklistTemplate>) =>
      apiClient.put<PeopleChecklistTemplate>(
        `/people/checklists/templates/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-template", id] });
      toast.success("Checklist template updated successfully");
    },
    onError: () => {
      toast.error("Failed to update checklist template");
    },
  });
}

/**
 * DELETE /people/checklists/templates/{id} - delete a checklist template.
 */
export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/checklists/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast.success("Checklist template deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete checklist template");
    },
  });
}

/* ================================================================== */
/*  Checklists — Queries                                                */
/* ================================================================== */

/**
 * GET /people/checklists - paginated list of checklists.
 */
export function useChecklists(
  page = 1,
  limit = 20,
  type?: string,
  status?: string,
  userId?: string,
) {
  return useQuery({
    queryKey: ["people-checklists", page, limit, type, status, userId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PeopleChecklist>>(
        "/people/checklists",
        { page, limit, type, status, user_id: userId },
      ),
  });
}

/**
 * GET /people/checklists/{id} - single checklist detail.
 */
export function useChecklist(id: string | undefined) {
  return useQuery({
    queryKey: ["people-checklist", id],
    queryFn: () =>
      apiClient.get<PeopleChecklist>(`/people/checklists/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Checklists — Mutations                                              */
/* ================================================================== */

/**
 * POST /people/checklists - create a checklist.
 */
export function useCreateChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PeopleChecklist>) =>
      apiClient.post<PeopleChecklist>("/people/checklists", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Checklist created successfully");
    },
    onError: () => {
      toast.error("Failed to create checklist");
    },
  });
}

/**
 * PUT /people/checklists/{id}/status - update checklist status.
 */
export function useUpdateChecklistStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const payload: Record<string, unknown> = { status };
      if (status === "in_progress") payload.startedAt = new Date().toISOString();
      if (status === "completed") payload.completedAt = new Date().toISOString();
      return apiClient.put(`/people/checklists/${id}/status`, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      queryClient.invalidateQueries({
        queryKey: ["people-checklist", variables.id],
      });
      toast.success("Checklist status updated");
    },
    onError: () => {
      toast.error("Failed to update checklist status");
    },
  });
}

/**
 * DELETE /people/checklists/{id} - delete a checklist.
 */
export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/checklists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Checklist deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete checklist");
    },
  });
}

/* ================================================================== */
/*  Checklist Tasks — Queries                                           */
/* ================================================================== */

/**
 * GET /people/checklists/tasks/{checklistId} - tasks for a checklist.
 */
export function useChecklistTasks(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-tasks", checklistId],
    queryFn: () =>
      apiClient.get<ChecklistTask[]>(
        `/people/checklists/tasks/${checklistId}`,
      ),
    enabled: !!checklistId,
  });
}

/* ================================================================== */
/*  Checklist Tasks — Mutations                                         */
/* ================================================================== */

/**
 * POST /people/checklists/tasks - create a checklist task.
 */
export function useCreateChecklistTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ChecklistTask>) =>
      apiClient.post<ChecklistTask>("/people/checklists/tasks", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["checklist-tasks", variables.checklistId],
      });
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Task added successfully");
    },
    onError: () => {
      toast.error("Failed to add task");
    },
  });
}

/**
 * PUT /people/checklists/tasks/item/{id} - update a checklist task.
 */
export function useUpdateChecklistTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Partial<ChecklistTask> & { id: string }) =>
      apiClient.put<ChecklistTask>(
        `/people/checklists/tasks/item/${id}`,
        body,
      ),
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["checklist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Task updated successfully");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });
}

/**
 * PUT /people/checklists/tasks/item/{id}/complete - complete a checklist task.
 */
export function useCompleteChecklistTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, evidenceDocId, notes }: { id: string; evidenceDocId?: string; notes?: string }) =>
      apiClient.put(`/people/checklists/tasks/item/${id}/complete`, { evidenceDocId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Task completed");
    },
    onError: () => {
      toast.error("Failed to complete task");
    },
  });
}

/**
 * DELETE /people/checklists/tasks/item/{id} - delete a checklist task.
 */
export function useDeleteChecklistTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/people/checklists/tasks/item/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["people-checklists"] });
      toast.success("Task deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });
}

/* ================================================================== */
/*  Rosters — Queries                                                   */
/* ================================================================== */

/**
 * GET /people/rosters - paginated list of rosters.
 */
export function useRosters(
  page = 1,
  limit = 20,
  teamId?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["rosters", page, limit, teamId, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Roster>>("/people/rosters", {
        page,
        limit,
        team_id: teamId,
        status,
      }),
  });
}

/**
 * GET /people/rosters/{id} - single roster detail.
 */
export function useRoster(id: string | undefined) {
  return useQuery({
    queryKey: ["roster", id],
    queryFn: () => apiClient.get<Roster>(`/people/rosters/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Rosters — Mutations                                                 */
/* ================================================================== */

/**
 * POST /people/rosters - create a roster.
 */
export function useCreateRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Roster>) =>
      apiClient.post<Roster>("/people/rosters", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      toast.success("Roster created successfully");
    },
    onError: () => {
      toast.error("Failed to create roster");
    },
  });
}

/**
 * PUT /people/rosters/{id} - update a roster.
 */
export function useUpdateRoster(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Roster>) =>
      apiClient.put<Roster>(`/people/rosters/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      queryClient.invalidateQueries({ queryKey: ["roster", id] });
      toast.success("Roster updated successfully");
    },
    onError: () => {
      toast.error("Failed to update roster");
    },
  });
}

/* ================================================================== */
/*  Leave Records — Queries                                             */
/* ================================================================== */

/**
 * GET /people/leave - paginated list of leave records.
 */
export function useLeaveRecords(
  page = 1,
  limit = 20,
  userId?: string,
  status?: string,
  leaveType?: string,
) {
  return useQuery({
    queryKey: ["leave-records", page, limit, userId, status, leaveType],
    queryFn: () =>
      apiClient.get<PaginatedResponse<LeaveRecord>>("/people/leave", {
        page,
        limit,
        user_id: userId,
        status,
        leave_type: leaveType,
      }),
  });
}

/**
 * GET /people/leave/{id} - single leave record detail.
 */
export function useLeaveRecord(id: string | undefined) {
  return useQuery({
    queryKey: ["leave-record", id],
    queryFn: () => apiClient.get<LeaveRecord>(`/people/leave/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Leave Records — Mutations                                           */
/* ================================================================== */

/**
 * POST /people/leave - create a leave record.
 */
export function useCreateLeaveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LeaveRecord>) =>
      apiClient.post<LeaveRecord>("/people/leave", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      toast.success("Leave request submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit leave request");
    },
  });
}

/**
 * PUT /people/leave/{id}/status - update leave record status.
 */
export function useUpdateLeaveRecordStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/people/leave/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      queryClient.invalidateQueries({
        queryKey: ["leave-record", variables.id],
      });
      toast.success("Leave status updated");
    },
    onError: () => {
      toast.error("Failed to update leave status");
    },
  });
}

/**
 * DELETE /people/leave/{id} - delete a leave record.
 */
export function useDeleteLeaveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/people/leave/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      toast.success("Leave record deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete leave record");
    },
  });
}

/* ================================================================== */
/*  Capacity Allocations — Queries                                      */
/* ================================================================== */

/**
 * GET /people/capacity - paginated list of capacity allocations.
 */
export function useCapacityAllocations(
  page = 1,
  limit = 20,
  userId?: string,
  projectId?: string,
) {
  return useQuery({
    queryKey: ["capacity-allocations", page, limit, userId, projectId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CapacityAllocation>>(
        "/people/capacity",
        {
          page,
          limit,
          user_id: userId,
          project_id: projectId,
        },
      ),
  });
}

/* ================================================================== */
/*  Capacity Allocations — Mutations                                    */
/* ================================================================== */

/**
 * POST /people/capacity - create a capacity allocation.
 */
export function useCreateCapacityAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CapacityAllocation>) =>
      apiClient.post<CapacityAllocation>("/people/capacity", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Capacity allocation created successfully");
    },
    onError: () => {
      toast.error("Failed to create capacity allocation");
    },
  });
}

/**
 * PUT /people/capacity/{id} - update a capacity allocation.
 */
export function useUpdateCapacityAllocation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CapacityAllocation>) =>
      apiClient.put<CapacityAllocation>(`/people/capacity/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Capacity allocation updated successfully");
    },
    onError: () => {
      toast.error("Failed to update capacity allocation");
    },
  });
}

/**
 * DELETE /people/capacity/{id} - delete a capacity allocation.
 */
export function useDeleteCapacityAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/people/capacity/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Capacity allocation deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete capacity allocation");
    },
  });
}

/* ================================================================== */
/*  Training Records — Queries                                          */
/* ================================================================== */

/**
 * GET /people/training - paginated list of training records.
 */
export function useTrainingRecords(
  page = 1,
  limit = 20,
  userId?: string,
  type?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["training-records", page, limit, userId, type, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<TrainingRecord>>("/people/training", {
        page,
        limit,
        user_id: userId,
        type,
        status,
      }),
  });
}

/**
 * GET /people/training/{id} - single training record detail.
 */
export function useTrainingRecord(id: string | undefined) {
  return useQuery({
    queryKey: ["training-record", id],
    queryFn: () =>
      apiClient.get<TrainingRecord>(`/people/training/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /people/training/expiring - certifications expiring within N days.
 */
export function useExpiringCertifications(days = 90) {
  return useQuery({
    queryKey: ["expiring-certifications", days],
    queryFn: () =>
      apiClient.get<TrainingRecord[]>("/people/training/expiring", { days }),
  });
}

/* ================================================================== */
/*  Training Records — Mutations                                        */
/* ================================================================== */

/**
 * POST /people/training - create a training record.
 */
export function useCreateTrainingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TrainingRecord>) =>
      apiClient.post<TrainingRecord>("/people/training", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-records"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-certifications"] });
      toast.success("Training record created successfully");
    },
    onError: () => {
      toast.error("Failed to create training record");
    },
  });
}

/**
 * PUT /people/training/{id} - update a training record.
 */
export function useUpdateTrainingRecord(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TrainingRecord>) =>
      apiClient.put<TrainingRecord>(`/people/training/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-records"] });
      queryClient.invalidateQueries({ queryKey: ["training-record", id] });
      queryClient.invalidateQueries({ queryKey: ["expiring-certifications"] });
      toast.success("Training record updated successfully");
    },
    onError: () => {
      toast.error("Failed to update training record");
    },
  });
}

/**
 * DELETE /people/training/{id} - delete a training record.
 */
export function useDeleteTrainingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/people/training/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-records"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-certifications"] });
      toast.success("Training record deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete training record");
    },
  });
}
