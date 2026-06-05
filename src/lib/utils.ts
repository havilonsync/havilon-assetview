import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

export function generateReceiptNumber(): string {
  return `R-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function generateInvoiceNumber(): string {
  return `INV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function generateWONumber(): string {
  return `WO-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function generateHash(data: string): string {
  // Simple deterministic hash for demo; use crypto in production
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "green", complete: "green", approved: "green", paid: "green",
    pending: "amber", in_progress: "amber", due_soon: "amber", under_review: "amber",
    overdue: "red", emergency: "red", litigation: "red", denied: "red",
    new: "blue", draft: "blue", scheduled: "blue",
    closed: "gray", cancelled: "gray", expired: "gray",
  };
  return map[status] ?? "gray";
}
