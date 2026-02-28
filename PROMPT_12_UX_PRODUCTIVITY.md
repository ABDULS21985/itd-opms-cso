# PROMPT 12: UX & Productivity — Command Palette, Bulk Operations, Kanban DnD, Keyboard Shortcuts, Export Engine & Inline Editing

> **Priority**: High (power-user productivity & UX polish)
> **Domains**: Cross-cutting — affects all modules
> **Estimated Files**: ~12 frontend + ~4 backend + ~2 shared libraries
> **Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (already installed)

---

## Context & Architecture

You are a senior full-stack engineer working on ITD-OPMS (Operations & Performance Management System) for the Central Bank of Nigeria's IT Department. The system is fully built across 10 modules with 106+ pages, 280+ TanStack Query hooks, and 200+ API endpoints.

**Tech Stack (already established — do NOT change):**
- Backend: Go modular monolith at `itd-opms-api/` (module: `github.com/itd-cbn/itd-opms-api`)
- Frontend: Next.js 16 + React 19 + TypeScript at `itd-opms-portal/`
- DB: PostgreSQL 16, pgx/v5 driver, goose/v3 migrations
- Router: chi/v5 with middleware chain
- UI: Tailwind 4, Framer Motion 12, Lucide icons, Recharts 2.15, Sonner toasts
- State: TanStack Query 5 for server state
- Auth: Dual-mode (Entra ID OIDC + dev JWT), RBAC with 7 roles
- Drag-and-drop: `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2` (installed, NOT yet used)
- Forms: react-hook-form 7 + zod 4 + @hookform/resolvers 5
- CSS Variables: `var(--primary)`, `var(--surface-0)`, `var(--surface-1)`, `var(--surface-2)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--neutral-gray)`, `var(--error)`, `var(--secondary)`

**Critical Patterns (follow exactly):**
- Response envelope: `types.OK(w, data, meta)`, `types.ErrorMessage(w, status, code, msg)`
- Pagination: `types.ParsePagination(r)` → page, limit; `types.NewMeta(total, pagination)`
- Auth context: `types.GetAuthContext(r.Context())` → `auth.UserID`, `auth.TenantID`, `auth.Roles`
- Middleware: `middleware.RequirePermission("itsm.manage")` per-route
- Frontend hooks: TanStack Query `useQuery`/`useMutation` with `apiClient.get`/`apiClient.post`/etc. from `@/lib/api-client`
- Toast: `toast.success("...")`, `toast.error("...")`
- Query invalidation: `queryClient.invalidateQueries({ queryKey: [...] })` on mutation success
- NO shadcn/ui — project uses plain JSX + Tailwind + Framer Motion. No @radix-ui.

---

## YOUR TASK — Implement 6 Features

### Feature 1: Global Command Palette (Cmd+K)

**Requirement**: Replace the static search bar placeholder in the header with a fully functional command palette supporting fuzzy search across pages, entities, quick actions, and recently visited items.

#### What Exists:

**Header placeholder** at `itd-opms-portal/components/layout/header.tsx` (lines 278-286):
```tsx
<button className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--neutral-gray)] min-w-[200px] lg:min-w-[260px] cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
  <Search size={16} />
  <span className="flex-1 text-left">Search...</span>
  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-0)] border border-[var(--border)] rounded text-[var(--neutral-gray)]">Cmd+K</kbd>
</button>
```

**Fuzzy match utility** at `itd-opms-portal/lib/fuzzy-match.ts`:
```typescript
export interface FuzzyMatchResult { score: number; matchedIndices: number[]; }
export function fuzzyMatch(query: string, text: string): FuzzyMatchResult | null
export function getHighlightSegments(text: string, matchedIndices: number[]): Array<{ text: string; highlighted: boolean }>
```
- Case-insensitive sequential character matching
- Bonuses: consecutive (+3), word boundary (+5), start-of-string (+8)
- `getHighlightSegments` returns segments for rendering highlighted matches

**Sidebar navigation items** at `itd-opms-portal/components/layout/sidebar.tsx` (lines 116-522):
- 10 nav groups with ~65 total items, each with: `{ href, label, icon: LucideIcon, permission? }`
- Groups: Overview, Analytics, Governance, People, Planning, ITSM, Assets, Knowledge, GRC, System

**Recently visited** at `itd-opms-portal/hooks/use-sidebar-recently-visited.ts`:
```typescript
export interface RecentItem { path: string; text: string; iconName: string; timestamp: number; }
export function useRecentlyVisited(navItemLookup: Map<string, NavItem>): {
  recentItems: RecentItem[]; // last 5 visited
}
```

**Mobile search button** at header.tsx (lines 289-294):
```tsx
<button className="md:hidden p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors" aria-label="Search">
  <Search size={20} />
</button>
```

**Auth provider** at `itd-opms-portal/providers/auth-provider.tsx`:
```typescript
const { user } = useAuth();
// user.permissions: string[] — e.g. ["*"] or ["itsm.view", "planning.manage", ...]
```

#### What to Build:

**A. Create `itd-opms-portal/components/shared/command-palette.tsx`**

A full-screen overlay command palette (like VS Code / Linear / Raycast) with:

```typescript
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  group: "pages" | "actions" | "recent" | "search";
  href?: string;           // For navigation items
  action?: () => void;     // For action items
  shortcut?: string;       // Display shortcut (e.g. "N" for new)
  permission?: string;     // Required permission
}
```

**UI Layout:**
1. **Backdrop**: Semi-transparent overlay (`bg-black/50 backdrop-blur-sm`), click to close
2. **Dialog**: Centered modal (`max-w-xl`, `bg-[var(--surface-0)]`, `rounded-2xl`, `shadow-2xl`, `border border-[var(--border)]`)
3. **Search input**: Auto-focused, large text, no border, full-width at top with `Search` icon
4. **Results list**: Grouped sections with sticky group headers, scrollable (`max-h-[400px] overflow-y-auto`)
5. **Footer**: Keyboard hints — `↑↓ Navigate`, `↵ Open`, `Esc Close`

**Data sources** (build these as static arrays + dynamic hooks):

1. **Pages** (static, from nav groups): Import the `navGroups` array from sidebar. Flatten all items into CommandItems with `group: "pages"`. Filter by user permissions.

2. **Quick Actions** (static array):
   ```typescript
   const QUICK_ACTIONS: CommandItem[] = [
     { id: "new-ticket", label: "New Ticket", icon: Plus, group: "actions", href: "/dashboard/itsm/tickets/new", shortcut: "N T", permission: "itsm.manage" },
     { id: "new-project", label: "New Project", icon: Plus, group: "actions", href: "/dashboard/planning/projects/new", shortcut: "N P", permission: "planning.manage" },
     { id: "new-policy", label: "New Policy", icon: Plus, group: "actions", href: "/dashboard/governance/policies/new", shortcut: "N O", permission: "governance.manage" },
     { id: "new-article", label: "New Article", icon: Plus, group: "actions", href: "/dashboard/knowledge/articles/new", shortcut: "N A", permission: "knowledge.manage" },
     { id: "new-risk", label: "New Risk", icon: Plus, group: "actions", href: "/dashboard/grc/risks?new=1", shortcut: "N R", permission: "grc.manage" },
     { id: "toggle-theme", label: "Toggle Theme", icon: Sun, group: "actions", action: () => { /* call setTheme */ } },
     { id: "my-queue", label: "My Ticket Queue", icon: Inbox, group: "actions", href: "/dashboard/itsm/my-queue", permission: "itsm.view" },
     { id: "my-actions", label: "My Action Items", icon: ListChecks, group: "actions", href: "/dashboard/governance/actions", permission: "governance.view" },
   ];
   ```

3. **Recently Visited** (from `useRecentlyVisited` hook): Map `RecentItem[]` to CommandItems with `group: "recent"`.

4. **Global Search** (backend API — already exists):
   - `GET /api/v1/search/global?q={query}&limit=5` — returns results from tickets, projects, policies, articles, assets
   - Hook: `useGlobalSearch(query)` already exists in `itd-opms-portal/hooks/use-reporting.ts`
   - Only trigger when query is 2+ chars, with 300ms debounce
   - Map results to CommandItems with `group: "search"`, href to entity detail page

**Behavior:**
- **Empty state** (no query): Show "Recent" items first, then "Quick Actions", then "Pages" (first 10)
- **With query**: Fuzzy-match against all items using `fuzzyMatch()`. Sort by score descending. Group by category. Highlight matched characters using `getHighlightSegments()`.
- **Keyboard navigation**: `ArrowUp`/`ArrowDown` to move focus, `Enter` to execute (navigate or run action), `Escape` to close
- **Active item**: Highlight with `bg-[var(--primary)]/10` and subtle left border `border-l-2 border-[var(--primary)]`
- **Animations**: Use `AnimatePresence` + `motion.div` for mount/unmount (fade + scale from 0.96)

**B. Update `itd-opms-portal/components/layout/header.tsx`**

1. Import `CommandPalette` and add state: `const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);`
2. Replace the static search button's `onClick` to open the palette: `onClick={() => setCommandPaletteOpen(true)}`
3. Do the same for the mobile search button
4. Add global `Cmd+K` / `Ctrl+K` keyboard listener in a `useEffect`:
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if ((e.metaKey || e.ctrlKey) && e.key === "k") {
         e.preventDefault();
         setCommandPaletteOpen(true);
       }
     };
     document.addEventListener("keydown", handleKeyDown);
     return () => document.removeEventListener("keydown", handleKeyDown);
   }, []);
   ```
5. Render `<CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />` at the end of the header

**C. Export navGroups for reuse**

The `navGroups` array is currently defined inside `sidebar.tsx`. Extract it to a shared file so both Sidebar and CommandPalette can import it:

Create `itd-opms-portal/lib/navigation.ts`:
```typescript
import { type LucideIcon } from "lucide-react";
// ... all icon imports ...

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  // ... move the full navGroups array here ...
];
```

Update `sidebar.tsx` to import from `@/lib/navigation` instead of defining inline.

---

### Feature 2: Bulk Operations for Data Tables

**Requirement**: Add multi-select rows to the shared `DataTable` component with bulk action toolbar for status change, assignment, and export.

#### What Exists:

**DataTable** at `itd-opms-portal/components/shared/data-table.tsx`:
```typescript
export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  sort?: SortState;
  onSort?: (sort: SortState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  pagination?: { currentPage: number; totalPages: number; totalItems?: number; pageSize?: number; onPageChange: (page: number) => void; };
  onRowClick?: (item: T) => void;
  className?: string;
}
```

- Generic `DataTable<T>` with sort, pagination, empty state, loading skeleton
- Used across 15+ pages (tickets, assets, users, policies, risks, audits, projects, etc.)
- No checkbox column, no selection state, no bulk actions currently

**Pages using DataTable** (examples):
- `itsm/tickets/page.tsx` — 8 columns, row click to detail
- `cmdb/assets/page.tsx` — 7 columns, row click to detail
- `system/users/page.tsx` — 6 columns, with deactivate action
- `governance/policies/page.tsx` — policy list
- `planning/projects/page.tsx` — project list

#### What to Build:

**A. Enhance `itd-opms-portal/components/shared/data-table.tsx`**

Add new optional props to `DataTableProps<T>`:

```typescript
export interface BulkAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "danger";   // danger = red styling for destructive actions
  /** Called with selected item IDs. Return a promise for loading state. */
  onExecute: (selectedIds: string[]) => Promise<void> | void;
}

export interface DataTableProps<T> {
  // ... existing props ...

  /** Enable row selection checkboxes. */
  selectable?: boolean;
  /** Bulk actions shown when rows are selected. */
  bulkActions?: BulkAction[];
  /** Controlled selection state (optional — internal state used if not provided). */
  selectedIds?: Set<string>;
  /** Called when selection changes. */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}
```

**Implementation details:**

1. **Checkbox column**: When `selectable` is true, prepend a checkbox column:
   - **Header checkbox**: "Select all" — toggles all visible rows on current page. Use indeterminate state (`ref.indeterminate = true`) when some but not all are selected.
   - **Row checkbox**: Individual row toggle. Use native `<input type="checkbox">` styled with Tailwind (`accent-[var(--primary)]`).
   - Clicking a row checkbox should NOT trigger `onRowClick`.

2. **Selection state**: Track internally with `useState<Set<string>>()` or use controlled `selectedIds`/`onSelectionChange` if provided. Key items by `keyExtractor(item)`.

3. **Bulk action toolbar**: When `selectedIds.size > 0`, render a floating toolbar above the table:
   ```tsx
   <motion.div
     initial={{ opacity: 0, y: -8 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, y: -8 }}
     className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20"
   >
     <span className="text-sm font-medium text-[var(--primary)]">
       {selectedIds.size} selected
     </span>
     <div className="h-4 w-px bg-[var(--primary)]/20" />
     {bulkActions.map(action => (
       <button key={action.id} onClick={() => action.onExecute(selectedIds)} ...>
         {action.icon && <action.icon size={15} />}
         {action.label}
       </button>
     ))}
     <button onClick={clearSelection} className="ml-auto text-sm text-[var(--neutral-gray)]">
       Clear selection
     </button>
   </motion.div>
   ```

4. **Shift+click**: Support range selection — when user shift-clicks a checkbox, select all rows between the last clicked row and the current one.

5. **Deselect on page change**: Clear selection when pagination changes (different page = different data).

**B. Add bulk backend endpoints**

Create `itd-opms-api/internal/shared/types/bulk.go`:
```go
// BulkUpdateRequest represents a batch status/field update
type BulkUpdateRequest struct {
    IDs    []uuid.UUID       `json:"ids" validate:"required,min=1,max=100"`
    Fields map[string]any    `json:"fields" validate:"required,min=1"`
}

// BulkUpdateResult represents the result of a bulk operation
type BulkUpdateResult struct {
    Updated  int      `json:"updated"`
    Failed   int      `json:"failed"`
    Errors   []string `json:"errors,omitempty"`
}
```

Add bulk endpoints to the modules that most need them. Start with **tickets** and **work items** as they're the highest-volume entities:

**Ticket bulk** — Add to `itd-opms-api/internal/modules/itsm/ticket_handler.go`:
```go
// POST /api/v1/itsm/tickets/bulk/update — Bulk update ticket fields
// Permission: itsm.manage
// Body: { "ids": ["uuid1", "uuid2"], "fields": { "status": "closed", "assigneeId": "uuid" } }
// Allowed fields: status, priority, assigneeId, teamQueueId
// Returns: { "updated": 5, "failed": 0 }
func (h *TicketHandler) BulkUpdate(w http.ResponseWriter, r *http.Request)
```

Add `BulkUpdateTickets(ctx, tenantID, ids []uuid.UUID, fields map[string]any) (*BulkUpdateResult, error)` to `ticket_service.go`. Use a single SQL UPDATE with `WHERE id = ANY($1)` for efficiency. Validate allowed field names server-side. Log a single audit entry with all affected IDs.

**Work item bulk** — Add to `itd-opms-api/internal/modules/planning/workitem_handler.go`:
```go
// POST /api/v1/planning/work-items/bulk/update — Bulk update work item fields
// Permission: planning.manage
// Body: { "ids": ["uuid1", "uuid2"], "fields": { "status": "done", "assigneeId": "uuid", "priority": "high" } }
// Allowed fields: status, priority, assigneeId, dueDate
func (h *WorkItemHandler) BulkUpdate(w http.ResponseWriter, r *http.Request)
```

Add SQL queries to `queries/itsm.sql` and `queries/planning.sql`:
```sql
-- name: BulkUpdateTicketStatus :execrows
UPDATE tickets SET status = @status, updated_at = NOW()
WHERE tenant_id = @tenant_id AND id = ANY(@ids::uuid[]);

-- name: BulkUpdateTicketAssignee :execrows
UPDATE tickets SET assignee_id = @assignee_id, updated_at = NOW()
WHERE tenant_id = @tenant_id AND id = ANY(@ids::uuid[]);

-- name: BulkUpdateWorkItemStatus :execrows
UPDATE work_items SET status = @status, updated_at = NOW()
WHERE tenant_id = @tenant_id AND id = ANY(@ids::uuid[]);

-- name: BulkUpdateWorkItemAssignee :execrows
UPDATE work_items SET assignee_id = @assignee_id, updated_at = NOW()
WHERE tenant_id = @tenant_id AND id = ANY(@ids::uuid[]);
```

**C. Wire bulk actions in page files**

Add bulk actions to the 2 highest-priority pages as reference implementations. Other pages can follow the same pattern later.

**Tickets page** (`itsm/tickets/page.tsx`):
```typescript
const bulkUpdateTickets = useBulkUpdateTickets(); // new hook

const bulkActions: BulkAction[] = [
  {
    id: "close",
    label: "Close",
    icon: CheckCircle,
    onExecute: async (ids) => {
      await bulkUpdateTickets.mutateAsync({ ids, fields: { status: "closed" } });
      toast.success(`${ids.length} tickets closed`);
    },
  },
  {
    id: "assign",
    label: "Assign to Me",
    icon: UserCheck,
    onExecute: async (ids) => {
      await bulkUpdateTickets.mutateAsync({ ids, fields: { assigneeId: user.id } });
      toast.success(`${ids.length} tickets assigned`);
    },
  },
  {
    id: "export",
    label: "Export Selected",
    icon: Download,
    onExecute: (ids) => {
      // Use the Export Engine (Feature 5) to export selected rows
      exportToCSV(data.filter(t => ids.includes(t.id)), "tickets");
    },
  },
];

// Pass to DataTable:
<DataTable selectable bulkActions={bulkActions} ... />
```

**Work items page** (`planning/work-items/page.tsx`):
```typescript
const bulkActions: BulkAction[] = [
  { id: "done", label: "Mark Done", icon: CheckCircle, onExecute: ... },
  { id: "assign", label: "Assign to Me", icon: UserCheck, onExecute: ... },
  { id: "export", label: "Export Selected", icon: Download, onExecute: ... },
];
```

**Frontend hooks** — Add to `use-itsm.ts` and `use-planning.ts`:
```typescript
export function useBulkUpdateTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; fields: Record<string, unknown> }) =>
      apiClient.post("/itsm/tickets/bulk/update", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useBulkUpdateWorkItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; fields: Record<string, unknown> }) =>
      apiClient.post("/planning/work-items/bulk/update", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}
```

---

### Feature 3: Kanban Drag & Drop

**Requirement**: Add drag-and-drop reordering to the existing Kanban board on the Work Items page using the already-installed `@dnd-kit` library.

#### What Exists:

**Work items page** at `itd-opms-portal/app/dashboard/planning/work-items/page.tsx`:
- Toggle between "List" (DataTable) and "Board" (Kanban) views
- `KanbanBoard` component renders 5 columns: Todo, In Progress, In Review, Done, Blocked
- `KanbanCard` component renders individual cards with Framer Motion layout animations
- Cards are static — no drag-and-drop; clicking navigates to detail page
- Status is updated via the detail page, not from the board

**Kanban columns config:**
```typescript
const KANBAN_COLUMNS = [
  { status: "todo", label: "Todo", color: "#6B7280" },
  { status: "in_progress", label: "In Progress", color: "#3B82F6" },
  { status: "in_review", label: "In Review", color: "#F59E0B" },
  { status: "done", label: "Done", color: "#10B981" },
  { status: "blocked", label: "Blocked", color: "#EF4444" },
];
```

**Installed packages** (in `package.json`):
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

**Work item update** — hook already exists:
```typescript
useUpdateWorkItem(id) // PUT /planning/work-items/{id} — can update status field
```

**Work item type:**
```typescript
interface WorkItem {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  type: string;        // epic, story, task, subtask
  status: string;      // todo, in_progress, in_review, done, blocked
  priority: string;    // critical, high, medium, low
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  sortOrder: number;
  createdAt: string;
}
```

#### What to Build:

**A. Refactor `KanbanBoard` to use @dnd-kit**

Replace the static grid with a drag-and-drop enabled board:

```typescript
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

**Component structure:**

```
DndContext (closestCorners collision detection)
├── KanbanColumn (droppable container per status)
│   ├── SortableContext (verticalListSortingStrategy)
│   │   ├── SortableKanbanCard (useSortable per card)
│   │   └── ...
│   └── Empty state placeholder
├── ...
└── DragOverlay (renders a ghost card during drag)
```

**Implementation details:**

1. **Sensors**: Use `PointerSensor` with `activationConstraint: { distance: 5 }` (prevents accidental drags on click) and `KeyboardSensor` for accessibility.

2. **SortableKanbanCard**: Wrap existing `KanbanCard` with `useSortable`:
   ```typescript
   function SortableKanbanCard({ item, onClick }: { item: WorkItem; onClick: () => void }) {
     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
       id: item.id,
       data: { type: "card", status: item.status },
     });

     const style = {
       transform: CSS.Transform.toString(transform),
       transition,
       opacity: isDragging ? 0.4 : 1,
     };

     return (
       <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
         <KanbanCard item={item} onClick={onClick} />
       </div>
     );
   }
   ```

3. **DroppableColumn**: Each column is a droppable area. Use `useDroppable` from `@dnd-kit/core`:
   ```typescript
   function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
     const { setNodeRef, isOver } = useDroppable({ id });
     return (
       <div
         ref={setNodeRef}
         className={`min-h-[120px] flex flex-col gap-2 transition-colors rounded-xl p-1 ${
           isOver ? "bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/20" : ""
         }`}
       >
         {children}
       </div>
     );
   }
   ```

4. **DragOverlay**: Render a styled ghost card with `rotate-3` tilt and elevated shadow:
   ```typescript
   <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
     {activeItem && (
       <div className="rotate-2 shadow-xl opacity-90">
         <KanbanCard item={activeItem} onClick={() => {}} />
       </div>
     )}
   </DragOverlay>
   ```

5. **onDragEnd handler**: When a card is dropped in a different column:
   ```typescript
   async function handleDragEnd(event: DragEndEvent) {
     const { active, over } = event;
     if (!over) return;

     const activeStatus = active.data.current?.status;
     const overStatus = over.data.current?.status ?? over.id; // column ID = status

     if (activeStatus !== overStatus) {
       // Optimistic update: move card to new column in local state
       setLocalItems(prev => prev.map(item =>
         item.id === active.id ? { ...item, status: overStatus as string } : item
       ));
       // API call to persist
       try {
         await updateWorkItem.mutateAsync({ id: active.id as string, status: overStatus });
         toast.success("Status updated");
       } catch {
         // Revert on failure
         setLocalItems(prev => prev.map(item =>
           item.id === active.id ? { ...item, status: activeStatus } : item
         ));
         toast.error("Failed to update status");
       }
     }
   }
   ```

6. **Optimistic state**: Maintain a `localItems` state derived from the query data. On successful drag, optimistically update before the API call. On API failure, revert. On API success, invalidate the query to get fresh data.

7. **Drop indicators**: When dragging over a column, show a subtle highlight and a dashed placeholder where the card will drop.

**B. Add sort order endpoint (optional enhancement)**

If you also want to support reordering within a column (not just moving between columns), add a backend endpoint:

`PUT /api/v1/planning/work-items/{id}/reorder`:
```go
type ReorderRequest struct {
    AfterID *uuid.UUID `json:"afterId"` // Place after this item (null = first)
}
```

Update `sort_order` field. Use gap-based ordering (sort_order increments by 1000) to avoid frequent reindexing.

---

### Feature 4: Keyboard Shortcuts

**Requirement**: Add power-user keyboard shortcuts for common actions across all pages, with a discoverable shortcut help overlay.

#### What Exists:

**Current keyboard handling** in sidebar.tsx (lines 930-956):
- `Escape` → close mobile nav, clear search, close menus
- `/` → focus sidebar search (when no input focused)
- Arrow keys for sidebar navigation
- These are sidebar-scoped, not global page shortcuts

**No global keyboard shortcut system exists.**

#### What to Build:

**A. Create `itd-opms-portal/hooks/use-hotkeys.ts`**

A lightweight custom hook for registering keyboard shortcuts:

```typescript
type HotkeyModifiers = {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

interface HotkeyConfig {
  key: string;                    // e.g. "k", "n", "Escape", "ArrowDown"
  modifiers?: HotkeyModifiers;   // e.g. { meta: true } for Cmd+K
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;              // Default true; set false to disable conditionally
  preventDefault?: boolean;       // Default true
  /** If true, fires even when focus is in an input/textarea. Default false. */
  global?: boolean;
}

/**
 * Register one or more keyboard shortcuts.
 * Shortcuts are automatically cleaned up on unmount.
 * Shortcuts do NOT fire when focus is in input/textarea/select (unless global: true).
 */
export function useHotkeys(shortcuts: HotkeyConfig[]): void;
```

Implementation:
- Attach a single `keydown` listener on `document` via `useEffect`
- Check `e.target.tagName` to skip `INPUT`, `TEXTAREA`, `SELECT` (unless `global: true`)
- Match key + modifiers (handle `metaKey || ctrlKey` for cross-platform Cmd/Ctrl)
- Support key sequences (optional): For two-key combos like "G then D" (go to dashboard), track a pending first key with a 1-second timeout

**B. Create `itd-opms-portal/components/shared/keyboard-shortcut-help.tsx`**

A modal overlay showing all available shortcuts, triggered by `?` key:

```typescript
const SHORTCUT_GROUPS = [
  {
    label: "Global",
    shortcuts: [
      { keys: ["Cmd", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["/"], description: "Focus search" },
      { keys: ["Esc"], description: "Close dialog / Deselect" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "T"], description: "Go to Tickets" },
      { keys: ["G", "P"], description: "Go to Projects" },
      { keys: ["G", "W"], description: "Go to Work Items" },
      { keys: ["G", "A"], description: "Go to Assets" },
    ],
  },
  {
    label: "Tables",
    shortcuts: [
      { keys: ["J"], description: "Move down" },
      { keys: ["K"], description: "Move up" },
      { keys: ["X"], description: "Toggle select row" },
      { keys: ["Shift", "X"], description: "Select range" },
      { keys: ["Cmd", "A"], description: "Select all" },
      { keys: ["Enter"], description: "Open selected row" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["N"], description: "New item (context-aware)" },
      { keys: ["E"], description: "Edit selected item" },
      { keys: ["Cmd", "E"], description: "Export table" },
    ],
  },
];
```

UI: Framer Motion modal with grouped shortcut list. Each shortcut renders `<kbd>` elements styled like the header's existing Cmd+K badge.

**C. Integrate global shortcuts in `itd-opms-portal/app/dashboard/layout.tsx`**

Add a `GlobalShortcuts` component rendered inside the layout:

```typescript
function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useHotkeys([
    // "?" shows help (shift+/)
    { key: "?", handler: () => setHelpOpen(true), global: false },
    // G-key sequences for navigation
    { key: "g", handler: () => startSequence("g"), global: false },
  ]);

  // Two-key sequence handler
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingKey) return;
    const timeout = setTimeout(() => setPendingKey(null), 1000);

    const handleSecond = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
      const combo = `${pendingKey}+${e.key}`;
      const routes: Record<string, string> = {
        "g+d": "/dashboard",
        "g+t": "/dashboard/itsm/tickets",
        "g+p": "/dashboard/planning/projects",
        "g+w": "/dashboard/planning/work-items",
        "g+a": "/dashboard/cmdb/assets",
        "g+k": "/dashboard/knowledge",
        "g+s": "/dashboard/system",
      };
      if (routes[combo]) {
        e.preventDefault();
        router.push(routes[combo]);
      }
      setPendingKey(null);
    };

    document.addEventListener("keydown", handleSecond);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("keydown", handleSecond);
    };
  }, [pendingKey, router]);

  return <KeyboardShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />;
}
```

**D. Add table-specific shortcuts**

Enhance `DataTable` to support keyboard navigation when a table has focus:

- Wrap the table in a `<div tabIndex={0}>` to make it focusable
- `J` / `ArrowDown` → move focus to next row
- `K` / `ArrowUp` → move focus to previous row
- `Enter` → trigger `onRowClick` on focused row
- `X` → toggle checkbox for focused row (when `selectable`)
- `Escape` → clear selection and blur table

Track `focusedRowIndex` state. Apply `bg-[var(--primary)]/5` to the focused row.

---

### Feature 5: Export Engine

**Requirement**: Add CSV, Excel, and PDF export for all data tables, with both client-side (for current page) and server-side (for full dataset) generation.

#### What Exists:

**Backend export pattern** in `audit_explorer_handler.go`:
```go
// ExportEvents returns up to 10,000 audit events as JSON
func (h *AuditExplorerHandler) ExportEvents(w http.ResponseWriter, r *http.Request)
```
- Returns JSON array, no file format conversion
- Capped at 10,000 records

**No CSV/Excel/PDF libraries** in go.mod or package.json.

**Frontend audit export hook** in `use-system.ts`:
```typescript
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (params: AuditLogFilters) =>
      apiClient.get("/system/audit/export", params),
  });
}
```

#### What to Build:

**A. Client-side export utility** — `itd-opms-portal/lib/export-utils.ts`

Pure client-side export for the data currently visible in a DataTable:

```typescript
export interface ExportColumn {
  key: string;
  header: string;
  /** Transform the raw value for export (e.g., format dates, flatten objects). */
  format?: (value: any, row: any) => string;
}

/**
 * Export data to CSV and trigger a browser download.
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  // 1. Build header row from columns[].header
  // 2. Build data rows: for each item, extract columns[].key value,
  //    apply format() if provided, escape commas/quotes/newlines
  // 3. Join with \n, prepend BOM for Excel UTF-8 compatibility (\uFEFF)
  // 4. Create Blob with type "text/csv;charset=utf-8"
  // 5. Create object URL, create <a> element, set download attribute, click, revoke URL
}

/**
 * Export data to Excel (.xlsx) using a lightweight approach.
 * Uses a simple XML spreadsheet format (no external library needed).
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName?: string
): void {
  // Generate Excel XML Spreadsheet (Microsoft XML Spreadsheet 2003 format)
  // This is natively supported by Excel without requiring external libraries.
  //
  // Structure:
  // <?xml version="1.0" encoding="UTF-8"?>
  // <?mso-application progid="Excel.Sheet"?>
  // <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ...>
  //   <Styles>
  //     <Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" .../></Style>
  //   </Styles>
  //   <Worksheet ss:Name="Sheet1">
  //     <Table>
  //       <Row ss:StyleID="header">
  //         <Cell><Data ss:Type="String">{header}</Data></Cell>
  //       </Row>
  //       <Row>
  //         <Cell><Data ss:Type="String">{value}</Data></Cell>
  //       </Row>
  //     </Table>
  //   </Worksheet>
  // </Workbook>
  //
  // Blob type: "application/vnd.ms-excel"
  // Extension: .xls (opens in Excel, Google Sheets, LibreOffice)
}

/**
 * Export data to a printable PDF using the browser's print API.
 * Generates an HTML table in a new window and triggers window.print().
 */
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  title: string
): void {
  // 1. Open a new window (or hidden iframe)
  // 2. Write a styled HTML document with:
  //    - Title header
  //    - Export date
  //    - Styled table with alternating row colors
  //    - @media print CSS for clean output
  // 3. Call window.print()
  // 4. Close window after print dialog
}
```

**B. Server-side CSV export endpoint**

Add a generic export handler pattern. Start with the 3 most common entities:

Install Go CSV library (or use stdlib `encoding/csv` — it's built-in):

Create `itd-opms-api/internal/shared/export/csv_writer.go`:
```go
package export

import (
    "encoding/csv"
    "fmt"
    "net/http"
)

// CSVColumn defines a column for CSV export
type CSVColumn struct {
    Header string
    Field  string // JSON field name or custom key
}

// WriteCSV streams CSV data directly to the HTTP response.
// This avoids buffering the entire file in memory.
func WriteCSV(w http.ResponseWriter, filename string, columns []CSVColumn, rows [][]string) {
    w.Header().Set("Content-Type", "text/csv; charset=utf-8")
    w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
    // Write BOM for Excel UTF-8 compatibility
    w.Write([]byte{0xEF, 0xBB, 0xBF})

    writer := csv.NewWriter(w)
    defer writer.Flush()

    // Write header
    headers := make([]string, len(columns))
    for i, col := range columns {
        headers[i] = col.Header
    }
    writer.Write(headers)

    // Write data rows
    for _, row := range rows {
        writer.Write(row)
    }
}
```

Add export endpoints to ticket and asset handlers:

**Ticket export** — `ticket_handler.go`:
```go
// GET /api/v1/itsm/tickets/export?format=csv&status=open&...
// Permission: itsm.view
// Streams CSV file with columns: Ticket#, Title, Type, Priority, Status, Assignee, Created, Updated
func (h *TicketHandler) ExportTickets(w http.ResponseWriter, r *http.Request) {
    auth := types.GetAuthContext(r.Context())
    // Parse same filters as ListTickets
    // Fetch up to 10,000 records (no pagination — export all matching)
    // Map to [][]string rows
    // Call export.WriteCSV(w, "tickets-export.csv", columns, rows)
}
```

Route: `r.With(middleware.RequirePermission("itsm.view")).Get("/export", h.ExportTickets)`

**Asset export** — `asset_handler.go`:
```go
// GET /api/v1/cmdb/assets/export?format=csv&type=hardware&...
// Permission: assets.view
func (h *AssetHandler) ExportAssets(w http.ResponseWriter, r *http.Request)
```

**C. Export dropdown component** — `itd-opms-portal/components/shared/export-dropdown.tsx`

A reusable button + dropdown for export options:

```typescript
interface ExportDropdownProps<T> {
  data: T[];                    // Current page data
  columns: ExportColumn[];       // Column definitions
  filename: string;              // Base filename (without extension)
  title?: string;                // Title for PDF header
  /** Optional: server-side export URL for full dataset */
  serverExportUrl?: string;
  serverExportParams?: Record<string, string>;
}

export function ExportDropdown<T extends Record<string, any>>({
  data, columns, filename, title, serverExportUrl, serverExportParams
}: ExportDropdownProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="...">
        <Download size={16} />
        Export
        <ChevronDown size={14} />
      </button>

      {open && (
        <motion.div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-0)] border rounded-xl shadow-xl z-50 p-1">
          <button onClick={() => exportToCSV(data, columns, filename)}>
            <FileSpreadsheet size={15} /> Export as CSV (this page)
          </button>
          <button onClick={() => exportToExcel(data, columns, filename)}>
            <FileSpreadsheet size={15} /> Export as Excel (this page)
          </button>
          <button onClick={() => exportToPDF(data, columns, title || filename)}>
            <FileText size={15} /> Export as PDF (this page)
          </button>
          {serverExportUrl && (
            <>
              <div className="h-px bg-[var(--border)] mx-1 my-1" />
              <button onClick={() => downloadServerExport(serverExportUrl, serverExportParams, `${filename}-full.csv`)}>
                <Database size={15} /> Export All (CSV)
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

/** Download a server-generated file via fetch + blob */
async function downloadServerExport(url: string, params?: Record<string, string>, filename?: string) {
  const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
  const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(objectUrl);
}
```

**D. Integrate export into pages**

Add `<ExportDropdown>` to the filter bar of each page that uses `DataTable`. Example for tickets:

```typescript
<ExportDropdown
  data={tickets}
  columns={[
    { key: "ticketNumber", header: "Ticket #" },
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    { key: "priority", header: "Priority" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Created", format: (v) => new Date(v).toLocaleDateString() },
  ]}
  filename="tickets"
  title="ITSM Tickets"
  serverExportUrl="/itsm/tickets/export"
  serverExportParams={{ status: statusFilter, priority: priorityFilter }}
/>
```

---

### Feature 6: Inline Editing

**Requirement**: Add click-to-edit cells in data tables for quick field updates without navigating to a detail page.

#### What Exists:

**DataTable Column render** — Each column has a `render: (item: T) => ReactNode` function. Currently returns static text/badges.

**No inline edit patterns** exist in the codebase.

**Update hooks** exist for all entities (e.g., `useUpdateTicket`, `useUpdateWorkItem`, `useUpdateAsset`, `useUpdatePolicy`, etc.).

#### What to Build:

**A. Create `itd-opms-portal/components/shared/inline-edit.tsx`**

Three inline edit cell components for different field types:

```typescript
/* ------------------------------------------------------------------ */
/*  1. Inline Text Editor                                              */
/* ------------------------------------------------------------------ */

interface InlineTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  /** Optional validation */
  validate?: (value: string) => string | null; // Return error message or null
  placeholder?: string;
  className?: string;
  /** If false, renders as read-only text. Default true. */
  editable?: boolean;
}

export function InlineText({ value, onSave, validate, placeholder, className, editable = true }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Sync draft with external value changes
  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    if (validate) {
      const err = validate(draft);
      if (err) { setError(err); return; }
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!editing || !editable) {
    return (
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation(); // Prevent row click
          setEditing(true);
        }}
        className={`cursor-text hover:bg-[var(--surface-2)] px-1.5 py-0.5 -mx-1.5 rounded transition-colors ${className ?? ""}`}
        title="Click to edit"
      >
        {value || <span className="text-[var(--neutral-gray)] italic">{placeholder || "Empty"}</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={e => { setDraft(e.target.value); setError(null); }}
        onKeyDown={e => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        onBlur={handleSave}
        disabled={saving}
        className="w-full px-1.5 py-0.5 text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
      {saving && <Loader2 size={14} className="animate-spin text-[var(--primary)]" />}
      {error && <span className="text-xs text-[var(--error)]">{error}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Inline Select Editor                                            */
/* ------------------------------------------------------------------ */

interface InlineSelectProps {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onSave: (newValue: string) => Promise<void> | void;
  editable?: boolean;
  renderValue?: (value: string) => ReactNode; // Custom display (e.g., StatusBadge)
}

export function InlineSelect({ value, options, onSave, editable = true, renderValue }: InlineSelectProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const handleChange = async (newValue: string) => {
    if (newValue === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(newValue);
      setEditing(false);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!editing || !editable) {
    return (
      <span
        onClick={e => { if (!editable) return; e.stopPropagation(); setEditing(true); }}
        className="cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/20 rounded transition-all"
        title="Click to change"
      >
        {renderValue ? renderValue(value) : value}
      </span>
    );
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <select
        ref={selectRef}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        disabled={saving}
        className="text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Inline Date Editor                                              */
/* ------------------------------------------------------------------ */

interface InlineDateProps {
  value: string | null;      // ISO date string or null
  onSave: (newValue: string) => Promise<void> | void;
  editable?: boolean;
  displayFormat?: (date: string) => string;
}

export function InlineDate({ value, onSave, editable = true, displayFormat }: InlineDateProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const formatted = value
    ? (displayFormat ? displayFormat(value) : new Date(value).toLocaleDateString())
    : "No date";

  if (!editing || !editable) {
    return (
      <span
        onClick={e => { if (!editable) return; e.stopPropagation(); setEditing(true); }}
        className="cursor-pointer hover:bg-[var(--surface-2)] px-1.5 py-0.5 -mx-1.5 rounded transition-colors"
        title="Click to change date"
      >
        {formatted}
      </span>
    );
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="date"
        defaultValue={value?.split("T")[0] || ""}
        onChange={async e => {
          const newValue = e.target.value;
          if (!newValue || newValue === value?.split("T")[0]) { setEditing(false); return; }
          setSaving(true);
          try {
            await onSave(newValue);
            setEditing(false);
          } catch {
            toast.error("Failed to update date");
          } finally {
            setSaving(false);
          }
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === "Escape") setEditing(false); }}
        disabled={saving}
        className="text-sm bg-[var(--surface-0)] border border-[var(--primary)] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
    </div>
  );
}
```

**B. Integrate inline editing into page columns**

Update column `render` functions in pages that benefit most from inline editing. Start with **tickets** and **work items**:

**Tickets page** — update priority and assignee columns:
```typescript
// In the columns array:
{
  key: "priority",
  header: "Priority",
  sortable: true,
  render: (ticket: Ticket) => (
    <InlineSelect
      value={ticket.priority}
      options={[
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ]}
      onSave={async (newPriority) => {
        await updateTicket.mutateAsync({ id: ticket.id, priority: newPriority });
        toast.success("Priority updated");
      }}
      renderValue={(v) => <PriorityBadge priority={v} />}
      editable={hasPermission("itsm.manage")}
    />
  ),
},
{
  key: "status",
  header: "Status",
  sortable: true,
  render: (ticket: Ticket) => (
    <InlineSelect
      value={ticket.status}
      options={TICKET_STATUS_OPTIONS}
      onSave={async (newStatus) => {
        await transitionTicket.mutateAsync({ id: ticket.id, status: newStatus });
        toast.success("Status updated");
      }}
      renderValue={(v) => <StatusBadge status={v} />}
      editable={hasPermission("itsm.manage")}
    />
  ),
},
```

**Work items page** — update title (inline text), status (inline select), due date (inline date):
```typescript
{
  key: "title",
  header: "Title",
  sortable: true,
  render: (item: WorkItem) => (
    <InlineText
      value={item.title}
      onSave={async (newTitle) => {
        await updateWorkItem.mutateAsync({ id: item.id, title: newTitle });
      }}
      validate={(v) => v.trim().length < 3 ? "Title must be at least 3 characters" : null}
      editable={hasPermission("planning.manage")}
    />
  ),
},
{
  key: "dueDate",
  header: "Due Date",
  sortable: true,
  render: (item: WorkItem) => (
    <InlineDate
      value={item.dueDate}
      onSave={async (newDate) => {
        await updateWorkItem.mutateAsync({ id: item.id, dueDate: newDate });
      }}
      editable={hasPermission("planning.manage")}
    />
  ),
},
```

**C. Important UX details for inline editing in DataTable:**

1. **Prevent row click propagation**: All inline edit components must call `e.stopPropagation()` on click to prevent triggering `onRowClick` when the user clicks to edit a cell.

2. **Visual affordance**: On hover, editable cells show a subtle background change (`hover:bg-[var(--surface-2)]`) to indicate they're clickable. Optionally show a tiny pencil icon on hover.

3. **Optimistic updates**: Use TanStack Query's `onMutate` for instant feedback:
   ```typescript
   const updateTicket = useMutation({
     mutationFn: (data) => apiClient.put(`/itsm/tickets/${data.id}`, data),
     onMutate: async (newData) => {
       await queryClient.cancelQueries({ queryKey: ["tickets"] });
       const previous = queryClient.getQueryData(["tickets"]);
       queryClient.setQueryData(["tickets"], (old) => /* merge newData */);
       return { previous };
     },
     onError: (_, __, context) => {
       queryClient.setQueryData(["tickets"], context?.previous);
     },
     onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ["tickets"] });
     },
   });
   ```

4. **Permission-gated**: Only show edit affordance if user has the relevant `*.manage` permission. Read-only users see static text.

5. **Escape to cancel**: Always revert to original value on Escape key.

6. **Tab to next editable cell** (optional enhancement): When user presses Tab in an inline editor, move to the next editable cell in the same row, then to the first editable cell in the next row.

---

## File Summary

### New Files to Create:

| # | File | Purpose | Est. Lines |
|---|------|---------|------------|
| 1 | `itd-opms-portal/lib/navigation.ts` | Shared nav groups array (extracted from sidebar) | ~250 |
| 2 | `itd-opms-portal/components/shared/command-palette.tsx` | Global Cmd+K command palette | ~350 |
| 3 | `itd-opms-portal/hooks/use-hotkeys.ts` | Keyboard shortcut hook | ~80 |
| 4 | `itd-opms-portal/components/shared/keyboard-shortcut-help.tsx` | Shortcut help overlay (?) | ~150 |
| 5 | `itd-opms-portal/lib/export-utils.ts` | Client-side CSV/Excel/PDF export | ~200 |
| 6 | `itd-opms-portal/components/shared/export-dropdown.tsx` | Reusable export button + dropdown | ~120 |
| 7 | `itd-opms-portal/components/shared/inline-edit.tsx` | InlineText, InlineSelect, InlineDate | ~250 |
| 8 | `itd-opms-api/internal/shared/export/csv_writer.go` | Server-side CSV streaming | ~50 |
| 9 | `itd-opms-api/internal/shared/types/bulk.go` | Bulk operation request/response types | ~25 |

### Files to Modify:

| # | File | Changes |
|---|------|---------|
| 1 | `itd-opms-portal/components/layout/header.tsx` | Wire Cmd+K, add CommandPalette state + render |
| 2 | `itd-opms-portal/components/layout/sidebar.tsx` | Import navGroups from `@/lib/navigation` instead of defining inline |
| 3 | `itd-opms-portal/components/shared/data-table.tsx` | Add `selectable`, `bulkActions`, checkbox column, bulk toolbar, keyboard focus |
| 4 | `itd-opms-portal/app/dashboard/layout.tsx` | Add `GlobalShortcuts` component |
| 5 | `itd-opms-portal/app/dashboard/planning/work-items/page.tsx` | Replace KanbanBoard with DnD version, add bulk actions, inline editing, export |
| 6 | `itd-opms-portal/app/dashboard/itsm/tickets/page.tsx` | Add bulk actions, inline editing, export |
| 7 | `itd-opms-portal/hooks/use-itsm.ts` | Add `useBulkUpdateTickets` hook |
| 8 | `itd-opms-portal/hooks/use-planning.ts` | Add `useBulkUpdateWorkItems` hook |
| 9 | `itd-opms-api/internal/modules/itsm/ticket_handler.go` | Add `BulkUpdate` and `ExportTickets` handlers |
| 10 | `itd-opms-api/internal/modules/itsm/ticket_service.go` | Add `BulkUpdateTickets` service method |
| 11 | `itd-opms-api/internal/modules/planning/workitem_handler.go` | Add `BulkUpdate` handler |
| 12 | `itd-opms-api/internal/modules/planning/workitem_service.go` | Add `BulkUpdateWorkItems` service method |
| 13 | `itd-opms-api/queries/itsm.sql` | Add bulk update + export queries |
| 14 | `itd-opms-api/queries/planning.sql` | Add bulk update queries |

---

## Implementation Order (Recommended)

Implement in this order to minimize cross-dependencies:

1. **Export Engine** (Feature 5) — No dependencies on other features. Creates `export-utils.ts` and `export-dropdown.tsx` that bulk operations will reuse.

2. **Inline Editing** (Feature 6) — Independent component. Creates `inline-edit.tsx` used by pages.

3. **Keyboard Shortcuts** (Feature 4) — Creates `use-hotkeys.ts` needed by command palette. Creates help overlay.

4. **Bulk Operations** (Feature 2) — Enhances DataTable. Uses export utils from Feature 5.

5. **Command Palette** (Feature 1) — Requires `navigation.ts` extraction. Uses `use-hotkeys.ts` from Feature 4.

6. **Kanban DnD** (Feature 3) — Self-contained to work items page. Can be done in parallel with others.

---

## Parallelization Strategy

These features can be split across **4 parallel agents**:

| Agent | Features | Files |
|-------|----------|-------|
| **Agent A** | Export Engine + Inline Editing | `export-utils.ts`, `export-dropdown.tsx`, `inline-edit.tsx`, page integrations |
| **Agent B** | Keyboard Shortcuts + Command Palette | `use-hotkeys.ts`, `keyboard-shortcut-help.tsx`, `navigation.ts`, `command-palette.tsx`, `header.tsx`, `sidebar.tsx`, `layout.tsx` |
| **Agent C** | Bulk Operations (frontend + backend) | `data-table.tsx` enhancement, `bulk.go`, bulk handlers/services, bulk hooks, `itsm.sql`, `planning.sql` |
| **Agent D** | Kanban DnD | `work-items/page.tsx` KanbanBoard rewrite with @dnd-kit |

**Dependency note**: Agent B should extract `navigation.ts` first (sidebar depends on it). Agent A's export utils are needed by Agent C's bulk export action. Run Agent B and Agent D in parallel, then Agent A, then Agent C.

---

## Verification Plan

1. **TypeScript**: `cd itd-opms-portal && npx tsc --noEmit` — zero errors
2. **Go build**: `cd itd-opms-api && go build ./... && go vet ./...` — zero errors
3. **Command Palette**: Press `Cmd+K` → palette opens → type "tick" → "Tickets" page appears with highlighted match → Enter navigates → palette closes
4. **Bulk Operations**: Go to Tickets → check 3 rows → toolbar appears "3 selected" → click "Close" → all 3 tickets update → toast "3 tickets closed"
5. **Kanban DnD**: Go to Work Items → Board view → drag card from "Todo" to "In Progress" → card moves → status updates → toast "Status updated"
6. **Keyboard Shortcuts**: Press `?` → help overlay appears → press `G` then `T` → navigates to Tickets → press `J`/`K` → rows highlight
7. **Export**: Go to Tickets → click Export → CSV → file downloads with correct columns and data → Excel opens in spreadsheet app → PDF opens print dialog
8. **Inline Editing**: Go to Tickets → click on Priority cell → dropdown appears → select "High" → saves immediately → badge updates → toast "Priority updated"
9. **Permission gating**: Log in as read-only user → inline edit cells show no hover affordance → bulk checkboxes hidden → command palette "New" actions hidden
10. **All existing functionality unaffected** — no regressions to existing pages/endpoints
