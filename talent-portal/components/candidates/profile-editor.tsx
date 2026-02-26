"use client";

import { useState, useCallback } from "react";
import {
  User,
  Briefcase,
  FolderGit2,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import type { CandidateProfile, CandidateProject } from "@/types/candidate";
import { AvailabilityStatus, WorkMode } from "@/types/candidate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileEditorProps {
  profile?: CandidateProfile;
  onSave: (data: ProfileFormData) => void;
  onSubmit: () => void;
}

export interface ProfileFormData {
  // Step 1: Basic
  fullName: string;
  bio: string;
  photoUrl: string | null;
  city: string;
  country: string;
  timezone: string;
  // Step 2: Professional
  skills: string[];
  primaryTrackId: string;
  yearsOfExperience: number | null;
  primaryStacks: string[];
  // Step 3: Portfolio
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  projects: ProjectFormData[];
  // Step 4: Availability
  availabilityStatus: AvailabilityStatus | null;
  preferredWorkMode: WorkMode | null;
  preferredHoursStart: string;
  preferredHoursEnd: string;
}

interface ProjectFormData {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl: string;
  techStack: string[];
}

// ---------------------------------------------------------------------------
// Steps config
// ---------------------------------------------------------------------------

const steps = [
  { id: 1, label: "Basic Info", icon: User },
  { id: 2, label: "Professional", icon: Briefcase },
  { id: 3, label: "Portfolio", icon: FolderGit2 },
  { id: 4, label: "Availability", icon: Clock },
  { id: 5, label: "Review", icon: CheckCircle },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultFormData(profile?: CandidateProfile): ProfileFormData {
  return {
    fullName: profile?.fullName ?? "",
    bio: profile?.bio ?? "",
    photoUrl: profile?.photoUrl ?? null,
    city: profile?.city ?? "",
    country: profile?.country ?? "",
    timezone: profile?.timezone ?? "",
    skills: profile?.candidateSkills?.map((s) => s.skillId) ?? [],
    primaryTrackId: profile?.primaryTrackId ?? "",
    yearsOfExperience: profile?.yearsOfExperience ?? null,
    primaryStacks: profile?.primaryStacks ?? [],
    githubUrl: profile?.githubUrl ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    projects:
      profile?.candidateProjects?.map((p) => ({
        title: p.title,
        description: p.description ?? "",
        projectUrl: p.projectUrl ?? "",
        githubUrl: p.githubUrl ?? "",
        techStack: p.techStack ?? [],
      })) ?? [],
    availabilityStatus: profile?.availabilityStatus ?? null,
    preferredWorkMode: profile?.preferredWorkMode ?? null,
    preferredHoursStart: profile?.preferredHoursStart ?? "",
    preferredHoursEnd: profile?.preferredHoursEnd ?? "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileEditor({ profile, onSave, onSubmit }: ProfileEditorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProfileFormData>(() =>
    getDefaultFormData(profile),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  function validateStep(step: number): boolean {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) errs.fullName = "Name is required";
    }

    if (step === 4) {
      if (!formData.availabilityStatus)
        errs.availabilityStatus = "Availability is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep < 5) {
      onSave(formData);
      setCurrentStep(currentStep + 1);
    }
  }

  function handlePrev() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  function handleSubmit() {
    onSave(formData);
    onSubmit();
  }

  // Project management
  function addProject() {
    updateField("projects", [
      ...formData.projects,
      { title: "", description: "", projectUrl: "", githubUrl: "", techStack: [] },
    ]);
  }

  function removeProject(index: number) {
    updateField(
      "projects",
      formData.projects.filter((_, i) => i !== index),
    );
  }

  function updateProject(index: number, field: keyof ProjectFormData, value: any) {
    const updated = [...formData.projects];
    updated[index] = { ...updated[index], [field]: value };
    updateField("projects", updated);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";

  const errorClass = "mt-1 text-xs text-[var(--error)]";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress indicator */}
      <nav className="mb-8" aria-label="Profile editor steps">
        <ol className="flex items-center">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;

            return (
              <li
                key={step.id}
                className={`flex items-center ${idx < steps.length - 1 ? "flex-1" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isComplete
                        ? "bg-[var(--success)] text-white"
                        : isActive
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:block ${
                      isActive
                        ? "text-[var(--primary)]"
                        : isComplete
                          ? "text-[var(--success-dark)]"
                          : "text-[var(--neutral-gray)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-3 h-0.5 flex-1 rounded-full transition-colors ${
                      isComplete
                        ? "bg-[var(--success)]"
                        : "bg-[var(--surface-3)]"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Form card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm sm:p-8">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Basic Information
            </h2>

            <div>
              <label htmlFor="fullName" className={labelClass}>
                Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
              {errors.fullName && (
                <p className={errorClass}>{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="bio" className={labelClass}>
                Bio
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="A brief description about yourself..."
                rows={4}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Photo</label>
              <div className="flex items-center gap-4">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Profile"
                    className="h-16 w-16 rounded-xl object-cover ring-2 ring-[var(--surface-3)]"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                    <Upload className="h-6 w-6 text-[var(--neutral-gray)]" />
                  </div>
                )}
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Lagos"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Nigeria"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="timezone" className={labelClass}>
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  placeholder="Africa/Lagos"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Professional */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Professional Details
            </h2>

            <div>
              <label htmlFor="primaryTrackId" className={labelClass}>
                Primary Track
              </label>
              <input
                id="primaryTrackId"
                type="text"
                value={formData.primaryTrackId}
                onChange={(e) => updateField("primaryTrackId", e.target.value)}
                placeholder="Track ID"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="yearsOfExperience" className={labelClass}>
                Years of Experience
              </label>
              <input
                id="yearsOfExperience"
                type="number"
                min={0}
                max={50}
                value={formData.yearsOfExperience ?? ""}
                onChange={(e) =>
                  updateField(
                    "yearsOfExperience",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="primaryStacks" className={labelClass}>
                Primary Stacks
              </label>
              <input
                id="primaryStacks"
                type="text"
                value={formData.primaryStacks.join(", ")}
                onChange={(e) =>
                  updateField(
                    "primaryStacks",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="React, Node.js, TypeScript (comma separated)"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                Separate stacks with commas
              </p>
            </div>

            <div>
              <label className={labelClass}>Skills</label>
              <p className="text-xs text-[var(--neutral-gray)]">
                Skills can be managed through the skills selector on your profile
                page.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Portfolio */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Portfolio & Links
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="githubUrl" className={labelClass}>
                  GitHub URL
                </label>
                <input
                  id="githubUrl"
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => updateField("githubUrl", e.target.value)}
                  placeholder="https://github.com/username"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="linkedinUrl" className={labelClass}>
                  LinkedIn URL
                </label>
                <input
                  id="linkedinUrl"
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateField("linkedinUrl", e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="portfolioUrl" className={labelClass}>
                Portfolio URL
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={(e) => updateField("portfolioUrl", e.target.value)}
                placeholder="https://myportfolio.com"
                className={inputClass}
              />
            </div>

            {/* Projects */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className={labelClass}>Projects</label>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project
                </button>
              </div>

              <div className="space-y-4">
                {formData.projects.map((project, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Project {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(idx)}
                        className="rounded-lg p-1.5 text-[var(--error)] transition-colors hover:bg-[var(--error-light)]"
                        aria-label={`Remove project ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={project.title}
                        onChange={(e) =>
                          updateProject(idx, "title", e.target.value)
                        }
                        placeholder="Project title"
                        className={inputClass}
                      />
                      <textarea
                        value={project.description}
                        onChange={(e) =>
                          updateProject(idx, "description", e.target.value)
                        }
                        placeholder="Brief description..."
                        rows={2}
                        className={inputClass}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="url"
                          value={project.projectUrl}
                          onChange={(e) =>
                            updateProject(idx, "projectUrl", e.target.value)
                          }
                          placeholder="Live URL"
                          className={inputClass}
                        />
                        <input
                          type="url"
                          value={project.githubUrl}
                          onChange={(e) =>
                            updateProject(idx, "githubUrl", e.target.value)
                          }
                          placeholder="GitHub URL"
                          className={inputClass}
                        />
                      </div>
                      <input
                        type="text"
                        value={project.techStack.join(", ")}
                        onChange={(e) =>
                          updateProject(
                            idx,
                            "techStack",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="Tech stack (comma separated)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}

                {formData.projects.length === 0 && (
                  <p className="py-6 text-center text-sm text-[var(--neutral-gray)]">
                    No projects yet. Add your first project to showcase your work.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Availability */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Availability & Work Preferences
            </h2>

            <div>
              <label className={labelClass}>Availability Status *</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: AvailabilityStatus.IMMEDIATE,
                    label: "Available now",
                    color: "border-[var(--success)] bg-[var(--success-light)]",
                  },
                  {
                    value: AvailabilityStatus.ONE_MONTH,
                    label: "Within 1 month",
                    color: "border-[var(--warning)] bg-[var(--warning-light)]",
                  },
                  {
                    value: AvailabilityStatus.TWO_THREE_MONTHS,
                    label: "2-3 months",
                    color:
                      "border-[var(--accent-orange)] bg-[var(--accent-orange)]/10",
                  },
                  {
                    value: AvailabilityStatus.NOT_AVAILABLE,
                    label: "Not available",
                    color: "border-[var(--error)] bg-[var(--error-light)]",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateField("availabilityStatus", opt.value)
                    }
                    className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                      formData.availabilityStatus === opt.value
                        ? opt.color
                        : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--surface-4)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.availabilityStatus && (
                <p className={errorClass}>{errors.availabilityStatus}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Preferred Work Mode</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: WorkMode.REMOTE, label: "Remote" },
                  { value: WorkMode.HYBRID, label: "Hybrid" },
                  { value: WorkMode.ON_SITE, label: "On-site" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("preferredWorkMode", opt.value)}
                    className={`rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                      formData.preferredWorkMode === opt.value
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--foreground)] hover:border-[var(--surface-4)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="hoursStart" className={labelClass}>
                  Preferred Hours Start
                </label>
                <input
                  id="hoursStart"
                  type="time"
                  value={formData.preferredHoursStart}
                  onChange={(e) =>
                    updateField("preferredHoursStart", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="hoursEnd" className={labelClass}>
                  Preferred Hours End
                </label>
                <input
                  id="hoursEnd"
                  type="time"
                  value={formData.preferredHoursEnd}
                  onChange={(e) =>
                    updateField("preferredHoursEnd", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Review Your Profile
            </h2>
            <p className="text-sm text-[var(--neutral-gray)]">
              Review your information below before submitting.
            </p>

            {/* Summary sections */}
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  Basic Info
                </h3>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">Name</dt>
                    <dd className="font-medium text-[var(--foreground)]">
                      {formData.fullName || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      Location
                    </dt>
                    <dd className="font-medium text-[var(--foreground)]">
                      {[formData.city, formData.country].filter(Boolean).join(", ") || "Not set"}
                    </dd>
                  </div>
                </dl>
                {formData.bio && (
                  <p className="mt-2 text-xs text-[var(--neutral-gray)]">
                    {formData.bio}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  Professional
                </h3>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      Experience
                    </dt>
                    <dd className="font-medium text-[var(--foreground)]">
                      {formData.yearsOfExperience != null
                        ? `${formData.yearsOfExperience} years`
                        : "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      Stacks
                    </dt>
                    <dd className="font-medium text-[var(--foreground)]">
                      {formData.primaryStacks.length > 0
                        ? formData.primaryStacks.join(", ")
                        : "Not set"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  Portfolio
                </h3>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      GitHub
                    </dt>
                    <dd className="truncate font-medium text-[var(--foreground)]">
                      {formData.githubUrl || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      LinkedIn
                    </dt>
                    <dd className="truncate font-medium text-[var(--foreground)]">
                      {formData.linkedinUrl || "Not set"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-[var(--neutral-gray)]">
                  {formData.projects.length} project(s) added
                </p>
              </div>

              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  Availability
                </h3>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      Status
                    </dt>
                    <dd className="font-medium capitalize text-[var(--foreground)]">
                      {formData.availabilityStatus?.replace(/_/g, " ") ??
                        "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--neutral-gray)]">
                      Work Mode
                    </dt>
                    <dd className="font-medium capitalize text-[var(--foreground)]">
                      {formData.preferredWorkMode?.replace(/_/g, " ") ??
                        "Not set"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-[var(--surface-3)] pt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md"
            >
              Save & Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--success)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--success-dark)] hover:shadow-md"
            >
              <CheckCircle className="h-4 w-4" />
              Submit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
