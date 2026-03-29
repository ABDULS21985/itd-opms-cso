"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  MapPin,
  Network,
  Shield,
  KeyRound,
  Camera,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Clock,
  Edit3,
  X,
  ChevronRight,
  Sparkles,
  Lock,
  Fingerprint,
  Globe,
  Calendar,
  AtSign,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

interface ProfileFormData {
  displayName: string;
  phone: string;
  jobTitle: string;
  department: string;
  office: string;
  unit: string;
}

type TabKey = "overview" | "edit" | "security";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const u = user as Record<string, unknown> | null;

  const [form, setForm] = useState<ProfileFormData>({
    displayName: "",
    phone: "",
    jobTitle: "",
    department: "",
    office: "",
    unit: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: (u?.displayName as string) || "",
        phone: (u?.phone as string) || "",
        jobTitle: (u?.jobTitle as string) || "",
        department: (u?.department as string) || "",
        office: (u?.office as string) || "",
        unit: (u?.unit as string) || "",
      });
    }
  }, [user]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    if (!form.displayName.trim()) {
      toast.error("Display name is required", {
        description: "Please enter a display name before saving.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // displayName is required — omit if empty so backend keeps existing value.
      // Optional fields (phone, jobTitle, etc.) send null when cleared so the
      // backend stores NULL and removes the previous value.
      await apiClient.patch("/auth/profile", {
        displayName: form.displayName.trim() || undefined,
        jobTitle: form.jobTitle.trim() || null,
        department: form.department.trim() || null,
        office: form.office.trim() || null,
        unit: form.unit.trim() || null,
        phone: form.phone.trim() || null,
      });
      await refreshUser();
      setIsDirty(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      toast.success("Profile updated", {
        description: "Your changes have been saved successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      toast.error("Update failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only JPEG, PNG, and WebP images are allowed.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Profile photo must be under 2MB.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      await apiClient.upload("/auth/profile/photo", formData);
      await refreshUser();
      toast.success("Photo uploaded", {
        description: "Your profile photo has been updated.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload photo.";
      toast.error("Upload failed", { description: message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    setIsUploading(true);
    try {
      await apiClient.delete("/auth/profile/photo");
      await refreshUser();
      toast.success("Photo removed", {
        description: "Your profile photo has been removed.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove photo.";
      toast.error("Remove failed", { description: message });
    } finally {
      setIsUploading(false);
    }
  };

  const photoUrl = u?.photoUrl as string | undefined;
  const displayName =
    (u?.displayName as string) || (u?.email as string) || "User";
  const userInitials = useMemo(() => {
    const parts = displayName.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);
  const roles = (u?.roles as string[]) || [];
  const email = (u?.email as string) || "";
  const jobTitle = (u?.jobTitle as string) || "";
  const department = (u?.department as string) || "";

  // Profile completeness
  const profileFields = [
    u?.displayName,
    u?.email,
    u?.phone,
    u?.jobTitle,
    u?.department,
    u?.office,
    u?.unit,
    u?.photoUrl,
  ];
  const filledCount = profileFields.filter(Boolean).length;
  const completeness = Math.round((filledCount / profileFields.length) * 100);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: User },
    { key: "edit", label: "Edit Profile", icon: Edit3 },
    { key: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="w-full pb-8">
      {/* ── Cover Banner ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-48 sm:h-56 rounded-2xl overflow-hidden"
      >
        {/* Gradient cover with pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D1F] via-[#1B7340] to-[#0E5A2D]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#C4A962]/10 rounded-full blur-2xl" />

        {/* Cover text/branding */}
        <div className="absolute bottom-4 right-6 flex items-center gap-2 text-white/40 text-xs font-medium">
          <Sparkles size={12} />
          <span>ITD-OPMS Profile</span>
        </div>
      </motion.div>

      {/* ── Profile Header (overlapping banner) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative -mt-20 mx-4 sm:mx-6"
      >
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="relative group -mt-16 sm:-mt-20 flex-shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#0E5A2D] flex items-center justify-center ring-4 ring-[var(--surface-0)] shadow-[var(--shadow-lg)] overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => {
                      // Presigned URL may have expired — refresh user to get
                      // a new 24-hour URL from /auth/me.
                      refreshUser();
                    }}
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-white/90 tracking-wide">
                    {userInitials}
                  </span>
                )}
              </div>
              {/* Hover overlay for photo actions */}
              <div className="absolute inset-0 -mt-16 sm:-mt-20 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 ring-4 ring-transparent">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110"
                  title="Upload photo"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
                {photoUrl && (
                  <button
                    onClick={handlePhotoDelete}
                    disabled={isUploading}
                    className="p-2 rounded-xl bg-white/20 hover:bg-red-500/70 text-white transition-all hover:scale-110"
                    title="Remove photo"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 w-5 h-5 bg-emerald-500 rounded-full ring-[3px] ring-[var(--surface-0)]" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Name, title, badges */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate">
                      {displayName}
                    </h1>
                    <BadgeCheck
                      size={20}
                      className="text-[var(--primary)] flex-shrink-0"
                    />
                  </div>
                  {(jobTitle || department) && (
                    <p className="text-sm text-[var(--neutral-gray)] mt-0.5 truncate">
                      {jobTitle}
                      {jobTitle && department ? " \u00B7 " : ""}
                      {department}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-1)] text-[var(--neutral-gray)] border border-[var(--border)]">
                      <AtSign size={11} />
                      {email}
                    </span>
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[var(--primary)]/10 to-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/15"
                      >
                        <Shield size={11} />
                        {role.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick action */}
                <button
                  onClick={() => setActiveTab("edit")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-all hover:shadow-sm self-start"
                >
                  <Edit3 size={14} />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Profile completeness bar */}
          {completeness < 100 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.3 }}
              className="mt-5 pt-5 border-t border-[var(--border)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={14}
                    className="text-[#C4A962]"
                  />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Profile Completeness
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">
                  {completeness}%
                </span>
              </div>
              <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#2D9B56]"
                />
              </div>
              <p className="text-[11px] text-[var(--neutral-gray)] mt-1.5">
                Complete your profile to help colleagues find and connect with
                you
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-6 mx-4 sm:mx-6"
      >
        <div className="flex gap-1 p-1 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-[var(--primary)] bg-[var(--surface-0)] shadow-sm"
                    : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-0)]/50"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <div className="mt-5 mx-4 sm:mx-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab
              key="overview"
              u={u}
              roles={roles}
              completeness={completeness}
            />
          )}
          {activeTab === "edit" && (
            <EditTab
              key="edit"
              form={form}
              handleChange={handleChange}
              handleSave={handleSave}
              isLoading={isLoading}
              isDirty={isDirty}
              showSaveSuccess={showSaveSuccess}
            />
          )}
          {activeTab === "security" && (
            <SecurityTab key="security" router={router} u={u} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Overview Tab                                                       */
/* ================================================================== */

function OverviewTab({
  u,
  roles,
  completeness,
}: {
  u: Record<string, unknown> | null;
  roles: string[];
  completeness: number;
}) {
  const infoItems = [
    {
      icon: Mail,
      label: "Email Address",
      value: u?.email as string,
      color: "#3B82F6",
    },
    {
      icon: Phone,
      label: "Phone",
      value: u?.phone as string,
      color: "#10B981",
    },
    {
      icon: Briefcase,
      label: "Job Title",
      value: u?.jobTitle as string,
      color: "#8B5CF6",
    },
    {
      icon: Building2,
      label: "Department",
      value: u?.department as string,
      color: "#F59E0B",
    },
    {
      icon: MapPin,
      label: "Office",
      value: u?.office as string,
      color: "#EF4444",
    },
    {
      icon: Network,
      label: "Unit",
      value: u?.unit as string,
      color: "#06B6D4",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* About Section */}
      <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            About
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {infoItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3.5 group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${item.color}12` }}
                  >
                    <Icon size={16} style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                      {item.value || (
                        <span className="text-[var(--neutral-gray)]/50 italic font-normal">
                          Not set
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Organization & Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Organization Card */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Organization
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow
              icon={Globe}
              label="Organization"
              value={(u?.tenantName as string) || (u?.tenantId as string) || "-"}
            />
            <InfoRow
              icon={Network}
              label="Org Level"
              value={(u?.orgLevel as string) || "Not assigned"}
            />
            <InfoRow
              icon={Shield}
              label="Roles"
              value={
                roles.length > 0
                  ? roles.map((r) => r.replace(/_/g, " ")).join(", ")
                  : "None"
              }
            />
          </div>
        </div>

        {/* Account Card */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Account
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <InfoRow icon={AtSign} label="Email" value={u?.email as string} />
            <InfoRow
              icon={Calendar}
              label="Member Since"
              value={
                u?.createdAt
                  ? new Date(u.createdAt as string).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )
                  : "N/A"
              }
            />
            <InfoRow
              icon={Clock}
              label="Last Login"
              value={
                u?.lastLoginAt
                  ? new Date(u.lastLoginAt as string).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "N/A"
              }
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Edit Tab                                                           */
/* ================================================================== */

function EditTab({
  form,
  handleChange,
  handleSave,
  isLoading,
  isDirty,
  showSaveSuccess,
}: {
  form: ProfileFormData;
  handleChange: (field: keyof ProfileFormData, value: string) => void;
  handleSave: (e: React.FormEvent) => void;
  isLoading: boolean;
  isDirty: boolean;
  showSaveSuccess: boolean;
}) {
  const fields: {
    key: keyof ProfileFormData;
    label: string;
    icon: React.ElementType;
    placeholder: string;
    type?: string;
  }[] = [
    {
      key: "displayName",
      label: "Display Name",
      icon: User,
      placeholder: "e.g. John Doe",
    },
    {
      key: "phone",
      label: "Phone Number",
      icon: Phone,
      placeholder: "e.g. +234 800 123 4567",
      type: "tel",
    },
    {
      key: "jobTitle",
      label: "Job Title",
      icon: Briefcase,
      placeholder: "e.g. Senior Software Engineer",
    },
    {
      key: "department",
      label: "Department",
      icon: Building2,
      placeholder: "e.g. Information Technology",
    },
    {
      key: "office",
      label: "Office Location",
      icon: MapPin,
      placeholder: "e.g. Head Office, Floor 3",
    },
    {
      key: "unit",
      label: "Unit",
      icon: Network,
      placeholder: "e.g. Application Development",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Edit Profile
            </h3>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              Update your personal information visible to your organization
            </p>
          </div>

          {/* Save success indicator */}
          <AnimatePresence>
            {showSaveSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium"
              >
                <CheckCircle2 size={14} />
                Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map((field, i) => {
              const Icon = field.icon;
              return (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    {field.label}
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
                      <Icon
                        size={15}
                        className="text-[var(--neutral-gray)] group-focus-within:text-[var(--primary)] transition-colors"
                      />
                    </div>
                    <input
                      type={field.type || "text"}
                      value={form[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15 focus:border-[var(--primary)]/50 transition-all bg-[var(--surface-0)] hover:border-[var(--primary)]/25"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--neutral-gray)]">
              {isDirty
                ? "You have unsaved changes"
                : "All changes are saved"}
            </p>
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#1B7340] to-[#0E5A2D] shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Security Tab                                                       */
/* ================================================================== */

function SecurityTab({
  router,
  u,
}: {
  router: ReturnType<typeof useRouter>;
  u: Record<string, unknown> | null;
}) {
  const securityItems = [
    {
      icon: KeyRound,
      title: "Password",
      description: "Change your account password to keep your account secure",
      action: "Change Password",
      onClick: () => router.push("/auth/change-password"),
      color: "#1B7340",
    },
    {
      icon: Fingerprint,
      title: "Two-Factor Authentication",
      description:
        "Add an extra layer of security with 2FA (coming soon)",
      action: "Coming Soon",
      onClick: undefined,
      color: "#8B5CF6",
      disabled: true,
    },
    {
      icon: Globe,
      title: "Active Sessions",
      description: "View and manage your active login sessions",
      action: "View Sessions",
      onClick: () => router.push("/dashboard/system/sessions"),
      color: "#3B82F6",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Security & Access
          </h3>
          <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
            Manage your security settings and account access
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {securityItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 group hover:bg-[var(--surface-1)]/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${item.color}12` }}
                  >
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all self-start sm:self-center flex-shrink-0 ${
                    item.disabled
                      ? "border border-[var(--border)] text-[var(--neutral-gray)]/50 cursor-not-allowed"
                      : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] hover:shadow-sm"
                  }`}
                >
                  {item.action}
                  {!item.disabled && (
                    <ChevronRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-5 bg-[var(--surface-0)] border border-[var(--error)]/20 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--error)]/10 bg-[var(--error)]/[0.02]">
          <h3 className="text-base font-semibold text-[var(--error)]">
            Danger Zone
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Deactivate Account
            </p>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
              Contact your administrator to deactivate your account
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--error)]/30 text-[var(--error)]/50 cursor-not-allowed self-start sm:self-center"
          >
            Contact Admin
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Info Row (reusable)                                                */
/* ================================================================== */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} className="text-[var(--neutral-gray)] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--neutral-gray)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {value || (
            <span className="text-[var(--neutral-gray)]/50 italic font-normal">
              Not set
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
