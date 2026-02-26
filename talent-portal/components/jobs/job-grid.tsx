"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Button } from "@digibit/ui/components";
import { AnimatedCardGrid } from "@/components/shared/animated-card";
import { EmptyState } from "@/components/shared/empty-state";
import { JobCard } from "./job-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobGridJob {
  id: string;
  slug: string;
  title: string;
  jobType: string;
  workMode: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  experienceLevel?: string | null;
  applicationDeadline?: string | null;
  publishedAt?: string | null;
  postedAt?: string;
  viewCount?: number;
  applicationCount?: number;
  niceToHaveSkills?: string[] | null;
  employer?: {
    companyName: string;
    slug?: string;
    logoUrl?: string | null;
    verificationStatus?: string;
  };
  jobSkills?: { isRequired: boolean; skill?: { name: string } }[];
}

interface JobGridProps {
  jobs: JobGridJob[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobGrid({ jobs }: JobGridProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)]">
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Try adjusting your search or filters to find matching positions."
          action={
            <Link href="/jobs">
              <Button variant="default" size="sm">
                Clear Filters
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <AnimatedCardGrid className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {jobs.map((job, i) => (
        <JobCard key={job.id} job={job} index={i} />
      ))}
    </AnimatedCardGrid>
  );
}
