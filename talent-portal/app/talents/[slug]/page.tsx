import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Wifi,
  Monitor,
  Building2,
  CheckCircle2,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Briefcase,
  Send,
  Award,
  Code2,
  TrendingUp,
  Zap,
  ChevronRight,
  Users,
  Link2,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PersonJsonLd } from "@/components/seo/json-ld";
import { CandidateCard } from "@/components/candidates/candidate-card";
import {
  fetchCandidateBySlug,
  fetchCandidates,
  type PublicCandidate,
} from "@/lib/server-api";
import { generateCandidateMetadata } from "@/lib/metadata";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { ExpandableBio } from "./bio-section";

// =============================================================================
// Dynamic Metadata
// =============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await fetchCandidateBySlug(slug);
  if (!candidate) {
    return { title: "Candidate Not Found" };
  }
  return generateCandidateMetadata(candidate);
}

// =============================================================================
// Helpers
// =============================================================================

function getAvailabilityConfig(availability: string | null) {
  const map: Record<
    string,
    { label: string; colorClass: string; dotClass: string }
  > = {
    immediate: {
      label: "Available now",
      colorClass: "bg-[var(--success-light)] text-[var(--success-dark)]",
      dotClass: "bg-[var(--success)]",
    },
    one_month: {
      label: "Available within 1 month",
      colorClass: "bg-[var(--warning-light)] text-[var(--warning-dark)]",
      dotClass: "bg-[var(--warning)]",
    },
    two_three_months: {
      label: "Available within 3 months",
      colorClass: "bg-[var(--info-light)] text-[var(--info-dark)]",
      dotClass: "bg-[var(--info)]",
    },
    not_available: {
      label: "Not currently available",
      colorClass: "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
      dotClass: "bg-[var(--neutral-gray)]",
    },
    placed: {
      label: "Placed",
      colorClass: "bg-[var(--primary)]/10 text-[var(--primary)]",
      dotClass: "bg-[var(--primary)]",
    },
  };
  return map[availability || "not_available"] || map.not_available;
}

function getWorkModeConfig(mode: string | null) {
  const map: Record<string, { label: string; Icon: typeof Monitor }> = {
    remote: { label: "Remote", Icon: Wifi },
    hybrid: { label: "Hybrid", Icon: Monitor },
    on_site: { label: "On-site", Icon: Building2 },
  };
  return map[mode || "remote"] || map.remote;
}

function getInitials(fullName: string): string {
  const parts = fullName.split(" ");
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Page
// =============================================================================

export default async function CandidateProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const candidate = await fetchCandidateBySlug(slug);

  if (!candidate) {
    notFound();
  }

  const fullName = candidate.fullName;
  const availability = getAvailabilityConfig(candidate.availabilityStatus);
  const workMode = getWorkModeConfig(candidate.preferredWorkMode);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://talent.digibit.com";

  const skills = (candidate.candidateSkills || []).map((cs) => ({
    name: cs.skill?.name || "",
    verified: cs.isVerified,
  }));
  const verifiedSkills = skills.filter((s) => s.verified);
  const otherSkills = skills.filter((s) => !s.verified);

  const projects = (candidate.candidateProjects || []).map((p) => ({
    title: p.title,
    description: p.description || "",
    outcome: p.outcomeMetric || "",
    techStack: p.techStack || [],
    liveUrl: p.projectUrl,
    repoUrl: p.githubUrl,
    imageUrl: p.imageUrl,
  }));

  const socialLinks = [
    candidate.githubUrl && {
      href: candidate.githubUrl,
      label: "GitHub",
      Icon: Github,
      bg: "bg-[#24292e]",
      hoverBg: "hover:bg-[#1b1f23]",
    },
    candidate.linkedinUrl && {
      href: candidate.linkedinUrl,
      label: "LinkedIn",
      Icon: Linkedin,
      bg: "bg-[#0A66C2]",
      hoverBg: "hover:bg-[#004182]",
    },
    candidate.portfolioUrl && {
      href: candidate.portfolioUrl,
      label: "Portfolio",
      Icon: Globe,
      bg: "bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]",
      hoverBg: "hover:opacity-90",
    },
    candidate.personalWebsite && {
      href: candidate.personalWebsite,
      label: "Website",
      Icon: Link2,
      bg: "bg-[var(--surface-0)] border border-[var(--border)]",
      hoverBg: "hover:bg-[var(--surface-1)]",
      textColor: "text-[var(--foreground)]",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    Icon: typeof Github;
    bg: string;
    hoverBg: string;
    textColor?: string;
  }[];

  // JSON-LD
  const sameAs = [
    candidate.githubUrl,
    candidate.linkedinUrl,
    candidate.portfolioUrl,
  ].filter(Boolean) as string[];

  // Profile strength ring values
  const profileStrength = candidate.profileStrength ?? 0;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset =
    circumference - (profileStrength / 100) * circumference;
  const strengthColor =
    profileStrength >= 80
      ? "var(--success)"
      : profileStrength >= 60
        ? "var(--primary)"
        : profileStrength >= 40
          ? "var(--accent-orange)"
          : "var(--error)";

  // Fetch similar candidates (same track, exclude current)
  let similarCandidates: PublicCandidate[] = [];
  if (candidate.primaryTrack?.name) {
    try {
      const result = await fetchCandidates({
        track: candidate.primaryTrack.name,
        limit: 4,
      });
      similarCandidates = result.candidates
        .filter((c) => c.id !== candidate.id)
        .slice(0, 3);
    } catch {
      // silently fail
    }
  }

  return (
    <>
      {/* JSON-LD structured data */}
      <PersonJsonLd
        name={fullName}
        jobTitle={candidate.primaryTrack?.name || "Graduate Developer"}
        description={candidate.bio || ""}
        url={`${siteUrl}/talents/${candidate.slug}`}
        image={candidate.photoUrl}
        skills={skills.map((s) => s.name)}
        location={{
          city: candidate.city || "",
          country: candidate.country || "",
        }}
        sameAs={sameAs}
      />

      <Header />
      <main className="min-h-screen bg-[var(--surface-1)]">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  HERO SECTION                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[#0f2d6e]">
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Decorative blobs */}
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[var(--warning)]/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#D4B87A]/10 blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
            {/* Back link */}
            <Link
              href="/talents"
              className="mb-10 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Talent Directory
            </Link>

            {/* Centered hero content */}
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              {candidate.photoUrl ? (
                <div className="relative">
                  <Image
                    src={candidate.photoUrl}
                    alt={fullName}
                    width={120}
                    height={120}
                    className="h-[120px] w-[120px] rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
                  />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--success)] ring-3 ring-white/30" />
                </div>
              ) : (
                <div className="relative">
                  <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-4xl font-bold text-white ring-4 ring-white/30 shadow-2xl backdrop-blur-sm">
                    {getInitials(fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--success)] ring-3 ring-white/30" />
                </div>
              )}

              {/* Name */}
              <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
                {fullName}
              </h1>

              {/* Track badge */}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <Code2 className="h-3.5 w-3.5" />
                {candidate.primaryTrack?.name || "Developer"}
              </span>

              {/* Location, experience, availability row */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {(candidate.city || candidate.country) && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {[candidate.city, candidate.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {candidate.yearsOfExperience != null && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                    <Briefcase className="h-3.5 w-3.5" />
                    {candidate.yearsOfExperience}+{" "}
                    {candidate.yearsOfExperience === 1 ? "year" : "years"}{" "}
                    experience
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${availability.colorClass}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${availability.dotClass}`}
                  />
                  {availability.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  FLOATING STATS ROW                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-12 z-10 grid grid-cols-3 gap-3 sm:gap-4">
            {/* Profile Strength */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-lg">
              <svg
                viewBox="0 0 44 44"
                className="h-10 w-10 shrink-0 -rotate-90"
              >
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="var(--surface-3)"
                  strokeWidth="3"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke={strengthColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)]">
                  {profileStrength}%
                </p>
                <p className="text-[11px] text-[var(--neutral-gray)] leading-tight">
                  Profile Strength
                </p>
              </div>
            </div>

            {/* Years of Experience */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10">
                <Briefcase className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)]">
                  {candidate.yearsOfExperience ?? 0}+
                </p>
                <p className="text-[11px] text-[var(--neutral-gray)] leading-tight">
                  Years Exp.
                </p>
              </div>
            </div>

            {/* Skills Count */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 shadow-lg">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/10">
                <Zap className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)]">
                  {skills.length}
                </p>
                <p className="text-[11px] text-[var(--neutral-gray)] leading-tight">
                  Skills
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  BREADCRUMB                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-md mt-6">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1.5 py-3 text-sm">
              <Link
                href="/talents"
                className="text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
              >
                Talents
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--surface-4)]" />
              <span className="font-medium text-[var(--foreground)] truncate">
                {fullName}
              </span>
            </nav>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  CONTENT AREA                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            {/* ── Main content ── */}
            <div className="space-y-8">
              {/* About */}
              {candidate.bio && (
                <ScrollReveal>
                  <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                      About
                    </h2>
                    <ExpandableBio bio={candidate.bio} />

                    {/* Primary stacks */}
                    {candidate.primaryStacks &&
                      candidate.primaryStacks.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {candidate.primaryStacks.map((stack) => (
                            <span
                              key={stack}
                              className="inline-flex items-center rounded-full bg-gradient-to-r from-[var(--primary)]/5 to-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] ring-1 ring-[var(--primary)]/20"
                            >
                              {stack}
                            </span>
                          ))}
                        </div>
                      )}
                  </section>
                </ScrollReveal>
              )}

              {/* Skills Showcase */}
              {skills.length > 0 && (
                <ScrollReveal delay={0.1}>
                <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                    Skills{" "}
                    <span className="text-sm font-normal text-[var(--neutral-gray)]">
                      ({skills.length})
                    </span>
                  </h2>

                  {/* Verified skills */}
                  {verifiedSkills.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--success-dark)]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                        Verified Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {verifiedSkills.map((skill) => (
                          <span
                            key={skill.name}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 px-3 py-1.5 text-sm font-medium text-[var(--success-dark)]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other skills */}
                  {otherSkills.length > 0 && (
                    <div>
                      {verifiedSkills.length > 0 && (
                        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                          Other Skills
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {otherSkills.map((skill) => (
                          <span
                            key={skill.name}
                            className="inline-flex items-center rounded-lg bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
                    <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                    Verified skills have been assessed by the Digibit team
                  </p>
                </section>
                </ScrollReveal>
              )}

              {/* Projects Gallery */}
              {projects.length > 0 && (
                <ScrollReveal delay={0.15}>
                <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                  <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">
                    Highlighted Projects
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {projects.map((project, idx) => (
                      <div
                        key={idx}
                        className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] transition-shadow hover:shadow-md"
                      >
                        {/* Image header */}
                        {project.imageUrl ? (
                          <div className="relative aspect-video overflow-hidden">
                            <Image
                              src={project.imageUrl}
                              alt={project.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 via-[var(--secondary)]/5 to-[var(--warning)]/10">
                            <span className="text-3xl font-bold text-[var(--primary)]/30">
                              {project.title
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="text-base font-semibold text-[var(--foreground)]">
                            {project.title}
                          </h3>
                          {project.description && (
                            <p className="mt-1.5 text-sm leading-relaxed text-[var(--neutral-gray)] line-clamp-2">
                              {project.description}
                            </p>
                          )}

                          {/* Outcome metric */}
                          {project.outcome && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--success-light)]/50 px-3 py-2">
                              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success-dark)]" />
                              <span className="text-sm font-medium text-[var(--success-dark)]">
                                {project.outcome}
                              </span>
                            </div>
                          )}

                          {/* Tech stack pills */}
                          {project.techStack.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {project.techStack.map((tech) => (
                                <span
                                  key={tech}
                                  className="rounded-md bg-[var(--surface-1)] px-2 py-0.5 text-xs font-medium text-[var(--neutral-gray)]"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          {(project.liveUrl || project.repoUrl) && (
                            <div className="mt-4 flex items-center gap-2">
                              {project.liveUrl && (
                                <a
                                  href={project.liveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Live
                                </a>
                              )}
                              {project.repoUrl && (
                                <a
                                  href={project.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-white"
                                >
                                  <Github className="h-3 w-3" />
                                  View Code
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                </ScrollReveal>
              )}

              {/* Social Links Bar */}
              {socialLinks.length > 0 && (
                <ScrollReveal delay={0.2}>
                <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                    Links
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/link inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${link.bg} ${link.hoverBg} ${link.textColor || "text-white"} shadow-sm hover:shadow-md`}
                      >
                        <link.Icon className="h-4 w-4" />
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </section>
                </ScrollReveal>
              )}

              {/* Program Info */}
              <ScrollReveal delay={0.25}>
              <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                  Program Info
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* Track */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                      <Code2 className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                        Track
                      </p>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {candidate.primaryTrack?.name || "Developer"}
                      </p>
                    </div>
                  </div>

                  {/* Cohort */}
                  {candidate.cohort && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                        <Calendar className="h-4 w-4 text-[var(--warning)]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                          Cohort
                        </p>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {candidate.cohort.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Work Mode */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info)]/10">
                      <workMode.Icon className="h-4 w-4 text-[var(--info)]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                        Work Mode
                      </p>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {workMode.label}
                      </p>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/10">
                      <Award className="h-4 w-4 text-[var(--success)]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
                        Experience
                      </p>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {candidate.yearsOfExperience ?? 0}+{" "}
                        {(candidate.yearsOfExperience ?? 0) === 1
                          ? "year"
                          : "years"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              </ScrollReveal>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="sticky top-16 space-y-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-md p-6 shadow-lg">
                  {/* Availability badge prominent */}
                  <div className="mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${availability.colorClass}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${availability.dotClass} animate-pulse`}
                      />
                      {availability.label}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    Interested in {fullName.split(" ")[0]}?
                  </h3>
                  <p className="mt-1.5 text-sm text-[var(--neutral-gray)]">
                    Request an introduction through our placement team.
                  </p>

                  <Link
                    href="/auth/login"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-[var(--primary)]/25"
                  >
                    <Send className="h-4 w-4" />
                    Request Introduction
                  </Link>

                  <p className="mt-3 text-center text-xs text-[var(--neutral-gray)]">
                    Free &middot; Usually responds within 24 hours
                  </p>

                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="text-center text-xs text-[var(--neutral-gray)]">
                      Sign in as an employer to request an introduction
                    </p>
                  </div>
                </div>

                {/* Quick Details Card */}
                <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                    Details
                  </h3>
                  <dl className="space-y-3">
                    {(candidate.city || candidate.country) && (
                      <div className="flex items-center gap-3">
                        <dt className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)]">
                          <MapPin className="h-4 w-4 text-[var(--neutral-gray)]" />
                        </dt>
                        <dd className="text-sm text-[var(--foreground)]">
                          {[candidate.city, candidate.country]
                            .filter(Boolean)
                            .join(", ")}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <dt className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)]">
                        <workMode.Icon className="h-4 w-4 text-[var(--neutral-gray)]" />
                      </dt>
                      <dd className="text-sm text-[var(--foreground)]">
                        {workMode.label}
                      </dd>
                    </div>
                    <div className="flex items-center gap-3">
                      <dt className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)]">
                        <Briefcase className="h-4 w-4 text-[var(--neutral-gray)]" />
                      </dt>
                      <dd className="text-sm text-[var(--foreground)]">
                        {candidate.yearsOfExperience ?? 0}+ years experience
                      </dd>
                    </div>
                    {candidate.cohort && (
                      <div className="flex items-center gap-3">
                        <dt className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)]">
                          <Calendar className="h-4 w-4 text-[var(--neutral-gray)]" />
                        </dt>
                        <dd className="text-sm text-[var(--foreground)]">
                          {candidate.cohort.name}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SIMILAR CANDIDATES                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {similarCandidates.length > 0 && (
          <ScrollReveal>
          <div className="border-t border-[var(--border)] bg-[var(--surface-0)]">
            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                    <Users className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  Similar Candidates
                </h2>
                <Link
                  href={`/talents${candidate.primaryTrack?.name ? `?track=${encodeURIComponent(candidate.primaryTrack.name)}` : ""}`}
                  className="text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] transition-colors flex items-center gap-1"
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {similarCandidates.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </div>
          </div>
          </ScrollReveal>
        )}

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>
      <Footer />
    </>
  );
}
