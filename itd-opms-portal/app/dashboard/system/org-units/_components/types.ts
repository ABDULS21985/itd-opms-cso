import type { OrgTreeNode } from "@/types";

export type ViewMode = "chart" | "sunburst" | "tree";

export interface FilterState {
  searchQuery: string;
  levelFilter: string[];
  statusFilter: "all" | "active" | "inactive";
}

export interface OrgViewProps {
  tree: OrgTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  highlightedIds: Set<string>;
  searchQuery: string;
  onMoveNode: (nodeId: string, newParentId: string) => void;
}
