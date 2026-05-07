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

export interface PortfolioShare {
  id: number;
  userId: number;
  shareId: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSkillSummary {
  name: string;
  proficiencyLevel: string;
}

export interface PortfolioTechSummary {
  name: string;
  projectCount: number;
}

export interface PortfolioProject {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  problemSolved: string | null;
  technologies: string[];
  difficultyLevel: string;
  githubLink: string | null;
  liveLink: string | null;
  screenshotUrl: string | null;
  duration: string | null;
  role: string | null;
  category: string | null;
  completionStatus: string;
  createdAt: string;
  updatedAt: string;
  completionDate: string;
}

export interface PortfolioUserInfo {
  id: number;
  name: string;
  college: string | null;
  degree: string | null;
  graduationYear: number | null;
  preferredDomain: string | null;
  profilePhotoUrl: string | null;
  skills: string[];
}

export interface GeneratedPortfolio {
  user: PortfolioUserInfo;
  projects: PortfolioProject[];
  skills: PortfolioSkillSummary[];
  techStackSummary: PortfolioTechSummary[];
  generatedAt: string;
  share?: {
    shareId: string;
    visibility: "public" | "private";
  };
}

export interface PublicPortfolioSummary {
  shareId: string;
  visibility: "public" | "private";
  projectCount: number;
  matchCount: number;
  topTechnologies: PortfolioTechSummary[];
  skills: string[];
  user: {
    name: string;
    college: string | null;
    degree: string | null;
    graduationYear: number | null;
    preferredDomain: string | null;
    profilePhotoUrl: string | null;
  };
  updatedAt: string;
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
  share: () => ["/api/portfolio/share"] as const,
  generate: () => ["/api/portfolio/generate"] as const,
  sharePortfolio: (shareId: string) => ["/api/portfolio/share", shareId] as const,
  publicPortfolios: (skills: string[]) => ["/api/portfolio/public", skills.slice().sort().join(",")] as const,
  publicSkills: () => ["/api/portfolio/public/skills"] as const,
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

// ─── Portfolio Generation & Sharing Hooks ───────────────────────────────────

export function useGeneratePortfolio(options?: { query?: Partial<UseQueryOptions<GeneratedPortfolio>> }) {
  const apiFetch = useAuthedFetch();
  return useQuery<GeneratedPortfolio>({
    queryKey: portfolioKeys.generate(),
    queryFn: () => apiFetch<GeneratedPortfolio>("/api/portfolio/generate"),
    ...options?.query,
  });
}

export function useGetPortfolioShare(options?: { query?: Partial<UseQueryOptions<PortfolioShare | null>> }) {
  const apiFetch = useAuthedFetch();
  return useQuery<PortfolioShare | null>({
    queryKey: portfolioKeys.share(),
    queryFn: () => apiFetch<PortfolioShare | null>("/api/portfolio/share"),
    ...options?.query,
  });
}

export function useUpsertPortfolioShare() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<PortfolioShare, Error, { visibility: "public" | "private" }>({
    mutationKey: ["upsertPortfolioShare"],
    mutationFn: (body) =>
      apiFetch<PortfolioShare>("/api/portfolio/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.share() });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/public"], exact: false });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.publicSkills() });
    },
  });
}

export function useGetSharedPortfolio(shareId: string) {
  const publicFetch = usePublicFetch();
  return useQuery<GeneratedPortfolio>({
    queryKey: portfolioKeys.sharePortfolio(shareId),
    queryFn: () => publicFetch<GeneratedPortfolio>(`/api/portfolio/share/${shareId}`),
    enabled: !!shareId,
  });
}

export function useListPublicPortfolios(skills: string[]) {
  const publicFetch = usePublicFetch();
  const skillQuery = skills.length > 0 ? `?skills=${encodeURIComponent(skills.join(","))}` : "";
  return useQuery<PublicPortfolioSummary[]>({
    queryKey: portfolioKeys.publicPortfolios(skills),
    queryFn: () => publicFetch<PublicPortfolioSummary[]>(`/api/portfolio/public${skillQuery}`),
  });
}

export function useListPublicPortfolioSkills() {
  const publicFetch = usePublicFetch();
  return useQuery<string[]>({
    queryKey: portfolioKeys.publicSkills(),
    queryFn: () => publicFetch<string[]>("/api/portfolio/public/skills"),
  });
}
