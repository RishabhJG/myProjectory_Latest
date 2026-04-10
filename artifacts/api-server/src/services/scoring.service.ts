import { eq } from "drizzle-orm";
import { db, analysisConfigTable, userScoreWeightsTable } from "@workspace/db";

export interface ScoringWeights {
  projectsWeight: number;
  skillsWeight: number;
  certificationsWeight: number;
  trendAlignmentWeight: number;
  roadmapCompletionWeight: number;
  executionProgressWeight: number;
}

// Default fallback weights if nothing is configured
const DEFAULT_WEIGHTS: ScoringWeights = {
  projectsWeight: 15,
  skillsWeight: 35,
  certificationsWeight: 0,
  trendAlignmentWeight: 25,
  roadmapCompletionWeight: 25,
  executionProgressWeight: 0,
};

// Map dimension names (from user_score_weights table) to ScoringWeights keys
const DIMENSION_KEY_MAP: Record<string, keyof ScoringWeights> = {
  projects: "projectsWeight",
  skills: "skillsWeight",
  certifications: "certificationsWeight",
  trendAlignment: "trendAlignmentWeight",
  roadmapCompletion: "roadmapCompletionWeight",
  executionProgress: "executionProgressWeight",
};

/**
 * Get per-user scoring weights from user_score_weights table (S3.4).
 * Falls back to analysis_config table, then to hardcoded defaults.
 */
export async function getUserScoringWeights(userId: number): Promise<ScoringWeights> {
  // 1. Try per-user weights first (S3.4)
  const userWeights = await db
    .select()
    .from(userScoreWeightsTable)
    .where(eq(userScoreWeightsTable.userId, userId));

  if (userWeights.length > 0) {
    const weights: ScoringWeights = { ...DEFAULT_WEIGHTS };
    for (const row of userWeights) {
      const key = DIMENSION_KEY_MAP[row.dimension];
      if (key) {
        weights[key] = row.weight;
      }
    }
    return weights;
  }

  // 2. Fallback to global analysis_config
  return getAnalysisWeights();
}

/**
 * Get global analysis weights from the analysis_config table.
 * This is the original function, preserved for backward compatibility.
 */
export async function getAnalysisWeights(): Promise<ScoringWeights> {
  const configs = await db.select().from(analysisConfigTable).limit(1);
  if (configs.length > 0) {
    return configs[0];
  }
  // Fallback defaults if DB is empty matching exactly S3.4 Weightage Configuration
  return { ...DEFAULT_WEIGHTS };
}

export function calculateReadinessScore(
  comfortScore: number, 
  marketDemandScore: number, 
  roadmapScore: number, 
  portfolioScore: number,
  weights: ScoringWeights
): number {
  const sumWeights = weights.projectsWeight + weights.skillsWeight + weights.certificationsWeight + weights.trendAlignmentWeight + weights.roadmapCompletionWeight + weights.executionProgressWeight;
  const normalizedFactor = sumWeights > 0 ? 100 / sumWeights : 1;

  // We map the backend components to the dynamically configured weights
  const score = (
    (portfolioScore * weights.projectsWeight) +
    (comfortScore * weights.skillsWeight) +
    (marketDemandScore * weights.trendAlignmentWeight) +
    (roadmapScore * weights.roadmapCompletionWeight)
  ) / 100;

  return Math.round(score * normalizedFactor);
}
