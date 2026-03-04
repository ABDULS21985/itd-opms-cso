"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  DollarSign,
  Star,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import {
  useVendor,
  useVendorSummary,
  useVendorScorecards,
  type Vendor,
  type Contract,
} from "@/hooks/use-vendors";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "contracts", label: "Contracts" },
  { key: "performance", label: "Performance" },
  { key: "spend", label: "Spend Analysis" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CONTRACT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  expiring_soon: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  expired: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  renewed: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  terminated: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  under_review: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

const VENDOR_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  inactive: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  under_review: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  blacklisted: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
};

/* ------------------------------------------------------------------ */
/*  Helper hooks                                                       */
/* ------------------------------------------------------------------ */

function useVendorContracts(vendorId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ["vendor-contracts", vendorId, page],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contract>>(
        `/vendors/${vendorId}/contracts`,
        { page, limit: 20 },
      ),
    enabled: !!vendorId,
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function OverviewTab({ vendor }: { vendor: Vendor }) {
  const { data: summary } = useVendorSummary(vendor.id);

  const statusColor = VENDOR_STATUS_COLORS[vendor.status] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Total Contracts
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {summary.totalContracts}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Active Contracts
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#10B981" }}
            >
              {summary.activeContracts}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Annual Value
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#3B82F6" }}
            >
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(summary.totalAnnualValue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Avg Score
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{
                color:
                  summary.avgScore >= 4
                    ? "#10B981"
                    : summary.avgScore >= 3
                      ? "#F59E0B"
                      : "#EF4444",
              }}
            >
              {summary.avgScore.toFixed(1)}/5
            </p>
          </div>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Contact Information
          </h3>
          <div className="space-y-3">
            {vendor.contactName && (
              <div className="flex items-center gap-3">
                <Building2
                  size={16}
                  className="text-[var(--text-secondary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {vendor.contactName}
                </span>
              </div>
            )}
            {vendor.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--text-secondary)]" />
                <a
                  href={`mailto:${vendor.contactEmail}`}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  {vendor.contactEmail}
                </a>
              </div>
            )}
            {vendor.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  {vendor.contactPhone}
                </span>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-[var(--text-secondary)]" />
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                >
                  {vendor.website}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  {vendor.address}
                </span>
              </div>
            )}
            {!vendor.contactName &&
              !vendor.contactEmail &&
              !vendor.contactPhone &&
              !vendor.website &&
              !vendor.address && (
                <p className="text-sm text-[var(--text-secondary)]">
                  No contact information available
                </p>
              )}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Vendor Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Status
              </span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                style={{
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                }}
              >
                {vendor.status.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Type
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {vendor.vendorType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Code
              </span>
              <span className="text-sm font-mono text-[var(--text-primary)]">
                {vendor.code}
              </span>
            </div>
            {vendor.taxId && (
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Tax ID
                </span>
                <span className="text-sm text-[var(--text-primary)]">
                  {vendor.taxId}
                </span>
              </div>
            )}
            {vendor.paymentTerms && (
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Payment Terms
                </span>
                <span className="text-sm text-[var(--text-primary)]">
                  {vendor.paymentTerms}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Registered
              </span>
              <span className="text-sm text-[var(--text-primary)] tabular-nums">
                {new Date(vendor.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {vendor.notes && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                Notes
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                {vendor.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContractsTab({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [contractPage, _setContractPage] = useState(1);
  const { data, isLoading } = useVendorContracts(vendorId, contractPage);
  const contracts = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
        <FileText
          size={40}
          className="mx-auto mb-3 text-[var(--text-secondary)]"
        />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          No contracts found
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          This vendor has no contracts yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => {
        const statusColor = CONTRACT_STATUS_COLORS[contract.status] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-secondary)",
        };
        return (
          <div
            key={contract.id}
            onClick={() =>
              router.push(`/dashboard/cmdb/contracts?id=${contract.id}`)
            }
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-colors hover:bg-[var(--surface-1)] cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {contract.title}
                </p>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize"
                  style={{
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                  }}
                >
                  {contract.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="font-mono">{contract.contractNumber}</span>
                <span className="capitalize">
                  {contract.contractType.replace("_", " ")}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Calendar size={12} />
                  {new Date(contract.startDate).toLocaleDateString()} -{" "}
                  {new Date(contract.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              {contract.annualValue != null && (
                <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: contract.currency || "NGN",
                    maximumFractionDigits: 0,
                  }).format(contract.annualValue)}
                </p>
              )}
              <p className="text-xs text-[var(--text-secondary)]">/year</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PerformanceTab({ vendorId }: { vendorId: string }) {
  const { data: scorecards, isLoading } = useVendorScorecards(vendorId);

  const latestScorecard = useMemo(() => {
    if (!scorecards || scorecards.length === 0) return null;
    return scorecards[0];
  }, [scorecards]);

  const radarData = useMemo(() => {
    if (!latestScorecard) return [];
    return [
      { dimension: "Quality", score: latestScorecard.qualityScore, fullMark: 5 },
      { dimension: "Delivery", score: latestScorecard.deliveryScore, fullMark: 5 },
      { dimension: "Responsiveness", score: latestScorecard.responsivenessScore, fullMark: 5 },
      { dimension: "Cost", score: latestScorecard.costScore, fullMark: 5 },
      { dimension: "Compliance", score: latestScorecard.complianceScore, fullMark: 5 },
    ];
  }, [latestScorecard]);

  const trendData = useMemo(() => {
    if (!scorecards || scorecards.length === 0) return [];
    return [...scorecards]
      .reverse()
      .map((sc) => ({
        period: sc.reviewPeriod,
        overall: sc.overallScore,
        quality: sc.qualityScore,
        delivery: sc.deliveryScore,
        responsiveness: sc.responsivenessScore,
        cost: sc.costScore,
        compliance: sc.complianceScore,
      }));
  }, [scorecards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!scorecards || scorecards.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
        <Star
          size={40}
          className="mx-auto mb-3 text-[var(--text-secondary)]"
        />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          No scorecards yet
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Performance scorecards will appear here once created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Radar Chart + Latest Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Performance Radar ({latestScorecard?.reviewPeriod})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Latest Scorecard
          </h3>
          {latestScorecard && (
            <div className="space-y-4">
              <div className="text-center pb-4 border-b border-[var(--border)]">
                <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">
                  {latestScorecard.overallScore.toFixed(1)}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Overall Score / 5.0
                </p>
              </div>
              {[
                { label: "Quality", score: latestScorecard.qualityScore, color: "#3B82F6" },
                { label: "Delivery", score: latestScorecard.deliveryScore, color: "#10B981" },
                { label: "Responsiveness", score: latestScorecard.responsivenessScore, color: "#F59E0B" },
                { label: "Cost", score: latestScorecard.costScore, color: "#8B5CF6" },
                { label: "Compliance", score: latestScorecard.complianceScore, color: "#EC4899" },
              ].map((dim) => (
                <div key={dim.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">
                      {dim.label}
                    </span>
                    <span
                      className="font-bold tabular-nums"
                      style={{ color: dim.color }}
                    >
                      {dim.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(dim.score / 5) * 100}%`,
                        backgroundColor: dim.color,
                      }}
                    />
                  </div>
                </div>
              ))}

              {latestScorecard.strengths && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Strengths
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {latestScorecard.strengths}
                  </p>
                </div>
              )}
              {latestScorecard.weaknesses && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Weaknesses
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {latestScorecard.weaknesses}
                  </p>
                </div>
              )}
              {latestScorecard.improvementAreas && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Improvement Areas
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {latestScorecard.improvementAreas}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trend Line */}
      {trendData.length > 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Performance Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="overall"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4, fill: "#3B82F6" }}
                name="Overall"
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Quality"
              />
              <Line
                type="monotone"
                dataKey="delivery"
                stroke="#F59E0B"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Delivery"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scorecard History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Scorecard History
        </h3>
        <div className="space-y-2">
          {scorecards.map((sc) => (
            <div
              key={sc.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {sc.reviewPeriod}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Reviewed {new Date(sc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span>Q: {sc.qualityScore.toFixed(1)}</span>
                <span>D: {sc.deliveryScore.toFixed(1)}</span>
                <span>R: {sc.responsivenessScore.toFixed(1)}</span>
                <span>C: {sc.costScore.toFixed(1)}</span>
                <span>Cp: {sc.complianceScore.toFixed(1)}</span>
                <span
                  className="font-bold text-sm"
                  style={{
                    color:
                      sc.overallScore >= 4
                        ? "#10B981"
                        : sc.overallScore >= 3
                          ? "#F59E0B"
                          : "#EF4444",
                  }}
                >
                  {sc.overallScore.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpendAnalysisTab({ vendorId }: { vendorId: string }) {
  const { data } = useVendorContracts(vendorId, 1);
  const contracts = data?.data ?? [];

  const spendData = useMemo(() => {
    if (contracts.length === 0) return [];

    // Group contracts by year and compute total annual spend.
    const byYear: Record<string, number> = {};
    contracts.forEach((c) => {
      const startYear = new Date(c.startDate).getFullYear();
      const endYear = new Date(c.endDate).getFullYear();
      const annualVal = c.annualValue ?? 0;

      for (let year = startYear; year <= endYear; year++) {
        const key = year.toString();
        byYear[key] = (byYear[key] || 0) + annualVal;
      }
    });

    return Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, value]) => ({ year, value }));
  }, [contracts]);

  const spendByType = useMemo(() => {
    if (contracts.length === 0) return [];

    const byType: Record<string, number> = {};
    contracts.forEach((c) => {
      const key = c.contractType.replace("_", " ");
      byType[key] = (byType[key] || 0) + (c.annualValue ?? 0);
    });

    return Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .map(([type, value]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        value,
      }));
  }, [contracts]);

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
        <DollarSign
          size={40}
          className="mx-auto mb-3 text-[var(--text-secondary)]"
        />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          No spend data available
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Spend analysis will appear once contracts are added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Annual Spend Bar Chart */}
      {spendData.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Annual Spend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-NG", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value) =>
                  new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 0,
                  }).format(Number(value))
                }
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spend by Contract Type */}
      {spendByType.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Spend by Contract Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendByType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-NG", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value) =>
                  new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 0,
                  }).format(Number(value))
                }
              />
              <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contract Breakdown */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Contract Value Breakdown
        </h3>
        <div className="space-y-2">
          {contracts
            .filter((c) => c.annualValue != null && c.annualValue > 0)
            .sort((a, b) => (b.annualValue ?? 0) - (a.annualValue ?? 0))
            .map((c) => {
              const maxVal = Math.max(
                ...contracts.map((x) => x.annualValue ?? 0),
              );
              const pct =
                maxVal > 0 ? ((c.annualValue ?? 0) / maxVal) * 100 : 0;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-primary)] line-clamp-1">
                      {c.title}
                    </span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums shrink-0 ml-4">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: c.currency || "NGN",
                        maximumFractionDigits: 0,
                      }).format(c.annualValue ?? 0)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-1.5 rounded-full bg-[#3B82F6] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: vendor, isLoading } = useVendor(vendorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-medium text-[var(--text-primary)]">
          Vendor not found
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/cmdb/vendors")}
          className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Vendors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/cmdb/vendors")}
          className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Vendors
        </button>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <Building2 size={24} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {vendor.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {vendor.code} -- {vendor.vendorType}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "overview" && <OverviewTab vendor={vendor} />}
        {activeTab === "contracts" && <ContractsTab vendorId={vendorId} />}
        {activeTab === "performance" && (
          <PerformanceTab vendorId={vendorId} />
        )}
        {activeTab === "spend" && <SpendAnalysisTab vendorId={vendorId} />}
      </motion.div>
    </div>
  );
}
