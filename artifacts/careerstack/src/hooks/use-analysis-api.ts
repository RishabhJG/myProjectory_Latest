/**
 * Manual React Query hooks for the Analysis extension APIs (S3.4, S3.6, S3.8).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeightEntry {
  dimension: string;
  weight: number;
}

export interface WeightsResponse {
  weights: WeightEntry[];
}

export interface StrengthDimension {
  dimension: string;
  label: string;
  score: number;
  weight: number;
}

export interface StrengthBreakdownResponse {
  dimensions: StrengthDimension[];
  insight: string;
}

export interface SkillGap {
  skill: string;
  demandCount: number;
}

export interface MarketAlignmentResponse {
  matchPercentage: number;
  skillGaps: SkillGap[];
  userMatchedSkills: string[];
  trendDataAvailable: boolean;
}

// ─── Auth Fetch Helper ────────────────────────────────────────────────────────

function useAuthedFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async <T>(url: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, { ...init, headers });

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    },
    [getToken],
  );
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const analysisKeys = {
  weights: () => ["/api/analysis/weights"] as const,
  strengthBreakdown: () => ["/api/analysis/strength-breakdown"] as const,
  marketAlignment: () => ["/api/analysis/market-alignment"] as const,
};

// ─── S3.4: Weights Hooks ──────────────────────────────────────────────────────

export function useGetWeights() {
  const apiFetch = useAuthedFetch();
  return useQuery<WeightsResponse>({
    queryKey: analysisKeys.weights(),
    queryFn: () => apiFetch<WeightsResponse>("/api/analysis/weights"),
  });
}

export function useSaveWeights() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<{ success: boolean; weights: WeightEntry[] }, Error, WeightEntry[]>({
    mutationKey: ["saveWeights"],
    mutationFn: (weights) =>
      apiFetch("/api/analysis/weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.weights() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.strengthBreakdown() });
      // Also invalidate job readiness since it uses these weights
      queryClient.invalidateQueries({ queryKey: ["/api/scores/job-readiness"] });
    },
  });
}

// ─── S3.6: Strength Breakdown Hook ───────────────────────────────────────────

export function useStrengthBreakdown() {
  const apiFetch = useAuthedFetch();
  return useQuery<StrengthBreakdownResponse>({
    queryKey: analysisKeys.strengthBreakdown(),
    queryFn: () => apiFetch<StrengthBreakdownResponse>("/api/analysis/strength-breakdown"),
  });
}

// ─── S3.8: Market Alignment Hook ─────────────────────────────────────────────

export function useMarketAlignment() {
  const apiFetch = useAuthedFetch();
  return useQuery<MarketAlignmentResponse>({
    queryKey: analysisKeys.marketAlignment(),
    queryFn: () => apiFetch<MarketAlignmentResponse>("/api/analysis/market-alignment"),
  });
}
