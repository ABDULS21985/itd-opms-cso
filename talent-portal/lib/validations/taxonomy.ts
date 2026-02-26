import { z } from "zod";

// ──────────────────────────────────────────────
// Skill
// ──────────────────────────────────────────────

export const skillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  slug: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────────
// Track
// ──────────────────────────────────────────────

export const trackSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  slug: z.string().max(200).optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
});

export const updateTrackSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────────
// Cohort
// ──────────────────────────────────────────────

export const cohortSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
    programCycle: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    capacity: z.coerce.number().int().min(0, "Must be 0 or more").optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["endDate"] },
  );

export const updateCohortSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    programCycle: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    capacity: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["endDate"] },
  );

// ──────────────────────────────────────────────
// Location
// ──────────────────────────────────────────────

export const locationSchema = z.object({
  city: z.string().min(1, "City is required").max(200),
  country: z.string().min(1, "Country is required").max(100),
  countryCode: z.string().max(10).optional(),
  timezone: z.string().optional(),
});

export const updateLocationSchema = z.object({
  city: z.string().min(1).max(200).optional(),
  country: z.string().min(1).max(100).optional(),
  countryCode: z.string().max(10).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────────
// Merge Skills
// ──────────────────────────────────────────────

export const mergeSkillsSchema = z.object({
  sourceIds: z.array(z.string().uuid()).min(2, "Select at least 2 skills to merge"),
  targetName: z.string().min(1, "Target name is required").max(100),
  targetCategory: z.string().max(100).optional(),
});

// ──────────────────────────────────────────────
// Reorder
// ──────────────────────────────────────────────

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0),
    }),
  ),
});

// ──────────────────────────────────────────────
// Bulk Import
// ──────────────────────────────────────────────

export const bulkImportSkillsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        category: z.string().max(100).optional(),
      }),
    )
    .min(1, "At least 1 skill is required"),
});

// ──────────────────────────────────────────────
// Type Inference Helpers
// ──────────────────────────────────────────────

export type SkillFormData = z.infer<typeof skillSchema>;
export type TrackFormData = z.infer<typeof trackSchema>;
export type CohortFormData = z.infer<typeof cohortSchema>;
export type LocationFormData = z.infer<typeof locationSchema>;
export type MergeSkillsFormData = z.infer<typeof mergeSkillsSchema>;
export type ReorderFormData = z.infer<typeof reorderSchema>;
