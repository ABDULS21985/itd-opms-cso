"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Fragment,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Plus,
  Trash2,
  Save,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Mail,
  Settings,
  UserPlus,
  Bell,
  Shield,
  CreditCard,
  Link2,
  Check,
  Eye,
  Camera,
  Briefcase,
  Laptop,
  Home,
  Clock,
  Monitor,
  Smartphone,
  Key,
  Fingerprint,
  LayoutGrid,
  GripVertical,
  Zap,
  Send,
  Crown,
  ShieldCheck,
  UserCog,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  useMyEmployerOrg,
  useUpdateEmployerOrg,
  useUploadEmployerLogo,
} from "@/hooks/use-employers";
import { apiClient } from "@/lib/api-client";
import type { EmployerOrg, EmployerUser } from "@/types/employer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/* ══════════════════════════════════════════════════════════════════
   Constants & Types
   ══════════════════════════════════════════════════════════════════ */

type SettingsSection =
  | "organization"
  | "team"
  | "notifications"
  | "hiring"
  | "integrations"
  | "billing"
  | "security";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: typeof Building2;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "organization", label: "Organization", icon: Building2, description: "Company profile & branding" },
  { id: "team", label: "Team & Roles", icon: Users, description: "Members, invites & permissions" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email & in-app alerts" },
  { id: "hiring", label: "Hiring Preferences", icon: Briefcase, description: "Tracks, modes & defaults" },
  { id: "integrations", label: "Integrations", icon: Link2, description: "Connected services" },
  { id: "billing", label: "Billing", icon: CreditCard, description: "Plan & payment" },
  { id: "security", label: "Security", icon: Shield, description: "Password, sessions & 2FA" },
];

const SECTORS = [
  "Technology", "Finance", "Healthcare", "Education", "E-commerce", "Consulting",
  "Media & Entertainment", "Real Estate", "Manufacturing", "Energy", "Logistics",
  "Telecommunications", "Agriculture", "Legal", "Non-Profit", "Government", "Other",
];

const WORK_MODES = [
  { value: "remote", label: "Remote", icon: Laptop, description: "Work from anywhere in the world" },
  { value: "hybrid", label: "Hybrid", icon: Home, description: "Mix of office and remote days" },
  { value: "on_site", label: "On-Site", icon: Building2, description: "Full-time at the office" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "XOF"];

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; permissions: string[] }> = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "#C4A35A",
    permissions: ["Full platform access", "Manage team & billing", "Transfer ownership", "Delete organization"],
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "#3B82F6",
    permissions: ["Manage team members", "Post & manage jobs", "View all applications", "Manage pipelines"],
  },
  member: {
    label: "Member",
    icon: UserCog,
    color: "#64748B",
    permissions: ["View jobs & applications", "Limited pipeline access", "Cannot manage team"],
  },
};

const NOTIFICATION_CATEGORIES = [
  { key: "new_applications", label: "New Applications", description: "When candidates apply to your jobs" },
  { key: "interview_reminders", label: "Interview Reminders", description: "Upcoming interview notifications" },
  { key: "intro_updates", label: "Intro Request Updates", description: "Status changes on intro requests" },
  { key: "pipeline_changes", label: "Pipeline Changes", description: "Candidate stage transitions" },
  { key: "team_activity", label: "Team Activity", description: "Actions by team members" },
  { key: "weekly_digest", label: "Weekly Digest", description: "Summary of activity across your account" },
];

const DEFAULT_PIPELINE_STAGES = [
  { id: "applied", label: "Applied", color: "#64748B" },
  { id: "screening", label: "Screening", color: "#3B82F6" },
  { id: "interview", label: "Interview", color: "#8B5CF6" },
  { id: "offer", label: "Offer", color: "#C4A35A" },
  { id: "hired", label: "Hired", color: "#10B981" },
];

const POPULAR_LOCATIONS = [
  "Lagos, Nigeria", "Nairobi, Kenya", "Accra, Ghana", "Cape Town, South Africa",
  "London, UK", "New York, USA", "San Francisco, USA", "Berlin, Germany",
  "Dubai, UAE", "Singapore", "Toronto, Canada", "Remote",
];

/* ══════════════════════════════════════════════════════════════════
   Tiny Helpers
   ══════════════════════════════════════════════════════════════════ */

function SectionShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </motion.div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6", className)}>
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, label }: { icon: typeof Building2; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#C4A35A]" />
      </div>
      <h3 className="font-semibold text-[var(--text-primary)]">{label}</h3>
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium"
        >
          <AlertCircle size={12} />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-[#C4A35A]" : "bg-[var(--surface-3)]",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Organization Profile
   ══════════════════════════════════════════════════════════════════ */

function OrganizationSection({ org, refetch }: { org: EmployerOrg; refetch: () => void }) {
  const updateOrg = useUpdateEmployerOrg();
  const uploadLogo = useUploadEmployerLogo();

  const [companyName, setCompanyName] = useState(org.companyName || "");
  const [websiteUrl, setWebsiteUrl] = useState(org.websiteUrl || "");
  const [description, setDescription] = useState(org.description || "");
  const [sector, setSector] = useState(org.sector || "");
  const [locationHq, setLocationHq] = useState(org.locationHq || "");
  const [country, setCountry] = useState(org.country || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLocations, setShowLocations] = useState(false);
  const [showSectors, setShowSectors] = useState(false);
  const [sectorSearch, setSectorSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyName(org.companyName || "");
    setWebsiteUrl(org.websiteUrl || "");
    setDescription(org.description || "");
    setSector(org.sector || "");
    setLocationHq(org.locationHq || "");
    setCountry(org.country || "");
  }, [org]);

  const isDirty =
    companyName !== (org.companyName || "") ||
    websiteUrl !== (org.websiteUrl || "") ||
    description !== (org.description || "") ||
    sector !== (org.sector || "") ||
    locationHq !== (org.locationHq || "") ||
    country !== (org.country || "");

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = "Company name is required";
    if (websiteUrl && !/^https?:\/\/.+\..+/.test(websiteUrl)) errs.websiteUrl = "Enter a valid URL (https://...)";
    if (description && description.length < 50) errs.description = `At least 50 characters (${description.length}/50)`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [companyName, websiteUrl, description]);

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await updateOrg.mutateAsync({
        companyName,
        websiteUrl: websiteUrl || null,
        description: description || null,
        sector: sector || null,
        locationHq: locationHq || null,
        country: country || null,
      } as any);
      toast.success("Organization updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 2MB.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadLogo.mutateAsync(formData);
      toast.success("Logo updated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleLogoUpload(file);
  };

  const filteredSectors = SECTORS.filter((s) =>
    s.toLowerCase().includes(sectorSearch.toLowerCase()),
  );

  const filteredLocations = POPULAR_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locationHq.toLowerCase()),
  );

  return (
    <SectionShell title="Organization Profile" description="Your company information visible to candidates.">
      {/* Logo Upload */}
      <Card>
        <CardTitle icon={Camera} label="Company Logo" />
        <div className="flex items-start gap-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleLogoDrop}
            onClick={() => logoInputRef.current?.click()}
            className={cn(
              "w-[120px] h-[120px] rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
              dragOver
                ? "border-[#C4A35A] bg-[#C4A35A]/5"
                : "border-[var(--border)] hover:border-[#C4A35A]/40",
            )}
          >
            {org.logoUrl ? (
              <>
                <img src={org.logoUrl} alt={org.companyName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-[var(--neutral-gray)]">
                {uploadLogo.isPending ? (
                  <Loader2 size={24} className="text-[#C4A35A] animate-spin" />
                ) : (
                  <>
                    <Upload size={20} />
                    <span className="text-[10px] font-medium">Drop or click</span>
                  </>
                )}
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] font-medium">Upload your company logo</p>
            <p className="text-xs text-[var(--neutral-gray)] mt-1">
              PNG, JPG or SVG. Max 2MB. Recommended 256x256px.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <Upload size={12} /> Upload
              </button>
              {org.logoUrl && (
                <button
                  onClick={() => toast.info("Logo removal coming soon")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Company Details */}
      <Card>
        <CardTitle icon={Building2} label="Company Details" />
        <div className="space-y-5">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Company Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setErrors((p) => ({ ...p, companyName: "" })); }}
              className={cn(
                "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]",
                errors.companyName ? "border-[var(--error)]" : "border-[var(--border)]",
              )}
            />
            <FieldError error={errors.companyName} />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Website</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => { setWebsiteUrl(e.target.value); setErrors((p) => ({ ...p, websiteUrl: "" })); }}
                placeholder="https://yourcompany.com"
                className={cn(
                  "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]",
                  errors.websiteUrl ? "border-[var(--error)]" : "border-[var(--border)]",
                )}
              />
            </div>
            <FieldError error={errors.websiteUrl} />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Description</label>
              <span className={cn(
                "text-xs tabular-nums",
                description.length >= 50 ? "text-[var(--neutral-gray)]" : "text-[var(--error)]",
              )}>
                {description.length} / 50 min
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: "" })); }}
              placeholder="Tell candidates about your company, culture, and mission..."
              rows={4}
              className={cn(
                "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)] resize-none",
                errors.description ? "border-[var(--error)]" : "border-[var(--border)]",
              )}
            />
            <FieldError error={errors.description} />
          </div>

          {/* Sector + Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sector */}
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Sector</label>
              <button
                type="button"
                onClick={() => { setShowSectors(!showSectors); setShowLocations(false); }}
                className="w-full flex items-center justify-between px-4 py-3 border border-[var(--border)] rounded-xl text-sm bg-[var(--surface-0)] hover:border-[#C4A35A]/30 transition-colors text-left"
              >
                <span className={sector ? "text-[var(--text-primary)]" : "text-[var(--neutral-gray)]"}>
                  {sector || "Select sector..."}
                </span>
                <ChevronDown size={14} className={cn("text-[var(--neutral-gray)] transition-transform", showSectors && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showSectors && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute z-20 top-full mt-1 w-full bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-lg max-h-60 overflow-hidden"
                  >
                    <div className="p-2 border-b border-[var(--border)]">
                      <input
                        type="text"
                        value={sectorSearch}
                        onChange={(e) => setSectorSearch(e.target.value)}
                        placeholder="Search sectors..."
                        className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-1)] focus:outline-none focus:border-[#C4A35A]"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {filteredSectors.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSector(s); setShowSectors(false); setSectorSearch(""); }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                            sector === s
                              ? "bg-[#C4A35A]/10 text-[#C4A35A] font-medium"
                              : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Location */}
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Headquarters</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                <input
                  type="text"
                  value={locationHq}
                  onChange={(e) => setLocationHq(e.target.value)}
                  onFocus={() => { setShowLocations(true); setShowSectors(false); }}
                  onBlur={() => setTimeout(() => setShowLocations(false), 200)}
                  placeholder="City, Country"
                  className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
                />
              </div>
              <AnimatePresence>
                {showLocations && locationHq.length > 0 && filteredLocations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute z-20 top-full mt-1 w-full bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1"
                  >
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc}
                        onMouseDown={() => { setLocationHq(loc); setShowLocations(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors flex items-center gap-2"
                      >
                        <MapPin size={12} className="text-[var(--neutral-gray)] shrink-0" />
                        {loc}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview & Save */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
        >
          <Eye size={14} /> Preview Profile
        </button>
        <button
          onClick={handleSave}
          disabled={updateOrg.isPending || !isDirty}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] disabled:opacity-50 transition-colors"
        >
          {updateOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowPreview(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)]">Profile Preview</h3>
                <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] text-[var(--neutral-gray)]">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-[var(--border)]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                      <Building2 size={24} className="text-[#C4A35A]" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">{companyName || "Company Name"}</h4>
                    {sector && <p className="text-sm text-[var(--neutral-gray)]">{sector}</p>}
                    {locationHq && (
                      <p className="text-sm text-[var(--neutral-gray)] flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {locationHq}
                      </p>
                    )}
                  </div>
                </div>
                {websiteUrl && (
                  <p className="text-sm text-[#C4A35A] flex items-center gap-1 mb-3">
                    <Globe size={12} /> {websiteUrl}
                  </p>
                )}
                <p className="text-sm text-[var(--neutral-gray)] leading-relaxed">
                  {description || "No description provided yet."}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Team & Roles
   ══════════════════════════════════════════════════════════════════ */

function TeamSection({ org, refetch }: { org: EmployerOrg; refetch: () => void }) {
  const teamMembers: EmployerUser[] = org.employerUsers || [];
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<EmployerUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setIsInviting(true);
    try {
      await apiClient.post("/employers/me/team/invite", {
        email: inviteEmail.trim(),
        contactName: inviteName.trim(),
        role: inviteRole,
        message: inviteMessage.trim() || undefined,
      });
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      setInviteMessage("");
      refetch();
      toast.success("Invitation sent!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await apiClient.delete(`/employers/me/team/${removeTarget.id}`);
      refetch();
      toast.success("Member removed.");
      setRemoveTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <SectionShell title="Team & Roles" description="Manage team members, roles, and invite new colleagues.">
      {/* Members List */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center shrink-0">
              <Users size={18} className="text-[#C4A35A]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Team Members</h3>
              <p className="text-xs text-[var(--neutral-gray)]">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
          >
            <UserPlus size={14} /> Invite
          </button>
        </div>

        {teamMembers.length === 0 ? (
          <div className="py-10 text-center">
            <Users size={36} className="mx-auto text-[var(--surface-3)] mb-3" />
            <p className="text-sm text-[var(--neutral-gray)]">No team members yet. Invite your colleagues.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] -mx-6">
            {teamMembers.map((member) => {
              const roleConf = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              return (
                <div key={member.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--surface-1)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: roleConf.color + "15" }}>
                      <span className="text-sm font-bold" style={{ color: roleConf.color }}>
                        {member.contactName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{member.contactName}</p>
                      <p className="text-xs text-[var(--neutral-gray)] truncate">{member.roleTitle || "Team member"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize"
                      style={{ backgroundColor: roleConf.color + "12", color: roleConf.color }}
                    >
                      <roleConf.icon size={11} />
                      {roleConf.label}
                    </span>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => setRemoveTarget(member)}
                        className="p-1.5 rounded-lg hover:bg-[var(--error)]/5 text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardTitle icon={ShieldCheck} label="Role Permissions" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ROLE_CONFIG).map(([key, conf]) => (
            <div key={key} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: conf.color + "12" }}>
                  <conf.icon size={14} style={{ color: conf.color }} />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{conf.label}</span>
              </div>
              <ul className="space-y-1.5">
                {conf.permissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-1.5 text-xs text-[var(--neutral-gray)]">
                    <Check size={10} className="mt-0.5 shrink-0" style={{ color: conf.color }} />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowInvite(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--surface-0)] rounded-2xl shadow-xl border border-[var(--border)] p-6"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-[#C4A35A]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invite Team Member</h3>
              </div>
              <p className="text-sm text-[var(--neutral-gray)] mb-5">
                Send an invitation email to add a new team member.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name <span className="text-[var(--error)]">*</span></label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email <span className="text-[var(--error)]">*</span></label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Role</label>
                  <div className="space-y-2">
                    {(["admin", "member"] as const).map((role) => {
                      const conf = ROLE_CONFIG[role];
                      return (
                        <label
                          key={role}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                            inviteRole === role ? "border-[#C4A35A]/30 bg-[#C4A35A]/5" : "border-[var(--border)] hover:border-[var(--neutral-gray)]",
                          )}
                        >
                          <input
                            type="radio"
                            name="invite-role"
                            value={role}
                            checked={inviteRole === role}
                            onChange={() => setInviteRole(role)}
                            className="w-4 h-4 accent-[#C4A35A]"
                          />
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{conf.label}</p>
                            <p className="text-xs text-[var(--neutral-gray)]">{conf.permissions[0]}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Message (optional)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Add a personal note..."
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)] resize-none h-16"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 text-sm font-medium text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={isInviting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] disabled:opacity-50 transition-colors"
                >
                  {isInviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Invite
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove Team Member"
        message={`This will revoke ${removeTarget?.contactName || "this member"}'s access to the organization. They will no longer be able to manage jobs or view applications.`}
        confirmLabel="Remove"
        variant="danger"
        loading={isRemoving}
      />
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Notifications
   ══════════════════════════════════════════════════════════════════ */

function NotificationsSection() {
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, true])),
  );
  const [inAppToggles, setInAppToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, true])),
  );
  const [digestFrequency, setDigestFrequency] = useState("weekly");
  const [testSending, setTestSending] = useState(false);

  const handleTest = async () => {
    setTestSending(true);
    setTimeout(() => {
      toast.success("Test notification sent to your email!");
      setTestSending(false);
    }, 1500);
  };

  const handleSave = () => {
    toast.success("Notification preferences saved");
  };

  return (
    <SectionShell title="Notifications" description="Control how and when you receive updates.">
      {/* Email Notifications */}
      <Card>
        <CardTitle icon={Mail} label="Email Notifications" />
        <div className="space-y-0 divide-y divide-[var(--border)] -mx-6">
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{cat.label}</p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{cat.description}</p>
              </div>
              <Toggle
                checked={emailToggles[cat.key]}
                onChange={(v) => setEmailToggles((p) => ({ ...p, [cat.key]: v }))}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardTitle icon={Bell} label="In-App Notifications" />
        <div className="space-y-0 divide-y divide-[var(--border)] -mx-6">
          {NOTIFICATION_CATEGORIES.filter((c) => c.key !== "weekly_digest").map((cat) => (
            <div key={cat.key} className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{cat.label}</p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{cat.description}</p>
              </div>
              <Toggle
                checked={inAppToggles[cat.key]}
                onChange={(v) => setInAppToggles((p) => ({ ...p, [cat.key]: v }))}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Digest Frequency */}
      <Card>
        <CardTitle icon={Clock} label="Digest Frequency" />
        <p className="text-sm text-[var(--neutral-gray)] mb-4">How often should we send you a summary of activity?</p>
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((freq) => (
            <button
              key={freq}
              onClick={() => setDigestFrequency(freq)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize",
                digestFrequency === freq
                  ? "bg-[#C4A35A]/10 text-[#C4A35A] border border-[#C4A35A]/20"
                  : "border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]",
              )}
            >
              {freq}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <button
          onClick={handleTest}
          disabled={testSending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
        >
          {testSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Test Notification
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          <Save size={14} /> Save Preferences
        </button>
      </div>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Hiring Preferences
   ══════════════════════════════════════════════════════════════════ */

function HiringSection({ org }: { org: EmployerOrg }) {
  const updateOrg = useUpdateEmployerOrg();
  const [hiringTracks, setHiringTracks] = useState<string[]>(org.hiringTracks || []);
  const [hiringWorkModes, setHiringWorkModes] = useState<string[]>(org.hiringWorkModes || []);
  const [newTrack, setNewTrack] = useState("");
  const [defaultExpLevel, setDefaultExpLevel] = useState("mid");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  useEffect(() => {
    setHiringTracks(org.hiringTracks || []);
    setHiringWorkModes(org.hiringWorkModes || []);
  }, [org]);

  const handleAddTrack = () => {
    const val = newTrack.trim();
    if (val && !hiringTracks.includes(val)) {
      setHiringTracks((p) => [...p, val]);
      setNewTrack("");
    }
  };

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({ hiringTracks, hiringWorkModes } as any);
      toast.success("Hiring preferences saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  return (
    <SectionShell title="Hiring Preferences" description="Configure defaults for job postings and your hiring pipeline.">
      {/* Hiring Tracks */}
      <Card>
        <CardTitle icon={LayoutGrid} label="Hiring Tracks" />
        <p className="text-xs text-[var(--neutral-gray)] mb-4">Specify which talent tracks your organization is interested in.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <AnimatePresence mode="popLayout">
            {hiringTracks.map((track) => (
              <motion.span
                key={track}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#C4A35A]/10 text-[#C4A35A] font-medium"
              >
                {track}
                <button onClick={() => setHiringTracks((p) => p.filter((t) => t !== track))} className="hover:text-[#A8893D]">
                  <X size={12} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTrack}
            onChange={(e) => setNewTrack(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTrack()}
            placeholder="e.g. Frontend Development, Data Science..."
            className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
          />
          <button
            onClick={handleAddTrack}
            disabled={!newTrack.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] disabled:opacity-40 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </Card>

      {/* Work Modes */}
      <Card>
        <CardTitle icon={Laptop} label="Preferred Work Modes" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WORK_MODES.map((mode) => {
            const selected = hiringWorkModes.includes(mode.value);
            return (
              <button
                key={mode.value}
                onClick={() =>
                  setHiringWorkModes((p) =>
                    p.includes(mode.value) ? p.filter((m) => m !== mode.value) : [...p, mode.value],
                  )
                }
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                  selected
                    ? "border-[#C4A35A] bg-[#C4A35A]/5"
                    : "border-[var(--border)] hover:border-[var(--neutral-gray)]",
                )}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C4A35A] flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selected ? "bg-[#C4A35A]/15" : "bg-[var(--surface-1)]",
                )}>
                  <mode.icon size={18} className={selected ? "text-[#C4A35A]" : "text-[var(--neutral-gray)]"} />
                </div>
                <p className={cn("text-sm font-semibold", selected ? "text-[#C4A35A]" : "text-[var(--text-primary)]")}>{mode.label}</p>
                <p className="text-[11px] text-[var(--neutral-gray)] leading-snug">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Default Job Settings */}
      <Card>
        <CardTitle icon={Settings} label="Default Job Settings" />
        <p className="text-xs text-[var(--neutral-gray)] mb-4">These defaults are pre-filled when you create a new job.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Default Experience Level</label>
            <div className="flex gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setDefaultExpLevel(level.value)}
                  className={cn(
                    "flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    defaultExpLevel === level.value
                      ? "bg-[#C4A35A]/10 text-[#C4A35A] border border-[#C4A35A]/20"
                      : "border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]",
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Default Salary Currency</label>
            <div className="relative">
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardTitle icon={Zap} label="Default Pipeline Stages" />
        <p className="text-xs text-[var(--neutral-gray)] mb-4">Configure the default stages for new hiring pipelines. Drag to reorder.</p>
        <div className="space-y-2">
          {DEFAULT_PIPELINE_STAGES.map((stage, idx) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <GripVertical size={14} className="text-[var(--neutral-gray)] cursor-grab shrink-0" />
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
              <span className="text-sm font-medium text-[var(--text-primary)] flex-1">{stage.label}</span>
              <span className="text-xs text-[var(--neutral-gray)] tabular-nums">Step {idx + 1}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateOrg.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] disabled:opacity-50 transition-colors"
        >
          {updateOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Preferences
        </button>
      </div>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Integrations (Placeholder)
   ══════════════════════════════════════════════════════════════════ */

function IntegrationsSection() {
  const integrations = [
    { name: "Slack", description: "Get notifications in your Slack channels", icon: "S", bg: "#4A154B" },
    { name: "Google Calendar", description: "Sync interview schedules automatically", icon: "G", bg: "#4285F4" },
    { name: "LinkedIn", description: "Import candidate profiles from LinkedIn", icon: "in", bg: "#0A66C2" },
    { name: "Zapier", description: "Connect with 5,000+ other apps", icon: "Z", bg: "#FF4A00" },
  ];

  return (
    <SectionShell title="Integrations" description="Connect external services to streamline your workflow.">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((intg) => (
            <div key={intg.name} className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--neutral-gray)] transition-colors">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: intg.bg }}
              >
                {intg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{intg.name}</p>
                <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{intg.description}</p>
              </div>
              <button className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors">
                Connect
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-dashed border-[var(--border)] text-center">
          <p className="text-sm text-[var(--neutral-gray)]">
            More integrations coming soon. Have a suggestion?{" "}
            <button className="text-[#C4A35A] font-medium hover:underline">Let us know</button>
          </p>
        </div>
      </Card>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Billing (Placeholder)
   ══════════════════════════════════════════════════════════════════ */

function BillingSection() {
  return (
    <SectionShell title="Billing" description="Manage your subscription plan and payment methods.">
      <Card>
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-[#C4A35A]/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard size={24} className="text-[#C4A35A]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">Free Plan</h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-4 max-w-sm mx-auto">
            You are currently on the free plan. Upgrade to unlock premium features like advanced analytics, priority support, and more.
          </p>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C4A35A] to-[#A8893D] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
            <Zap size={14} /> Upgrade Plan
          </button>
        </div>
      </Card>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Section: Security
   ══════════════════════════════════════════════════════════════════ */

function SecuritySection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error("Fill in all password fields"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    try {
      await apiClient.put("/me/password", { currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  const sessions = [
    { device: "Chrome on macOS", ip: "102.89.xx.xx", date: "Active now", current: true },
    { device: "Safari on iPhone", ip: "102.89.xx.xx", date: "2 hours ago", current: false },
    { device: "Firefox on Windows", ip: "41.203.xx.xx", date: "3 days ago", current: false },
  ];

  return (
    <SectionShell title="Security" description="Manage your account security and active sessions.">
      {/* Change Password */}
      <Card>
        <CardTitle icon={Key} label="Change Password" />
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-0)]"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPw}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] disabled:opacity-50 transition-colors"
          >
            {changingPw ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            Update Password
          </button>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center shrink-0">
              <Fingerprint size={18} className="text-[#C4A35A]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Two-Factor Authentication</h3>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Add an extra layer of security to your account</p>
            </div>
          </div>
          <Toggle checked={twoFaEnabled} onChange={setTwoFaEnabled} />
        </div>
        {!twoFaEnabled && (
          <p className="text-xs text-[var(--neutral-gray)] mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
            We strongly recommend enabling 2FA. It protects your account even if your password is compromised.
          </p>
        )}
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardTitle icon={Monitor} label="Active Sessions" />
        <div className="space-y-0 divide-y divide-[var(--border)] -mx-6">
          {sessions.map((session, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                  {session.device.includes("iPhone") ? (
                    <Smartphone size={16} className="text-[var(--neutral-gray)]" />
                  ) : (
                    <Monitor size={16} className="text-[var(--neutral-gray)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{session.device}</p>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    {session.ip} · {session.date}
                  </p>
                </div>
              </div>
              {session.current ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  This device
                </span>
              ) : (
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* API Keys (Placeholder) */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-1)] flex items-center justify-center shrink-0">
              <Key size={18} className="text-[var(--neutral-gray)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">API Keys</h3>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Manage API keys for programmatic access</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-1)] text-[var(--neutral-gray)]">Coming Soon</span>
        </div>
      </Card>

      {/* Login History */}
      <Card>
        <CardTitle icon={Clock} label="Login History" />
        <div className="space-y-2">
          {[
            { date: "Feb 18, 2026 09:42 AM", ip: "102.89.xx.xx", device: "Chrome on macOS", status: "success" },
            { date: "Feb 17, 2026 03:15 PM", ip: "102.89.xx.xx", device: "Safari on iPhone", status: "success" },
            { date: "Feb 16, 2026 11:30 AM", ip: "41.203.xx.xx", device: "Firefox on Windows", status: "success" },
            { date: "Feb 15, 2026 08:22 PM", ip: "154.118.xx.xx", device: "Unknown Browser", status: "failed" },
            { date: "Feb 14, 2026 10:05 AM", ip: "102.89.xx.xx", device: "Chrome on macOS", status: "success" },
          ].map((entry, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--surface-1)] transition-colors">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  entry.status === "success" ? "bg-emerald-500" : "bg-red-500",
                )} />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{entry.device}</p>
                  <p className="text-xs text-[var(--neutral-gray)]">{entry.ip}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--neutral-gray)] tabular-nums">{entry.date}</p>
            </div>
          ))}
        </div>
      </Card>
    </SectionShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════════════════════ */

export default function EmployerSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("organization");
  const { data: org, isLoading, error, refetch } = useMyEmployerOrg();

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        <div className="flex gap-6">
          <div className="hidden md:block w-64 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-[var(--surface-2)] rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="flex-1 h-96 bg-[var(--surface-2)] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Error
  if (error || !org) {
    return (
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Failed to load settings</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "organization": return <OrganizationSection org={org} refetch={refetch} />;
      case "team": return <TeamSection org={org} refetch={refetch} />;
      case "notifications": return <NotificationsSection />;
      case "hiring": return <HiringSection org={org} />;
      case "integrations": return <IntegrationsSection />;
      case "billing": return <BillingSection />;
      case "security": return <SecuritySection />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          Manage your organization, team, and account preferences.
        </p>
      </div>

      {/* Mobile Section Selector */}
      <div className="md:hidden relative">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
          className="w-full appearance-none px-4 py-3 border border-[var(--border)] rounded-xl text-sm font-medium bg-[var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation — Desktop */}
        <nav className="hidden md:block w-64 shrink-0">
          <div className="sticky top-20 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group",
                    active
                      ? "bg-[#C4A35A]/10 text-[#C4A35A]"
                      : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <item.icon size={18} className={active ? "text-[#C4A35A]" : "text-[var(--neutral-gray)] group-hover:text-[var(--text-primary)]"} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium truncate", active && "font-semibold")}>{item.label}</p>
                    <p className="text-[11px] text-[var(--neutral-gray)] truncate">{item.description}</p>
                  </div>
                  {active && (
                    <ChevronRight size={14} className="ml-auto shrink-0 text-[#C4A35A]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <Fragment key={activeSection}>
              {renderSection()}
            </Fragment>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
