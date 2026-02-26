"use client";

import { useState } from "react";
import {
  Building2,
  Globe,
  MapPin,
  User,
  Briefcase,
  Phone,
  FileText,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmployerRegisterData {
  companyName: string;
  websiteUrl: string;
  sector: string;
  locationHq: string;
  country: string;
  description: string;
  contactName: string;
  roleTitle: string;
  phone: string;
}

interface EmployerRegisterFormProps {
  onSubmit: (data: EmployerRegisterData) => void | Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(data: EmployerRegisterData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.companyName.trim()) errors.companyName = "Company name is required";
  if (!data.contactName.trim()) errors.contactName = "Contact name is required";
  if (!data.country.trim()) errors.country = "Country is required";
  if (data.websiteUrl && !/^https?:\/\/.+/.test(data.websiteUrl)) {
    errors.websiteUrl = "Enter a valid URL";
  }
  if (data.phone && !/^\+?[\d\s()-]{7,}$/.test(data.phone)) {
    errors.phone = "Enter a valid phone number";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployerRegisterForm({
  onSubmit,
  loading = false,
}: EmployerRegisterFormProps) {
  const [formData, setFormData] = useState<EmployerRegisterData>({
    companyName: "",
    websiteUrl: "",
    sector: "",
    locationHq: "",
    country: "",
    description: "",
    contactName: "",
    roleTitle: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(key: keyof EmployerRegisterData, value: string) {
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

  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";

  const errorClass = "mt-1 text-xs text-[var(--error)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Register Your Organization
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-gray)]">
          Fill in your company details to get started with the Digibit Talent
          Portal.
        </p>
      </div>

      <div className="space-y-5">
        {/* Company Info Section */}
        <div className="rounded-lg bg-[var(--surface-1)] p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Building2 className="h-4 w-4 text-[var(--primary)]" />
            Company Information
          </h3>

          <div className="space-y-4">
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
                  Country *
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Nigeria"
                  className={inputClass}
                />
                {errors.country && (
                  <p className={errorClass}>{errors.country}</p>
                )}
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

            <div>
              <label htmlFor="description" className={labelClass}>
                Company Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Tell us about your company..."
                rows={4}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="rounded-lg bg-[var(--surface-1)] p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <User className="h-4 w-4 text-[var(--primary)]" />
            Contact Person
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="contactName" className={labelClass}>
                Contact Name *
              </label>
              <input
                id="contactName"
                type="text"
                value={formData.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="John Doe"
                className={inputClass}
              />
              {errors.contactName && (
                <p className={errorClass}>{errors.contactName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="roleTitle" className={labelClass}>
                  Role / Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
                  <input
                    id="roleTitle"
                    type="text"
                    value={formData.roleTitle}
                    onChange={(e) => updateField("roleTitle", e.target.value)}
                    placeholder="HR Manager"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+234 800 000 0000"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.phone && (
                  <p className={errorClass}>{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Register Organization
            </>
          )}
        </button>
      </div>
    </form>
  );
}
