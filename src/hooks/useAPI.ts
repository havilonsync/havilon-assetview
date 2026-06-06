"use client";
// Custom data fetching hooks — replace static store.ts imports in pages
// Install swr: npm install swr (already compatible with Next.js App Router)

import { useState, useEffect } from "react";

// Generic fetch hook
export function useAPI<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [path]);

  const mutate = async (newPath?: string) => {
    const url = newPath ?? path;
    if (!url) return;
    const r = await fetch(url);
    if (r.ok) setData(await r.json());
  };

  return { data, loading, error, mutate };
}

// Generic POST/PATCH/DELETE helper
export async function apiCall(
  path: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  body?: unknown
): Promise<{ data: unknown; error: string | null }> {
  try {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) return { data: null, error: data?.error ?? `Request failed: ${r.status}` };
    return { data, error: null };
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

// Module-specific hooks
export function useDashboard() { return useAPI<any>("/api/dashboard"); }
export function useLeads(stage?: string) { return useAPI<any>(stage ? `/api/leads?stage=${stage}` : "/api/leads"); }
export function useOnboardings() { return useAPI<any>("/api/onboarding"); }
export function useOnboardingSteps(onboardingId?: string | null) {
  return useAPI<any>(onboardingId ? `/api/onboarding/steps?onboardingId=${onboardingId}` : null);
}
export function useAssets() { return useAPI<any>("/api/assets"); }
export function useLifecycleEvents(assetId?: string | null) {
  return useAPI<any>(assetId ? `/api/assets/lifecycle?assetId=${assetId}` : null);
}
export function useProperties() { return useAPI<any>("/api/properties"); }
export function useLeases(status?: string) { return useAPI<any>(status ? `/api/leases?status=${status}` : "/api/leases"); }
export function useWorkOrders(status?: string, priority?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  return useAPI<any>(`/api/work-orders?${params}`);
}
export function useInsurancePolicies(status?: string) {
  return useAPI<any>(status ? `/api/insurance-policies?status=${status}` : "/api/insurance-policies");
}
export function useInsuranceClaims(status?: string) { return useAPI<any>(status ? `/api/insurance-claims?status=${status}` : "/api/insurance-claims"); }
export function useComplianceItems(status?: string) { return useAPI<any>(status ? `/api/compliance-items?status=${status}` : "/api/compliance-items"); }
export function useCommunications(pendingApproval?: boolean) {
  return useAPI<any>(pendingApproval ? "/api/communications?pendingApproval=true" : "/api/communications");
}
export function useInvoices(status?: string) { return useAPI<any>(status ? `/api/invoices?status=${status}` : "/api/invoices"); }
export function useTrustAccounts() { return useAPI<any>("/api/trust"); }
export function useAuditEngagements() { return useAPI<any>("/api/audit"); }
export function useWorkflowInstances(status?: string) { return useAPI<any>(status ? `/api/workflow-instances?status=${status}` : "/api/workflow-instances"); }
export function useReceipts() { return useAPI<any>("/api/receipts"); }
export function useAuditLog(entity?: string) { return useAPI<any>(entity ? `/api/audit-log?entity=${entity}` : "/api/audit-log"); }
export function useUsers() { return useAPI<any>("/api/users"); }
export function useMfaStatus() { return useAPI<any>("/api/mfa"); }
