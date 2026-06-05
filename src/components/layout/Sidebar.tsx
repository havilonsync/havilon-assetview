"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, TrendingUp, Users, UserCheck, Building2, Home, Wrench, Shield,
  ClipboardCheck, MessageSquare, BarChart3, Vault, FileBadge, GitBranch,
  Brain, Receipt, Archive, Server
} from "lucide-react";

const nav = [
  { section: "Overview", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/performance", label: "Performance", icon: TrendingUp },
  ] },
  {
    section: "Portfolio",
    items: [
      { href: "/crm", label: "CRM", icon: Users },
      { href: "/onboarding", label: "Client Onboarding", icon: UserCheck },
      { href: "/assets", label: "Asset Lifecycle", icon: Building2 },
      { href: "/properties", label: "Properties & Units", icon: Home },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/maintenance", label: "Maintenance", icon: Wrench },
      { href: "/insurance", label: "Insurance", icon: Shield },
      { href: "/compliance", label: "Compliance", icon: ClipboardCheck },
      { href: "/communications", label: "Communications", icon: MessageSquare },
    ],
  },
  {
    section: "Finance",
    items: [
      { href: "/revenue", label: "Revenue Ops", icon: BarChart3 },
      { href: "/trust", label: "Trust Accounting", icon: Vault },
    ],
  },
  {
    section: "Governance",
    items: [
      { href: "/audit", label: "Audit Portal", icon: FileBadge },
      { href: "/workflow", label: "Workflow Engine", icon: GitBranch },
      { href: "/ai", label: "AI Layer", icon: Brain },
      { href: "/receipts", label: "Receipts & CoC", icon: Receipt },
      { href: "/closeout", label: "Closeout & Archive", icon: Archive },
      { href: "/saas", label: "SaaS Admin", icon: Server },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 min-w-[224px] bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto">
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">Havilon</div>
            <div className="text-[10px] text-slate-400">AssetView™</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-2">
        {nav.map((group) => (
          <div key={group.section} className="mb-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">{group.section}</div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">AR</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-700 truncate">Alex Rivera</div>
            <div className="text-slate-400">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
