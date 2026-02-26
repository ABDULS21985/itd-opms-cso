export interface EmployerAnalytics {
  overview: {
    totalPipelines: number;
    totalCandidatesInPipeline: number;
    totalInterviews: number;
    totalPlacements: number;
    activeJobs: number;
    totalApplications: number;
  };
  hiringVelocity: {
    month: string;
    placements: number;
    interviews: number;
    applications?: number;
  }[];
  pipelineConversion: {
    stageName: string;
    count: number;
    percentage: number;
  }[];
  avgTimeToHire: number | null;
  jobPerformance: {
    jobId: string;
    title: string;
    views: number;
    applications: number;
    conversionRate: number;
    interviews?: number;
    offers?: number;
    status?: string;
    postedDate?: string;
    dailyTrend?: number[];
  }[];
  platformComparison: {
    avgTimeToHire: number;
    avgApplicationsPerJob: number;
    avgInterviewsPerHire: number;
  };
  sourceEffectiveness?: {
    source: string;
    applications: number;
    hires: number;
  }[];
  timeToHireDistribution?: {
    range: string;
    count: number;
  }[];
  pipelineOverTime?: {
    date: string;
    [stageName: string]: string | number;
  }[];
}

export interface JobTemplate {
  id: string;
  employerId: string;
  name: string;
  templateData: {
    title?: string;
    description?: string;
    responsibilities?: string;
    skills?: string[];
    jobType?: string;
    workMode?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    location?: string;
  };
  createdAt: string;
}
