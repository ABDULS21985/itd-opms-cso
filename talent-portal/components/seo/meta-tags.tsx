import type { Metadata } from "next";

// =============================================================================
// Meta Tags Helper — Digibit Talent Portal
// Returns metadata objects for Next.js generateMetadata in page files
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BaseMetaOptions {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
}

interface CandidateMetaOptions extends BaseMetaOptions {
  type: "candidate";
  candidateName: string;
  skills?: string[];
  location?: string;
}

interface JobMetaOptions extends BaseMetaOptions {
  type: "job";
  companyName: string;
  jobType?: string;
  location?: string;
  salary?: string;
}

interface PageMetaOptions extends BaseMetaOptions {
  type: "page";
}

type MetaOptions = CandidateMetaOptions | JobMetaOptions | PageMetaOptions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_NAME = "Digibit Talent Portal";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://talent.digibit.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function generatePageMetadata(options: MetaOptions): Metadata {
  const {
    title,
    description,
    path,
    image,
    noIndex = false,
  } = options;

  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${BASE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
    },
  };

  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  }

  // Type-specific enhancements
  if (options.type === "candidate") {
    const keywords = [
      options.candidateName,
      "developer",
      "talent",
      ...(options.skills ?? []),
      options.location,
      "Digibit",
    ].filter(Boolean);

    metadata.keywords = keywords as string[];

    if (metadata.openGraph) {
      (metadata.openGraph as Record<string, unknown>).type = "profile";
    }
  }

  if (options.type === "job") {
    const keywords = [
      options.companyName,
      options.jobType,
      options.location,
      "job",
      "career",
      "Digibit",
    ].filter(Boolean);

    metadata.keywords = keywords as string[];
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function candidateMetadata(opts: {
  name: string;
  slug: string;
  description: string;
  skills?: string[];
  location?: string;
  image?: string | null;
}): Metadata {
  return generatePageMetadata({
    type: "candidate",
    title: opts.name,
    description: opts.description,
    path: `/talents/${opts.slug}`,
    image: opts.image,
    candidateName: opts.name,
    skills: opts.skills,
    location: opts.location,
  });
}

export function jobMetadata(opts: {
  title: string;
  slug: string;
  description: string;
  companyName: string;
  jobType?: string;
  location?: string;
  salary?: string;
  image?: string | null;
}): Metadata {
  return generatePageMetadata({
    type: "job",
    title: `${opts.title} at ${opts.companyName}`,
    description: opts.description,
    path: `/jobs/${opts.slug}`,
    image: opts.image,
    companyName: opts.companyName,
    jobType: opts.jobType,
    location: opts.location,
    salary: opts.salary,
  });
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
}): Metadata {
  return generatePageMetadata({
    type: "page",
    ...opts,
  });
}
