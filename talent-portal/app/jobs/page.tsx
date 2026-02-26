import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JobGrid } from "@/components/jobs/job-grid";
import {
  JobPendingProvider,
  JobHeroSearch,
  JobFilterSidebar,
  JobResultsHeader,
  JobGridWrapper,
} from "@/components/jobs/job-search-filters";
import { fetchJobs } from "@/lib/server-api";
import { generatePageMetadata } from "@/lib/metadata";

// =============================================================================
// SEO Metadata
// =============================================================================

export const metadata: Metadata = generatePageMetadata({
  title: "Job Board",
  description:
    "Browse open positions from verified employers on the Digibit Talent Portal. Filter by job type, work mode, skills, and location to find your next opportunity.",
  path: "/jobs",
  keywords: [
    "job board",
    "graduate jobs",
    "tech jobs Africa",
    "developer jobs",
    "remote jobs Africa",
  ],
});

// =============================================================================
// Pagination helper
// =============================================================================

function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");

  if (total > 1) pages.push(total);

  return pages;
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function JobBoardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { jobs, total, totalPages } = await fetchJobs({
    search: params.search,
    jobType: params.jobType,
    workMode: params.workMode,
    experienceLevel: params.experienceLevel,
    skills: params.skills,
    location: params.location,
    sort: params.sort,
    page,
    limit: 10,
  });

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== "page") sp.set(k, v);
    });
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  const paginationBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)]";

  return (
    <>
      <Header />
      <JobPendingProvider>
        <main className="min-h-screen bg-[var(--surface-1)]">
          {/* ── Immersive Hero ── */}
          <section className="relative bg-gradient-to-br from-[#1B7340] to-[#0E5A2D] pb-16 pt-12 rounded-b-3xl overflow-hidden">
            {/* Dot pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-white">
                Find Your Next Opportunity
              </h1>
              <p className="mt-3 text-base text-white/80">
                Browse{" "}
                <span className="font-semibold text-white">{total}</span> open
                positions from verified employers
              </p>

              <Suspense
                fallback={
                  <div className="mx-auto mt-8 max-w-2xl h-14 animate-pulse rounded-2xl bg-white/10" />
                }
              >
                <JobHeroSearch total={total} />
              </Suspense>
            </div>
          </section>

          {/* ── Content ── */}
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
              {/* Sidebar */}
              <Suspense
                fallback={
                  <div className="hidden lg:block h-96 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                }
              >
                <JobFilterSidebar />
              </Suspense>

              {/* Results */}
              <div>
                <Suspense
                  fallback={
                    <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-2)] mb-4" />
                  }
                >
                  <JobResultsHeader
                    total={total}
                    page={page}
                    count={jobs.length}
                  />
                </Suspense>

                <JobGridWrapper>
                  <JobGrid jobs={jobs} />
                </JobGridWrapper>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <>
                    <nav
                      className="mt-8 flex items-center justify-center gap-1.5"
                      aria-label="Pagination"
                    >
                      {/* First */}
                      {page > 2 && (
                        <Link
                          href={buildPageUrl(1)}
                          className={paginationBtnClass}
                          aria-label="First page"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Link>
                      )}

                      {/* Prev */}
                      {page > 1 ? (
                        <Link
                          href={buildPageUrl(page - 1)}
                          className={paginationBtnClass}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span
                          className={`${paginationBtnClass} opacity-40 cursor-not-allowed`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </span>
                      )}

                      {/* Page numbers */}
                      {pageNumbers.map((p, i) =>
                        p === "ellipsis" ? (
                          <span
                            key={`e-${i}`}
                            className="px-1 text-sm text-[var(--neutral-gray)]"
                          >
                            &hellip;
                          </span>
                        ) : (
                          <Link
                            key={p}
                            href={buildPageUrl(p)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                              p === page
                                ? "bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/25"
                                : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                            }`}
                            aria-current={p === page ? "page" : undefined}
                          >
                            {p}
                          </Link>
                        ),
                      )}

                      {/* Next */}
                      {page < totalPages ? (
                        <Link
                          href={buildPageUrl(page + 1)}
                          className={paginationBtnClass}
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span
                          className={`${paginationBtnClass} opacity-40 cursor-not-allowed`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}

                      {/* Last */}
                      {page < totalPages - 1 && (
                        <Link
                          href={buildPageUrl(totalPages)}
                          className={paginationBtnClass}
                          aria-label="Last page"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Link>
                      )}
                    </nav>

                    <p className="mt-3 text-center text-xs text-[var(--neutral-gray)]">
                      Showing {(page - 1) * 10 + 1}&ndash;
                      {Math.min(page * 10, total)} of {total} jobs
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </JobPendingProvider>
      <Footer />
    </>
  );
}
