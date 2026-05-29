"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileArchive,
  GitBranch,
  Loader2,
  Map,
  MessageSquareText,
  Play,
  RadioTower,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
  TriangleAlert,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import {
  useGenerateITSMEvidencePack,
  useImpactMap,
  useOperationsSnapshot,
  usePlaybookPreview,
  useProcessMining,
  useSLAForecast,
  useTriageAssistant,
  useWorkflowSimulation,
} from "@/hooks/use-itsm";
import type {
  ImpactMapResponse,
  ITSMEvidencePack,
  OperationsTask,
  PlaybookPreviewResponse,
  ProcessBottleneck,
  SLAForecastResponse,
  TriageSuggestion,
  WorkflowSimulationResult,
} from "@/types";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const panelClass = "rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm";

function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      {pct}% confidence
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: Array<{ label: string; reason?: string; metadata?: string[] }> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{title}</p>
      {items.length > 0 ? (
        items.map((item) => (
          <div key={`${title}-${item.label}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
            {item.reason && <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.reason}</p>}
            {item.metadata && item.metadata.length > 0 && (
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.metadata.filter(Boolean).join(" / ")}</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-[var(--text-muted)]">No matching signals yet.</p>
      )}
    </div>
  );
}

function BottleneckColumn({ title, items }: { title: string; items: ProcessBottleneck[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {items.length > 0 ? (
        items.map((item) => (
          <div key={`${title}-${item.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
              <span className="rounded-full bg-[var(--surface-0)] px-2 py-1 text-[11px] font-semibold capitalize text-[var(--text-secondary)]">
                {item.severity}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {item.count} item(s), avg age {item.ageHours}h
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.reasons.join(" ")}</p>
          </div>
        ))
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-sm text-[var(--text-muted)]">No pressure detected.</p>
      )}
    </div>
  );
}

function TaskList({ tasks }: { tasks: OperationsTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Nothing is waiting on you right now.</p>;
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={task.actionUrl}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <span>
            <span className="block font-semibold text-[var(--text-primary)]">{task.label}</span>
            <span className="block text-xs text-[var(--text-muted)]">{task.reason}</span>
          </span>
          <ArrowRight size={16} className="text-[var(--text-tertiary)]" />
        </Link>
      ))}
    </div>
  );
}

function TriageResult({ result }: { result?: TriageSuggestion }) {
  if (!result) {
    return <p className="text-sm text-[var(--text-muted)]">Run the assistant to see recommended category, queue, owner, CIs, known errors, and KB articles.</p>;
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Category", `${result.category} / ${result.subcategory}`],
          ["Priority", result.priority.replace(/_/g, " ")],
          ["Required", result.requiredFields.join(", ")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <Confidence value={result.confidence} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ResultList title="Routing" items={[result.queue, result.assignee].filter(Boolean) as NonNullable<TriageSuggestion["queue"]>[]} />
        <ResultList title="Related CIs" items={result.relatedCis} />
        <ResultList title="Known Errors" items={result.knownErrors} />
        <ResultList title="Knowledge" items={result.kbArticles} />
      </div>
      <ResultList title="Why" items={result.explanation.map((label) => ({ label }))} />
    </div>
  );
}

function SimulationResult({ result }: { result?: WorkflowSimulationResult }) {
  if (!result) return <p className="text-sm text-[var(--text-muted)]">Simulate lifecycle moves before a workflow version is published.</p>;
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-3 ${result.allowed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          {result.allowed ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
          {result.message}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ResultList title="Blockers" items={result.blockers.map((label) => ({ label }))} />
        <ResultList title="Side effects" items={result.sideEffects.map((label) => ({ label }))} />
        <ResultList title="Notifications" items={result.notifications.map((label) => ({ label }))} />
        <ResultList title="Audit trail" items={result.auditTrail.map((label) => ({ label }))} />
      </div>
    </div>
  );
}

function SLAResult({ result }: { result?: SLAForecastResponse }) {
  if (!result) return <p className="text-sm text-[var(--text-muted)]">Forecast breach probability from SLA time, workload, and priority.</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-3xl font-bold text-blue-900">{Math.round(result.breachProbability * 100)}%</p>
        <p className="text-sm font-semibold capitalize text-blue-800">{result.riskLabel} breach probability</p>
        <p className="mt-1 text-xs text-blue-700">{result.minutesRemaining} minutes remaining</p>
      </div>
      <ResultList title="Drivers" items={result.drivers.map((label) => ({ label }))} />
      <ResultList title="Recommendations" items={result.recommendations.map((label) => ({ label }))} />
    </div>
  );
}

function EvidencePackResult({ pack }: { pack?: ITSMEvidencePack }) {
  if (!pack) return <p className="text-sm text-[var(--text-muted)]">Generate an audit/CAB/PIR evidence pack with timeline, comments, decisions, and checksum.</p>;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
        <p className="text-sm font-semibold text-violet-950">Evidence pack generated</p>
        <p className="mt-1 break-all font-mono text-xs text-violet-800">{pack.checksum}</p>
      </div>
      <ResultList title="Sections" items={pack.sections.map((section) => ({ label: `${section.title}: ${section.items.length} item(s)` }))} />
    </div>
  );
}

function PlaybookResult({ result }: { result?: PlaybookPreviewResponse }) {
  if (!result) return <p className="text-sm text-[var(--text-muted)]">Preview automation actions triggered by workflow transitions.</p>;
  return (
    <div className="space-y-3">
      <ResultList title="Actions" items={result.actions.map((action) => ({ label: action.label, reason: action.description, metadata: [action.type, action.required ? "required" : "optional"] }))} />
      <ResultList title="Warnings" items={result.warnings.map((label) => ({ label }))} />
    </div>
  );
}

function ImpactMap({ map }: { map?: ImpactMapResponse }) {
  if (!map) return <p className="text-sm text-[var(--text-muted)]">Enter an entity ID to inspect affected CIs, related records, and business-service signals.</p>;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {map.nodes.map((node) => (
          <div key={node.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{node.label}</p>
            <p className="text-xs capitalize text-[var(--text-muted)]">{node.type} {node.status ? `/ ${node.status}` : ""}</p>
          </div>
        ))}
      </div>
      <ResultList title="Relationships" items={map.edges.map((edge) => ({ label: `${edge.source} -> ${edge.target}`, reason: edge.label }))} />
      <ResultList title="Signals" items={map.signals.map((label) => ({ label }))} />
    </div>
  );
}

export default function ITSMIntelligencePage() {
  const triage = useTriageAssistant();
  const workflowSimulation = useWorkflowSimulation();
  const processMining = useProcessMining();
  const evidencePack = useGenerateITSMEvidencePack();
  const slaForecast = useSLAForecast();
  const playbookPreview = usePlaybookPreview();
  const operations = useOperationsSnapshot();

  const [triageInput, setTriageInput] = useState({
    title: "Payment switch latency for external transfers",
    description: "Customers report slow transaction completion and intermittent API timeout errors.",
    type: "incident",
    urgency: "high",
    impact: "high",
  });
  const [simulationInput, setSimulationInput] = useState({
    entity: "major_incident",
    currentStatus: "resolved",
    targetStatus: "closed",
    priority: "P1_critical",
    pirRequired: true,
    pirCompleted: false,
  });
  const [impactEntity, setImpactEntity] = useState({ entityType: "ticket", entityId: "" });
  const [impactQuery, setImpactQuery] = useState<{ entityType?: string; entityId?: string }>({});
  const impactMap = useImpactMap(impactQuery.entityType, impactQuery.entityId);
  const [evidenceInput, setEvidenceInput] = useState({ entityType: "ticket", entityId: "", purpose: "PIR" });
  const [slaInput, setSlaInput] = useState({
    priority: "P2_high",
    status: "in_progress",
    queueOpenCount: 18,
    assigneeOpenCount: 7,
    similarHistoricalHours: 18,
  });
  const [playbookInput, setPlaybookInput] = useState({
    entityType: "major_incident",
    transition: "major_incident_declared",
    priority: "P1_critical",
  });

  const metricCards = useMemo(() => {
    const metrics = processMining.data?.metrics ?? {};
    return [
      { label: "Open tickets", value: metrics.openTickets ?? 0 },
      { label: "SLA risk", value: metrics.slaRiskTickets ?? 0 },
      { label: "Pending approvals", value: metrics.pendingApprovals ?? 0 },
    ];
  }, [processMining.data]);

  return (
    <div className="mx-auto max-w-[96rem] space-y-6 pb-10">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles size={14} />
              ITSM intelligence layer
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)]">Operations Intelligence</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Predictive triage, workflow simulation, playbook previews, impact mapping, process mining,
              mobile-ready approvals, evidence packs, and NFR readiness in one operator workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metricCards.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{metric.value}</p>
                <p className="text-xs text-[var(--text-muted)]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Brain size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Triage Assistant</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} value={triageInput.title} onChange={(event) => setTriageInput((prev) => ({ ...prev, title: event.target.value }))} />
            <select className={inputClass} value={triageInput.type} onChange={(event) => setTriageInput((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="incident">Incident</option>
              <option value="service_request">Service request</option>
            </select>
            <select className={inputClass} value={triageInput.urgency} onChange={(event) => setTriageInput((prev) => ({ ...prev, urgency: event.target.value }))}>
              <option value="critical">Critical urgency</option>
              <option value="high">High urgency</option>
              <option value="medium">Medium urgency</option>
              <option value="low">Low urgency</option>
            </select>
            <select className={inputClass} value={triageInput.impact} onChange={(event) => setTriageInput((prev) => ({ ...prev, impact: event.target.value }))}>
              <option value="critical">Critical impact</option>
              <option value="high">High impact</option>
              <option value="medium">Medium impact</option>
              <option value="low">Low impact</option>
            </select>
            <textarea className={`${inputClass} sm:col-span-2`} rows={3} value={triageInput.description} onChange={(event) => setTriageInput((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
          <button
            type="button"
            onClick={() => triage.mutate({ ...triageInput, channel: "portal" })}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {triage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Run triage
          </button>
        </div>
        <div className={panelClass}>
          <TriageResult result={triage.data} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Workflow size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workflow Simulation Mode</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["entity", "currentStatus", "targetStatus", "priority"] as const).map((key) => (
              <input
                key={key}
                className={inputClass}
                value={String(simulationInput[key])}
                onChange={(event) => setSimulationInput((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            ))}
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" checked={simulationInput.pirRequired} onChange={(event) => setSimulationInput((prev) => ({ ...prev, pirRequired: event.target.checked }))} />
              PIR required
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" checked={simulationInput.pirCompleted} onChange={(event) => setSimulationInput((prev) => ({ ...prev, pirCompleted: event.target.checked }))} />
              PIR completed
            </label>
          </div>
          <button type="button" onClick={() => workflowSimulation.mutate(simulationInput)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            <Play size={16} />
            Simulate
          </button>
          <div className="mt-4">
            <SimulationResult result={workflowSimulation.data} />
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Automation Playbooks</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={inputClass} value={playbookInput.entityType} onChange={(event) => setPlaybookInput((prev) => ({ ...prev, entityType: event.target.value }))} />
            <input className={inputClass} value={playbookInput.transition} onChange={(event) => setPlaybookInput((prev) => ({ ...prev, transition: event.target.value }))} />
            <input className={inputClass} value={playbookInput.priority} onChange={(event) => setPlaybookInput((prev) => ({ ...prev, priority: event.target.value }))} />
          </div>
          <button type="button" onClick={() => playbookPreview.mutate(playbookInput)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
            <Play size={16} />
            Preview playbook
          </button>
          <div className="mt-4">
            <PlaybookResult result={playbookPreview.data} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <TimerReset size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Advanced SLA Forecasting</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} value={slaInput.priority} onChange={(event) => setSlaInput((prev) => ({ ...prev, priority: event.target.value }))} />
            <input className={inputClass} value={slaInput.status} onChange={(event) => setSlaInput((prev) => ({ ...prev, status: event.target.value }))} />
            <input className={inputClass} type="number" value={slaInput.queueOpenCount} onChange={(event) => setSlaInput((prev) => ({ ...prev, queueOpenCount: Number(event.target.value) }))} />
            <input className={inputClass} type="number" value={slaInput.assigneeOpenCount} onChange={(event) => setSlaInput((prev) => ({ ...prev, assigneeOpenCount: Number(event.target.value) }))} />
          </div>
          <button type="button" onClick={() => slaForecast.mutate(slaInput)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            <Activity size={16} />
            Forecast SLA risk
          </button>
          <div className="mt-4">
            <SLAResult result={slaForecast.data} />
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Map size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Service Impact Map</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[0.6fr_1fr]">
            <select className={inputClass} value={impactEntity.entityType} onChange={(event) => setImpactEntity((prev) => ({ ...prev, entityType: event.target.value }))}>
              <option value="ticket">Ticket</option>
              <option value="change">Change</option>
              <option value="major_incident">Major incident</option>
            </select>
            <input className={inputClass} placeholder="Entity UUID" value={impactEntity.entityId} onChange={(event) => setImpactEntity((prev) => ({ ...prev, entityId: event.target.value }))} />
          </div>
          <button type="button" disabled={!impactEntity.entityId.trim()} onClick={() => setImpactQuery(impactEntity)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <GitBranch size={16} />
            Load impact map
          </button>
          <div className="mt-4">
            <ImpactMap map={impactMap.data} />
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-4 flex items-center gap-2">
          <RadioTower size={18} className="text-red-600" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Process Mining And Bottleneck Analytics</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-4">
          <BottleneckColumn title="Queues" items={processMining.data?.queueBottlenecks ?? []} />
          <BottleneckColumn title="Approvals" items={processMining.data?.approvalDelays ?? []} />
          <BottleneckColumn title="SLA hotspots" items={processMining.data?.slaHotspots ?? []} />
          <BottleneckColumn title="Reassignment loops" items={processMining.data?.reassignmentLoops ?? []} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <FileArchive size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Evidence Pack Generator</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className={inputClass} value={evidenceInput.entityType} onChange={(event) => setEvidenceInput((prev) => ({ ...prev, entityType: event.target.value }))}>
              <option value="ticket">Ticket</option>
              <option value="change">Change</option>
              <option value="major_incident">Major incident</option>
            </select>
            <input className={inputClass} placeholder="Entity UUID" value={evidenceInput.entityId} onChange={(event) => setEvidenceInput((prev) => ({ ...prev, entityId: event.target.value }))} />
            <input className={inputClass} value={evidenceInput.purpose} onChange={(event) => setEvidenceInput((prev) => ({ ...prev, purpose: event.target.value }))} />
          </div>
          <button type="button" disabled={!evidenceInput.entityId.trim()} onClick={() => evidencePack.mutate({ ...evidenceInput, format: "json" })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <FileArchive size={16} />
            Generate evidence pack
          </button>
          <div className="mt-4">
            <EvidencePackResult pack={evidencePack.data} />
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText size={18} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Customer Communication Center</h2>
          </div>
          <div className="grid gap-3">
            {[
              ["Major incident update", "Audience: executives, service owners, customer support. Cadence: 30 minutes."],
              ["Resolution validation", "Audience: requester and watchers. Includes fix summary, validation steps, and closure window."],
              ["CAB decision notice", "Audience: implementers and impacted service owners. Includes decision, conditions, and schedule."],
            ].map(([label, reason]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{reason}</p>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
            <Save size={16} />
            Save template draft locally
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Waiting On Me</h2>
          </div>
          <TaskList tasks={operations.data?.waitingOnMe ?? []} />
        </div>
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <Smartphone size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Mobile Approvals</h2>
          </div>
          <TaskList tasks={operations.data?.mobileApprovals ?? []} />
        </div>
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Saved Workspaces</h2>
          </div>
          <ResultList title="Views" items={(operations.data?.savedWorkspaces ?? []).map((workspace) => ({ label: workspace.label, reason: workspace.description, metadata: workspace.filters }))} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-600" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">CI Confidence And Staleness</h2>
          </div>
          <ResultList title="CI health" items={(operations.data?.ciHealth ?? []).map((ci) => ({ label: `${ci.label} (${Math.round(ci.confidence * 100)}%)`, reason: ci.reason, metadata: [ci.ciType, ci.staleSince ? `stale since ${new Date(ci.staleSince).toLocaleDateString()}` : "current"] }))} />
        </div>
        <div className={panelClass}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--text-secondary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">DR And NFR Evidence</h2>
          </div>
          <ResultList title="Readiness" items={(operations.data?.drReadiness ?? []).map((item) => ({ label: `${item.label}: ${item.status}`, reason: item.evidence }))} />
        </div>
      </section>
    </div>
  );
}
