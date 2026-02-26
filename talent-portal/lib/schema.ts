// =============================================================================
// JSON-LD Schema Builders — Structured data for SEO
// =============================================================================

import type { CandidateProfile } from "@/types/candidate";
import type { JobPost } from "@/types/job";
import type { EmployerOrg } from "@/types/employer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://talent.digibit.com";

// ──────────────────────────────────────────────
// Person schema for candidate profiles
// ──────────────────────────────────────────────

export function buildPersonSchema(candidate: CandidateProfile): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: candidate.fullName,
    url: `${SITE_URL}/talents/${candidate.slug}`,
  };

  if (candidate.photoUrl) {
    schema.image = candidate.photoUrl;
  }

  if (candidate.bio) {
    schema.description = candidate.bio;
  }

  if (candidate.city && candidate.country) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: candidate.city,
      addressCountry: candidate.country,
    };
  }

  if (candidate.primaryTrack) {
    schema.jobTitle = candidate.primaryTrack.name;
  }

  const sameAs: string[] = [];
  if (candidate.githubUrl) sameAs.push(candidate.githubUrl);
  if (candidate.linkedinUrl) sameAs.push(candidate.linkedinUrl);
  if (candidate.portfolioUrl) sameAs.push(candidate.portfolioUrl);
  if (candidate.personalWebsite) sameAs.push(candidate.personalWebsite);
  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  if (
    candidate.candidateSkills &&
    candidate.candidateSkills.length > 0
  ) {
    schema.knowsAbout = candidate.candidateSkills
      .map((cs) => cs.skill?.name || cs.customTagName)
      .filter(Boolean);
  }

  return schema;
}

// ──────────────────────────────────────────────
// JobPosting schema for Google Jobs
// ──────────────────────────────────────────────

export function buildJobPostingSchema(job: JobPost): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    url: `${SITE_URL}/jobs/${job.slug}`,
    datePosted: job.publishedAt || job.createdAt,
    jobLocationType: job.workMode === "remote" ? "TELECOMMUTE" : undefined,
  };

  if (job.location) {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    };
  }

  if (job.applicationDeadline) {
    schema.validThrough = job.applicationDeadline;
  }

  if (job.employer) {
    schema.hiringOrganization = {
      "@type": "Organization",
      name: job.employer.companyName,
      sameAs: job.employer.websiteUrl || undefined,
      logo: job.employer.logoUrl || undefined,
    };
  }

  if (job.salaryMin || job.salaryMax) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin || undefined,
        maxValue: job.salaryMax || undefined,
        unitText: "YEAR",
      },
    };
  }

  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
  };
  if (job.jobType) {
    schema.employmentType = employmentTypeMap[job.jobType] || job.jobType;
  }

  if (job.experienceLevel) {
    const levelMap: Record<string, string> = {
      entry: "Entry level",
      mid: "Mid level",
      senior: "Senior level",
    };
    schema.experienceRequirements = levelMap[job.experienceLevel] || job.experienceLevel;
  }

  if (job.jobSkills && job.jobSkills.length > 0) {
    schema.skills = job.jobSkills
      .map((js) => js.skill?.name)
      .filter(Boolean)
      .join(", ");
  }

  return schema;
}

// ──────────────────────────────────────────────
// Organization schema for employer pages
// ──────────────────────────────────────────────

export function buildOrganizationSchema(employer: EmployerOrg): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: employer.companyName,
    url: employer.websiteUrl || `${SITE_URL}/employers/${employer.slug}`,
  };

  if (employer.logoUrl) {
    schema.logo = employer.logoUrl;
  }

  if (employer.description) {
    schema.description = employer.description;
  }

  if (employer.websiteUrl) {
    schema.sameAs = [employer.websiteUrl];
  }

  if (employer.locationHq || employer.country) {
    schema.address = {
      "@type": "PostalAddress",
      ...(employer.locationHq && { addressLocality: employer.locationHq }),
      ...(employer.country && { addressCountry: employer.country }),
    };
  }

  if (employer.sector) {
    schema.industry = employer.sector;
  }

  return schema;
}
