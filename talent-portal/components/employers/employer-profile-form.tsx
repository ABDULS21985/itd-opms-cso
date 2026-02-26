"use client";

import { useState } from "react";
import {
  Building2,
  Globe,
  MapPin,
  Upload,
  Loader2,
  Save,
} from "lucide-react";
import type { EmployerOrg } from "@/types/employer";
import { WorkMode } from "@/types/candidate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmployerProfileData {
  companyName: string;
  logoUrl: string | null;
  websiteUrl: string;
  description: string;
  sector: string;
  locationHq: string;
  country: string;
  hiringTracks: string[];
  hiringWorkModes: string[];
}

interface EmployerProfileFormProps {
  employer?: EmployerOrg;
  onSubmit: (data: EmployerProfileData) => void | Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(data: EmployerProfileData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.companyName.trim()) errors.companyName = "Company name is required";
  if (data.websiteUrl && !/^https?:\/\/.+/.test(data.websiteUrl)) {
    errors.websiteUrl = "Enter a valid URL";
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployerProfileForm({
  employer,
  onSubmit,
  loading = false,
}: EmployerProfileFormProps) {
  const [formData, setFormData] = useState<EmployerProfileData>({
    companyName: employer?.companyName ?? "",
    logoUrl: employer?.logoUrl ?? null,
    websiteUrl: employer?.websiteUrl ?? "",
    description: employer?.description ?? "",
    sector: employer?.sector ?? "",
    locationHq: employer?.locationHq ?? "",
    country: employer?.country ?? "",
    hiringTracks: employer?.hiringTracks ?? [],
    hiringWorkModes: employer?.hiringWorkModes ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(key: keyof EmployerProfileData, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleWorkMode(mode: string) {
    const current = formData.hiringWorkModes;
    if (current.includes(mode)) {
      updateField(
        "hiringWorkModes",
        current.filter((m) => m !== mode),
      );
    } else {
      updateField("hiringWorkModes", [...current, mode]);
    }
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

  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";

  const errorClass = "mt-1 text-xs text-[var(--error)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Edit Organization Profile
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Update your company information visible to candidates.
        </p>
      </div>

      <div className="space-y-5">
        {/* Logo */}
        <div>
          <label className={labelClass}>Company Logo</label>
          <div className="flex items-center gap-4">
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt={formData.companyName}
                className="h-16 w-16 rounded-xl object-cover ring-2 ring-[var(--surface-3)]"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                <Building2 className="h-6 w-6 text-[var(--neutral-gray)]" />
              </div>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <Upload className="h-4 w-4" />
              Upload Logo
            </button>
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className={labelClass}>
            Company Name *
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            placeholder="Acme Corporation"
            className={inputClass}
          />
          {errors.companyName && (
            <p className={errorClass}>{errors.companyName}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <label htmlFor="websiteUrl" className={labelClass}>
            Website
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
            <input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
              placeholder="https://example.com"
              className={`${inputClass} pl-10`}
            />
          </div>
          {errors.websiteUrl && (
            <p className={errorClass}>{errors.websiteUrl}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Tell candidates about your company..."
            rows={4}
            className={inputClass}
          />
        </div>

        {/* Sector + Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sector" className={labelClass}>
              Sector
            </label>
            <input
              id="sector"
              type="text"
              value={formData.sector}
              onChange={(e) => updateField("sector", e.target.value)}
              placeholder="Technology"
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
        </div>

        <div>
          <label htmlFor="locationHq" className={labelClass}>
            HQ Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
            <input
              id="locationHq"
              type="text"
              value={formData.locationHq}
              onChange={(e) => updateField("locationHq", e.target.value)}
              placeholder="Lagos, Nigeria"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* Hiring Tracks */}
        <div>
          <label htmlFor="hiringTracks" className={labelClass}>
            Hiring Tracks
          </label>
          <input
            id="hiringTracks"
            type="text"
            value={formData.hiringTracks.join(", ")}
            onChange={(e) =>
              updateField(
                "hiringTracks",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="Frontend, Backend, DevOps (comma separated)"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-[var(--neutral-gray)]">
            Separate tracks with commas
          </p>
        </div>

        {/* Work Modes */}
        <div>
          <label className={labelClass}>Hiring Work Modes</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: WorkMode.REMOTE, label: "Remote" },
              { value: WorkMode.HYBRID, label: "Hybrid" },
              { value: WorkMode.ON_SITE, label: "On-site" },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => toggleWorkMode(mode.value)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  formData.hiringWorkModes.includes(mode.value)
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--foreground)] hover:border-[var(--surface-4)]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
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
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
