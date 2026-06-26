"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AnalyticsResponse, CategoryRule, Filters, ImportBatchResponse, PresentedTransaction, TransactionInput, TransactionPage } from "./types";
import { queryString } from "./types";

export const ledgerKeys = {
  root: (userId: string) => ["ledger", userId] as const,
  analytics: (userId: string, filters = "") => [...ledgerKeys.root(userId), "analytics", filters] as const,
  transactions: (userId: string, filters: string) => [...ledgerKeys.root(userId), "transactions", filters] as const,
  imports: (userId: string) => [...ledgerKeys.root(userId), "imports"] as const,
  rules: (userId: string) => [...ledgerKeys.root(userId), "rules"] as const
};

export function useAnalytics(token: string, userId: string, filters: Filters) {
  const filterKey = queryString(filters);
  return useQuery({
    queryKey: ledgerKeys.analytics(userId, filterKey),
    queryFn: () => apiFetch<AnalyticsResponse>(`/api/analytics/summary?${filterKey}`, token)
  });
}

export function useTransactions(token: string, userId: string, filters: Filters) {
  const filterKey = queryString(filters);
  return useInfiniteQuery({
    queryKey: ledgerKeys.transactions(userId, filterKey),
    queryFn: ({ pageParam }) => apiFetch<TransactionPage>(`/api/transactions?${filterKey}${filterKey ? "&" : ""}limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`, token),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
}

export function useImports(token: string, userId: string) {
  return useQuery({ queryKey: ledgerKeys.imports(userId), queryFn: () => apiFetch<{ batches: ImportBatchResponse[] }>("/api/imports", token) });
}

export function useRules(token: string, userId: string) {
  return useQuery({ queryKey: ledgerKeys.rules(userId), queryFn: () => apiFetch<{ rules: CategoryRule[] }>("/api/category-rules", token) });
}

export function useLedgerMutations(token: string, userId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ledgerKeys.root(userId) });
  return {
    createTransaction: useMutation({
      mutationFn: (record: TransactionInput) => apiFetch("/api/transactions", token, { method: "POST", body: JSON.stringify({ drafts: [{ ...record, confidence: 1, source: "MANUAL" }] }) }),
      onSuccess: refresh
    }),
    editTransaction: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => apiFetch(`/api/transactions/${id}`, token, { method: "PATCH", body: JSON.stringify(input) }),
      onSuccess: refresh
    }),
    deleteTransaction: useMutation({
      mutationFn: (id: string) => apiFetch(`/api/transactions/${id}`, token, { method: "DELETE" }),
      onSuccess: refresh
    }),
    importTransactions: useMutation({
      mutationFn: (payload: { filename: string; records: Array<TransactionInput & { include: boolean }> }) => apiFetch("/api/imports", token, { method: "POST", body: JSON.stringify(payload) }),
      onSuccess: refresh
    }),
    rollbackImport: useMutation({
      mutationFn: (id: string) => apiFetch(`/api/imports/${id}`, token, { method: "DELETE" }),
      onSuccess: refresh
    }),
    saveRule: useMutation({
      mutationFn: (input: { matchText: string; category: string }) => apiFetch("/api/category-rules", token, { method: "POST", body: JSON.stringify(input) }),
      onSuccess: refresh
    }),
    deleteRule: useMutation({
      mutationFn: (id: string) => apiFetch(`/api/category-rules/${id}`, token, { method: "DELETE" }),
      onSuccess: refresh
    })
  };
}

export function clearLedgerCache(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.removeQueries({ queryKey: ledgerKeys.root(userId) });
}
