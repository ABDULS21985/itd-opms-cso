"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, ChevronRight, ChevronDown, Download,
  ChevronLeft, Users, AlertTriangle, Network,
} from "lucide-react";
import { ChartCard } from "@/components/dashboard/charts/chart-card";
import { LEVEL_COLORS, LEVEL_OPTIONS, flattenTree, buildBreadcrumb } from "./constants";
import type { OrgTreeNode } from "@/types";

interface PeopleMatrixTabProps {
  tree: OrgTreeNode[];
  isLoading: boolean;
}

// Detect managers who manage multiple units (dual-hatting)
function detectDualHatting(tree: OrgTreeNode[]) {
  const managerUnits: Record<string, { name: string; units: string[] }> = {};
  function walk(nodes: OrgTreeNode[]) {
    for (const node of nodes) {
      if (node.managerName) {
        if (!managerUnits[node.managerName]) {
          managerUnits[node.managerName] = { name: node.managerName, units: [] };
        }
        managerUnits[node.managerName].units.push(node.name);
      }
      if (node.children?.length) walk(node.children);
    }
  }
  walk(tree);
  return Object.values(managerUnits).filter(m => m.units.length > 1);
}

// Build reporting lines (chain of command for each unit)
function buildReportingLines(tree: OrgTreeNode[]) {
  const lines: { unitName: string; level: string; chain: string[] }[] = [];
  function walk(nodes: OrgTreeNode[], path: string[]) {
    for (const node of nodes) {
      lines.push({
        unitName: node.name,
        level: node.level,
        chain: [...path],
      });
      if (node.children?.length) {
        walk(node.children, [...path, node.name]);
      }
    }
  }
  walk(tree, []);
  return lines;
}

// Compute matrix grid data grouped by level
function computeMatrixData(tree: OrgTreeNode[]) {
  const flat = flattenTree(tree);
  const groups: Record<string, { node: OrgTreeNode; depth: number; totalHC: number; subUnits: number }[]> = {};

  for (const { node, depth } of flat) {
    if (!groups[node.level]) groups[node.level] = [];
    let totalHC = node.userCount;
    let subUnits = 0;
    function count(n: OrgTreeNode) {
      for (const c of n.children ?? []) {
        totalHC += c.userCount;
        subUnits++;
        count(c);
      }
    }
    count(node);
    groups[node.level].push({ node, depth, totalHC, subUnits });
  }

  return groups;
}

export function PeopleMatrixTab({ tree, isLoading }: PeopleMatrixTabProps) {
  const [activeSection, setActiveSection] = useState<"matrix" | "network" | "lines">("matrix");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(["directorate", "department"]));
  const [linesSearch, setLinesSearch] = useState("");
  const [linesPage, setLinesPage] = useState(0);
  const LINES_PAGE_SIZE = 15;

  // Matrix data grouped by level
  const matrixData = useMemo(() => computeMatrixData(tree), [tree]);

  // Dual-hatting detection
  const dualHatters = useMemo(() => detectDualHatting(tree), [tree]);

  // Reporting lines
  const reportingLines = useMemo(() => buildReportingLines(tree), [tree]);
  const filteredLines = useMemo(() => {
    if (!linesSearch.trim()) return reportingLines;
    const q = linesSearch.toLowerCase();
    return reportingLines.filter(l => l.unitName.toLowerCase().includes(q) || l.chain.some(c => c.toLowerCase().includes(q)));
  }, [reportingLines, linesSearch]);
  const linesPageCount = Math.ceil(filteredLines.length / LINES_PAGE_SIZE);
  const linesPageData = filteredLines.slice(linesPage * LINES_PAGE_SIZE, (linesPage + 1) * LINES_PAGE_SIZE);

  const toggleLevel = useCallback((level: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  }, []);

  // Export matrix to CSV
  const exportMatrixCsv = useCallback(() => {
    const rows = [["Unit Name", "Level", "Manager", "Headcount", "Sub-units", "Total HC"]];
    const flat = flattenTree(tree);
    for (const { node } of flat) {
      let totalHC = node.userCount;
      function sumHC(n: OrgTreeNode) { for (const c of n.children ?? []) { totalHC += c.userCount; sumHC(c); } }
      sumHC(node);
      rows.push([node.name, node.level, node.managerName || "\u2014", String(node.userCount), String(node.children?.length ?? 0), String(totalHC)]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "people-matrix.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [tree]);

  const sections = [
    { key: "matrix" as const, label: "People Matrix", icon: Users },
    { key: "network" as const, label: "Manager Network", icon: Network },
    { key: "lines" as const, label: "Reporting Lines", icon: ChevronRight },
  ];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-[var(--surface-2)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-[var(--border)]">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSection === s.key
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <Icon size={13} />
              {s.label}
              {s.key === "network" && dualHatters.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F59E0B] text-[9px] font-bold text-white">
                  {dualHatters.length}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={exportMatrixCsv}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Matrix View */}
        {activeSection === "matrix" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
              <input
                type="text"
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                placeholder="Search units..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            {/* Grouped by level */}
            {LEVEL_OPTIONS.map(opt => {
              const items = matrixData[opt.value] ?? [];
              if (items.length === 0) return null;
              const levelColor = LEVEL_COLORS[opt.value];
              const isExpanded = expandedLevels.has(opt.value);
              const filtered = matrixSearch.trim()
                ? items.filter(i => i.node.name.toLowerCase().includes(matrixSearch.toLowerCase()) || i.node.managerName?.toLowerCase().includes(matrixSearch.toLowerCase()))
                : items;
              if (matrixSearch.trim() && filtered.length === 0) return null;

              return (
                <div key={opt.value} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <button
                    onClick={() => toggleLevel(opt.value)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />}
                    <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: levelColor?.bg, color: levelColor?.text }}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{filtered.length} units</span>
                    <div className="flex-1" />
                    <span className="text-xs text-[var(--neutral-gray)] tabular-nums">
                      {filtered.reduce((s, i) => s + i.totalHC, 0)} people
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--border)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[var(--surface-1)]">
                            <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Unit Name</th>
                            <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Manager</th>
                            <th className="px-4 py-2 text-center font-medium text-[var(--text-secondary)]">Headcount</th>
                            <th className="px-4 py-2 text-center font-medium text-[var(--text-secondary)]">Sub-units</th>
                            <th className="px-4 py-2 text-center font-medium text-[var(--text-secondary)]">Total HC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(item => (
                            <tr key={item.node.id} className="border-t border-[var(--border)]/50 hover:bg-[var(--surface-1)]/50">
                              <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{item.node.name}</td>
                              <td className="px-4 py-2 text-[var(--text-secondary)]">{item.node.managerName || <span className="text-[var(--text-muted)] italic">Vacant</span>}</td>
                              <td className="px-4 py-2 text-center tabular-nums text-[var(--text-secondary)]">{item.node.userCount}</td>
                              <td className="px-4 py-2 text-center tabular-nums text-[var(--text-secondary)]">{item.subUnits}</td>
                              <td className="px-4 py-2 text-center tabular-nums font-medium text-[var(--text-primary)]">{item.totalHC}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Manager Network */}
        {activeSection === "network" && (
          <div className="space-y-4">
            {dualHatters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(16,185,129,0.1)] mb-4">
                  <Network size={24} className="text-[#10B981]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No dual-hatting detected</h3>
                <p className="text-sm text-[var(--neutral-gray)]">Each manager leads only one unit</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] px-4 py-3">
                  <AlertTriangle size={16} className="text-[#F59E0B] shrink-0" />
                  <p className="text-sm text-[var(--text-primary)]">
                    <strong>{dualHatters.length}</strong> manager{dualHatters.length !== 1 ? "s" : ""} leading multiple units (dual-hatting detected)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dualHatters.map((manager, i) => (
                    <motion.div
                      key={manager.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-[var(--border)] p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(245,158,11,0.1)] text-xs font-bold text-[#F59E0B]">
                          {manager.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{manager.name}</p>
                          <p className="text-[10px] text-[var(--neutral-gray)]">Managing {manager.units.length} units</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {manager.units.map(unit => (
                          <div key={unit} className="flex items-center gap-2 rounded-lg bg-[var(--surface-1)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            {unit}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Reporting Lines */}
        {activeSection === "lines" && (
          <div className="space-y-3">
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
              <input
                type="text"
                value={linesSearch}
                onChange={(e) => { setLinesSearch(e.target.value); setLinesPage(0); }}
                placeholder="Search by unit or parent..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-1)]">
                    <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Unit</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Level</th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Chain of Command</th>
                  </tr>
                </thead>
                <tbody>
                  {linesPageData.map((line, i) => (
                    <tr key={i} className="border-t border-[var(--border)]/50 hover:bg-[var(--surface-1)]/50">
                      <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{line.unitName}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: LEVEL_COLORS[line.level]?.bg, color: LEVEL_COLORS[line.level]?.text }}>
                          {line.level}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {line.chain.length === 0 ? (
                          <span className="text-[var(--text-muted)] italic">Root unit</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {line.chain.map((crumb, ci) => (
                              <span key={ci} className="flex items-center gap-1 text-[var(--text-secondary)]">
                                {ci > 0 && <ChevronRight size={10} className="text-[var(--border)]" />}
                                {crumb}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {linesPageCount > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {filteredLines.length} entries · Page {linesPage + 1}/{linesPageCount}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setLinesPage(p => Math.max(0, p - 1))} disabled={linesPage === 0} className="p-1 rounded hover:bg-[var(--surface-1)] disabled:opacity-30 text-[var(--text-muted)]">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setLinesPage(p => Math.min(linesPageCount - 1, p + 1))} disabled={linesPage >= linesPageCount - 1} className="p-1 rounded hover:bg-[var(--surface-1)] disabled:opacity-30 text-[var(--text-muted)]">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
