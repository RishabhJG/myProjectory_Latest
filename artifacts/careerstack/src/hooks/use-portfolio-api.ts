/**
 * Manual React Query hooks for the Portfolio extension APIs.
 * These bypass the Orval-generated codegen to avoid modifying generated files.
 * Uses a local authed fetch helper that mirrors the customFetch behavior.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSkill {
  id: number;
  userId: number;
  name: string;
  proficiencyLevel: string;
  createdAt: string;
}

export interface UserCertification {
  id: number;
  userId: number;
  name: string;
  issuingBody: string;
  dateObtained: string | null;
  url: string | null;
  createdAt: string;
}

export interface ProjectStackTag {
  id: number;
  projectId: number;
  stackId: number;
  taggedAt: string;
  technology: string;
}

export interface TechScore {
  technology: string;
  projectCount: number;
  comfortScore: number;
  confidenceLevel: "low" | "medium" | "high";
}

export interface PortfolioProjectItem {
  id: number;
  title: string;
  description?: string | null;
  technologies: string[];
  difficultyLevel: string;
  completionStatus: string;
  githubLink?: string | null;
  liveLink?: string | null;
  screenshotUrl?: string | null;
  duration?: string | null;
  role?: string | null;
  category?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  displayOrder: number;
  isFeatured: boolean;
}

export interface PortfolioResponse {
  id: number;
  studentId: number;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: string;
  visibility: "public" | "private";
  slug: string;
  shareToken?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  projects: PortfolioProjectItem[];
  projectsCount: number;
  techScores: TechScore[];
  topTechs: string[];
}

export interface PublicPortfolioSummary {
  id: number;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  slug: string;
  theme: string;
  publishedAt: string | null;
  student: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  projectsCount: number;
  topTechs: string[];
  techScores: TechScore[];
  combinedTechScore: number | null;
}

export interface AddSkillBody {
  name: string;
  proficiencyLevel: string;
}

export interface AddCertificationBody {
  name: string;
  issuingBody: string;
  dateObtained?: string;
  url?: string;
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

function usePublicFetch() {
  return useCallback(
    async <T>(url: string, init: RequestInit = {}): Promise<T> => {
      const response = await fetch(url, init);

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
    [],
  );
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const portfolioKeys = {
  skills: () => ["/api/portfolio/skills"] as const,
  certifications: () => ["/api/portfolio/certifications"] as const,
  projectStackTags: (projectId: number) => ["/api/portfolio/projects", projectId, "stack-tags"] as const,
  myPortfolio: () => ["/api/portfolios/my"] as const,
  publicPortfolios: (query: string) => ["/api/portfolios/public", query] as const,
  publicPortfolioSlug: (slug: string) => ["/api/p", slug] as const,
  publicPortfolioToken: (token: string) => ["/api/p/private", token] as const,
};

// ─── Skills Hooks ─────────────────────────────────────────────────────────────

export function useListSkills(options?: { query?: Partial<UseQueryOptions<UserSkill[]>> }) {
  const apiFetch = useAuthedFetch();
  return useQuery<UserSkill[]>({
    queryKey: portfolioKeys.skills(),
    queryFn: () => apiFetch<UserSkill[]>("/api/portfolio/skills"),
    ...options?.query,
  });
}

export function useAddSkill() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<UserSkill, Error, AddSkillBody>({
    mutationKey: ["addSkill"],
    mutationFn: (body) =>
      apiFetch<UserSkill>("/api/portfolio/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.skills() });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<void, Error, number>({
    mutationKey: ["deleteSkill"],
    mutationFn: (id) =>
      apiFetch<void>(`/api/portfolio/skills/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.skills() });
    },
  });
}

// ─── Certifications Hooks ─────────────────────────────────────────────────────

export function useListCertifications(options?: { query?: Partial<UseQueryOptions<UserCertification[]>> }) {
  const apiFetch = useAuthedFetch();
  return useQuery<UserCertification[]>({
    queryKey: portfolioKeys.certifications(),
    queryFn: () => apiFetch<UserCertification[]>("/api/portfolio/certifications"),
    ...options?.query,
  });
}

export function useAddCertification() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<UserCertification, Error, AddCertificationBody>({
    mutationKey: ["addCertification"],
    mutationFn: (body) =>
      apiFetch<UserCertification>("/api/portfolio/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certifications() });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<void, Error, number>({
    mutationKey: ["deleteCertification"],
    mutationFn: (id) =>
      apiFetch<void>(`/api/portfolio/certifications/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certifications() });
    },
  });
}

// ─── Project Stack Tags Hooks ─────────────────────────────────────────────────

export function useListProjectStackTags(projectId: number) {
  const apiFetch = useAuthedFetch();
  return useQuery<ProjectStackTag[]>({
    queryKey: portfolioKeys.projectStackTags(projectId),
    queryFn: () =>
      apiFetch<ProjectStackTag[]>(`/api/portfolio/projects/${projectId}/stack-tags`),
    enabled: !!projectId,
  });
}

export function useTagProjectToStack() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<ProjectStackTag, Error, { projectId: number; stackId: number }>({
    mutationKey: ["tagProjectToStack"],
    mutationFn: ({ projectId, stackId }) =>
      apiFetch<ProjectStackTag>(`/api/portfolio/projects/${projectId}/stack-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stackId }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projectStackTags(variables.projectId) });
    },
  });
}

export function useRemoveProjectStackTag() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<void, Error, { projectId: number; tagId: number }>({
    mutationKey: ["removeProjectStackTag"],
    mutationFn: ({ projectId, tagId }) =>
      apiFetch<void>(`/api/portfolio/projects/${projectId}/stack-tags/${tagId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projectStackTags(variables.projectId) });
    },
  });
}

// ─── Portfolio Generation & Publishing ──────────────────────────────────────

export function useGeneratePortfolio() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<PortfolioResponse, Error>({
    mutationKey: ["generatePortfolio"],
    mutationFn: () => apiFetch<PortfolioResponse>("/api/portfolios/generate", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.myPortfolio() });
    },
  });
}

export function useMyPortfolio(options?: { query?: Partial<UseQueryOptions<PortfolioResponse | null>> }) {
  const apiFetch = useAuthedFetch();
  return useQuery<PortfolioResponse | null>({
    queryKey: portfolioKeys.myPortfolio(),
    queryFn: async () => {
      try {
        return await apiFetch<PortfolioResponse>("/api/portfolios/my");
      } catch (err) {
        if ((err as Error).message?.includes("404")) {
          return null;
        }
        throw err;
      }
    },
    ...options?.query,
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<PortfolioResponse, Error, { id: number; data: Partial<Pick<PortfolioResponse, "title" | "bio" | "visibility" | "theme">> }>({
    mutationKey: ["updatePortfolio"],
    mutationFn: ({ id, data }) =>
      apiFetch<PortfolioResponse>(`/api/portfolios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.myPortfolio() });
    },
  });
}

export function useUpdatePortfolioProjects() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<PortfolioResponse, Error, { id: number; projects: Array<{ projectId: number; displayOrder: number; isFeatured: boolean }> }>({
    mutationKey: ["updatePortfolioProjects"],
    mutationFn: ({ id, projects }) =>
      apiFetch<PortfolioResponse>(`/api/portfolios/${id}/projects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.myPortfolio() });
    },
  });
}

export function usePublishPortfolio() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<{ portfolioUrl: string | null; shareLink: string }, Error, { id: number; visibility: "public" | "private" }>({
    mutationKey: ["publishPortfolio"],
    mutationFn: ({ id, visibility }) =>
      apiFetch<{ portfolioUrl: string | null; shareLink: string }>(`/api/portfolios/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.myPortfolio() });
    },
  });
}

// ─── Public Portfolio Views ─────────────────────────────────────────────────

export function usePublicPortfolios(query: string, options?: { query?: Partial<UseQueryOptions<PublicPortfolioSummary[]>> }) {
  const apiFetch = usePublicFetch();
  const queryString = query ? `?${query}` : "";
  return useQuery<PublicPortfolioSummary[]>({
    queryKey: portfolioKeys.publicPortfolios(queryString),
    queryFn: () => apiFetch<PublicPortfolioSummary[]>(`/api/portfolios/public${queryString}`),
    ...options?.query,
  });
}

export function usePublicPortfolioBySlug(slug: string, options?: { query?: Partial<UseQueryOptions<PortfolioResponse>> }) {
  const apiFetch = usePublicFetch();
  return useQuery<PortfolioResponse>({
    queryKey: portfolioKeys.publicPortfolioSlug(slug),
    queryFn: () => apiFetch<PortfolioResponse>(`/api/p/${slug}`),
    enabled: !!slug,
    ...options?.query,
  });
}

export function usePublicPortfolioByToken(token: string, options?: { query?: Partial<UseQueryOptions<PortfolioResponse>> }) {
  const apiFetch = usePublicFetch();
  return useQuery<PortfolioResponse>({
    queryKey: portfolioKeys.publicPortfolioToken(token),
    queryFn: () => apiFetch<PortfolioResponse>(`/api/p/private/${token}`),
    enabled: !!token,
    ...options?.query,
  });
}
