import { useGetDashboardSummary, useGetRecentActivity, useGetSkillGaps } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Target, Map, Zap, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: gaps, isLoading: loadingGaps } = useGetSkillGaps();

  if (loadingSummary || loadingActivity || loadingGaps) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your career mission control.</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Job Readiness</CardTitle>
              <Target className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.readinessScore}%</div>
              <Progress value={summary.readinessScore} className="h-2 mt-3" />
            </CardContent>
          </Card>
          
          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Projects</CardTitle>
              <Briefcase className="w-4 h-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.completedProjects} <span className="text-lg text-muted-foreground font-normal">/ {summary.totalProjects}</span></div>
              <p className="text-xs text-muted-foreground mt-1">Completed projects</p>
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Roadmap Progress</CardTitle>
              <Map className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.roadmapProgress}%</div>
              <Progress value={summary.roadmapProgress} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Strongest Tech</CardTitle>
              <Zap className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{summary.strongestTech || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Based on portfolio & skills</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass rounded-2xl border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle>Skill Gaps</CardTitle>
            <p className="text-sm text-muted-foreground">Areas to improve for your target roles</p>
          </CardHeader>
          <CardContent>
            {gaps && gaps.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gaps} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="technology" type="category" stroke="hsl(var(--foreground))" tick={{fontSize: 12}} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="currentScore" name="Current Score" stackId="a" fill="hsl(var(--primary))" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="gap" name="Gap to Required" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No skill gaps identified yet. Add more target roles to generate insights.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.map((item, i) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 relative"
                  >
                    {i !== activity.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-border/50" />
                    )}
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10">
                      {item.type.includes('complete') ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      ) : item.type.includes('project') ? (
                        <Briefcase className="w-3.5 h-3.5 text-secondary" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                        {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent activity. Start building your portfolio!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
