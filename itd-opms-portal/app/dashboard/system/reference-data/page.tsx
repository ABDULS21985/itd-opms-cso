"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  DatabaseZap,
  Plus,
  Save,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  useReferenceData,
  useCreateReferenceData,
  useUpdateReferenceData,
  useDeactivateReferenceData,
} from "@/hooks/use-system";
import type { ReferenceData } from "@/types";

const DOMAINS = [
  { value: "", label: "All domains" },
  { value: "itsm.priority", label: "ITSM priorities" },
  { value: "itsm.category", label: "ITSM categories" },
  { value: "cmdb.ci_type", label: "CI types" },
  { value: "cmdb.location", label: "Locations" },
  { value: "resolver_group", label: "Resolver groups" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

function parseJSON(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Value must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function ReferenceRow({ item }: { item: ReferenceData }) {
  const update = useUpdateReferenceData();
  const deactivate = useDeactivateReferenceData();
  const [label, setLabel] = useState(item.label);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder ?? 0));
  const [value, setValue] = useState(
    item.value ? JSON.stringify(item.value, null, 2) : "",
  );

  const dirty =
    label !== item.label ||
    Number(sortOrder || 0) !== item.sortOrder ||
    value !== (item.value ? JSON.stringify(item.value, null, 2) : "");

  function handleSave() {
    try {
      update.mutate({
        id: item.id,
        label,
        sortOrder: Number(sortOrder || 0),
        value: parseJSON(value),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid JSON value");
    }
  }

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0">
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <p className="text-xs font-mono text-[var(--text-primary)]">
            {item.key}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {item.domain}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={`${inputClass} max-w-24`}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className={`${inputClass} min-w-72 font-mono text-xs`}
          placeholder='{"color":"#10B981"}'
        />
      </td>
      <td className="px-4 py-3 align-top">
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          {item.isActive ? (
            <ToggleRight size={16} className="text-emerald-600" />
          ) : (
            <ToggleLeft size={16} />
          )}
          {item.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || update.isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition hover:opacity-90 disabled:opacity-40"
            title="Save reference data"
          >
            {update.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => deactivate.mutate(item.id)}
            disabled={!item.isActive || deactivate.isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
            title="Deactivate reference data"
          >
            {deactivate.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ReferenceDataPage() {
  const [domain, setDomain] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState({
    domain: "itsm.category",
    key: "",
    label: "",
    sortOrder: "100",
    value: "",
  });

  const { data, isLoading } = useReferenceData(domain || undefined, includeInactive);
  const create = useCreateReferenceData();
  const items = useMemo(() => data ?? [], [data]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      create.mutate(
        {
          domain: form.domain,
          key: form.key.trim(),
          label: form.label.trim(),
          sortOrder: Number(form.sortOrder || 0),
          value: parseJSON(form.value),
        },
        {
          onSuccess: () =>
            setForm((current) => ({
              ...current,
              key: "",
              label: "",
              value: "",
            })),
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid JSON value");
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <DatabaseZap size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Reference Data
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage priorities, categories, CI types, locations, and resolver groups.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={inputClass}
          >
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Include inactive
          </label>
        </div>
      </motion.div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 lg:grid-cols-[1.2fr_1fr_1.4fr_0.7fr_2fr_auto]"
      >
        <select
          value={form.domain}
          onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
          className={inputClass}
        >
          {DOMAINS.filter((d) => d.value).map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          value={form.key}
          onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
          placeholder="key"
          required
          className={inputClass}
        />
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="Label"
          required
          className={inputClass}
        />
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          className={inputClass}
        />
        <input
          value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          placeholder='JSON value, e.g. {"color":"#2563EB"}'
          className={`${inputClass} font-mono`}
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {create.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Add
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[var(--surface-1)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Sort
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                State
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                  Loading reference data...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                  No reference data found for this filter.
                </td>
              </tr>
            ) : (
              items.map((item) => <ReferenceRow key={item.id} item={item} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
