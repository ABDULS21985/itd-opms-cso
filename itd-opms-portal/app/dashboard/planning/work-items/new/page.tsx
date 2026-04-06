"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  FolderKanban,
  FileText,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { WorkItemPicker } from "@/components/shared/pickers";
import { useCreateWorkItem, useProjects } from "@/hooks/use-planning";
import { useUsers } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WORK_ITEM_TYPES = [
  { value: "epic", label: "Epic" },
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "subtask", label: "Subtask" },
  { value: "milestone", label: "Milestone" },
];

const PRIORITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STEPS = [
  { label: "Context", icon: FolderKanban, description: "Project & classification" },
  { label: "Details", icon: FileText, description: "Title, description & assignment" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
];

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewWorkItemPage() {
  const router = useRouter();
  const createWorkItem = useCreateWorkItem();

  const { data: projectsData } = useProjects(1, 200);
  const projects = Array.isArray(projectsData)
    ? projectsData
    : projectsData?.data ?? [];
  const projectOptions = projects.map(
    (p: { id: string; title?: string; code: string }) => ({
      value: p.id,
      label: p.title || p.code,
    }),
  );

  const { data: usersData } = useUsers(1, 200);
  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];
  const userOptions = users.map(
    (u: { id: string; displayName?: string; email: string }) => ({
      value: u.id,
      label: u.displayName || u.email,
    }),
  );

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [projectId, setProjectId] = useState("");
  const [parentId, setParentId] = useState("");
  const [parentDisplay, setParentDisplay] = useState("");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!type) newErrors.type = "Type is required";
        if (!projectId) newErrors.projectId = "Project is required";
      }
      if (s === 1) {
        if (!title.trim()) newErrors.title = "Title is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [type, projectId, title],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target > step) {
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Submit ---- */
  function handleSubmit() {
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createWorkItem.mutate(
      {
        projectId: projectId.trim(),
        parentId: parentId.trim() || undefined,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: assigneeId.trim() || undefined,
        priority,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        dueDate: dueDate || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/work-items");
        },
      },
    );
  }

  /* ---- Helpers ---- */
  const findLabel = (
    opts: { value: string; label: string }[],
    val: string,
  ) => opts.find((o) => o.value === val)?.label || "—";

  const isLastStep = step === STEPS.length - 1;

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!(type && projectId),
    !!title.trim(),
    false,
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/work-items")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Work Items
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Work Item
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Follow the steps below to define a new task, story, or epic.
        </p>
      </motion.div>

      {/* ── Stepper ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-5"
      >
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => isClickable && goTo(i)}
                  className={`group flex flex-col items-center gap-1.5 transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 scale-110"
                        : isDone
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    } ${isClickable && !isActive ? "group-hover:border-[var(--primary)]/50 group-hover:scale-105" : ""}`}
                  >
                    {isDone && !isActive ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors hidden sm:block ${
                      isActive
                        ? "text-[var(--primary)]"
                        : isDone
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--neutral-gray)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--primary)]"
                        initial={false}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs text-[var(--neutral-gray)] mt-3"
          >
            Step {step + 1} of {STEPS.length} — {STEPS[step].description}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* ── Step Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 min-h-[320px] relative overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Step 0: Context */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Context
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Select the project, type, and priority for this work item.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Project"
                      name="projectId"
                      type="select"
                      value={projectId}
                      onChange={(v: string) => { setProjectId(v); setParentId(""); setParentDisplay(""); }}
                      options={projectOptions}
                      placeholder="Select project"
                      required
                      error={errors.projectId}
                    />
                    {projectId ? (
                      <WorkItemPicker
                        label="Parent Work Item"
                        projectId={projectId}
                        value={parentId || undefined}
                        displayValue={parentDisplay}
                        onChange={(id, title) => { setParentId(id ?? ""); setParentDisplay(title); }}
                        description="For subtasks, reference the parent item"
                      />
                    ) : (
                      <FormField
                        label="Parent Work Item"
                        name="parentId"
                        value=""
                        onChange={() => {}}
                        placeholder="Select a project first"
                        disabled
                        description="For subtasks, reference the parent item"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Type"
                      name="type"
                      type="select"
                      value={type}
                      onChange={setType}
                      options={WORK_ITEM_TYPES}
                      placeholder="Select type"
                      required
                      error={errors.type}
                    />
                    <FormField
                      label="Priority"
                      name="priority"
                      type="select"
                      value={priority}
                      onChange={setPriority}
                      options={PRIORITIES}
                      placeholder="Select priority"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Details
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide the title, description, and assignment details.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Implement user authentication module"
                    required
                    error={errors.title}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Detailed description of the work item"
                    rows={4}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Assignee"
                      name="assigneeId"
                      type="select"
                      value={assigneeId}
                      onChange={setAssigneeId}
                      options={userOptions}
                      placeholder="Select assignee (optional)"
                    />
                    <FormField
                      label="Estimated Hours"
                      name="estimatedHours"
                      type="number"
                      value={estimatedHours}
                      onChange={setEstimatedHours}
                      placeholder="e.g. 8"
                    />
                  </div>
                  <FormField
                    label="Due Date"
                    name="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={setDueDate}
                  />
                  <FormField
                    label="Tags"
                    name="tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="e.g. backend, api, auth (comma-separated)"
                    description="Separate multiple tags with commas"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Context summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FolderKanban
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Context
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Project"
                        value={findLabel(projectOptions, projectId)}
                      />
                      <ReviewField label="Parent Item" value={parentDisplay || parentId} />
                      <ReviewField
                        label="Type"
                        value={findLabel(WORK_ITEM_TYPES, type)}
                      />
                      <ReviewField
                        label="Priority"
                        value={findLabel(PRIORITIES, priority)}
                      />
                    </div>
                  </button>

                  {/* Details summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Details
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField
                        label="Assignee"
                        value={findLabel(userOptions, assigneeId)}
                      />
                      <ReviewField
                        label="Estimated Hours"
                        value={estimatedHours ? `${estimatedHours}h` : ""}
                      />
                      <ReviewField
                        label="Due Date"
                        value={
                          dueDate
                            ? new Date(dueDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""
                        }
                      />
                      <ReviewField label="Tags" value={tags} />
                    </div>
                    {description && (
                      <div className="mt-2">
                        <ReviewField
                          label="Description"
                          value={
                            description.length > 120
                              ? description.slice(0, 120) + "..."
                              : description
                          }
                        />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={step === 0 ? () => router.push("/dashboard/planning/work-items") : goPrev}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <ArrowLeft size={16} />
          {step === 0 ? "Cancel" : "Previous"}
        </button>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-[var(--primary)]"
                  : i < step
                    ? "w-1.5 bg-[var(--primary)]/40"
                    : "w-1.5 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createWorkItem.isPending || !title.trim() || !type || !projectId}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createWorkItem.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Work Item
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
          >
            Continue
            <ArrowRight size={16} />
          </button>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review field helper                                                */
/* ------------------------------------------------------------------ */

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-[var(--neutral-gray)]">{label}: </span>
      <span className="text-sm text-[var(--text-primary)]">
        {value || "—"}
      </span>
    </div>
  );
}
