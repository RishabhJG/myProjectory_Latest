import { useGetTechComfortScores, useGetMarketDemandScores, useGetJobReadinessScore } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Scores() {
  const { data: comfortScores, isLoading: loadingComfort } = useGetTechComfortScores();
  const { data: demandScores, isLoading: loadingDemand } = useGetMarketDemandScores();
  const { data: readiness, isLoading: loadingReadiness } = useGetJobReadinessScore();

  const isLoading = loadingComfort || loadingDemand || loadingReadiness;

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
                  {comfortScores?.slice(0, 5).map((score) => (
                    <div key={score.technology}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium flex items-center">
                          {score.technology}
                          {score.confidenceLevel === 'high' && <Zap className="w-3 h-3 text-yellow-500 ml-1.5" />}
                        </span>
                        <span className="text-muted-foreground">{score.comfortScore}%</span>
                      </div>
                      <Progress value={score.comfortScore} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle>Market Demand Trends</CardTitle>
          <CardDescription>How your skills align with current job postings</CardDescription>
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
