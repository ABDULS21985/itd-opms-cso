"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Clock,
  ShieldCheck,
  ChevronRight,
  Lock,
  FileText,
  Layers,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  useCatalogItem,
  useCatalogCategory,
  useRelatedCatalogItems,
  useSLAPolicy,
  useCreateTicket,
} from "@/hooks/use-itsm";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DynamicFormRenderer,
  type FormSchema,
} from "@/components/shared/dynamic-form-renderer";
import type { CatalogItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-[var(--surface-2)]" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 space-y-4">
            <div className="h-6 w-2/3 rounded bg-[var(--surface-2)]" />
            <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--surface-2)]" />
            <div className="h-4 w-4/6 rounded bg-[var(--surface-2)]" />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 h-64" />
        </div>
        <div className="lg:w-80 space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 h-48" />
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6 h-32" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Related Services Card                                              */
/* ------------------------------------------------------------------ */

function RelatedServicesCard({
  items,
  currentItemId,
}: {
  items: CatalogItem[];
  currentItemId: string;
}) {
  const router = useRouter();
  const related = items
    .filter((i) => i.id !== currentItemId)
    .slice(0, 5);

  if (related.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Layers size={16} className="text-[var(--primary)]" />
        Related Services
      </h3>
      <div className="space-y-2">
        {related.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              router.push(
                `/dashboard/itsm/service-catalog/${item.id}`,
              )
            }
            className="group w-full text-left rounded-lg border border-[var(--border)] p-3 transition-all duration-150 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.name}
                </p>
                {item.estimatedDelivery && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {item.estimatedDelivery}
                  </p>
                )}
              </div>
              <ChevronRight
                size={14}
                className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-sm text-[var(--text-secondary)] shrink-0 mr-4">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--text-primary)] text-right">
        {children}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Approval Info                                                      */
/* ------------------------------------------------------------------ */

function ApprovalInfo({
  config,
}: {
  config?: Record<string, unknown>;
}) {
  if (!config) {
    return (
      <span className="text-sm text-[var(--text-secondary)]">
        Standard approval process
      </span>
    );
  }

  const type = config.type as string | undefined;
  const levels = config.levels as unknown[] | undefined;

  return (
    <div className="space-y-1.5">
      {type && (
        <span className="text-sm capitalize text-[var(--text-primary)]">
          {type.replace(/_/g, " ")} approval
        </span>
      )}
      {levels && (
        <span className="text-xs text-[var(--text-secondary)] block">
          {levels.length} approval level{levels.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ServiceCatalogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const { data: item, isLoading: itemLoading } = useCatalogItem(itemId);
  const { data: category } = useCatalogCategory(item?.categoryId);
  const { data: slaPolicy } = useSLAPolicy(item?.slaPolicyId);
  const { data: relatedItems } = useRelatedCatalogItems(itemId);
  const createTicket = useCreateTicket();

  // Parse form schema
  const formSchema = useMemo<FormSchema | null>(() => {
    if (!item?.formSchema) return null;
    const schema = item.formSchema as unknown;
    if (
      typeof schema === "object" &&
      schema !== null &&
      "fields" in schema &&
      Array.isArray((schema as { fields: unknown }).fields)
    ) {
      return schema as FormSchema;
    }
    return null;
  }, [item?.formSchema]);

  // SLA priority targets formatted
  const slaTargets = useMemo(() => {
    if (!slaPolicy?.priorityTargets) return null;
    const targets = slaPolicy.priorityTargets as unknown as Record<
      string,
      { response_minutes: number; resolution_minutes: number }
    >;
    return targets;
  }, [slaPolicy?.priorityTargets]);

  const handleFormSubmit = (data: Record<string, unknown>) => {
    createTicket.mutate(
      {
        type: "service_request",
        title: item?.name || "Service Request",
        description:
          item?.description || `Service request for ${item?.name}`,
        urgency: "medium",
        impact: "medium",
        channel: "portal",
        customFields: {
          catalogItemId: itemId,
          catalogItemName: item?.name,
          formData: data,
        },
      } as Parameters<typeof createTicket.mutate>[0],
      {
        onSuccess: (ticket) => {
          const ticketData = ticket as { id?: string };
          if (ticketData?.id) {
            router.push(`/dashboard/itsm/tickets/${ticketData.id}`);
          } else {
            router.push("/dashboard/itsm/tickets");
          }
        },
      },
    );
  };

  const handleQuickRequest = () => {
    const params = new URLSearchParams({
      catalogItemId: itemId,
      type: "service_request",
      title: item?.name || "",
    });
    router.push(`/dashboard/itsm/tickets/new?${params.toString()}`);
  };

  if (itemLoading) return <DetailSkeleton />;

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle
          size={48}
          className="text-[var(--text-secondary)] mb-4 opacity-40"
        />
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Service not found
        </p>
        <button
          onClick={() => router.push("/dashboard/itsm/service-catalog")}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Back to Service Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb & Back */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => router.push("/dashboard/itsm/service-catalog")}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors mb-3"
        >
          <ArrowLeft size={16} />
          Service Catalog
        </button>

        {/* Breadcrumb trail */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
          <span>Service Catalog</span>
          {category && (
            <>
              <ChevronRight size={12} />
              <span>{category.name}</span>
            </>
          )}
          <ChevronRight size={12} />
          <span className="text-[var(--text-primary)] font-medium">
            {item.name}
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Service Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-xl border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <Package size={24} style={{ color: "#3B82F6" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {item.name}
                  </h1>
                  <StatusBadge status={item.status} />
                </div>

                {item.description && (
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
                    {item.description}
                  </p>
                )}

                {/* Quick Info Badges */}
                <div className="flex items-center gap-3 flex-wrap mt-4">
                  {item.estimatedDelivery && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-1)] rounded-full px-2.5 py-1">
                      <Clock size={12} />
                      {item.estimatedDelivery}
                    </span>
                  )}
                  {item.approvalRequired && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: "rgba(249, 115, 22, 0.1)",
                        color: "#F97316",
                      }}
                    >
                      <ShieldCheck size={12} />
                      Approval Required
                    </span>
                  )}
                  {item.entitlementRoles &&
                    item.entitlementRoles.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-1)] rounded-full px-2.5 py-1">
                        <Lock size={12} />
                        Role-restricted
                      </span>
                    )}
                  {category && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-1)] rounded-full px-2.5 py-1">
                      <Layers size={12} />
                      {category.name}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-secondary)]">
                    v{item.version}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Service Details Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
              Service Details
            </h2>

            <div className="divide-y divide-[var(--border)]">
              {category && (
                <InfoRow label="Category">{category.name}</InfoRow>
              )}
              {item.estimatedDelivery && (
                <InfoRow label="Estimated Delivery">
                  {item.estimatedDelivery}
                </InfoRow>
              )}
              <InfoRow label="Approval Required">
                {item.approvalRequired ? "Yes" : "No"}
              </InfoRow>
              {item.approvalRequired && (
                <InfoRow label="Approval Process">
                  <ApprovalInfo
                    config={
                      item.approvalChainConfig as
                        | Record<string, unknown>
                        | undefined
                    }
                  />
                </InfoRow>
              )}
              {slaPolicy && (
                <InfoRow label="SLA Policy">{slaPolicy.name}</InfoRow>
              )}
              {item.entitlementRoles &&
                item.entitlementRoles.length > 0 && (
                  <InfoRow label="Entitled Roles">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {item.entitlementRoles.map((role) => (
                        <span
                          key={role}
                          className="inline-block text-xs bg-[var(--surface-2)] text-[var(--text-secondary)] rounded-full px-2 py-0.5"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </InfoRow>
                )}
            </div>
          </motion.div>

          {/* SLA Details */}
          {slaPolicy && slaTargets && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-xl border p-6"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
              }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
                SLA Terms
              </h2>
              {slaPolicy.description && (
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {slaPolicy.description}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(slaTargets).map(([priority, targets]) => (
                  <div
                    key={priority}
                    className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-1)]"
                  >
                    <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      {priority.replace(/_/g, " ")}
                    </span>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Response
                        </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {targets.response_minutes < 60
                            ? `${targets.response_minutes}m`
                            : `${Math.floor(targets.response_minutes / 60)}h`}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Resolution
                        </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {targets.resolution_minutes < 60
                            ? `${targets.resolution_minutes}m`
                            : targets.resolution_minutes < 1440
                              ? `${Math.floor(targets.resolution_minutes / 60)}h`
                              : `${Math.floor(targets.resolution_minutes / 1440)}d`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Request Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-xl border p-6"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Request This Service
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mb-5">
              {formSchema
                ? "Fill out the form below to submit your request."
                : "Click below to create a service request ticket."}
            </p>

            {formSchema ? (
              <DynamicFormRenderer
                schema={formSchema}
                onSubmit={handleFormSubmit}
                isSubmitting={createTicket.isPending}
                submitLabel="Submit Service Request"
              />
            ) : (
              <button
                onClick={handleQuickRequest}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-6 py-3 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Send size={16} />
                Request This Service
              </button>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 space-y-4">
          {/* Quick Action Card */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <FileText size={16} className="text-[var(--primary)]" />
              Quick Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-[var(--text-secondary)]">
                  Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={item.status} />
                </div>
              </div>
              {item.estimatedDelivery && (
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Delivery Time
                  </span>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {item.estimatedDelivery}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-[var(--text-secondary)]">
                  Approval
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                  {item.approvalRequired
                    ? "Manager approval needed"
                    : "Auto-approved"}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)]">
                  Version
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                  {item.version}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Related Services */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <RelatedServicesCard
              items={relatedItems || []}
              currentItemId={itemId}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
