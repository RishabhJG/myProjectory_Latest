import { useListRoadmaps, useGenerateRoadmap, getListRoadmapsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Map, Plus, ArrowRight, Loader2, Sparkles, Compass, Info, Layers,
  CheckCircle, TrendingUp, Zap, BookOpen, Trophy, FlameKindling, Trash2,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TechTrend {
  name: string;
  count: number;
  percentage: number;
}

interface TrendData {
  top_technologies: TechTrend[];
  top_stack_combinations: { stack: string; count: number }[];
  all_technologies: TechTrend[];
  total_jobs_analyzed: number;
  analyzed_at: string;
}

// ─── Trend data fetch (same source as Market Intel tab) ──────────────────────

async function fetchTrendingStacks(): Promise<TrendData | null> {
  try {
    const res = await fetch("/api/jobs/trending-stacks", {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function useTrendingStacks() {
  return useQuery<TrendData | null>({
    queryKey: ["/api/jobs/trending-stacks"],
    queryFn: fetchTrendingStacks,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Rank Medal ──────────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  const gradients = [
    "from-yellow-400 to-amber-500",
    "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-600",
  ];
  const emojis = ["🥇", "🥈", "🥉"];
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradients[rank] ?? "from-primary/40 to-primary/60"} flex items-center justify-center shadow-md text-base shrink-0`}>
      {emojis[rank] ?? `#${rank + 1}`}
    </div>
  );
}

// ─── Stack descriptions ───────────────────────────────────────────────────────

const STACK_DESCRIPTIONS: Record<string, string> = {
  python: "Python is the most versatile language for data science, AI/ML, automation, and backend development. High demand across industries.",
  react: "React is the dominant frontend framework with the largest job market. Essential for modern web development roles.",
  javascript: "JavaScript is the language of the web — required for both frontend and full-stack development positions.",
  "react native": "Build cross-platform mobile apps with React knowledge. Growing demand in mobile development roles.",
  "system design": "System design skills are critical for senior engineering interviews and architecture roles.",
  devops: "DevOps practices (CI/CD, containers, cloud) are increasingly required in all engineering roles.",
  typescript: "TypeScript adds type-safety to JavaScript and is now expected in most professional codebases.",
  "node.js": "Node.js enables full-stack JavaScript development — a popular choice for startups and enterprise alike.",
  "machine learning": "Machine learning skills are among the most sought-after in the tech industry today.",
  sql: "SQL is fundamental for data access and manipulation across virtually every industry.",
  docker: "Docker and containerization are essential skills for DevOps and cloud-native development.",
  kubernetes: "Kubernetes orchestration skills are highly prized for cloud infrastructure roles.",
  aws: "AWS is the leading cloud platform — proficiency is required in most modern backend and DevOps roles.",
};

function getStackDescription(techName: string): string {
  return STACK_DESCRIPTIONS[techName.toLowerCase()] ?? `Master ${techName} with a structured, industry-aligned learning path.`;
}

// ─── Trending Roadmap Card ────────────────────────────────────────────────────

function TrendingRoadmapCard({
  tech,
  rank,
  count,
  percentage,
  existingRoadmapId,
  onGenerate,
  isGenerating,
}: {
  tech: string;
  rank: number;
  count: number;
  percentage: number;
  existingRoadmapId?: number;
  onGenerate: (tech: string) => void;
  isGenerating: boolean;
}) {
  const RANK_COLORS = [
    "border-yellow-400/40 bg-yellow-400/5",
    "border-slate-300/40 bg-slate-300/5",
    "border-orange-400/40 bg-orange-400/5",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
    >
      <Card className={`glass rounded-2xl border ${RANK_COLORS[rank] ?? "border-primary/20"} hover-elevate h-full flex flex-col`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <RankMedal rank={rank} />
              <div>
                <CardTitle className="text-lg leading-tight">{tech}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  #{rank + 1} trending in market
                </CardDescription>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-primary">{percentage}%</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {getStackDescription(tech)}
          </p>
        </CardContent>
        <CardFooter className="pt-0 border-t border-border/50 bg-muted/20 px-5 py-3">
          {existingRoadmapId ? (
            <Button variant="outline" size="sm" className="w-full rounded-xl gap-2 opacity-80" disabled>
              <CheckCircle className="w-3.5 h-3.5" />
              Already There
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full rounded-xl gap-2"
              onClick={() => onGenerate(tech)}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              ADD TO MY ROADMAP
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Roadmaps() {
  const { data: roadmaps, isLoading: roadmapsLoading } = useListRoadmaps();
  const { data: trendData, isLoading: trendsLoading } = useTrendingStacks();
  const generateMutation = useGenerateRoadmap();
  const [tech, setTech] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteRoadmap = async (id: number, techName: string) => {
    if (!confirm(`Are you sure you want to delete the roadmap for "${techName}"? This will remove all your progress for this stack.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/roadmaps/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete roadmap");
      toast({ title: "Roadmap Deleted", description: `Removed learning path for ${techName}.` });
      queryClient.invalidateQueries({ queryKey: getListRoadmapsQueryKey() });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete roadmap.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTech, setPendingTech] = useState("");

  const isLoading = roadmapsLoading || trendsLoading;

  // Get top 3 trending skills (individual technologies, same as Market Intel)
  const trendingSkills: TechTrend[] = trendData?.top_technologies?.slice(0, 3) ?? [];

  // Build a map of technology (lowercase) → roadmap id for existing user roadmaps
  const roadmapByTech: Record<string, number> = {};
  roadmaps?.forEach((rm) => {
    roadmapByTech[rm.technology.toLowerCase()] = rm.id;
  });

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tech.trim()) return;
    if (roadmapByTech[tech.trim().toLowerCase()]) {
      toast({ title: "Already There", description: `You already have a roadmap for ${tech.trim()}.`, variant: "default" });
      return;
    }
    setPendingTech(tech.trim());
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    setShowConfirm(false);
    try {
      await generateMutation.mutateAsync({ data: { technology: pendingTech } });
      toast({ title: "Roadmap Generated!", description: `Your ${pendingTech} roadmap is ready.` });
      queryClient.invalidateQueries({ queryKey: getListRoadmapsQueryKey() });
      setTech("");
      setPendingTech("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate roadmap.", variant: "destructive" });
    }
  };

  const handleTrendingGenerate = (techName: string) => {
    if (roadmapByTech[techName.toLowerCase()]) {
      toast({ title: "Already There", description: `You already have a roadmap for ${techName}.`, variant: "default" });
      return;
    }
    setPendingTech(techName);
    setShowConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading roadmaps...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Roadmaps</h1>
          <p className="text-muted-foreground mt-1">AI-generated paths to master the skills employers want.</p>
        </div>
      </div>

      {/* ─── Generate Card ──────────────────────────────────────────── */}
      <Card className="glass rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="py-8 px-6 md:px-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2 flex items-center">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              Generate a New Roadmap
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Tell us what you want to learn, and we'll create a step-by-step curriculum tailored to industry standards.
            </p>
            <form onSubmit={handleSubmitForm} className="flex gap-3 max-w-md">
              <Input
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                placeholder="e.g. React Native, System Design, DevOps..."
                className="glass rounded-xl h-12"
              />
              <Button
                type="submit"
                className="rounded-xl h-12 px-6"
                disabled={!tech.trim() || generateMutation.isPending}
              >
                {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
              </Button>
            </form>
          </div>
          <div className="hidden md:flex w-32 h-32 rounded-full bg-primary/10 items-center justify-center shrink-0">
            <Compass className="w-16 h-16 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* ─── Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Confirm Stack Selection
            </DialogTitle>
            <DialogDescription>
              You're about to generate a learning roadmap for:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <h3 className="text-lg font-bold text-primary">{pendingTech}</h3>
              <p className="text-sm text-muted-foreground mt-1">{getStackDescription(pendingTech)}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This will create a structured roadmap with milestones and tasks tailored to this technology. You can track your progress as you learn.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirm & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Section 1: Trending Skills ──────────────────────────────── */}
      <div className="space-y-4" id="trending-roadmaps">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400/20 to-yellow-400/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Trending Roadmaps
              <Badge variant="outline" className="text-xs font-normal text-orange-500 border-orange-400/40 bg-orange-400/5">
                From Market Intel
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Top 3 most in-demand skills in current job postings</p>
          </div>
        </div>

        {trendingSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {trendingSkills.map((trend, i) => (
              <TrendingRoadmapCard
                key={trend.name}
                tech={trend.name}
                rank={i}
                count={trend.count}
                percentage={trend.percentage}
                existingRoadmapId={roadmapByTech[trend.name.toLowerCase()]}
                onGenerate={handleTrendingGenerate}
                isGenerating={generateMutation.isPending && pendingTech === trend.name}
              />
            ))}
          </div>
        ) : (
          <Card className="glass rounded-2xl border-border/50">
            <CardContent className="py-10 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No trending data yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Market intelligence data will appear here once the admin runs the scraper.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Section 1.5: New Roadmaps ───────────────────────────────── */}
      <div className="space-y-4" id="new-roadmaps">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400/20 to-cyan-400/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              New Roadmaps
              <Badge variant="outline" className="text-xs font-normal text-blue-500 border-blue-400/40 bg-blue-400/5">
                Just Added
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Emerging technologies and new learning paths</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { name: "Agentic AI", percentage: 98 },
            { name: "Web3 & Blockchain", percentage: 85 },
            { name: "Quantum Computing", percentage: 72 }
          ].map((trend, i) => (
            <TrendingRoadmapCard
              key={trend.name}
              tech={trend.name}
              rank={i}
              count={0}
              percentage={trend.percentage}
              existingRoadmapId={roadmapByTech[trend.name.toLowerCase()]}
              onGenerate={handleTrendingGenerate}
              isGenerating={generateMutation.isPending && pendingTech === trend.name}
            />
          ))}
        </div>
      </div>

      {/* ─── Section 2: My Roadmaps ──────────────────────────────────── */}
      <div className="space-y-4" id="my-roadmaps">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Map className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">My Roadmaps</h2>
            <p className="text-sm text-muted-foreground">Your personally generated learning paths</p>
          </div>
        </div>

        <TooltipProvider>
          {roadmaps && roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roadmaps.map((roadmap, i) => (
                <motion.div
                  key={roadmap.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full flex flex-col glass rounded-2xl border-border/50 hover-elevate transition-all cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-lg">
                          {roadmap.technology.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                                <Info className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px] text-sm">
                              <p className="font-semibold mb-1">Why {roadmap.technology}?</p>
                              <p className="text-xs">{getStackDescription(roadmap.technology)}</p>
                            </TooltipContent>
                          </Tooltip>

                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoadmap(roadmap.id, roadmap.technology);
                            }}
                            disabled={deletingId === roadmap.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            {deletingId === roadmap.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Link href={`/stacks/${roadmap.id}`}>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors cursor-pointer">
                          {roadmap.technology}
                        </CardTitle>
                      </Link>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                        <span>{roadmap.completedMilestones} of {roadmap.totalMilestones} milestones</span>
                        <span className="font-medium text-foreground">{roadmap.progressPercent}%</span>
                      </div>
                      <Progress value={roadmap.progressPercent} className="h-2" />
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 flex justify-between text-xs text-muted-foreground">
                      <span>Started {formatDistanceToNow(new Date(roadmap.createdAt), { addSuffix: true })}</span>
                      <div className="flex items-center gap-2">
                        <Link href={`/stacks/${roadmap.id}`} className="flex items-center gap-1 text-primary hover:underline font-medium">
                          <Layers className="w-3.5 h-3.5" />
                          Stack Detail
                        </Link>
                        <Link href={`/roadmaps/${roadmap.id}`}>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="glass rounded-2xl border-border/50">
              <CardContent className="py-14 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Compass className="w-7 h-7 text-primary/50" />
                </div>
                <p className="text-muted-foreground font-medium">No roadmaps yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-6">
                  You haven't selected any roadmaps. Please select one from the Trending or New Roadmaps sections above to get started.
                </p>
                <Button 
                  onClick={() => document.getElementById("trending-roadmaps")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-xl px-6"
                >
                  Select a Roadmap
                </Button>
              </CardContent>
            </Card>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
