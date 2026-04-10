import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  sourceUrl: string;
  domain: string;
  postedAt: string;
  fetchedAt: string;
  isActive: boolean;
  isSaved?: boolean;
}

export interface ListJobsParams {
  domain?: string;
  location?: string;
  skills?: string;
  daysOld?: number;
  page?: number;
  limit?: number;
}

export interface ListJobsResponse {
  jobs: JobListing[];
  page: number;
  limit: number;
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const jobKeys = {
  all: ["/api/job-listings"] as const,
  list: (params: ListJobsParams) => ["/api/job-listings", params] as const,
  detail: (id: number) => ["/api/job-listings", id] as const,
  saved: () => ["/api/job-listings/saved"] as const,
};

export function useListJobs(params: ListJobsParams = {}) {
  const apiFetch = useAuthedFetch();
  return useQuery<ListJobsResponse>({
    queryKey: jobKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.domain) sp.set("domain", params.domain);
      if (params.location) sp.set("location", params.location);
      if (params.skills) sp.set("skills", params.skills);
      if (params.daysOld) sp.set("daysOld", params.daysOld.toString());
      if (params.page) sp.set("page", params.page.toString());
      if (params.limit) sp.set("limit", params.limit.toString());
      return apiFetch<ListJobsResponse>(`/api/job-listings?${sp.toString()}`);
    },
  });
}

export function useJobDetail(id: number) {
  const apiFetch = useAuthedFetch();
  return useQuery<JobListing>({
    queryKey: jobKeys.detail(id),
    queryFn: () => apiFetch<JobListing>(`/api/job-listings/${id}`),
    enabled: !!id,
  });
}

export function useSaveJob() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<{ saved: boolean }, Error, number>({
    mutationFn: (id) =>
      apiFetch<{ saved: boolean }>(`/api/job-listings/${id}/save`, {
        method: "POST",
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.saved() });
    },
  });
}

export function useListSavedJobs() {
  const apiFetch = useAuthedFetch();
  return useQuery<JobListing[]>({
    queryKey: jobKeys.saved(),
    queryFn: () => apiFetch<JobListing[]>("/api/job-listings/saved"),
  });
}
