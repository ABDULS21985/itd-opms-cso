import Link from "next/link";
import { ExternalLink } from "lucide-react";

function DigibitLogoWhite() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="18" fill="#1B7340" />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        D
      </text>
    </svg>
  );
}

const candidateLinks = [
  { href: "/talents", label: "Browse Talents" },
  { href: "/jobs", label: "Find Jobs" },
  { href: "/auth/register/candidate", label: "Create Profile" },
  { href: "/dashboard/cv", label: "CV Builder" },
];

const employerLinks = [
  { href: "/auth/register/employer", label: "Post a Job" },
  { href: "/talents", label: "Search Candidates" },
  { href: "/dashboard/intro-requests", label: "Request Intros" },
  { href: "/dashboard/shortlists", label: "Manage Shortlists" },
];

const companyLinks = [
  { href: "https://digibit.com", label: "About Digibit", external: true },
  { href: "https://digibit.com/contact", label: "Contact Us", external: true },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <DigibitLogoWhite />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold leading-tight tracking-tight">
                  Digibit
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Beyond Technology
                </span>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-400">
              African Tech Talent Portal connects top tech talent with leading
              employers across Africa. Discover, evaluate, and hire emerging
              professionals through our curated marketplace.
            </p>
            <a
              href="https://digibit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#C4A35A] transition-colors hover:text-[#D4B87A]"
            >
              Visit digibit.com
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* For Candidates */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              For Candidates
            </h3>
            <ul className="mt-4 space-y-3">
              {candidateLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              For Employers
            </h3>
            <ul className="mt-4 space-y-3">
              {employerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Digibit */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              About Digibit
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) =>
                link.external ? (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-gray-300 transition-colors hover:text-white"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; 2026 Digibit. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>Powered by</span>
            <span className="font-semibold text-[#1B7340]">Digibit</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
              Beyond Technology
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
