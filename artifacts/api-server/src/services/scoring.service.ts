import { eq, and, count } from "drizzle-orm";
import { 
  db, 
  analysisConfigTable, 
  userScoreWeightsTable,
  projectsTable,
  userSkillsTable,
  userCertificationsTable
} from "../lib/db/index.js";

export interface ScoringWeights {
  projectsWeight: number;
  skillsWeight: number;
  certificationsWeight: number;
  trendAlignmentWeight: number;
  roadmapCompletionWeight: number;
  executionProgressWeight: number;
}

// Default fallback weights if nothing is calculated
const DEFAULT_WEIGHTS: ScoringWeights = {
  projectsWeight: 15,
  skillsWeight: 35,
  certificationsWeight: 0,
  trendAlignmentWeight: 25,
  roadmapCompletionWeight: 25,
  executionProgressWeight: 0,
};

/**
 * Automatically calculates scoring weights based on user portfolio content.
 * Balanced approach: 50% fixed market/roadmap, 50% dynamic portfolio.
 */
export async function calculateDynamicWeights(userId: number): Promise<ScoringWeights> {
  // 1. Get counts for Projects, Skills, and Certifications
  const [projectCount] = await db
    .select({ val: count() })
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  
  const [skillCount] = await db
    .select({ val: count() })
    .from(userSkillsTable)
    .where(eq(userSkillsTable.userId, userId));

  const [certCount] = await db
    .select({ val: count() })
    .from(userCertificationsTable)
    .where(eq(userCertificationsTable.userId, userId));

  const p = projectCount?.val || 0;
  const s = skillCount?.val || 0;
  const c = certCount?.val || 0;

  // 2. Base distribution for Portfolio (50% total)
  // Baseline: Projects (15), Skills (35), Certs (0)
  let projW = 15;
  let skillW = 35;
  let certW = 0;

  // 3. Dynamic Adjustments
  
  // Certifications take weight from Skills/Projects if present (max 15%)
  if (c > 0) {
    certW = Math.min(15, c * 5);
    // Take from skills mostly, then projects
    const takeFromSkills = Math.min(skillW - 10, Math.ceil(certW * 0.7));
    skillW -= takeFromSkills;
    projW -= (certW - takeFromSkills);
  }

  // Volume balance: If user is heavily focused on projects, shift more weight there
  if (p > 2 && p > s) {
    // Project-heavy profile
    const shift = Math.min(10, (p - s) * 2);
    if (skillW > 15) {
      skillW -= shift;
      projW += shift;
    }
  } else if (s > 10 && s > p * 3) {
    // Skill-heavy profile
    const shift = Math.min(5, (s / 5));
    if (projW > 10) {
      projW -= shift;
      skillW += shift;
    }
  }

  return {
    projectsWeight: projW,
    skillsWeight: skillW,
    certificationsWeight: certW,
    trendAlignmentWeight: 25, // Fixed market anchor
    roadmapCompletionWeight: 25, // Fixed progress anchor
    executionProgressWeight: 0,
  };
}

/**
 * Get per-user scoring weights.
 * Now defaults to dynamic portfolio-driven calculation.
 */
export async function getUserScoringWeights(userId: number): Promise<ScoringWeights> {
  // The system now automatically adjusts based on portfolio content
  return calculateDynamicWeights(userId);
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
