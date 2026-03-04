import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPut,
  mockPatch,
  mockDelete,
  paginatedMeta,
} from "./hook-test-utils";
import {
  useSkillCategories,
  useSkillCategory,
  useCreateSkillCategory,
  useUpdateSkillCategory,
  useDeleteSkillCategory,
  useSkills,
  useSkill,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  useUserSkills,
  useUsersBySkill,
  useCreateUserSkill,
  useUpdateUserSkill,
  useDeleteUserSkill,
  useVerifyUserSkill,
  useRoleSkillRequirements,
  useCreateRoleSkillRequirement,
  useDeleteRoleSkillRequirement,
  useSkillGapAnalysis,
  useChecklistTemplates,
  useChecklistTemplate,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useDeleteChecklistTemplate,
  useChecklists,
  useChecklist,
  useCreateChecklist,
  useUpdateChecklistStatus,
  useDeleteChecklist,
  useChecklistTasks,
  useCreateChecklistTask,
  useUpdateChecklistTask,
  useCompleteChecklistTask,
  useDeleteChecklistTask,
  useRosters,
  useRoster,
  useCreateRoster,
  useUpdateRoster,
  useLeaveRecords,
  useLeaveRecord,
  useCreateLeaveRecord,
  useUpdateLeaveRecordStatus,
  useDeleteLeaveRecord,
  useCapacityAllocations,
  useCreateCapacityAllocation,
  useUpdateCapacityAllocation,
  useDeleteCapacityAllocation,
  useTrainingRecords,
  useTrainingRecord,
  useExpiringCertifications,
  useCreateTrainingRecord,
  useUpdateTrainingRecord,
  useDeleteTrainingRecord,
} from "@/hooks/use-people";

/* ================================================================== */
/*  Skills                                                             */
/* ================================================================== */

describe("useSkillCategories", () => {
  it("fetches skill categories", async () => {
    const cat = { id: "sc-1", name: "Programming" };
    server.use(mockGet("/people/skills/categories", [cat]));

    const { result } = renderHook(() => useSkillCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([cat]);
  });
});

describe("useSkillCategory", () => {
  it("fetches a single skill category", async () => {
    const cat = { id: "sc-1", name: "Programming" };
    server.use(mockGet("/people/skills/categories/sc-1", cat));

    const { result } = renderHook(() => useSkillCategory("sc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cat);
  });
});

describe("useCreateSkillCategory", () => {
  it("calls POST /people/skills/categories", async () => {
    server.use(mockPost("/people/skills/categories", { id: "sc-2" }));

    const { result } = renderHook(() => useCreateSkillCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Design" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateSkillCategory", () => {
  it("calls PUT /people/skills/categories/{id}", async () => {
    server.use(mockPut("/people/skills/categories/sc-1", { id: "sc-1" }));

    const { result } = renderHook(() => useUpdateSkillCategory("sc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSkillCategory", () => {
  it("calls DELETE /people/skills/categories/{id}", async () => {
    server.use(mockDelete("/people/skills/categories/sc-1"));

    const { result } = renderHook(() => useDeleteSkillCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("sc-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSkills", () => {
  it("fetches paginated skills", async () => {
    const skill = { id: "sk-1", name: "Go" };
    server.use(mockGet("/people/skills", [skill], paginatedMeta));

    const { result } = renderHook(() => useSkills(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useSkill", () => {
  it("fetches a single skill", async () => {
    const skill = { id: "sk-1", name: "Go" };
    server.use(mockGet("/people/skills/sk-1", skill));

    const { result } = renderHook(() => useSkill("sk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(skill);
  });
});

describe("useCreateSkill", () => {
  it("calls POST /people/skills", async () => {
    server.use(mockPost("/people/skills", { id: "sk-2" }));

    const { result } = renderHook(() => useCreateSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Python" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateSkill", () => {
  it("calls PUT /people/skills/{id}", async () => {
    server.use(mockPut("/people/skills/sk-1", { id: "sk-1" }));

    const { result } = renderHook(() => useUpdateSkill("sk-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSkill", () => {
  it("calls DELETE /people/skills/{id}", async () => {
    server.use(mockDelete("/people/skills/sk-1"));

    const { result } = renderHook(() => useDeleteSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("sk-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUserSkills", () => {
  it("fetches user skills", async () => {
    const skills = [{ id: "us-1", skillId: "sk-1", level: 3 }];
    server.use(mockGet("/people/skills/user-skills/u-1", skills));

    const { result } = renderHook(() => useUserSkills("u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(skills);
  });
});

describe("useUsersBySkill", () => {
  it("fetches users by skill", async () => {
    const users = [{ userId: "u-1", level: 3 }];
    server.use(mockGet("/people/skills/user-skills/by-skill/sk-1", users));

    const { result } = renderHook(() => useUsersBySkill("sk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateUserSkill", () => {
  it("calls POST /people/skills/users", async () => {
    server.use(mockPost("/people/skills/user-skills", { id: "us-2" }));

    const { result } = renderHook(() => useCreateUserSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", skillId: "sk-1", level: 2 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateUserSkill", () => {
  it("calls PUT /people/skills/users/{id}", async () => {
    server.use(mockPut("/people/skills/user-skills/us-1", { id: "us-1" }));

    const { result } = renderHook(() => useUpdateUserSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "us-1", level: 4 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteUserSkill", () => {
  it("calls DELETE /people/skills/users/{id}", async () => {
    server.use(mockDelete("/people/skills/user-skills/us-1"));

    const { result } = renderHook(() => useDeleteUserSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("us-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useVerifyUserSkill", () => {
  it("calls PUT /people/skills/user-skills/{id}/verify", async () => {
    server.use(mockPut("/people/skills/user-skills/us-1/verify", {}));

    const { result } = renderHook(() => useVerifyUserSkill(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("us-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRoleSkillRequirements", () => {
  it("fetches role skill requirements", async () => {
    const reqs = [{ id: "rsr-1", skillId: "sk-1", minLevel: 3 }];
    server.use(mockGet("/people/skills/requirements/engineer", reqs));

    const { result } = renderHook(() => useRoleSkillRequirements("engineer"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(reqs);
  });
});

describe("useCreateRoleSkillRequirement", () => {
  it("calls POST /people/skills/roles/requirements", async () => {
    server.use(mockPost("/people/skills/requirements", { id: "rsr-2" }));

    const { result } = renderHook(() => useCreateRoleSkillRequirement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roleType: "engineer", skillId: "sk-1", minLevel: 2 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRoleSkillRequirement", () => {
  it("calls DELETE /people/skills/roles/requirements/{id}", async () => {
    server.use(mockDelete("/people/skills/requirements/rsr-1"));

    const { result } = renderHook(() => useDeleteRoleSkillRequirement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("rsr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSkillGapAnalysis", () => {
  it("fetches skill gap analysis", async () => {
    const analysis = [{ skillId: "sk-1", gap: 2 }];
    server.use(mockGet("/people/skills/requirements/engineer/gap/u-1", analysis));

    const { result } = renderHook(() => useSkillGapAnalysis("engineer", "u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(analysis);
  });
});

/* ================================================================== */
/*  Checklists                                                         */
/* ================================================================== */

describe("useChecklistTemplates", () => {
  it("fetches checklist templates", async () => {
    const template = { id: "ct-1", name: "Onboarding" };
    server.use(mockGet("/people/checklists/templates", [template]));

    const { result } = renderHook(() => useChecklistTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([template]);
  });
});

describe("useChecklistTemplate", () => {
  it("fetches a single checklist template", async () => {
    const template = { id: "ct-1", name: "Onboarding" };
    server.use(mockGet("/people/checklists/templates/ct-1", template));

    const { result } = renderHook(() => useChecklistTemplate("ct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(template);
  });
});

describe("useCreateChecklistTemplate", () => {
  it("calls POST /people/checklists/templates", async () => {
    server.use(mockPost("/people/checklists/templates", { id: "ct-2" }));

    const { result } = renderHook(() => useCreateChecklistTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Offboarding" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateChecklistTemplate", () => {
  it("calls PUT /people/checklists/templates/{id}", async () => {
    server.use(mockPut("/people/checklists/templates/ct-1", { id: "ct-1" }));

    const { result } = renderHook(() => useUpdateChecklistTemplate("ct-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteChecklistTemplate", () => {
  it("calls DELETE /people/checklists/templates/{id}", async () => {
    server.use(mockDelete("/people/checklists/templates/ct-1"));

    const { result } = renderHook(() => useDeleteChecklistTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ct-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useChecklists", () => {
  it("fetches paginated checklists", async () => {
    const cl = { id: "cl-1", status: "in_progress" };
    server.use(mockGet("/people/checklists", [cl], paginatedMeta));

    const { result } = renderHook(() => useChecklists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useChecklist", () => {
  it("fetches a single checklist", async () => {
    const cl = { id: "cl-1", status: "in_progress" };
    server.use(mockGet("/people/checklists/cl-1", cl));

    const { result } = renderHook(() => useChecklist("cl-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cl);
  });
});

describe("useCreateChecklist", () => {
  it("calls POST /people/checklists", async () => {
    server.use(mockPost("/people/checklists", { id: "cl-2" }));

    const { result } = renderHook(() => useCreateChecklist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ templateId: "ct-1", userId: "u-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateChecklistStatus", () => {
  it("calls PUT /people/checklists/{id}/status", async () => {
    server.use(mockPut("/people/checklists/cl-1/status", { id: "cl-1" }));

    const { result } = renderHook(() => useUpdateChecklistStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "cl-1", status: "completed" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteChecklist", () => {
  it("calls DELETE /people/checklists/{id}", async () => {
    server.use(mockDelete("/people/checklists/cl-1"));

    const { result } = renderHook(() => useDeleteChecklist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("cl-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useChecklistTasks", () => {
  it("fetches checklist tasks", async () => {
    const tasks = [{ id: "task-1", title: "Set up email" }];
    server.use(mockGet("/people/checklists/tasks/cl-1", tasks));

    const { result } = renderHook(() => useChecklistTasks("cl-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tasks);
  });
});

describe("useCreateChecklistTask", () => {
  it("calls POST /people/checklists/tasks", async () => {
    server.use(mockPost("/people/checklists/tasks", { id: "task-2" }));

    const { result } = renderHook(() => useCreateChecklistTask(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ checklistId: "cl-1", title: "New Task" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateChecklistTask", () => {
  it("calls PUT /people/checklists/tasks/item/{id}", async () => {
    server.use(mockPut("/people/checklists/tasks/item/task-1", { id: "task-1" }));

    const { result } = renderHook(() => useUpdateChecklistTask(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "task-1", title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCompleteChecklistTask", () => {
  it("calls PUT /people/checklists/tasks/item/{id}/complete", async () => {
    server.use(mockPut("/people/checklists/tasks/item/task-1/complete", {}));

    const { result } = renderHook(() => useCompleteChecklistTask(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("task-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteChecklistTask", () => {
  it("calls DELETE /people/checklists/tasks/item/{id}", async () => {
    server.use(mockDelete("/people/checklists/tasks/item/task-1"));

    const { result } = renderHook(() => useDeleteChecklistTask(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("task-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Rosters & Leave                                                    */
/* ================================================================== */

describe("useRosters", () => {
  it("fetches paginated rosters", async () => {
    const roster = { id: "ros-1", name: "On-Call" };
    server.use(mockGet("/people/rosters", [roster], paginatedMeta));

    const { result } = renderHook(() => useRosters(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useRoster", () => {
  it("fetches a single roster", async () => {
    const roster = { id: "ros-1", name: "On-Call" };
    server.use(mockGet("/people/rosters/ros-1", roster));

    const { result } = renderHook(() => useRoster("ros-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(roster);
  });
});

describe("useCreateRoster", () => {
  it("calls POST /people/rosters", async () => {
    server.use(mockPost("/people/rosters", { id: "ros-2" }));

    const { result } = renderHook(() => useCreateRoster(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Standby" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRoster", () => {
  it("calls PUT /people/rosters/{id}", async () => {
    server.use(mockPut("/people/rosters/ros-1", { id: "ros-1" }));

    const { result } = renderHook(() => useUpdateRoster("ros-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLeaveRecords", () => {
  it("fetches paginated leave records", async () => {
    const leave = { id: "lr-1", type: "annual" };
    server.use(mockGet("/people/leave", [leave], paginatedMeta));

    const { result } = renderHook(() => useLeaveRecords(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useLeaveRecord", () => {
  it("fetches a single leave record", async () => {
    const leave = { id: "lr-1", type: "annual" };
    server.use(mockGet("/people/leave/lr-1", leave));

    const { result } = renderHook(() => useLeaveRecord("lr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(leave);
  });
});

describe("useCreateLeaveRecord", () => {
  it("calls POST /people/leave", async () => {
    server.use(mockPost("/people/leave", { id: "lr-2" }));

    const { result } = renderHook(() => useCreateLeaveRecord(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", type: "sick" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateLeaveRecordStatus", () => {
  it("calls PUT /people/leave/{id}/status", async () => {
    server.use(mockPut("/people/leave/lr-1/status", { id: "lr-1" }));

    const { result } = renderHook(() => useUpdateLeaveRecordStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "lr-1", status: "approved" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteLeaveRecord", () => {
  it("calls DELETE /people/leave/{id}", async () => {
    server.use(mockDelete("/people/leave/lr-1"));

    const { result } = renderHook(() => useDeleteLeaveRecord(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("lr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Capacity & Training                                                */
/* ================================================================== */

describe("useCapacityAllocations", () => {
  it("fetches capacity allocations", async () => {
    const alloc = { id: "ca-1", percentage: 50 };
    server.use(mockGet("/people/capacity", [alloc]));

    const { result } = renderHook(() => useCapacityAllocations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([alloc]);
  });
});

describe("useCreateCapacityAllocation", () => {
  it("calls POST /people/capacity", async () => {
    server.use(mockPost("/people/capacity", { id: "ca-2" }));

    const { result } = renderHook(() => useCreateCapacityAllocation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", projectId: "p-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCapacityAllocation", () => {
  it("calls PUT /people/capacity/{id}", async () => {
    server.use(mockPut("/people/capacity/ca-1", { id: "ca-1" }));

    const { result } = renderHook(() => useUpdateCapacityAllocation("ca-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ percentage: 75 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCapacityAllocation", () => {
  it("calls DELETE /people/capacity/{id}", async () => {
    server.use(mockDelete("/people/capacity/ca-1"));

    const { result } = renderHook(() => useDeleteCapacityAllocation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ca-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTrainingRecords", () => {
  it("fetches paginated training records", async () => {
    const record = { id: "tr-1", course: "AWS Cert" };
    server.use(mockGet("/people/training", [record], paginatedMeta));

    const { result } = renderHook(() => useTrainingRecords(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useTrainingRecord", () => {
  it("fetches a single training record", async () => {
    const record = { id: "tr-1", course: "AWS Cert" };
    server.use(mockGet("/people/training/tr-1", record));

    const { result } = renderHook(() => useTrainingRecord("tr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(record);
  });
});

describe("useExpiringCertifications", () => {
  it("fetches expiring certifications", async () => {
    const certs = [{ id: "tr-1", expiresAt: "2026-04-01" }];
    server.use(mockGet("/people/training/expiring", certs));

    const { result } = renderHook(() => useExpiringCertifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(certs);
  });
});

describe("useCreateTrainingRecord", () => {
  it("calls POST /people/training", async () => {
    server.use(mockPost("/people/training", { id: "tr-2" }));

    const { result } = renderHook(() => useCreateTrainingRecord(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ course: "GCP Cert" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateTrainingRecord", () => {
  it("calls PUT /people/training/{id}", async () => {
    server.use(mockPut("/people/training/tr-1", { id: "tr-1" }));

    const { result } = renderHook(() => useUpdateTrainingRecord("tr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ course: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteTrainingRecord", () => {
  it("calls DELETE /people/training/{id}", async () => {
    server.use(mockDelete("/people/training/tr-1"));

    const { result } = renderHook(() => useDeleteTrainingRecord(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("tr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
