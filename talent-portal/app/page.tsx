import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Building2,
  Award,
  Zap,
  Search,
  UserPlus,
  Handshake,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Star,
  TrendingUp,
  MapPin,
  Wifi,
  Monitor,
  Code2,
  Smartphone,
  Database,
  Shield,
  BarChart3,
  Palette,
  Quote,
  Globe,
  Clock,
  Heart,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CandidateCard } from "@/components/candidates/candidate-card";
import { JobCard } from "@/components/jobs/job-card";
import { fetchCandidates, fetchJobs } from "@/lib/server-api";

// =============================================================================
// Unsplash images — curated collection of Black African professionals
// =============================================================================

const HERO_IMAGES = {
  main: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&h=1000&fit=crop&crop=face",
  topRight: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop&crop=face",
  bottomLeft: "https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=500&h=600&fit=crop&crop=face",
  bottomRight: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=500&fit=crop&crop=face",
};

const GRADUATE_SHOWCASE = [
  {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=750&fit=crop&crop=face",
    name: "Backend Developer",
    alt: "Professional African man in a business suit",
  },
  {
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=750&fit=crop&crop=face",
    name: "Product Manager",
    alt: "Professional African woman smiling",
  },
  {
    src: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=600&h=750&fit=crop&crop=face",
    name: "DevOps Engineer",
    alt: "Young African man professional",
  },
  {
    src: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&h=750&fit=crop&crop=face",
    name: "Data Scientist",
    alt: "African man working with technology",
  },
  {
    src: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=750&fit=crop&crop=face",
    name: "Frontend Developer",
    alt: "Young African woman professional",
  },
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=750&fit=crop&crop=face",
    name: "Mobile Developer",
    alt: "African man portrait",
  },
];

const TRACK_IMAGES = [
  {
    track: "Backend Development",
    icon: Database,
    description: "Node.js, Python, Go, Java — building the engines that power applications.",
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop",
    color: "#1B7340",
  },
  {
    track: "Frontend Development",
    icon: Code2,
    description: "React, Next.js, Vue — crafting beautiful, responsive user experiences.",
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=500&fit=crop",
    color: "#C4A35A",
  },
  {
    track: "Mobile Development",
    icon: Smartphone,
    description: "React Native, Flutter, Swift, Kotlin — apps that users love.",
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=500&fit=crop",
    color: "#10B981",
  },
  {
    track: "Data / AI / ML",
    icon: BarChart3,
    description: "Machine learning, data analysis, Python — turning data into decisions.",
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop",
    color: "#8B5CF6",
  },
  {
    track: "DevOps & Cloud",
    icon: Globe,
    description: "Docker, Kubernetes, AWS, CI/CD — reliable infrastructure at scale.",
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop",
    color: "#EC4899",
  },
  {
    track: "UI/UX Design",
    icon: Palette,
    description: "Figma, research, prototyping — designing with empathy and intention.",
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop",
    color: "#F59E0B",
  },
];

const TESTIMONIALS = [
  {
    quote: "The Digibit programme gave me real-world skills and a portfolio that got me hired within 3 weeks of graduating. The talent portal made it effortless.",
    name: "Amina Bello",
    role: "Full-Stack Developer",
    company: "Placed at TechCorp Lagos",
    src: "https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=200&h=200&fit=crop&crop=face",
  },
  {
    quote: "We hired 4 graduates through the portal last quarter. The verification process means we spend less time screening and more time building our team.",
    name: "David Okonkwo",
    role: "CTO",
    company: "FinanceHub Africa",
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
  },
  {
    quote: "From an intern on the programme to a full-time cloud engineer — the placement team matched me with the perfect role. I could not be more grateful.",
    name: "Fatima Adeyemi",
    role: "Cloud Engineer",
    company: "Placed at Azure Solutions",
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face",
  },
];

const COMMUNITY_GALLERY = [
  { src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=700&h=500&fit=crop", alt: "Team collaboration", span: "col-span-2 row-span-2" },
  { src: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=400&h=400&fit=crop&crop=face", alt: "Professional portrait", span: "col-span-1 row-span-1" },
  { src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=face", alt: "Professional woman", span: "col-span-1 row-span-1" },
  { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=500&fit=crop", alt: "Professionals working together", span: "col-span-1 row-span-2" },
  { src: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face", alt: "Young woman portrait", span: "col-span-1 row-span-1" },
  { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=700&h=400&fit=crop", alt: "Team meeting", span: "col-span-2 row-span-1" },
  { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face", alt: "Professional portrait", span: "col-span-1 row-span-1" },
  { src: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&h=400&fit=crop&crop=face", alt: "Professional man", span: "col-span-1 row-span-1" },
];

// =============================================================================
// Landing Page — Server Component
// =============================================================================

export default async function LandingPage() {
  const [candidatesResult, jobsResult] = await Promise.all([
    fetchCandidates({ limit: 4 }),
    fetchJobs({ limit: 3 }),
  ]);
  const featuredCandidates = candidatesResult.candidates;
  const featuredJobs = jobsResult.jobs;

  return (
    <>
      <Header />
      <main>
        {/* ================================================================
            SECTION 1: HERO — Split layout with photo collage
            ================================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[#1843A5] to-[#0F2E78]">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[var(--warning)]/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[#D4B87A]/10 blur-3xl" />
            <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left — Copy */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
                  <Star className="h-4 w-4 text-[#D4B87A]" />
                  Africa&apos;s Premier Tech Talent Marketplace
                </div>

                <h1
                  className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
                  style={{ lineHeight: "1.1" }}
                >
                  Discover Top{" "}
                  <span className="bg-gradient-to-r from-[#D4B87A] to-[var(--warning)] bg-clip-text text-transparent">
                    Tech Talent
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
                  A curated marketplace connecting skilled
                  tech professionals with leading employers. Skills-verified,
                  portfolio-first, ready to hire.
                </p>

                {/* CTA buttons */}
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/talents"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-0)] px-8 py-3.5 text-base font-semibold text-[var(--primary)] shadow-lg transition-all duration-200 hover:bg-[#D4B87A] hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <Search className="h-5 w-5" />
                    Browse Talents
                  </Link>
                  <Link
                    href="/auth/register/employer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/60 hover:bg-white/20 hover:-translate-y-0.5"
                  >
                    <Briefcase className="h-5 w-5" />
                    Post a Job
                  </Link>
                </div>

                {/* Social proof */}
                <div className="mt-10 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {GRADUATE_SHOWCASE.slice(0, 4).map((grad, i) => (
                      <div
                        key={i}
                        className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#1B7340]"
                      >
                        <Image
                          src={grad.src}
                          alt={grad.alt}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-white/70">
                    <span className="font-semibold text-white">500+</span>{" "}
                    graduates already placed
                  </div>
                </div>
              </div>

              {/* Right — Photo collage */}
              <div className="relative hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  {/* Main large image */}
                  <div className="relative col-span-1 row-span-2 h-[420px] overflow-hidden rounded-2xl shadow-2xl">
                    <Image
                      src={HERO_IMAGES.main}
                      alt="Young African professional woman smiling"
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 320px, 0px"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--primary)] backdrop-blur-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                        Skills Verified
                      </div>
                    </div>
                  </div>

                  {/* Top-right */}
                  <div className="relative h-[200px] overflow-hidden rounded-2xl shadow-xl">
                    <Image
                      src={HERO_IMAGES.topRight}
                      alt="African professional man portrait"
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 280px, 0px"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/90 px-3 py-1 text-xs font-semibold text-white">
                        <Wifi className="h-3 w-3" />
                        Available Now
                      </div>
                    </div>
                  </div>

                  {/* Bottom-right — two stacked */}
                  <div className="grid grid-rows-2 gap-4">
                    <div className="relative overflow-hidden rounded-2xl shadow-xl">
                      <Image
                        src={HERO_IMAGES.bottomLeft}
                        alt="African woman working on laptop"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 0px"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-2xl shadow-xl">
                      <Image
                        src={HERO_IMAGES.bottomRight}
                        alt="Professional African woman in office"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 0px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#C4A35A]/90 px-3 py-1 text-xs font-semibold text-white">
                          <Star className="h-3 w-3" />
                          Top Rated
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating accent card */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4B87A]">
                      <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">95%</p>
                      <p className="text-xs text-white/60">Placement Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full"
              preserveAspectRatio="none"
            >
              <path
                d="M0 60V30C240 5 480 0 720 10C960 20 1200 45 1440 30V60H0Z"
                fill="white"
              />
            </svg>
          </div>
        </section>

        {/* ================================================================
            SECTION 2: STATS BAR
            ================================================================ */}
        <section className="relative -mt-1 bg-[var(--surface-0)]">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                {
                  value: "500+",
                  label: "Professionals",
                  Icon: Users,
                  color: "text-[var(--primary)]",
                  bg: "bg-[var(--primary)]/5",
                },
                {
                  value: "200+",
                  label: "Employers",
                  Icon: Building2,
                  color: "text-[var(--warning)]",
                  bg: "bg-[var(--warning)]/5",
                },
                {
                  value: "300+",
                  label: "Placements",
                  Icon: Award,
                  color: "text-[var(--success)]",
                  bg: "bg-[var(--success)]/5",
                },
                {
                  value: "50+",
                  label: "Skills Tracks",
                  Icon: Zap,
                  color: "text-[#D4B87A]",
                  bg: "bg-[#D4B87A]/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <stat.Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <span className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                    {stat.value}
                  </span>
                  <span className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3: MEET OUR GRADUATES — Photo showcase
            ================================================================ */}
        <section className="bg-[var(--surface-0)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/5 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
                <Heart className="h-4 w-4" />
                Our Community
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl lg:text-4xl">
                Meet Our{" "}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                  Talent
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--neutral-gray)] sm:text-lg">
                Skilled, verified, and ready to bring value. Each professional has
                demonstrated expertise and built a real-world portfolio.
              </p>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {GRADUATE_SHOWCASE.map((grad, i) => (
                <div
                  key={i}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <Image
                    src={grad.src}
                    alt={grad.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 200px, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-sm font-semibold text-white">
                      {grad.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                      <span className="text-xs text-white/80">Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/talents"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-lg hover:-translate-y-0.5"
              >
                Explore All Talent
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4: FEATURED TALENTS (from API)
            ================================================================ */}
        <section className="bg-[var(--surface-1)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                  Featured Talent
                </h2>
                <p className="mt-2 text-base text-[var(--neutral-gray)]">
                  Skills-verified graduates ready to make an impact
                </p>
              </div>
              <Link
                href="/talents"
                className="hidden items-center gap-1 text-sm font-semibold text-[var(--primary)] transition-colors hover:text-[var(--secondary)] sm:inline-flex"
              >
                View All Talents
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/talents"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
              >
                View All Talents
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5: SKILLS TRACKS — Cards with background images
            ================================================================ */}
        <section className="bg-[var(--surface-0)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--warning)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--warning)]">
                <Zap className="h-4 w-4" />
                Skills-First
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl lg:text-4xl">
                Talent Across Every{" "}
                <span className="bg-gradient-to-r from-[var(--warning)] to-[#A8893D] bg-clip-text text-transparent">
                  Tech Track
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--neutral-gray)] sm:text-lg">
                From backend engineering to UI/UX design, our graduates are
                trained in the skills that employers need most.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TRACK_IMAGES.map((track) => (
                <Link
                  key={track.track}
                  href={`/talents?track=${encodeURIComponent(track.track.toLowerCase())}`}
                  className="group relative h-64 overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <Image
                    src={track.src}
                    alt={`${track.track} professionals working`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  />
                  {/* Overlay */}
                  <div
                    className="absolute inset-0 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(to top, ${track.color}ee 0%, ${track.color}99 40%, ${track.color}33 100%)`,
                    }}
                  />
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <track.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {track.track}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">
                      {track.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90 transition-transform duration-200 group-hover:translate-x-1">
                      Browse Talent
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6: FEATURED JOBS (from API)
            ================================================================ */}
        <section className="bg-[var(--surface-1)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                  Latest Opportunities
                </h2>
                <p className="mt-2 text-base text-[var(--neutral-gray)]">
                  Open positions from verified employers
                </p>
              </div>
              <Link
                href="/jobs"
                className="hidden items-center gap-1 text-sm font-semibold text-[var(--primary)] transition-colors hover:text-[var(--secondary)] sm:inline-flex"
              >
                View All Jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
              >
                View All Jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7: SUCCESS STORIES / TESTIMONIALS — With photos
            ================================================================ */}
        <section className="relative overflow-hidden bg-[var(--surface-0)] py-20">
          {/* Decorative background */}
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[var(--primary)]/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[var(--warning)]/5 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--success)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--success-dark)]">
                <Award className="h-4 w-4" />
                Success Stories
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl lg:text-4xl">
                Hear From Our{" "}
                <span className="bg-gradient-to-r from-[#10B981] to-[#059669] bg-clip-text text-transparent">
                  Community
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--neutral-gray)] sm:text-lg">
                Real stories from graduates who found their dream roles and
                employers who built winning teams.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8"
                >
                  <Quote className="mb-4 h-8 w-8 text-[var(--primary)]/20" />
                  <p className="text-base leading-relaxed text-[var(--neutral-gray)]">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full shadow-md">
                      <Image
                        src={t.src}
                        alt={t.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {t.name}
                      </p>
                      <p className="text-sm text-[var(--neutral-gray)]">
                        {t.role}
                      </p>
                      <p className="text-xs font-medium text-[var(--primary)]">
                        {t.company}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 8: HOW IT WORKS
            ================================================================ */}
        <section className="bg-[var(--surface-1)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                How It Works
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-[var(--neutral-gray)]">
                Whether you&apos;re a graduate seeking opportunities or an
                employer looking for talent, we make the process seamless.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* For Candidates */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/5 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
                  <Users className="h-4 w-4" />
                  For Candidates
                </div>
                <div className="space-y-6">
                  {[
                    {
                      step: "01",
                      title: "Create Your Profile",
                      description:
                        "Build a comprehensive portfolio showcasing your skills, projects, and achievements from the Digibit programme.",
                    },
                    {
                      step: "02",
                      title: "Get Verified",
                      description:
                        "Our team verifies your skills and reviews your profile to ensure you stand out to employers.",
                    },
                    {
                      step: "03",
                      title: "Get Discovered",
                      description:
                        "Employers browse the directory, find your profile, and request introductions for opportunities.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--neutral-gray)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* For Employers */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--warning)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--warning)]">
                  <Building2 className="h-4 w-4" />
                  For Employers
                </div>
                <div className="space-y-6">
                  {[
                    {
                      step: "01",
                      title: "Post a Job or Browse",
                      description:
                        "Post your open positions or search our curated directory of verified tech talent filtered by skills, track, and location.",
                    },
                    {
                      step: "02",
                      title: "Request Introductions",
                      description:
                        "Found a candidate you like? Request an introduction through our placement team for a vetted, warm connection.",
                    },
                    {
                      step: "03",
                      title: "Hire With Confidence",
                      description:
                        "Interview skills-verified candidates with portfolio evidence. Our team supports the process end-to-end.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--warning)] text-sm font-bold text-white">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--neutral-gray)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 9: COMMUNITY PHOTO COLLAGE
            ================================================================ */}
        <section className="relative overflow-hidden bg-[#0F2E78] py-20">
          <div className="absolute inset-0 opacity-10">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, #D4B87A 1px, transparent 1px), radial-gradient(circle at 75% 75%, #C4A35A 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                A Growing Network of{" "}
                <span className="bg-gradient-to-r from-[#D4B87A] to-[var(--warning)] bg-clip-text text-transparent">
                  African Tech Talent
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-white/70 sm:text-lg">
                Our graduates are building the future across Lagos, Abuja,
                Nairobi, Accra, and beyond. Join a community that supports your
                growth.
              </p>
            </div>

            {/* Photo mosaic */}
            <div className="grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-4 md:auto-rows-[180px]">
              {COMMUNITY_GALLERY.map((photo, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-xl ${photo.span}`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(min-width: 1024px) 350px, (min-width: 640px) 250px, 50vw"
                  />
                  <div className="absolute inset-0 bg-[#0F2E78]/10 transition-opacity duration-300 hover:opacity-0" />
                </div>
              ))}
            </div>

            {/* Inline stats */}
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { value: "9+", label: "Countries", icon: Globe },
                { value: "12", label: "Tech Tracks", icon: Code2 },
                { value: "95%", label: "Completion Rate", icon: Award },
                { value: "< 30 days", label: "Avg. Time to Hire", icon: Clock },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="mx-auto mb-2 h-6 w-6 text-[#D4B87A]" />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 10: WHY DIGIBIT TALENT — Features with images
            ================================================================ */}
        <section className="bg-[var(--surface-0)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left — Image grid */}
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="relative h-48 overflow-hidden rounded-2xl shadow-lg sm:h-56">
                      <Image
                        src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=500&h=400&fit=crop&crop=face"
                        alt="Young African woman developer"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 50vw"
                      />
                    </div>
                    <div className="relative h-36 overflow-hidden rounded-2xl shadow-lg sm:h-44">
                      <Image
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=350&fit=crop&crop=face"
                        alt="African professional in business attire"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 50vw"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="relative h-36 overflow-hidden rounded-2xl shadow-lg sm:h-44">
                      <Image
                        src="https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=500&h=350&fit=crop&crop=face"
                        alt="African woman working on laptop"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 50vw"
                      />
                    </div>
                    <div className="relative h-48 overflow-hidden rounded-2xl shadow-lg sm:h-56">
                      <Image
                        src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=500&h=400&fit=crop&crop=face"
                        alt="Young African man professional"
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 280px, 50vw"
                      />
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/10">
                      <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        Every profile verified
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)]">
                        By our placement team
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — Content */}
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/5 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
                  <Shield className="h-4 w-4" />
                  Why Digibit Talent
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                  Hire smarter. Hire faster. Hire with confidence.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[var(--neutral-gray)]">
                  We don&apos;t just list profiles — we verify skills, curate
                  portfolios, and support the entire placement journey from
                  introduction to onboarding.
                </p>

                <div className="mt-8 space-y-5">
                  {[
                    {
                      icon: CheckCircle2,
                      title: "Skills-Verified Talent",
                      description:
                        "Every candidate undergoes technical assessment and portfolio review before being listed.",
                    },
                    {
                      icon: Shield,
                      title: "Employer Verification",
                      description:
                        "Only verified organizations can access full profiles and request introductions.",
                    },
                    {
                      icon: Handshake,
                      title: "Managed Introductions",
                      description:
                        "Our placement team facilitates warm introductions, not cold applications.",
                    },
                    {
                      icon: TrendingUp,
                      title: "End-to-End Tracking",
                      description:
                        "From first introduction to successful placement — full pipeline visibility.",
                    },
                  ].map((feature) => (
                    <div key={feature.title} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/5">
                        <feature.icon className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {feature.title}
                        </h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-[var(--neutral-gray)]">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 11: TRUSTED EMPLOYERS — Logos / partners
            ================================================================ */}
        <section className="border-y border-[var(--border)] bg-[var(--surface-1)] py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-[var(--neutral-gray)]">
              Trusted by leading organisations across Africa
            </p>
            <div className="grid grid-cols-2 items-center gap-8 sm:grid-cols-3 md:grid-cols-6">
              {[
                "TechCorp",
                "FinanceHub",
                "CloudWave",
                "DataPulse",
                "CyberShield",
                "InnoVentures",
              ].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-4 text-center"
                >
                  <span className="text-base font-bold tracking-tight text-[var(--foreground)]/40">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 12: DUAL CTA — With background images
            ================================================================ */}
        <section className="bg-[var(--surface-0)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Employer CTA */}
              <div className="relative overflow-hidden rounded-2xl shadow-xl">
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&h=500&fit=crop"
                    alt="Diverse team in a meeting"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 600px, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/95 to-[#0F2E78]/85" />
                </div>
                <div className="relative p-8 text-white sm:p-10">
                  <Building2 className="mb-4 h-10 w-10 text-[#D4B87A]" />
                  <h3 className="text-2xl font-bold">
                    Ready to find your next hire?
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-white/80">
                    Access a curated pool of skills-verified graduates. Post
                    jobs, search profiles, and request introductions — all in
                    one place.
                  </p>
                  <Link
                    href="/auth/register/employer"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-0)] px-6 py-3 text-sm font-semibold text-[var(--primary)] transition-all hover:bg-[#D4B87A] hover:shadow-lg"
                  >
                    Get Started as Employer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Candidate CTA */}
              <div className="relative overflow-hidden rounded-2xl shadow-xl">
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&h=500&fit=crop"
                    alt="Young professionals collaborating"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 600px, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--foreground)]/90 to-[var(--foreground)]/70" />
                </div>
                <div className="relative p-8 text-white sm:p-10">
                  <Users className="mb-4 h-10 w-10 text-[#D4B87A]" />
                  <h3 className="text-2xl font-bold">
                    Ready to showcase your skills?
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-white/80">
                    Create your portfolio profile, get your skills verified, and
                    connect with employers looking for talent like you.
                  </p>
                  <Link
                    href="/auth/register/candidate"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--secondary)] hover:shadow-lg"
                  >
                    Create Your Profile
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
