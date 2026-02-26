// =============================================================================
// JSON-LD Structured Data — Digibit Talent Portal
// Renders schema.org structured data for SEO (Person, JobPosting)
// =============================================================================

interface PersonJsonLdProps {
  name: string;
  jobTitle: string;
  description: string;
  url: string;
  image?: string | null;
  skills: string[];
  location: {
    city: string;
    country: string;
  };
  sameAs: string[];
}

interface JobPostingJsonLdProps {
  title: string;
  description: string;
  url: string;
  companyName: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  employmentType: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  skills?: string[];
  experienceLevel?: string | null;
  workMode: string;
}

function mapEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
  };
  return map[type] || "OTHER";
}

export function PersonJsonLd({
  name,
  jobTitle,
  description,
  url,
  image,
  skills,
  location,
  sameAs,
}: PersonJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle,
    description,
    url,
    ...(image && { image }),
    knowsAbout: skills,
    address: {
      "@type": "PostalAddress",
      addressLocality: location.city,
      addressCountry: location.country,
    },
    sameAs: sameAs.filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function JobPostingJsonLd({
  title,
  description,
  url,
  companyName,
  companyLogoUrl,
  location,
  employmentType,
  salaryMin,
  salaryMax,
  salaryCurrency = "USD",
  datePosted,
  validThrough,
  skills,
  experienceLevel,
  workMode,
}: JobPostingJsonLdProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    url,
    datePosted,
    employmentType: mapEmploymentType(employmentType),
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      ...(companyLogoUrl && { logo: companyLogoUrl }),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
      },
    },
    skills,
    experienceRequirements: experienceLevel,
    jobLocationType: workMode === "remote" ? "TELECOMMUTE" : undefined,
  };

  if (validThrough) {
    schema.validThrough = validThrough;
  }

  if (salaryMin != null && salaryMax != null) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: salaryMin,
        maxValue: salaryMax,
        unitText: "MONTH",
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
