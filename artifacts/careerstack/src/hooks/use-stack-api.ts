/**
 * Manual React Query hooks for the Stack module APIs (S5.2, S5.3, S5.7, S5.11).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MilestoneDetail {
  id: number;
  title: string;
  description: string | null;
  estimatedDuration: string;
  industryRelevance: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

export interface LinkedDomain {
  id: number;
  name: string;
  description: string;
  skills: string[];
}

export interface StackDetail {
  id: number;
  name: string;
  description: string;
  technologies: string[];
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  milestones: MilestoneDetail[];
  linkedDomain: LinkedDomain | null;
  roadmapId: number;
}

export interface DomainSuggestion {
  id: number;
  name: string;
  description: string;
  skills: string[];
  priority: number;
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

      if (response.status === 204) return undefined as unknown as T;
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

export const stackKeys = {
  detail: (id: number) => ["/api/stacks", id, "detail"] as const,
  domainSuggestions: () => ["/api/stacks/domain-suggestions"] as const,
};

// ─── S5.2 + S5.7: Stack Detail Hook ──────────────────────────────────────────

export function useStackDetail(id: number) {
  const apiFetch = useAuthedFetch();
  return useQuery<StackDetail>({
    queryKey: stackKeys.detail(id),
    queryFn: () => apiFetch<StackDetail>(`/api/stacks/${id}/detail`),
    enabled: !!id,
  });
}

// ─── S5.11: Link Domain to Roadmap ───────────────────────────────────────────

export function useLinkDomainToStack() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<any, Error, { roadmapId: number; domainId: number }>({
    mutationKey: ["linkDomainToStack"],
    mutationFn: ({ roadmapId, domainId }) =>
      apiFetch(`/api/stacks/${roadmapId}/link-domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: stackKeys.detail(variables.roadmapId) });
    },
  });
}

// ─── S5.3: Domain Suggestions Hook ──────────────────────────────────────────

export function useDomainSuggestions() {
  const apiFetch = useAuthedFetch();
  return useQuery<DomainSuggestion[]>({
    queryKey: stackKeys.domainSuggestions(),
    queryFn: () => apiFetch<DomainSuggestion[]>("/api/stacks/domain-suggestions"),
  });
}
