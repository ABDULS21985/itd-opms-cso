import type { MetadataRoute } from "next";
import { fetchCandidateSlugs, fetchJobSlugs } from "@/lib/server-api";

// =============================================================================
// Dynamic Sitemap — Digibit Talent Portal
// Generates URLs for all public pages including candidate profiles and job posts
// =============================================================================

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://talent.digibit.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/talents`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Fetch slugs in parallel
  const [candidateSlugs, jobSlugs] = await Promise.all([
    fetchCandidateSlugs(),
    fetchJobSlugs(),
  ]);

  // Dynamic candidate profile pages
  const candidatePages: MetadataRoute.Sitemap = candidateSlugs.map((slug) => ({
    url: `${SITE_URL}/talents/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic job pages
  const jobPages: MetadataRoute.Sitemap = jobSlugs.map((slug) => ({
    url: `${SITE_URL}/jobs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...candidatePages, ...jobPages];
}
