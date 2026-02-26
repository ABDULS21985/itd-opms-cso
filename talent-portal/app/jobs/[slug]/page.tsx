import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Wifi,
  Monitor,
  Building2,
  BadgeCheck,
  Banknote,
  Calendar,
  Clock,
  ArrowLeft,
  Briefcase,
  Award,
  CheckCircle2,
  Send,
  ListChecks,
  FileText,
  Users,
  ChevronRight,
  Eye,
  ExternalLink,
  Phone,
  Code2,
  UserCheck,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JobPostingJsonLd } from "@/components/seo/json-ld";
import { fetchJobBySlug } from "@/lib/server-api";
import { generateJobMetadata } from "@/lib/metadata";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { ShareButtons } from "./share-buttons";

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
  const job = await fetchJobBySlug(slug);
  if (!job) {
    return { title: "Job Not Found" };
  }
  return generateJobMetadata(job);
}

// =============================================================================
// Helpers
// =============================================================================

function getJobTypeBadge(type: string) {
  const map: Record<string, { label: string; className: string }> = {
    full_time: {
      label: "Full Time",
      className: "bg-[var(--success-light)] text-[var(--success-dark)]",
    },
    part_time: {
      label: "Part Time",
      className: "bg-[var(--info-light)] text-[var(--info-dark)]",
    },
    contract: {
      label: "Contract",
      className: "bg-[var(--warning-light)] text-[var(--warning-dark)]",
    },
    internship: {
      label: "Internship",
      className: "bg-[var(--primary)]/10 text-[var(--primary)]",
    },
  };
  return (
    map[type] || {
      label: type,
      className: "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
    }
  );
}

function getWorkModeConfig(mode: string) {
  const map: Record<string, { label: string; Icon: typeof Monitor }> = {
    remote: { label: "Remote", Icon: Wifi },
    hybrid: { label: "Hybrid", Icon: Monitor },
    on_site: { label: "On-site", Icon: Building2 },
  };
  return map[mode] || map.remote;
}

function getExperienceLevelLabel(level: string | null | undefined) {
  if (!level) return "Not specified";
  const map: Record<string, string> = {
    entry: "Entry Level",
    junior: "Junior",
    mid: "Mid Level",
    senior: "Senior",
  };
  return map[level] || level;
}

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (min == null || max == null) return null;
  const cur = currency || "USD";
  try {
    const fmt = new Intl.NumberFormat("en", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    });
    return `${fmt.format(min)} - ${fmt.format(max)} / month`;
  } catch {
    return `${cur} ${min.toLocaleString()} - ${max.toLocaleString()} / month`;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getRelativePostedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 7) return `Posted ${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30)
    return `Posted ${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return `Posted ${formatDate(dateStr)}`;
}

function getDaysUntilDeadline(
  dateStr: string | null | undefined
): number | null {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  const now = new Date();
  return Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// Hiring process: match keywords to icons
const PROCESS_KEYWORDS: [string[], LucideIcon][] = [
  [["phone", "call", "screen"], Phone],
  [["technical", "coding", "code", "assessment", "test"], Code2],
  [["interview", "final", "panel", "onsite"], Users],
  [["offer", "decision"], Award],
  [["onboard", "welcome", "start"], UserCheck],
];

function getProcessStepIcon(text: string): LucideIcon {
  const lower = text.toLowerCase();
  for (const [keywords, Icon] of PROCESS_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return Icon;
  }
  return CheckCircle2;
}

// =============================================================================
// Page
// =============================================================================

export default async function JobDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const job = await fetchJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const companyName = job.employer?.companyName || "Company";
  const companyLogoUrl = job.employer?.logoUrl || null;
  const companyVerified = job.employer?.verificationStatus === "verified";
  const companySlug = job.employer?.slug || "";

  const requiredSkills = job.jobSkills
    ? job.jobSkills
        .filter((js) => js.isRequired)
        .map((js) => js.skill?.name || "")
        .filter(Boolean)
    : [];
  const niceToHaveSkills = job.niceToHaveSkills || [];

  const responsibilityLines =
    typeof job.responsibilities === "string" && job.responsibilities
      ? job.responsibilities.split("\n").filter(Boolean)
      : [];

  const hiringSteps =
    typeof job.hiringProcess === "string" && job.hiringProcess
      ? job.hiringProcess.split("\n").filter(Boolean)
      : [];

  const jobType = getJobTypeBadge(job.jobType);
  const workMode = getWorkModeConfig(job.workMode);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://talent.digibit.com";
  const jobUrl = `${siteUrl}/jobs/${job.slug}`;

  const daysUntilDeadline = getDaysUntilDeadline(job.applicationDeadline);
  const isUrgent =
    daysUntilDeadline !== null &&
    daysUntilDeadline > 0 &&
    daysUntilDeadline <= 7;
  const isExpired = daysUntilDeadline !== null && daysUntilDeadline <= 0;

  const descriptionParagraphs = job.description
    ? job.description.split("\n").filter(Boolean)
    : [];

  return (
    <>
      {/* JSON-LD structured data */}
      <JobPostingJsonLd
        title={job.title}
        description={job.description}
        url={jobUrl}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        location={job.location}
        employmentType={job.jobType}
        salaryMin={job.salaryMin}
        salaryMax={job.salaryMax}
        salaryCurrency={job.salaryCurrency}
        datePosted={job.publishedAt}
        validThrough={job.applicationDeadline}
        skills={requiredSkills}
        experienceLevel={getExperienceLevelLabel(job.experienceLevel)}
        workMode={job.workMode}
      />

      <Header />
      <main className="min-h-screen bg-[var(--surface-1)]">
        {/* ── Mobile sticky back bar ── */}
        <div className="sticky top-0 z-40 lg:hidden border-b border-[var(--border)] bg-[var(--surface-0)] backdrop-blur-md px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/jobs"
              className="shrink-0 p-1 -ml-1 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--foreground)]" />
            </Link>
            <span className="text-sm font-semibold text-[var(--foreground)] truncate">
              {job.title}
            </span>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[#1843A5] to-[#0F2E78]">
          <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[var(--warning)]/10 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#D4B87A]/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
            {/* Breadcrumb (desktop) */}
            <nav
              className="hidden lg:flex items-center gap-1.5 text-sm text-white/50 mb-8"
              aria-label="Breadcrumb"
            >
              <Link
                href="/jobs"
                className="hover:text-white/80 transition-colors"
              >
                Jobs
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white/70 truncate max-w-xs">
                {job.title}
              </span>
            </nav>

            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-start">
              {/* Company logo */}
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={companyName}
                  className="h-16 w-16 shrink-0 rounded-xl border-2 border-white/20 bg-white object-contain p-2 shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 text-2xl font-bold text-white shadow-lg backdrop-blur-sm">
                  {getCompanyInitial(companyName)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Company name + verified + view company */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-medium text-white/80">
                    {companyName}
                  </span>
                  {companyVerified && (
                    <BadgeCheck className="h-5 w-5 text-[#D4B87A]" />
                  )}
                  {companySlug && (
                    <Link
                      href={`/jobs?employer=${companySlug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white/80 transition-colors ml-1"
                    >
                      View Company
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Job title */}
                <h1 className="text-2xl font-bold text-white sm:text-3xl leading-tight">
                  {job.title}
                </h1>

                {/* Badge row */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${jobType.className}`}
                  >
                    {jobType.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                    <workMode.Icon className="h-3 w-3" />
                    {workMode.label}
                  </span>
                  {job.experienceLevel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">
                      <Award className="h-3 w-3" />
                      {getExperienceLevelLabel(job.experienceLevel)}
                    </span>
                  )}
                  {job.location && (
                    <span className="inline-flex items-center gap-1 text-sm text-white/70">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  )}
                </div>

                {/* Salary */}
                {salary && (
                  <p className="mt-3 text-xl font-bold text-white">{salary}</p>
                )}

                {/* Meta line: posted date + applicants + views */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
                  {job.publishedAt && (
                    <span>{getRelativePostedDate(job.publishedAt)}</span>
                  )}
                  {job.applicationCount != null &&
                    job.applicationCount > 0 && (
                      <>
                        <span className="text-white/30">&middot;</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job.applicationCount} applicant
                          {job.applicationCount !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  {job.viewCount != null && job.viewCount > 0 && (
                    <>
                      <span className="text-white/30">&middot;</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {job.viewCount} view{job.viewCount !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-12">
            {/* Deadline urgency banner */}
            {isUrgent && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-light)] p-3 px-4">
                <Clock className="h-5 w-5 shrink-0 text-[var(--warning-dark)]" />
                <p className="text-sm font-medium text-[var(--warning-dark)]">
                  Applications close in {daysUntilDeadline} day
                  {daysUntilDeadline !== 1 ? "s" : ""} &mdash; apply now!
                </p>
              </div>
            )}

            {isExpired && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--error)] bg-[var(--error-light)] p-3 px-4">
                <Clock className="h-5 w-5 shrink-0 text-[var(--error-dark)]" />
                <p className="text-sm font-medium text-[var(--error-dark)]">
                  Applications for this position have closed.
                </p>
              </div>
            )}

            {/* Mobile CTA (shown above content on mobile) */}
            <div className="lg:hidden mb-6">
              <ApplyCTACard
                salary={salary}
                deadline={job.applicationDeadline}
                daysUntilDeadline={daysUntilDeadline}
                isExpired={isExpired}
                viewCount={job.viewCount}
                applicationCount={job.applicationCount}
                jobUrl={jobUrl}
                jobTitle={job.title}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              {/* ── Main content ── */}
              <div className="space-y-0 sm:space-y-6">
                {/* Description */}
                <ScrollReveal>
                <section className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-[var(--border)] bg-[var(--surface-0)] px-4 sm:px-6 py-6 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-[var(--foreground)]">
                    <FileText className="h-5 w-5 text-[var(--primary)]" />
                    Job Description
                  </h2>
                  <div className="border-t border-[var(--border)] pt-4">
                    <div className="max-w-none text-[var(--neutral-gray)] text-base leading-relaxed space-y-3">
                      {descriptionParagraphs.map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </section>
                </ScrollReveal>

                {/* Responsibilities */}
                {responsibilityLines.length > 0 && (
                  <ScrollReveal delay={0.1}>
                  <section className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-[var(--border)] bg-[var(--surface-0)] px-4 sm:px-6 py-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-[var(--foreground)]">
                      <ListChecks className="h-5 w-5 text-[var(--primary)]" />
                      Responsibilities
                    </h2>
                    <div className="border-t border-[var(--border)] pt-4">
                      <ul className="space-y-1">
                        {responsibilityLines.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 py-1.5 text-sm text-[var(--neutral-gray)]"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                  </ScrollReveal>
                )}

                {/* Required Skills */}
                {requiredSkills.length > 0 && (
                  <ScrollReveal delay={0.15}>
                  <section className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-[var(--border)] bg-[var(--surface-0)] px-4 sm:px-6 py-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-[var(--foreground)]">
                      <Zap className="h-5 w-5 text-[var(--primary)]" />
                      Required Skills
                      <span className="ml-auto text-sm font-normal text-[var(--neutral-gray)]">
                        {requiredSkills.length} skill
                        {requiredSkills.length !== 1 ? "s" : ""}
                      </span>
                    </h2>
                    <div className="border-t border-[var(--border)] pt-4">
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--primary)] border border-[var(--primary)]/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>
                  </ScrollReveal>
                )}

                {/* Nice-to-Have Skills */}
                {niceToHaveSkills.length > 0 && (
                  <ScrollReveal delay={0.2}>
                  <section className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-[var(--border)] bg-[var(--surface-0)] px-4 sm:px-6 py-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-[var(--foreground)]">
                      <Star className="h-5 w-5 text-[var(--warning)]" />
                      Nice to Have
                      <span className="text-sm font-normal text-[var(--neutral-gray)]">
                        (bonus)
                      </span>
                    </h2>
                    <div className="border-t border-[var(--border)] pt-4">
                      <div className="flex flex-wrap gap-2">
                        {niceToHaveSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-lg bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--neutral-gray)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>
                  </ScrollReveal>
                )}

                {/* Hiring Process */}
                {hiringSteps.length > 0 && (
                  <ScrollReveal delay={0.25}>
                  <section className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-[var(--border)] bg-[var(--surface-0)] px-4 sm:px-6 py-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-[var(--foreground)]">
                      <Users className="h-5 w-5 text-[var(--primary)]" />
                      Hiring Process
                    </h2>
                    <div className="border-t border-[var(--border)] pt-4">
                      <div className="relative ml-1">
                        {hiringSteps.map((step, idx) => {
                          const StepIcon = getProcessStepIcon(step);
                          const isLast = idx === hiringSteps.length - 1;
                          return (
                            <div
                              key={idx}
                              className="relative flex gap-4 pb-6 last:pb-0"
                            >
                              {/* Connector line */}
                              {!isLast && (
                                <div className="absolute left-[15px] top-[36px] bottom-0 w-px bg-[var(--border)]" />
                              )}
                              {/* Step icon */}
                              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                <StepIcon className="h-4 w-4" />
                              </div>
                              {/* Step content */}
                              <div className="flex-1 pt-0.5">
                                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                                  Step {idx + 1}
                                </span>
                                <p className="mt-0.5 text-sm text-[var(--foreground)]">
                                  {step}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                  </ScrollReveal>
                )}
              </div>

              {/* ── Desktop Sidebar ── */}
              <div className="hidden lg:block">
                <div className="sticky top-8 space-y-6">
                  <ApplyCTACard
                    salary={salary}
                    deadline={job.applicationDeadline}
                    daysUntilDeadline={daysUntilDeadline}
                    isExpired={isExpired}
                    viewCount={job.viewCount}
                    applicationCount={job.applicationCount}
                    jobUrl={jobUrl}
                    jobTitle={job.title}
                  />

                  {/* Job Details Card */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                      Job Details
                    </h3>
                    <dl className="divide-y divide-[var(--border)]">
                      <DetailRow
                        icon={Briefcase}
                        label="Job Type"
                        value={jobType.label}
                      />
                      <DetailRow
                        icon={workMode.Icon}
                        label="Work Mode"
                        value={workMode.label}
                      />
                      {job.location && (
                        <DetailRow
                          icon={MapPin}
                          label="Location"
                          value={job.location}
                        />
                      )}
                      <DetailRow
                        icon={Award}
                        label="Experience"
                        value={getExperienceLevelLabel(job.experienceLevel)}
                      />
                      {salary && (
                        <DetailRow
                          icon={Banknote}
                          label="Salary Range"
                          value={salary}
                          highlight
                        />
                      )}
                      {job.publishedAt && (
                        <DetailRow
                          icon={Calendar}
                          label="Posted"
                          value={formatDate(job.publishedAt)}
                        />
                      )}
                      {job.applicationDeadline && (
                        <DetailRow
                          icon={Clock}
                          label="Deadline"
                          value={formatDate(job.applicationDeadline)}
                          urgent={isUrgent}
                        />
                      )}
                    </dl>
                  </div>

                  {/* Company Info Card */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                      About the Company
                    </h3>
                    <div className="flex items-start gap-4">
                      {companyLogoUrl ? (
                        <img
                          src={companyLogoUrl}
                          alt={companyName}
                          className="h-16 w-16 rounded-xl border border-[var(--border)] object-contain p-2 bg-[var(--surface-1)]"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--surface-1)] text-xl font-bold text-[var(--primary)]">
                          {getCompanyInitial(companyName)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-semibold text-[var(--foreground)]">
                            {companyName}
                          </span>
                          {companyVerified && (
                            <BadgeCheck className="h-4 w-4 text-[var(--primary)]" />
                          )}
                        </div>
                        {companyVerified && (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--success-dark)] font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified Employer
                          </span>
                        )}
                      </div>
                    </div>
                    {companySlug && (
                      <Link
                        href={`/jobs?employer=${companySlug}`}
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-1)] transition-colors"
                      >
                        View all jobs from {companyName}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-16" />
      </main>
      <Footer />
    </>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ApplyCTACard({
  salary,
  deadline,
  daysUntilDeadline,
  isExpired,
  viewCount,
  applicationCount,
  jobUrl,
  jobTitle,
}: {
  salary: string | null;
  deadline: string | null | undefined;
  daysUntilDeadline: number | null;
  isExpired: boolean;
  viewCount: number | null | undefined;
  applicationCount: number | null | undefined;
  jobUrl: string;
  jobTitle: string;
}) {
  const hasStats =
    (viewCount != null && viewCount > 0) ||
    (applicationCount != null && applicationCount > 0);

  return (
    <div className="rounded-2xl bg-[var(--surface-0)]/90 backdrop-blur-md shadow-lg border border-[var(--border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">
        Apply for this position
      </h3>
      {salary && (
        <p className="mt-1 text-base font-bold text-[var(--primary)]">
          {salary}
        </p>
      )}

      <Link
        href="/auth/login"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/20 transition-all hover:shadow-lg hover:shadow-[var(--primary)]/30"
      >
        <Send className="h-4 w-4" />
        Apply Now
      </Link>
      <p className="mt-2 text-center text-xs text-[var(--neutral-gray)]">
        Sign in as a candidate to apply
      </p>

      {/* Deadline */}
      {deadline && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            isExpired
              ? "bg-[var(--error-light)] text-[var(--error-dark)]"
              : daysUntilDeadline !== null && daysUntilDeadline <= 7
                ? "bg-[var(--warning-light)] text-[var(--warning-dark)]"
                : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {isExpired
            ? "Applications closed"
            : `Applications close ${formatDate(deadline)}`}
        </div>
      )}

      {/* Quick stats */}
      {hasStats && (
        <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-4">
          {viewCount != null && viewCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
              <Eye className="h-3.5 w-3.5" />
              {viewCount} views
            </div>
          )}
          {applicationCount != null && applicationCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
              <Users className="h-3.5 w-3.5" />
              {applicationCount} applicants
            </div>
          )}
        </div>
      )}

      {/* Share */}
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="text-xs font-medium text-[var(--neutral-gray)] mb-2">
          Share this job
        </p>
        <ShareButtons url={jobUrl} title={jobTitle} />
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  highlight,
  urgent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          urgent
            ? "bg-[var(--warning-light)]"
            : highlight
              ? "bg-[var(--success)]/10"
              : "bg-[var(--surface-1)]"
        }`}
      >
        <Icon
          className={`h-4 w-4 ${
            urgent
              ? "text-[var(--warning-dark)]"
              : highlight
                ? "text-[var(--success)]"
                : "text-[var(--neutral-gray)]"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--neutral-gray)]">{label}</p>
        <p
          className={`text-sm font-medium ${
            urgent
              ? "text-[var(--warning-dark)]"
              : highlight
                ? "text-[var(--success-dark)]"
                : "text-[var(--foreground)]"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
