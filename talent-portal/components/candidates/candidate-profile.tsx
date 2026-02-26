"use client";

import {
  MapPin,
  Globe,
  Clock,
  Github,
  Linkedin,
  ExternalLink,
  Monitor,
  Wifi,
  Building2,
  GraduationCap,
  Eye,
  MessageSquare,
} from "lucide-react";
import type { CandidateProfile as CandidateProfileType } from "@/types/candidate";
import { AvailabilityStatus, WorkMode } from "@/types/candidate";
import { AvailabilityBadge } from "./availability-badge";
import { SkillTagsDisplay } from "./skill-tags";
import { ProfileStrengthMeter } from "./profile-strength-meter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateProfileProps {
  candidate: CandidateProfileType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return fullName.charAt(0).toUpperCase();
}

function getWorkModeConfig(mode: WorkMode) {
  const map: Record<WorkMode, { label: string; Icon: typeof Monitor }> = {
    [WorkMode.REMOTE]: { label: "Remote", Icon: Wifi },
    [WorkMode.HYBRID]: { label: "Hybrid", Icon: Monitor },
    [WorkMode.ON_SITE]: { label: "On-site", Icon: Building2 },
  };
  return map[mode];
}

function getMissingFields(candidate: CandidateProfileType): string[] {
  const missing: string[] = [];
  if (!candidate.photoUrl) missing.push("Profile photo");
  if (!candidate.bio) missing.push("Bio");
  if (!candidate.city || !candidate.country) missing.push("Location");
  if (!candidate.candidateSkills || candidate.candidateSkills.length === 0) missing.push("Skills");
  if (!candidate.githubUrl && !candidate.linkedinUrl) missing.push("Social links");
  if (!candidate.candidateProjects || candidate.candidateProjects.length === 0) missing.push("Projects");
  if (!candidate.availabilityStatus) missing.push("Availability");
  if (!candidate.yearsOfExperience) missing.push("Years of experience");
  return missing;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateProfile({ candidate }: CandidateProfileProps) {
  const workMode = candidate.preferredWorkMode
    ? getWorkModeConfig(candidate.preferredWorkMode)
    : null;

  const missingFields = getMissingFields(candidate);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--warning)]" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.fullName}
                className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-4 ring-[var(--surface-2)]"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-2xl font-bold text-white ring-4 ring-[var(--surface-2)]">
                {getInitials(candidate.fullName)}
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  {candidate.fullName}
                </h1>
                {candidate.availabilityStatus && (
                  <AvailabilityBadge
                    status={candidate.availabilityStatus}
                    size="md"
                  />
                )}
              </div>

              {candidate.primaryTrack && (
                <p className="mt-1 text-sm font-medium text-[var(--primary)]">
                  {candidate.primaryTrack.name}
                </p>
              )}

              {candidate.bio && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--neutral-gray)]">
                  {candidate.bio}
                </p>
              )}

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--neutral-gray)]">
                {(candidate.city || candidate.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {[candidate.city, candidate.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {candidate.timezone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {candidate.timezone}
                  </span>
                )}
                {workMode && (
                  <span className="inline-flex items-center gap-1.5">
                    <workMode.Icon className="h-4 w-4" />
                    {workMode.label}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-4 text-xs text-[var(--neutral-gray)]">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {candidate.profileViews} views
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {candidate.introRequestsReceived} intro requests
                </span>
              </div>
            </div>

            {/* Profile Strength */}
            <div className="shrink-0">
              <ProfileStrengthMeter
                strength={candidate.profileStrength}
                missingFields={missingFields}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Skills ── */}
      {candidate.candidateSkills && candidate.candidateSkills.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Skills
          </h2>
          <SkillTagsDisplay skills={candidate.candidateSkills} />
        </section>
      )}

      {/* ── Projects ── */}
      {candidate.candidateProjects &&
        candidate.candidateProjects.length > 0 && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
              Projects
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {candidate.candidateProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--neutral-gray)]">
                      {project.description}
                    </p>
                  )}
                  {project.techStack && project.techStack.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Links */}
                  <div className="mt-3 flex items-center gap-3">
                    {project.projectUrl && (
                      <a
                        href={project.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--secondary)]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Live
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--secondary)]"
                      >
                        <Github className="h-3 w-3" />
                        Code
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* ── Links ── */}
      {(candidate.githubUrl ||
        candidate.linkedinUrl ||
        candidate.portfolioUrl ||
        candidate.personalWebsite) && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {candidate.githubUrl && (
              <a
                href={candidate.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            )}
            {candidate.linkedinUrl && (
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {candidate.portfolioUrl && (
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Globe className="h-4 w-4" />
                Portfolio
              </a>
            )}
            {candidate.personalWebsite && (
              <a
                href={candidate.personalWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── Track & Cohort ── */}
      {(candidate.primaryTrack || candidate.cohort) && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Program Info
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {candidate.primaryTrack && (
              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Track
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
                  {candidate.primaryTrack.name}
                </p>
                {candidate.primaryTrack.description && (
                  <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                    {candidate.primaryTrack.description}
                  </p>
                )}
              </div>
            )}
            {candidate.cohort && (
              <div className="rounded-lg bg-[var(--surface-1)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                  Cohort
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {candidate.cohort.name}
                </p>
                {candidate.cohort.programCycle && (
                  <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                    {candidate.cohort.programCycle}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
