import type { OrgTreeNode } from "@/types";

/* ------------------------------------------------------------------ */
/*  Level options & colors                                             */
/* ------------------------------------------------------------------ */

export const LEVEL_OPTIONS = [
  { value: "directorate", label: "Directorate" },
  { value: "department", label: "Department" },
  { value: "division", label: "Division" },
  { value: "office", label: "Office" },
  { value: "unit", label: "Unit" },
  { value: "team", label: "Team" },
  { value: "section", label: "Section" },
];

export const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  directorate: { bg: "rgba(220, 38, 38, 0.12)", text: "#DC2626" },
  department: { bg: "rgba(99, 102, 241, 0.12)", text: "#6366F1" },
  division: { bg: "rgba(59, 130, 246, 0.12)", text: "#3B82F6" },
  office: { bg: "rgba(139, 92, 246, 0.12)", text: "#8B5CF6" },
  unit: { bg: "rgba(16, 185, 129, 0.12)", text: "#10B981" },
  team: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B" },
  section: { bg: "rgba(107, 114, 128, 0.12)", text: "#6B7280" },
};

export function getLevelColor(level: string) {
  return (
    LEVEL_COLORS[level.toLowerCase()] ?? {
      bg: "rgba(107, 114, 128, 0.1)",
      text: "#6B7280",
    }
  );
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Tree traversal helpers                                             */
/* ------------------------------------------------------------------ */

/** Build breadcrumb path from root to target node. */
export function buildBreadcrumb(
  nodes: OrgTreeNode[],
  targetId: string,
  path: OrgTreeNode[] = [],
): OrgTreeNode[] | null {
  for (const node of nodes) {
    const currentPath = [...path, node];
    if (node.id === targetId) return currentPath;
    if (node.children?.length) {
      const found = buildBreadcrumb(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/** Collect all descendant IDs for a node (used to prevent moving to own subtree). */
export function collectDescendantIds(node: OrgTreeNode): Set<string> {
  const ids = new Set<string>();
  ids.add(node.id);
  for (const child of node.children ?? []) {
    for (const id of collectDescendantIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

/** Flatten tree for parent selection. */
export function flattenTree(
  nodes: OrgTreeNode[],
  depth = 0,
): { node: OrgTreeNode; depth: number }[] {
  const result: { node: OrgTreeNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

/** Find a node in the tree by ID. */
export function findNodeById(
  nodes: OrgTreeNode[],
  id: string,
): OrgTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeById(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

/** Count total nodes in a tree. */
export function countNodes(nodes: OrgTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children?.length) count += countNodes(node.children);
  }
  return count;
}

/** Collect all node IDs for expand-all. */
export function collectAllIds(nodes: OrgTreeNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(node.id);
    if (node.children?.length) {
      for (const id of collectAllIds(node.children)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

/** Find ancestor IDs for a given node (for auto-expanding search results). */
export function findAncestorIds(
  nodes: OrgTreeNode[],
  targetId: string,
  path: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path;
    if (node.children?.length) {
      const found = findAncestorIds(node.children, targetId, [
        ...path,
        node.id,
      ]);
      if (found) return found;
    }
  }
  return null;
}

/** Filter tree by search query and level filter, returning matching node IDs. */
export function getMatchingNodeIds(
  nodes: OrgTreeNode[],
  searchQuery: string,
  levelFilter: string[],
): Set<string> {
  const ids = new Set<string>();
  const query = searchQuery.toLowerCase().trim();

  function walk(nodeList: OrgTreeNode[]) {
    for (const node of nodeList) {
      const matchesSearch =
        !query ||
        node.name.toLowerCase().includes(query) ||
        node.code?.toLowerCase().includes(query) ||
        node.managerName?.toLowerCase().includes(query);
      const matchesLevel =
        levelFilter.length === 0 || levelFilter.includes(node.level);

      if (matchesSearch && matchesLevel) {
        ids.add(node.id);
      }
      if (node.children?.length) walk(node.children);
    }
  }

  walk(nodes);
  return ids;
}
