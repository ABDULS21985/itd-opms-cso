// =============================================================================
// Server-side API client for SSR pages
// Uses the talent-api directly (no auth needed for public endpoints)
// =============================================================================

const API_BASE_URL =
  process.env.TALENT_API_URL ||
  process.env.NEXT_PUBLIC_TALENT_API_URL ||
  "http://localhost:4002/api/v1";

interface FetchOptions {
  params?: Record<string, string | number | boolean | undefined>;
  revalidate?: number | false;
  tags?: string[];
}

async function serverFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, revalidate = 60, tags } = options;

  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    headers: { "Content-Type": "application/json" },
    next: {},
  };

  if (revalidate !== undefined) {
    fetchOptions.next!.revalidate = revalidate;
  }
  if (tags) {
    fetchOptions.next!.tags = tags;
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      console.error(
        `[server-api] ${response.status} ${response.statusText} for ${path}`,
      );
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  } catch (error) {
    console.error(`[server-api] Failed to fetch ${path}:`, error);
    throw error;
  }
}

// =============================================================================
// Public API functions for SSR pages
// =============================================================================

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PublicCandidate {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  yearsOfExperience: number | null;
  primaryStacks: string[] | null;
  availabilityStatus: string | null;
  preferredWorkMode: string | null;
  profileStrength: number;
  primaryTrack?: { id: string; name: string; slug: string } | null;
  tracks?: { id: string; name: string; slug: string }[];
  cohort?: { id: string; name: string } | null;
  candidateSkills?: {
    id: string;
    isVerified: boolean;
    skill?: { id: string; name: string; slug: string };
  }[];
  candidateProjects?: {
    id: string;
    title: string;
    description: string | null;
    outcomeMetric: string | null;
    projectUrl: string | null;
    githubUrl: string | null;
    imageUrl: string | null;
    techStack: string[] | null;
  }[];
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  personalWebsite: string | null;
}

export interface PublicJob {
  id: string;
  slug: string;
  title: string;
  jobType: string;
  workMode: string;
  location: string | null;
  description: string;
  responsibilities: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  experienceLevel: string | null;
  applicationDeadline: string | null;
  hiringProcess: string | null;
  publishedAt: string | null;
  viewCount: number;
  applicationCount: number;
  niceToHaveSkills: string[] | null;
  employer?: {
    id: string;
    companyName: string;
    slug: string;
    logoUrl: string | null;
    verificationStatus: string;
  };
  jobSkills?: {
    id: string;
    isRequired: boolean;
    skill?: { id: string; name: string; slug: string };
  }[];
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export interface SearchCandidatesParams {
  search?: string;
  track?: string;
  skills?: string;
  location?: string;
  availability?: string;
  workMode?: string;
  experienceLevel?: string;
  cohort?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function fetchCandidates(
  params: SearchCandidatesParams = {},
): Promise<{ candidates: PublicCandidate[]; total: number; totalPages: number }> {
  try {
    const result = await serverFetch<PaginatedResult<PublicCandidate>>(
      "/talents",
      {
        params: {
          search: params.search,
          tracks: params.track,
          skills: params.skills,
          location: params.location,
          availability: params.availability,
          workMode: params.workMode,
          experienceLevel: params.experienceLevel,
          cohort: params.cohort,
          page: params.page || 1,
          limit: params.limit || 12,
          sort: params.sort || "createdAt",
        },
        revalidate: 60,
        tags: ["candidates"],
      },
    );

    // Handle both paginated and array responses
    if (Array.isArray(result)) {
      return {
        candidates: result,
        total: result.length,
        totalPages: 1,
      };
    }

    return {
      candidates: result.data || [],
      total: result.meta?.total || 0,
      totalPages: result.meta?.totalPages || 1,
    };
  } catch {
    // Fallback to empty results if API is unavailable
    return { candidates: [], total: 0, totalPages: 0 };
  }
}

export async function fetchCandidateBySlug(
  slug: string,
): Promise<PublicCandidate | null> {
  try {
    return await serverFetch<PublicCandidate>(`/talents/${slug}`, {
      revalidate: 60,
      tags: [`candidate-${slug}`],
    });
  } catch {
    return null;
  }
}

export async function fetchCandidateSlugs(): Promise<string[]> {
  try {
    const result = await fetchCandidates({ limit: 1000 });
    return result.candidates.map((c) => c.slug);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface SearchJobsParams {
  search?: string;
  tracks?: string;
  skills?: string;
  jobType?: string;
  workMode?: string;
  experienceLevel?: string;
  location?: string;
  employer?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function fetchJobs(
  params: SearchJobsParams = {},
): Promise<{ jobs: PublicJob[]; total: number; totalPages: number }> {
  try {
    const result = await serverFetch<PaginatedResult<PublicJob>>("/jobs", {
      params: {
        search: params.search,
        tracks: params.tracks,
        skills: params.skills,
        jobType: params.jobType,
        workMode: params.workMode,
        experienceLevel: params.experienceLevel,
        location: params.location,
        employer: params.employer,
        page: params.page || 1,
        limit: params.limit || 12,
        sort: params.sort || "publishedAt",
      },
      revalidate: 60,
      tags: ["jobs"],
    });

    if (Array.isArray(result)) {
      return {
        jobs: result,
        total: result.length,
        totalPages: 1,
      };
    }

    return {
      jobs: result.data || [],
      total: result.meta?.total || 0,
      totalPages: result.meta?.totalPages || 1,
    };
  } catch {
    return { jobs: [], total: 0, totalPages: 0 };
  }
}

export async function fetchJobBySlug(slug: string): Promise<PublicJob | null> {
  try {
    return await serverFetch<PublicJob>(`/jobs/${slug}`, {
      revalidate: 60,
      tags: [`job-${slug}`],
    });
  } catch {
    return null;
  }
}

export async function fetchJobSlugs(): Promise<string[]> {
  try {
    const result = await fetchJobs({ limit: 1000 });
    return result.jobs.map((j) => j.slug);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  category?: string;
  description?: string;
  iconName?: string;
}

export async function fetchSkills(): Promise<TaxonomyItem[]> {
  try {
    return await serverFetch<TaxonomyItem[]>("/taxonomy/skills", {
      revalidate: 300,
      tags: ["skills"],
    });
  } catch {
    return [];
  }
}

export async function fetchTracks(): Promise<TaxonomyItem[]> {
  try {
    return await serverFetch<TaxonomyItem[]>("/taxonomy/tracks", {
      revalidate: 300,
      tags: ["tracks"],
    });
  } catch {
    return [];
  }
}

export async function fetchCohorts(): Promise<TaxonomyItem[]> {
  try {
    return await serverFetch<TaxonomyItem[]>("/taxonomy/cohorts", {
      revalidate: 300,
      tags: ["cohorts"],
    });
  } catch {
    return [];
  }
}

export async function fetchLocations(): Promise<TaxonomyItem[]> {
  try {
    return await serverFetch<TaxonomyItem[]>("/taxonomy/locations", {
      revalidate: 300,
      tags: ["locations"],
    });
  } catch {
    return [];
  }
}
