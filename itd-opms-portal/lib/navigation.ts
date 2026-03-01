import {
  LayoutDashboard,
  Shield,
  FileText,
  GitBranch,
  Calendar,
  Target,
  Users,
  Brain,
  UserPlus,
  ClipboardList,
  FolderKanban,
  Briefcase,
  ListTodo,
  AlertTriangle,
  BookOpen,
  CircleDot,
  TicketCheck,
  Bug,
  HardDrive,
  KeyRound,
  ScrollText,
  Settings,
  Library,
  Search,
  PenSquare,
  ShieldCheck,
  AlertOctagon,
  ClipboardCheck,
  Scale,
  UserCheck,
  FileBarChart,
  Building2,
  Network,
  MonitorSmartphone,
  Mail,
  Activity,
  Layers,
  BarChart3,
  PieChart,
  TrendingUp,
  ShieldAlert,
  Milestone,
  AlertCircle,
  FileEdit,
  LogOut,
  CheckSquare,
  CalendarDays,
  Thermometer,
  DollarSign,
  Store,
  FolderOpen,
  Zap,
  SlidersHorizontal,
  Handshake,
  type LucideIcon,
} from "lucide-react";

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
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        href: "/dashboard/analytics",
        label: "Executive Overview",
        icon: BarChart3,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/portfolio",
        label: "Portfolio Analytics",
        icon: PieChart,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/projects",
        label: "Project Performance",
        icon: TrendingUp,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/risks",
        label: "Risk & Issues",
        icon: ShieldAlert,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/resources",
        label: "Resource & Workload",
        icon: Users,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/governance",
        label: "Governance & Compliance",
        icon: Shield,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/offices",
        label: "Office Analytics",
        icon: Building2,
        permission: "reporting.view",
      },
      {
        href: "/dashboard/analytics/collaboration",
        label: "Collaboration & Dependencies",
        icon: GitBranch,
        permission: "reporting.view",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        href: "/dashboard/governance/policies",
        label: "Policies",
        icon: FileText,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/raci",
        label: "RACI",
        icon: GitBranch,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/meetings",
        label: "Meetings",
        icon: Calendar,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/actions",
        label: "Action Tracker",
        icon: ClipboardList,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/okrs",
        label: "OKRs",
        icon: Target,
        permission: "governance.view",
      },
      {
        href: "/dashboard/governance/approvals",
        label: "Approvals",
        icon: CheckSquare,
        permission: "approval.view",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/dashboard/people/roster",
        label: "Directory",
        icon: Users,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/skills",
        label: "Skills",
        icon: Brain,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/onboarding",
        label: "Onboarding",
        icon: UserPlus,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/offboarding",
        label: "Offboarding",
        icon: LogOut,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/training",
        label: "Training",
        icon: BookOpen,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/capacity",
        label: "Capacity",
        icon: Activity,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/capacity/heatmap",
        label: "Resource Heatmap",
        icon: Thermometer,
        permission: "people.view",
      },
      {
        href: "/dashboard/people/analytics",
        label: "People Analytics",
        icon: BarChart3,
        permission: "people.view",
      },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        href: "/dashboard/planning/portfolios",
        label: "Portfolios",
        icon: FolderKanban,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/projects",
        label: "Projects",
        icon: Briefcase,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/work-items",
        label: "Work Items",
        icon: ListTodo,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/milestones",
        label: "Milestones",
        icon: Milestone,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/risks",
        label: "Risks",
        icon: AlertTriangle,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/issues",
        label: "Issues",
        icon: AlertCircle,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/change-requests",
        label: "Change Requests",
        icon: FileEdit,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/pir",
        label: "PIR Reviews",
        icon: ClipboardCheck,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/calendar",
        label: "Change Calendar",
        icon: CalendarDays,
        permission: "planning.view",
      },
      {
        href: "/dashboard/planning/budget",
        label: "Budget Overview",
        icon: DollarSign,
        permission: "planning.view",
      },
    ],
  },
  {
    label: "ITSM",
    items: [
      {
        href: "/dashboard/itsm/service-catalog",
        label: "Service Catalog",
        icon: BookOpen,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/tickets",
        label: "Tickets",
        icon: CircleDot,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/my-queue",
        label: "My Queue",
        icon: TicketCheck,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/problems",
        label: "Problems",
        icon: Bug,
        permission: "itsm.view",
      },
      {
        href: "/dashboard/itsm/sla-dashboard",
        label: "SLA Dashboard",
        icon: Activity,
        permission: "itsm.view",
      },
    ],
  },
  {
    label: "Assets",
    items: [
      {
        href: "/dashboard/cmdb/assets",
        label: "Asset Inventory",
        icon: HardDrive,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/topology",
        label: "Topology",
        icon: Network,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/licenses",
        label: "Licenses",
        icon: KeyRound,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/warranties",
        label: "Warranties",
        icon: ShieldCheck,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/reconciliation",
        label: "Reconciliation",
        icon: Layers,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/reports",
        label: "Asset Reports",
        icon: FileBarChart,
        permission: "assets.view",
      },
      {
        href: "/dashboard/cmdb/vendors",
        label: "Vendors",
        icon: Store,
        permission: "vendor.view",
      },
      {
        href: "/dashboard/cmdb/contracts",
        label: "Contracts",
        icon: Handshake,
        permission: "vendor.view",
      },
    ],
  },
  {
    label: "Knowledge",
    items: [
      {
        href: "/dashboard/knowledge",
        label: "Knowledge Base",
        icon: Library,
        permission: "knowledge.view",
      },
      {
        href: "/dashboard/knowledge/search",
        label: "Search",
        icon: Search,
        permission: "knowledge.view",
      },
      {
        href: "/dashboard/knowledge/articles/new",
        label: "New Article",
        icon: PenSquare,
        permission: "knowledge.manage",
      },
    ],
  },
  {
    label: "Document Vault",
    items: [
      {
        href: "/dashboard/vault",
        label: "Document Vault",
        icon: FolderOpen,
        permission: "documents.view",
      },
    ],
  },
  {
    label: "GRC",
    items: [
      {
        href: "/dashboard/grc",
        label: "GRC Dashboard",
        icon: ShieldCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/risks",
        label: "Risks",
        icon: AlertOctagon,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/audits",
        label: "Audits",
        icon: ClipboardCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/compliance",
        label: "Compliance",
        icon: Scale,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/access-reviews",
        label: "Access Reviews",
        icon: UserCheck,
        permission: "grc.view",
      },
      {
        href: "/dashboard/grc/reports",
        label: "Reports",
        icon: FileBarChart,
        permission: "grc.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/dashboard/system",
        label: "Overview",
        icon: LayoutDashboard,
        permission: "system.view",
      },
      {
        href: "/dashboard/system/users",
        label: "Users",
        icon: Users,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/roles",
        label: "Roles & Permissions",
        icon: Shield,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/tenants",
        label: "Tenants",
        icon: Building2,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/org-units",
        label: "Org Structure",
        icon: Network,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
        permission: "system.view",
      },
      {
        href: "/dashboard/system/sessions",
        label: "Sessions",
        icon: MonitorSmartphone,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/settings",
        label: "Settings",
        icon: Settings,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/email-templates",
        label: "Email Templates",
        icon: Mail,
        permission: "system.manage",
      },
      {
        href: "/dashboard/system/health",
        label: "Platform Health",
        icon: Activity,
        permission: "system.view",
      },
      {
        href: "/dashboard/system/workflows",
        label: "Workflows",
        icon: GitBranch,
        permission: "approval.manage",
      },
      {
        href: "/dashboard/system/automation",
        label: "Automation",
        icon: Zap,
        permission: "automation.manage",
      },
      {
        href: "/dashboard/system/custom-fields",
        label: "Custom Fields",
        icon: SlidersHorizontal,
        permission: "custom_fields.manage",
      },
    ],
  },
];
