import { db, analysisConfigTable } from "@workspace/db";

export interface ScoringWeights {
  projectsWeight: number;
  skillsWeight: number;
  certificationsWeight: number;
  trendAlignmentWeight: number;
  roadmapCompletionWeight: number;
  executionProgressWeight: number;
}

export async function getAnalysisWeights(): Promise<ScoringWeights> {
  const configs = await db.select().from(analysisConfigTable).limit(1);
  if (configs.length > 0) {
    return configs[0];
  }
  // Fallback defaults if DB is empty matching exactly S3.4 Weightage Configuration
  return {
    projectsWeight: 15,
    skillsWeight: 35,
    certificationsWeight: 0,
    trendAlignmentWeight: 25,
    roadmapCompletionWeight: 25,
    executionProgressWeight: 0,
  };
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
