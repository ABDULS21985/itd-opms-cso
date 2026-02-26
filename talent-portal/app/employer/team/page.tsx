"use client";

import { useState, useMemo } from "react";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  Crown,
  MoreVertical,
  Trash2,
  X,
  Mail,
  Search,
  Phone,
  Calendar,
  Loader2,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeamMembers, useInviteMember, useUpdateMemberRole, useRemoveMember } from "@/hooks/use-team";
import { useAuth } from "@/providers/auth-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Role config
// ─────────────────────────────────────────────────────────────────────────────

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string; bg: string; border: string }> = {
  owner: { label: "Owner", icon: Crown, color: "#C4A35A", bg: "bg-gradient-to-br from-[#C4A35A]/15 to-[#A8893D]/10", border: "border-[#C4A35A]/30" },
  admin: { label: "Admin", icon: ShieldCheck, color: "#3B82F6", bg: "bg-[var(--primary)]/10", border: "border-[var(--primary)]/20" },
  member: { label: "Member", icon: Shield, color: "#6B7280", bg: "bg-[var(--surface-2)]", border: "border-[var(--border)]" },
};

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Card
// ─────────────────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isCurrentUser,
  index,
  onChangeRole,
  onRemove,
}: {
  member: any;
  isCurrentUser: boolean;
  index: number;
  onChangeRole: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = roleConfig[member.role] || roleConfig.member;
  const RoleIcon = config.icon;
  const displayName = member.contactName || member.user?.displayName || "Unknown";
  const email = member.user?.email || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="group relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Role accent stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: config.color }} />

      <div className="p-5 pt-4">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-lg font-bold shadow-sm border"
            style={{
              backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)`,
              borderColor: `color-mix(in srgb, ${config.color} 20%, transparent)`,
              color: config.color,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-full">
            {displayName}
            {isCurrentUser && (
              <span className="text-[10px] font-medium text-[var(--neutral-gray)] ml-1">(You)</span>
            )}
          </h3>
          <p className="text-xs text-[var(--neutral-gray)] truncate max-w-full mt-0.5">{email}</p>
        </div>

        {/* Role Badge */}
        <div className="flex justify-center mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${config.bg} ${config.border}`}
            style={{ color: config.color }}
          >
            <RoleIcon size={13} />
            {config.label}
          </span>
        </div>

        {/* Contact info */}
        <div className="space-y-2 text-xs text-[var(--neutral-gray)]">
          {member.phone && (
            <div className="flex items-center gap-2">
              <Phone size={11} /> {member.phone}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={11} /> Joined {formatJoinDate(member.createdAt || new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      {member.role !== "owner" && !isCurrentUser && (
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[160px] py-1">
                {member.role !== "admin" && (
                  <button
                    onClick={() => { onChangeRole(member.userId, "admin"); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <ShieldCheck size={14} className="text-[var(--primary)]" /> Make Admin
                  </button>
                )}
                {member.role !== "member" && (
                  <button
                    onClick={() => { onChangeRole(member.userId, "member"); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <Shield size={14} className="text-[var(--neutral-gray)]" /> Make Member
                  </button>
                )}
                <div className="my-1 border-t border-[var(--border)]" />
                <button
                  onClick={() => { onRemove(member.userId); setMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors text-left"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite CTA Card
// ─────────────────────────────────────────────────────────────────────────────

function InviteCTACard({ onClick, index }: { onClick: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      onClick={onClick}
      className="group flex flex-col items-center justify-center bg-[var(--surface-1)] rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[#C4A35A]/40 p-8 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 min-h-[260px] cursor-pointer"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#C4A35A]/10 flex items-center justify-center mb-3 group-hover:bg-[#C4A35A]/15 transition-colors">
        <UserPlus size={24} className="text-[#C4A35A]" />
      </div>
      <p className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Invite Team Member</p>
      <p className="text-xs text-[var(--neutral-gray)]">Add colleagues to your team</p>
    </motion.button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════

export default function TeamPage() {
  const { user } = useAuth();
  const { data: members, isLoading, isError, refetch } = useTeamMembers();
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteName, setInviteName] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const teamMembers: any[] = Array.isArray(members) ? members : [];

  // ── Filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = teamMembers;
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          (m.contactName || m.user?.displayName || "").toLowerCase().includes(q) ||
          (m.user?.email || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [teamMembers, roleFilter, search]);

  // ── Role counts ─────────────────────────────────────────────────────
  const roleCounts = useMemo(() => ({
    all: teamMembers.length,
    owner: teamMembers.filter((m) => m.role === "owner").length,
    admin: teamMembers.filter((m) => m.role === "admin").length,
    member: teamMembers.filter((m) => m.role === "member").length,
  }), [teamMembers]);

  // ── Handlers ────────────────────────────────────────────────────────
  function handleInvite() {
    if (!inviteEmail) return;
    inviteMember.mutate(
      { email: inviteEmail, role: inviteRole, contactName: inviteName || undefined },
      {
        onSuccess: () => {
          toast.success("Invite sent successfully!");
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteRole("member");
          setInviteName("");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to invite member");
        },
      },
    );
  }

  function handleRoleChange(userId: string, newRole: string) {
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => toast.success(`Role updated to ${newRole}`),
        onError: (err: Error) => toast.error(err.message || "Failed to update role"),
      },
    );
  }

  function handleRemove(userId: string) {
    removeMember.mutate(userId, {
      onSuccess: () => { toast.success("Member removed"); setConfirmRemove(null); },
      onError: (err: Error) => { toast.error(err.message || "Failed to remove"); setConfirmRemove(null); },
    });
  }

  // ── Loading / Error ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-[var(--surface-1)] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Failed to load team</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">Something went wrong. Please try again.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team</h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-1">
            Manage your organization members and roles &middot; {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C4A35A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A8893D] transition-colors"
        >
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Role Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "owner", "admin", "member"] as const).map((role) => {
            const rc = role !== "all" ? roleConfig[role] : null;
            const Icon = rc?.icon;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  roleFilter === role
                    ? "bg-[#C4A35A]/10 text-[#C4A35A] font-semibold"
                    : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {Icon && <Icon size={13} style={{ color: rc?.color }} />}
                {role === "all" ? "All" : rc?.label}
                <span className="text-[10px] font-bold ml-0.5">
                  {roleCounts[role]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-1)]"
          />
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((member: any, i: number) => {
          const isCurrentUser = member.userId === user?.id;
          return (
            <MemberCard
              key={member.id || member.userId}
              member={member}
              isCurrentUser={isCurrentUser}
              index={i}
              onChangeRole={handleRoleChange}
              onRemove={(userId) => setConfirmRemove(userId)}
            />
          );
        })}
        <InviteCTACard onClick={() => setShowInviteModal(true)} index={filtered.length} />
      </div>

      {filtered.length === 0 && teamMembers.length > 0 && (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-10 text-center">
          <Users size={36} className="mx-auto text-[var(--surface-3)] mb-3" />
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No members match your filters</p>
          <p className="text-xs text-[var(--neutral-gray)]">Try adjusting the role filter or search query.</p>
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                    <UserPlus size={18} className="text-[#C4A35A]" />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Invite Team Member</h2>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">
                    Name <span className="font-normal text-[var(--neutral-gray)]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["member", "admin"] as const).map((role) => {
                      const rc = roleConfig[role];
                      const Icon = rc.icon;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setInviteRole(role)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            inviteRole === role
                              ? "border-[#C4A35A] bg-[#C4A35A]/5"
                              : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          <Icon size={16} style={{ color: rc.color }} />
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{rc.label}</p>
                            <p className="text-[10px] text-[var(--neutral-gray)]">
                              {role === "admin" ? "Can manage jobs & team" : "View and apply access"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteMember.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#C4A35A] text-white hover:bg-[#A8893D] disabled:opacity-50 transition-colors"
                >
                  {inviteMember.isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {inviteMember.isPending ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && handleRemove(confirmRemove)}
        title="Remove Team Member"
        message="Are you sure you want to remove this member? They will lose access to your organization."
        confirmLabel="Remove"
        variant="danger"
        loading={removeMember.isPending}
      />
    </div>
  );
}
