import { cn } from "@/lib/utils";

const variants = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-slate-50 text-slate-600 border-slate-200",
};

type Variant = keyof typeof variants;

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function statusVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    active: "green", complete: "green", approved: "green", paid: "green", preferred: "green",
    provided: "green", delivered: "green", sent: "green", scheduled: "green",
    in_progress: "amber", pending: "amber", due_soon: "amber", under_review: "amber",
    negotiation: "amber", opened: "amber", trial: "amber", expiring_soon: "amber",
    overdue: "red", emergency: "red", litigation_hold: "red", litigation: "red",
    documentation_needed: "red", no_reply: "red",
    new: "blue", draft: "blue", proposal: "blue", in_review: "blue", commercial: "blue",
    enterprise: "purple", onboarding: "purple",
    closed: "gray", cancelled: "gray", expired: "gray", archived: "gray",
    not_started: "gray", vacant: "gray", pending_bid: "gray",
  };
  return map[status] ?? "gray";
}
