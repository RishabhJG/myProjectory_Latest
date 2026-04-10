import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Map, CheckCircle2, Clock, Layers, ExternalLink, ListChecks, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStackDetail } from "@/hooks/use-stack-api";

export default function StackDetail() {
  const { id } = useParams();
  const stackId = parseInt(id!);
  const { data: stack, isLoading } = useStackDetail(stackId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading stack details...</div>
        </div>
      </div>
    );
  }

  if (!stack) return <div className="text-center py-20 text-muted-foreground">Stack not found</div>;

  const statusColor = (status: string) => {
    if (status === "completed") return "bg-green-500";
    if (status === "in_progress") return "bg-yellow-500";
    return "bg-muted";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/roadmaps" className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {stack.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{stack.name}</h1>
              <p className="text-muted-foreground">{stack.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* S5.7: Progress Tracker */}
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Stack Progress</h3>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {stack.completedTasks} of {stack.totalTasks} tasks complete
              </Badge>
              <span className="text-2xl font-bold text-primary">{stack.progressPercent}%</span>
            </div>
          </div>
          <div className="relative w-full h-4 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${stack.progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Started {new Date(stack.createdAt).toLocaleDateString()}</span>
            <span>{stack.milestones.length} milestones</span>
          </div>
        </CardContent>
      </Card>

      {/* Stack Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technologies */}
        <Card className="glass rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Technologies & Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stack.technologies.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-sm">{tech}</Badge>
              ))}
              {stack.linkedDomain?.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-sm bg-primary/5">{skill}</Badge>
              ))}
              {stack.technologies.length === 1 && !stack.linkedDomain && (
                <span className="text-xs text-muted-foreground">This stack focuses on {stack.technologies[0]}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* S5.11: View Roadmap + Domain Linkage */}
        <Card className="glass rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Associated Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stack.linkedDomain && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Linked Domain</span>
                <p className="text-sm font-medium">{stack.linkedDomain.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stack.linkedDomain.description}</p>
              </div>
            )}
            <Link href={`/roadmaps/${stack.roadmapId}`}>
              <Button className="w-full" variant="default">
                <Map className="w-4 h-4 mr-2" />
                View Roadmap
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress List */}
      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Milestone Progress</CardTitle>
          <CardDescription>Track your progress through each phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stack.milestones.map((ms, i) => (
            <motion.div
              key={ms.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-4 rounded-xl border transition-all",
                ms.status === "completed" ? "bg-green-500/5 border-green-500/20" :
                ms.status === "in_progress" ? "bg-yellow-500/5 border-yellow-500/20" :
                "bg-muted/20 border-border/40"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    statusColor(ms.status)
                  )}>
                    {ms.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-white">{i + 1}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{ms.title}</h4>
                    {ms.description && <p className="text-xs text-muted-foreground mt-0.5">{ms.description}</p>}
                  </div>
                </div>
                <Badge variant={ms.status === "completed" ? "default" : ms.status === "in_progress" ? "secondary" : "outline"} className="shrink-0 text-xs">
                  {ms.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 ml-11">
                <div className="flex-1">
                  <Progress value={ms.totalTasks > 0 ? (ms.completedTasks / ms.totalTasks) * 100 : 0} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {ms.completedTasks}/{ms.totalTasks} tasks
                </span>
                <span className="text-xs text-muted-foreground flex items-center shrink-0">
                  <Clock className="w-3 h-3 mr-0.5" />{ms.estimatedDuration}
                </span>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
