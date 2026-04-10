import { useState, useEffect } from "react";
import { 
  useGetTechComfortScores, 
  useGetMarketDemandScores, 
  useGetJobReadinessScore,
  useGetStrengths,
  useGetTrendAlignment
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Zap, AlertCircle, BarChart3, Globe2, CheckCircle, XCircle, Loader2, Info, Sparkles, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  useGetWeights,
  useStrengthBreakdown,
  useMarketAlignment,
  type WeightEntry,
} from "@/hooks/use-analysis-api";

// ─── Dynamic Weighting Information ───────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  trendAlignment: "Trend Alignment",
  roadmapCompletion: "Roadmap Completion",
};

const DIMENSION_COLORS: Record<string, string> = {
  projects: "bg-blue-500",
  skills: "bg-emerald-500",
  certifications: "bg-amber-500",
  trendAlignment: "bg-purple-500",
  roadmapCompletion: "bg-cyan-500",
};

function DynamicWeightingInfo() {
  const { data: weightsData, isLoading } = useGetWeights();
  const [showExplanation, setShowExplanation] = useState(false);

  if (isLoading) {
    return (
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const weights = weightsData?.weights || [];
  const maxWeight = Math.max(...weights.map(w => w.weight));
  const primaryFocus = weights.find(w => w.weight === maxWeight)?.dimension || "skills";

  return (
    <Card className="glass rounded-2xl border-border/50 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Portfolio Weighting</CardTitle>
              <CardDescription>Automatically optimized based on your activity</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 gap-1.5 px-3">
            <Sparkles className="w-3.5 h-3.5" />
            {primaryFocus === 'projects' ? 'Project-First' : primaryFocus === 'skills' ? 'Skill-Focused' : 'Balanced'} Profile
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          {weights.map((w, i) => (
            <div key={w.dimension} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-wider">{DIMENSION_LABELS[w.dimension] || w.dimension}</span>
                <span>{w.weight}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${DIMENSION_COLORS[w.dimension] || "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${w.weight}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/40">
          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <Info className="w-4 h-4" />
            How are these weights calculated?
          </button>
          
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 text-sm space-y-3">
                  <p>Our <strong>Dynamic Scoring Engine</strong> automatically adjusts the importance of each category based on the depth of your portfolio:</p>
                  <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                    <li>As you complete more <strong>Projects</strong>, the system increases their weight to reflect your practical experience.</li>
                    <li>Higher proficiency in <strong>Technical Skills</strong> establishes a stronger baseline for your readiness.</li>
                    <li><strong>Industry Certifications</strong> provide an additional boost by verifying your expertise.</li>
                    <li>Common market standards (Trend Alignment & Progress) remain at a stable 25% each.</li>
                  </ul>
                  <p className="text-xs italic pt-2 border-t border-border/20">Manual configuration is disabled to ensure your score remains benchmarked against industry-validated standards.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── S3.6: Strength Breakdown ─────────────────────────────────────────────────

const DIMENSION_BAR_COLORS: Record<string, string> = {
  projects: "bg-blue-500",
  skills: "bg-emerald-500",
  certifications: "bg-amber-500",
  trendAlignment: "bg-purple-500",
  roadmapCompletion: "bg-cyan-500",
};

function StrengthBreakdownSection() {
  const { data, isLoading } = useStrengthBreakdown();

  if (isLoading) {
    return (
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.dimensions.length === 0) {
    return null;
  }

  return (
    <Card className="glass rounded-2xl border-border/50 h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Strength Breakdown</CardTitle>
            <CardDescription>Your performance across calibrated readiness metrics</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.dimensions.map((dim, i) => {
          const weightedScore = Math.round((dim.score * dim.weight) / 100);
          return (
            <motion.div
              key={dim.dimension}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${DIMENSION_BAR_COLORS[dim.dimension] || "bg-gray-500"}`} />
                  <span className="font-medium">{dim.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{dim.score}% raw</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-primary/5 border-primary/10">
                    +{weightedScore} pts
                  </Badge>
                </div>
              </div>
              <div className="relative w-full h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`absolute left-0 top-0 h-full rounded-full ${DIMENSION_BAR_COLORS[dim.dimension] || "bg-gray-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dim.score}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}

        {/* Insight */}
        {data.insight && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm mt-4">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground leading-relaxed">{data.insight}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── S3.8: Market Alignment ──────────────────────────────────────────────────

function MarketAlignmentSection() {
  const { data, isLoading } = useMarketAlignment();

  if (isLoading) {
    return (
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Graceful degradation for missing trend data
  if (!data.trendDataAvailable) {
    return (
      <Card className="glass rounded-2xl border-border/50 border-amber-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Globe2 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Market Alignment</CardTitle>
              <CardDescription>Trend data loading, check back soon</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Market trend data is not yet populated. Once the trend engine processes job listings, your alignment score will appear here.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matchColor = data.matchPercentage >= 60 ? "text-emerald-600" : data.matchPercentage >= 30 ? "text-amber-600" : "text-red-500";

  return (
    <Card className="glass rounded-2xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Globe2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Market Alignment</CardTitle>
              <CardDescription>Your skills vs. top trending technologies</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${matchColor}`}>{data.matchPercentage}%</div>
            <div className="text-xs text-muted-foreground">match</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match progress */}
        <div className="relative w-full h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${data.matchPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Matched skills */}
          {data.userMatchedSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Skills You Have ({data.userMatchedSkills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.userMatchedSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skill gaps */}
          {data.skillGaps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Skill Gaps ({data.skillGaps.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.skillGaps.map((gap) => (
                  <Badge key={gap.skill} variant="outline" className="bg-red-500/5 text-red-500 border-red-500/20 text-xs">
                    {gap.skill}
                    <span className="ml-1 opacity-60">({gap.demandCount})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Scores Page ─────────────────────────────────────────────────────────

export default function Scores() {
  const { data: comfortScores, isLoading: loadingComfort } = useGetTechComfortScores();
  const { data: demandScores, isLoading: loadingDemand } = useGetMarketDemandScores();
  const { data: readiness, isLoading: loadingReadiness } = useGetJobReadinessScore();
  const { data: strengthsMap, isLoading: loadingStrengths } = useGetStrengths();
  const { data: trendAlignment, isLoading: loadingTrend } = useGetTrendAlignment();

  const isLoading = loadingComfort || loadingDemand || loadingReadiness || loadingStrengths || loadingTrend;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Calculating scores...</div>
        </div>
      </div>
    );
  }

  // Prepare radar chart data
  const radarData = comfortScores?.slice(0, 6).map(score => ({
    subject: score.technology,
    A: score.comfortScore,
    fullMark: 100,
  })) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scores & Readiness</h1>
          <p className="text-muted-foreground mt-1">Data-driven insights into your career preparation.</p>
        </div>
      </div>

      {readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass rounded-2xl border-border/50 lg:col-span-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Overall Readiness</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <motion.circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (283 * readiness.overallScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{readiness.overallScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              
              <Badge variant={
                readiness.readinessStatus === 'job_ready' ? 'default' :
                readiness.readinessStatus === 'interview_ready' ? 'secondary' :
                'outline'
              } className="text-sm px-4 py-1 mb-6">
                {readiness.readinessStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Badge>

              <div className="w-full space-y-4 mt-auto">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Portfolio Strength</span>
                    <span className="font-medium">{readiness.portfolioComponent}/100</span>
                  </div>
                  <Progress value={readiness.portfolioComponent} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Skill Match</span>
                    <span className="font-medium">{readiness.comfortComponent}/100</span>
                  </div>
                  <Progress value={readiness.comfortComponent} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Market Demand Alignment</span>
                    <span className="font-medium">{readiness.marketDemandComponent}/100</span>
                  </div>
                  <Progress value={readiness.marketDemandComponent} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Skill Profile</CardTitle>
              <CardDescription>Your strongest technologies based on portfolio usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Comfort" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-4 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm border-b pb-1">Top Strength Skills</h3>
                    {strengthsMap && strengthsMap.confidenceLevel !== 'low' && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="w-3 h-3 text-yellow-500 mr-1" />
                        {strengthsMap.confidenceLevel.toUpperCase()} CONFIDENCE
                      </Badge>
                    )}
                  </div>
                  {strengthsMap?.strengths.slice(0, 5).map((skill) => {
                    const scoreObj = comfortScores?.find(s => s.technology === skill) || { comfortScore: 80 };
                    return (
                      <div key={skill}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{skill}</span>
                          <span className="text-muted-foreground">{scoreObj.comfortScore}%</span>
                        </div>
                        <Progress value={scoreObj.comfortScore} className="h-2" />
                      </div>
                    );
                  })}
                  
                  {strengthsMap && strengthsMap.strongDomains.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-sm border-b pb-1 mb-3">Strongest Domains</h3>
                      <div className="flex flex-wrap gap-2">
                        {strengthsMap.strongDomains.map(domain => (
                          <Badge key={domain} variant="secondary">{domain}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* S3.6: Strength Breakdown + Dynamic Weighting Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrengthBreakdownSection />
        <DynamicWeightingInfo />
      </div>

      {/* S3.8: Market Alignment */}
      <MarketAlignmentSection />

      {readiness?.suggestions && readiness.suggestions.length > 0 && (
        <Card className="glass rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 text-primary mr-2" />
              Action Plan to Improve
            </h3>
            <ul className="space-y-3">
              {readiness.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 shrink-0" />
                  <span className="text-foreground leading-relaxed">{suggestion}</span>
                </li>
              ))}
              {trendAlignment && trendAlignment.missingHighDemandSkills.length > 0 && (
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 mr-3 shrink-0" />
                  <span className="text-foreground leading-relaxed">
                    <strong>Trend Gap:</strong> Consider building projects with {trendAlignment.missingHighDemandSkills.slice(0, 3).join(", ")} to align with current market demands.
                  </span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Market Demand Trends</CardTitle>
              <CardDescription>How your skills align with current job postings</CardDescription>
            </div>
            {trendAlignment && (
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{trendAlignment.matchPercentage}%</div>
                <div className="text-xs text-muted-foreground">Market Alignment</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demandScores?.map((score, i) => (
              <motion.div 
                key={score.technology}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-border/50 bg-background/50 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold">{score.technology}</h4>
                  <Badge variant={score.trendDirection === 'rising' ? 'default' : 'secondary'} className={score.trendDirection === 'rising' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
                    {score.trendDirection === 'rising' && <TrendingUp className="w-3 h-3 mr-1" />}
                    {score.trendDirection}
                  </Badge>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Demand Score</span>
                    <span>{score.demandScore}/100</span>
                  </div>
                  <Progress value={score.demandScore} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-3">
                    {score.totalJobs.toLocaleString()} open roles
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
