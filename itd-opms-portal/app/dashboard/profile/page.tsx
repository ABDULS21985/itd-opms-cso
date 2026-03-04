"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const u = user as Record<string, unknown> | null;

  const [form, setForm] = useState<ProfileFormData>({
    displayName: "",
    phone: "",
    jobTitle: "",
    department: "",
    office: "",
    unit: "",
  });

  // Populate form when user data loads.
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

    setIsLoading(true);
    try {
      await apiClient.patch("/auth/profile", {
        displayName: form.displayName || undefined,
        jobTitle: form.jobTitle || undefined,
        department: form.department || undefined,
        office: form.office || undefined,
        unit: form.unit || undefined,
        phone: form.phone || undefined,
      });
      await refreshUser();
      setIsDirty(false);
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

    // Validate file type.
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only JPEG, PNG, and WebP images are allowed.",
      });
      return;
    }

    // Validate file size (2MB).
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
      // Reset file input so the same file can be re-selected.
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
  const userInitial = ((u?.displayName as string) || (u?.email as string) || "U")
    .charAt(0)
    .toUpperCase();
  const roles = (u?.roles as string[]) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          My Profile
        </h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          View and manage your personal information
        </p>
      </motion.div>

      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center border-2 border-[var(--primary)]/10 overflow-hidden">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[var(--primary)]">
                  {userInitial}
                </span>
              )}
            </div>
            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Upload photo"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              {photoUrl && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={isUploading}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 text-white transition-colors"
                  title="Remove photo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Name and meta */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {(u?.displayName as string) || (u?.email as string)}
            </h2>
            <p className="text-sm text-[var(--neutral-gray)] truncate">
              {u?.jobTitle as string}{" "}
              {u?.department ? `- ${u?.department}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                <Mail size={12} />
                {u?.email as string}
              </span>
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--secondary)]/10 text-[var(--secondary)]"
                >
                  <Shield size={12} />
                  {role.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal Information Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Personal Information
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Your display name"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Phone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Job Title
              </label>
              <div className="relative">
                <Briefcase
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Your job title"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Department
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Your department"
                />
              </div>
            </div>

            {/* Office */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Office
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="text"
                  value={form.office}
                  onChange={(e) => handleChange("office", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Office location"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Unit
              </label>
              <div className="relative">
                <Network
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                />
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all bg-[var(--surface-1)]"
                  placeholder="Your unit"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,#0E5A2D)] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
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
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Security
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <KeyRound size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Password
              </p>
              <p className="text-xs text-[var(--neutral-gray)]">
                Change your account password
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/auth/change-password")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <KeyRound size={14} />
            Change Password
          </button>
        </div>
      </motion.div>

      {/* Account Info (read-only) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoField label="Email" value={(u?.email as string) || "-"} />
          <InfoField label="Tenant ID" value={(u?.tenantId as string) || "-"} />
          <InfoField
            label="Org Unit"
            value={(u?.orgUnitId as string) || "Not assigned"}
          />
          <InfoField
            label="Org Level"
            value={(u?.orgLevel as string) || "-"}
          />
          <InfoField
            label="Roles"
            value={roles.length > 0 ? roles.join(", ") : "None"}
          />
          <InfoField
            label="Member Since"
            value={
              u?.createdAt
                ? new Date(u.createdAt as string).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "-"
            }
          />
        </div>
      </motion.div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--neutral-gray)] mb-1">
        {label}
      </p>
      <p className="text-sm text-[var(--text-primary)] truncate">{value}</p>
    </div>
  );
}
