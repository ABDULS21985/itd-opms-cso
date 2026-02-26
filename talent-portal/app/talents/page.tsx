import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CandidateCard } from "@/components/candidates/candidate-card";
import { CandidateSearchFilters } from "@/components/candidates/candidate-search-filters";
import { fetchCandidates } from "@/lib/server-api";
import { generatePageMetadata } from "@/lib/metadata";

// =============================================================================
// SEO Metadata
// =============================================================================

export const metadata: Metadata = generatePageMetadata({
  title: "Tech Talent Directory",
  description:
    "Browse our curated directory of skills-verified tech talent. Filter by track, skills, location, and availability to find the perfect candidate.",
  path: "/talents",
  keywords: [
    "tech talent directory",
    "talent search",
    "hire tech professionals",
    "skills-verified candidates",
  ],
});

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TalentDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { candidates, total, totalPages } = await fetchCandidates({
    search: params.search,
    track: params.track,
    skills: params.skills,
    location: params.location,
    availability: params.availability,
    workMode: params.workMode,
    experienceLevel: params.experienceLevel,
    cohort: params.cohort,
    sort: params.sort,
    page,
    limit: 9,
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--surface-1)]">
        <Suspense
          fallback={
            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] py-20 rounded-b-3xl">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="h-10 w-80 mx-auto rounded-lg bg-white/20 animate-pulse mb-4" />
                <div className="h-5 w-96 mx-auto rounded bg-white/10 animate-pulse mb-8" />
                <div className="h-14 max-w-2xl mx-auto rounded-2xl bg-white/10 animate-pulse" />
              </div>
            </div>
          }
        >
          <CandidateSearchFilters
            total={total}
            page={page}
            totalPages={totalPages}
            pageSize={9}
            candidateCount={candidates.length}
          >
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </CandidateSearchFilters>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
