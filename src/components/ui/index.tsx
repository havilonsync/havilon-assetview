"use client";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-white border border-slate-200 rounded-xl p-5", className)}>{children}</div>;
}
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between mb-4", className)}>{children}</div>;
}
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-800">{children}</h3>;
}
interface MetricCardProps { label: string; value: string | number; sub?: string; valueColor?: string; }
export function MetricCard({ label, value, sub, valueColor }: MetricCardProps) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="text-xs text-slate-500 mb-1 font-medium">{label}</div>
      <div className={cn("text-2xl font-semibold text-slate-900", valueColor)}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
export function MetricsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">{children}</div>;
}
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto", className)}><table className="w-full text-sm border-collapse">{children}</table></div>;
}
export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100 whitespace-nowrap">{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={cn("px-3 py-2.5 border-b border-slate-50 text-slate-800 align-middle", className)} colSpan={colSpan}>{children}</td>;
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-slate-50 transition-colors", className)}>{children}</tr>;
}
export function ProgressBar({ value, max = 100, color = "blue" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colorMap: Record<string, string> = { blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-400" };
  return (
    <div className="bg-slate-100 rounded-full h-1.5 w-full">
      <div className={cn("h-1.5 rounded-full", colorMap[color] ?? "bg-blue-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}
export function FieldRow({ label, value, valueClass }: { label: React.ReactNode; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0 text-sm">
      <span className="text-slate-500 min-w-[160px]">{label}</span>
      <span className={cn("text-slate-800 text-right", valueClass)}>{value}</span>
    </div>
  );
}
export function TwoCol({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4", className)}>{children}</div>;
}
export function ThreeCol({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>{children}</div>;
}
export function PageTopBar({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-10 text-sm text-slate-400">{message}</div>;
}
export function AIBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-slate-600 mt-3">
      <span className="font-semibold text-purple-700">AI Insight: </span>{children}
    </div>
  );
}
export function Btn({ children, onClick, variant = "default", size = "sm", className }: {
  children: React.ReactNode; onClick?: () => void; variant?: "default" | "primary" | "danger"; size?: "sm" | "md"; className?: string;
}) {
  return (
    <button onClick={onClick} className={cn(
      "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer",
      size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
      variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
      variant === "danger" && "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
      variant === "default" && "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      className
    )}>{children}</button>
  );
}
export function SectionPage({ children }: { children: React.ReactNode }) {
  return <div className="p-6 space-y-4">{children}</div>;
}
export function Avatar({ initials, color = "blue" }: { initials: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700", amber: "bg-amber-100 text-amber-700",
  };
  return <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", colorMap[color] ?? colorMap.blue)}>{initials}</div>;
}
export function Timeline({ items }: { items: { text: string; sub: string; color?: string }[] }) {
  const colorMap: Record<string, string> = { blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-400", gray: "bg-slate-300" };
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", colorMap[item.color ?? "blue"])} />
          <div>
            <div className="text-sm text-slate-800">{item.text}</div>
            <div className="text-xs text-slate-400">{item.sub}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
