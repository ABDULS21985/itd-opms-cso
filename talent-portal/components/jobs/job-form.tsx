"use client";

import { useState } from "react";
import {
  Briefcase,
  DollarSign,
  MapPin,
  Calendar,
  Loader2,
  Save,
} from "lucide-react";
import type { JobPost } from "@/types/job";
import { JobType, ExperienceLevel } from "@/types/job";
import { WorkMode } from "@/types/candidate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobFormData {
  title: string;
  description: string;
  responsibilities: string;
  jobType: JobType;
  workMode: WorkMode;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceLevel: ExperienceLevel | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  applicationDeadline: string;
  hiringProcess: string;
}

interface JobFormProps {
  job?: JobPost;
  onSubmit: (data: JobFormData) => void | Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(data: JobFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.title.trim()) errors.title = "Job title is required";
  if (!data.description.trim()) errors.description = "Description is required";
  if (
    data.salaryMin != null &&
    data.salaryMax != null &&
    data.salaryMin > data.salaryMax
  ) {
    errors.salaryMin = "Min salary cannot exceed max salary";
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobForm({ job, onSubmit, loading = false }: JobFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    title: job?.title ?? "",
    description: job?.description ?? "",
    responsibilities: job?.responsibilities ?? "",
    jobType: job?.jobType ?? JobType.FULL_TIME,
    workMode: job?.workMode ?? WorkMode.REMOTE,
    location: job?.location ?? "",
    salaryMin: job?.salaryMin ?? null,
    salaryMax: job?.salaryMax ?? null,
    salaryCurrency: job?.salaryCurrency ?? "USD",
    experienceLevel: job?.experienceLevel ?? null,
    requiredSkills:
      job?.jobSkills
        ?.filter((js) => js.isRequired)
        .map((js) => js.skill?.name ?? "") ?? [],
    niceToHaveSkills: job?.niceToHaveSkills ?? [],
    applicationDeadline: job?.applicationDeadline ?? "",
    hiringProcess: job?.hiringProcess ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(key: keyof JobFormData, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formData);
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

  const selectClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";

  const errorClass = "mt-1 text-xs text-[var(--error)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          {job ? "Edit Job Posting" : "Create Job Posting"}
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Fill in the details for this job posting.
        </p>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            Job Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Senior Frontend Developer"
            className={inputClass}
          />
          {errors.title && <p className={errorClass}>{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the role, company, and what success looks like..."
            rows={6}
            className={inputClass}
          />
          {errors.description && (
            <p className={errorClass}>{errors.description}</p>
          )}
        </div>

        {/* Responsibilities */}
        <div>
          <label htmlFor="responsibilities" className={labelClass}>
            Responsibilities
          </label>
          <textarea
            id="responsibilities"
            value={formData.responsibilities}
            onChange={(e) => updateField("responsibilities", e.target.value)}
            placeholder="Key responsibilities for this role..."
            rows={4}
            className={inputClass}
          />
        </div>

        {/* Job type + Work mode + Experience */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="jobType" className={labelClass}>
              Job Type
            </label>
            <select
              id="jobType"
              value={formData.jobType}
              onChange={(e) =>
                updateField("jobType", e.target.value as JobType)
              }
              className={selectClass}
            >
              <option value={JobType.FULL_TIME}>Full-Time</option>
              <option value={JobType.PART_TIME}>Part-Time</option>
              <option value={JobType.CONTRACT}>Contract</option>
              <option value={JobType.INTERNSHIP}>Internship</option>
            </select>
          </div>
          <div>
            <label htmlFor="workMode" className={labelClass}>
              Work Mode
            </label>
            <select
              id="workMode"
              value={formData.workMode}
              onChange={(e) =>
                updateField("workMode", e.target.value as WorkMode)
              }
              className={selectClass}
            >
              <option value={WorkMode.REMOTE}>Remote</option>
              <option value={WorkMode.HYBRID}>Hybrid</option>
              <option value={WorkMode.ON_SITE}>On-site</option>
            </select>
          </div>
          <div>
            <label htmlFor="experienceLevel" className={labelClass}>
              Experience Level
            </label>
            <select
              id="experienceLevel"
              value={formData.experienceLevel ?? ""}
              onChange={(e) =>
                updateField(
                  "experienceLevel",
                  e.target.value ? (e.target.value as ExperienceLevel) : null,
                )
              }
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value={ExperienceLevel.ENTRY}>Entry Level</option>
              <option value={ExperienceLevel.MID}>Mid Level</option>
              <option value={ExperienceLevel.SENIOR}>Senior Level</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="Lagos, Nigeria or Remote"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* Salary */}
        <div className="rounded-lg bg-[var(--surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <DollarSign className="h-4 w-4 text-[var(--primary)]" />
            Salary Range
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="salaryMin" className={labelClass}>
                Minimum
              </label>
              <input
                id="salaryMin"
                type="number"
                min={0}
                value={formData.salaryMin ?? ""}
                onChange={(e) =>
                  updateField(
                    "salaryMin",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                placeholder="50000"
                className={inputClass}
              />
              {errors.salaryMin && (
                <p className={errorClass}>{errors.salaryMin}</p>
              )}
            </div>
            <div>
              <label htmlFor="salaryMax" className={labelClass}>
                Maximum
              </label>
              <input
                id="salaryMax"
                type="number"
                min={0}
                value={formData.salaryMax ?? ""}
                onChange={(e) =>
                  updateField(
                    "salaryMax",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                placeholder="100000"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="salaryCurrency" className={labelClass}>
                Currency
              </label>
              <select
                id="salaryCurrency"
                value={formData.salaryCurrency}
                onChange={(e) =>
                  updateField("salaryCurrency", e.target.value)
                }
                className={selectClass}
              >
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="requiredSkills" className={labelClass}>
              Required Skills
            </label>
            <input
              id="requiredSkills"
              type="text"
              value={formData.requiredSkills.join(", ")}
              onChange={(e) =>
                updateField(
                  "requiredSkills",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="React, TypeScript (comma separated)"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[var(--neutral-gray)]">
              Separate skills with commas
            </p>
          </div>
          <div>
            <label htmlFor="niceToHaveSkills" className={labelClass}>
              Nice-to-Have Skills
            </label>
            <input
              id="niceToHaveSkills"
              type="text"
              value={formData.niceToHaveSkills.join(", ")}
              onChange={(e) =>
                updateField(
                  "niceToHaveSkills",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="GraphQL, Docker (comma separated)"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[var(--neutral-gray)]">
              Separate skills with commas
            </p>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="applicationDeadline" className={labelClass}>
            Application Deadline
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
            <input
              id="applicationDeadline"
              type="date"
              value={formData.applicationDeadline}
              onChange={(e) =>
                updateField("applicationDeadline", e.target.value)
              }
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* Hiring Process */}
        <div>
          <label htmlFor="hiringProcess" className={labelClass}>
            Hiring Process
          </label>
          <textarea
            id="hiringProcess"
            value={formData.hiringProcess}
            onChange={(e) => updateField("hiringProcess", e.target.value)}
            placeholder="Describe the hiring steps (e.g., application review, technical interview, final interview)..."
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--surface-3)] pt-6">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {job ? "Update Job" : "Create Job"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
