"use client";

import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Monitor,
  Wifi,
  Building2,
  CheckCircle2,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { Button } from "@digibit/ui/components";
import { AnimatedCard } from "@/components/shared/animated-card";
import { AvailabilityBadge } from "./availability-badge";
import type { AvailabilityStatus } from "@/types/candidate";

// ---------------------------------------------------------------------------
// Types - accept both API and legacy shapes
// ---------------------------------------------------------------------------

interface CandidateCardData {
  id: string;
  slug: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  photoUrl: string | null;
  bio?: string | null;
  primaryTrack?: { name: string } | null;
  primaryTrackName?: string;
  availabilityStatus?: string | null;
  availability?: string;
  preferredWorkMode?: string | null;
  workMode?: string;
  city?: string | null;
  country?: string | null;
  candidateSkills?: { isVerified: boolean; skill?: { name: string } }[];
  skills?: { name: string; verified: boolean }[];
  yearsOfExperience?: number | null;
  profileStrength?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2);
}

function getName(candidate: CandidateCardData): string {
  if (candidate.fullName) return candidate.fullName;
  return `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
}

function getTrackName(candidate: CandidateCardData): string {
  if (candidate.primaryTrack?.name) return candidate.primaryTrack.name;
  if (candidate.primaryTrackName) return candidate.primaryTrackName;
  return "Developer";
}

function getSkills(candidate: CandidateCardData): { name: string; verified: boolean }[] {
  if (candidate.candidateSkills) {
    return candidate.candidateSkills.map((cs) => ({
      name: cs.skill?.name || "",
      verified: cs.isVerified,
    }));
  }
  if (candidate.skills) return candidate.skills;
  return [];
}

function getWorkModeIcon(mode: string | null | undefined) {
  const map: Record<string, typeof Monitor> = {
    remote: Wifi,
    hybrid: Monitor,
    on_site: Building2,
  };
  return map[mode || "remote"] || Wifi;
}

function getStrengthColor(strength: number): string {
  if (strength < 50) return "var(--error)";
  if (strength < 80) return "var(--warning)";
  return "var(--success)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CandidateCardProps {
  candidate: CandidateCardData;
  index?: number;
}

export function CandidateCard({ candidate, index = 0 }: CandidateCardProps) {
  const name = getName(candidate);
  const trackName = getTrackName(candidate);
  const skills = getSkills(candidate);
  const topSkills = skills.slice(0, 5);
  const location = [candidate.city, candidate.country].filter(Boolean).join(", ");
  const availStatus = (candidate.availabilityStatus || candidate.availability || "not_available") as AvailabilityStatus;
  const workModeVal = candidate.preferredWorkMode || candidate.workMode;
  const WorkModeIcon = getWorkModeIcon(workModeVal);
  const yrsExp = candidate.yearsOfExperience;
  const profileStrength = candidate.profileStrength;

  return (
    <AnimatedCard index={index} hoverable={false} className="group flex flex-col overflow-hidden p-0 hover:shadow-lg hover:border-l-2 hover:border-l-[var(--primary)] transition-all duration-200">
      <Link href={`/talents/${candidate.slug}`} className="flex flex-col flex-1">
        {/* Top accent bar — always visible */}
        <div className="h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-orange)] flex-shrink-0" />

        <div className="relative p-5 flex flex-col flex-1">
          {/* Top row: Avatar + Name */}
          <div className="flex items-start gap-3.5">
            {/* Avatar with availability overlay */}
            <div className="relative flex-shrink-0">
              {candidate.photoUrl ? (
                <Image
                  src={candidate.photoUrl}
                  alt={name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-lg font-bold text-white ring-2 ring-white shadow-sm">
                  {getInitials(name)}
                </div>
              )}
              {/* Availability overlay on avatar */}
              <div className="absolute -bottom-1 -right-1">
                <AvailabilityBadge status={availStatus} size="sm" />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="truncate text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors duration-200">
                {name}
              </h3>
              <span className="mt-1 inline-block rounded-full bg-[var(--primary)]/5 px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                {trackName}
              </span>
            </div>
          </div>

          {/* Bio preview */}
          {candidate.bio && (
            <p className="mt-3 text-xs text-[var(--neutral-gray)] line-clamp-2 leading-relaxed">
              {candidate.bio}
            </p>
          )}

          {/* Skills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
              >
                {skill.verified && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-[var(--success)]" />
                )}
                {skill.name}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="inline-flex items-center rounded-full bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--neutral-gray)]">
                +{skills.length - 5}
              </span>
            )}
          </div>

          {/* Footer: Location + Experience */}
          <div className="mt-auto pt-4 flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
            {location && yrsExp != null && (
              <span aria-hidden="true">·</span>
            )}
            {yrsExp != null && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {yrsExp}+ yrs
              </span>
            )}
          </div>

          {/* Hover: "View Profile" overlay */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4 pointer-events-none">
            <div className="group-hover:opacity-100 group-hover:translate-y-0 opacity-0 translate-y-2 transition-all duration-200 pointer-events-auto">
              <Button variant="glass" size="sm" className="shadow-lg">
                View Profile
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Profile strength bar */}
        {profileStrength != null && (
          <div className="h-0.5 w-full bg-[var(--surface-2)]">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(profileStrength, 100)}%`,
                backgroundColor: getStrengthColor(profileStrength),
              }}
            />
          </div>
        )}
      </Link>
    </AnimatedCard>
  );
}
