import type { Metadata } from "next";

// =============================================================================
// SEO Metadata Helpers — African Tech Talent Portal
// =============================================================================

const SITE_NAME = "African Tech Talent Portal";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://talent.digibit.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface MetadataParams {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
  type?: "website" | "profile" | "article";
  keywords?: string[];
}

/**
 * Generates full page metadata with OG tags, Twitter cards, and canonical URL.
 */
export function generatePageMetadata({
  title,
  description,
  path = "",
  ogImage,
  noIndex = false,
  type = "website",
  keywords = [],
}: MetadataParams): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    keywords: [
      "african tech talent",
      "talent marketplace",
      "Digibit",
      "Africa jobs",
      "hiring platform",
      ...keywords,
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: ogImage || DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage || DEFAULT_OG_IMAGE],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

/**
 * Generates metadata for a candidate profile page.
 */
export function generateCandidateMetadata(candidate: {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  primaryTrack?: { name: string } | null;
  primaryTrackName?: string;
  bio?: string | null;
  slug: string;
  candidateSkills?: { skill?: { name: string } }[];
  skills?: { name: string }[];
}): Metadata {
  const name =
    candidate.fullName ||
    `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() ||
    "Candidate";
  const track =
    candidate.primaryTrack?.name || candidate.primaryTrackName || "Developer";
  const bio = candidate.bio || "";
  const skillNames = candidate.candidateSkills
    ? candidate.candidateSkills
        .map((cs) => cs.skill?.name)
        .filter((s): s is string => !!s)
    : candidate.skills
      ? candidate.skills.map((s) => s.name)
      : [];

  return generatePageMetadata({
    title: `${name} - ${track}`,
    description: bio.slice(0, 160) || `${name} is a ${track} on African Tech Talent Portal.`,
    path: `/talents/${candidate.slug}`,
    type: "profile",
    keywords: [track, ...skillNames, name],
  });
}

/**
 * Generates metadata for a job posting page.
 */
export function generateJobMetadata(job: {
  title: string;
  description: string;
  slug: string;
  location?: string | null;
  employer?: { companyName: string } | null;
  companyName?: string;
  jobSkills?: { skill?: { name: string } }[];
  requiredSkills?: string[];
}): Metadata {
  const companyName = job.employer?.companyName || job.companyName || "Company";
  const skillNames = job.jobSkills
    ? job.jobSkills
        .map((js) => js.skill?.name)
        .filter((s): s is string => !!s)
    : job.requiredSkills || [];

  return generatePageMetadata({
    title: `${job.title} at ${companyName}`,
    description: job.description.slice(0, 160),
    path: `/jobs/${job.slug}`,
    type: "website",
    keywords: [
      job.title,
      companyName,
      ...(job.location ? [job.location] : []),
      ...skillNames,
    ],
  });
}
