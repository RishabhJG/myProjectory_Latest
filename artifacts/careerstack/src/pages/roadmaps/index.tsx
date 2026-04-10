import { useListRoadmaps, useGenerateRoadmap, getListRoadmapsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Map, Plus, ArrowRight, Loader2, Sparkles, Compass, Info, Layers, CheckCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Roadmaps() {
  const { data: roadmaps, isLoading } = useListRoadmaps();
  const generateMutation = useGenerateRoadmap();
  const [tech, setTech] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // S5.3: Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTech, setPendingTech] = useState("");

  // S5.3: "Why this stack?" descriptions for known technologies
  const STACK_DESCRIPTIONS: Record<string, string> = {
    python: "Python is the most versatile language for data science, AI/ML, automation, and backend development. High demand across industries.",
    react: "React is the dominant frontend framework with the largest job market. Essential for modern web development roles.",
    javascript: "JavaScript is the language of the web — required for both frontend and full-stack development positions.",
    "react native": "Build cross-platform mobile apps with React knowledge. Growing demand in mobile development roles.",
    "system design": "System design skills are critical for senior engineering interviews and architecture roles.",
    devops: "DevOps practices (CI/CD, containers, cloud) are increasingly required in all engineering roles.",
    typescript: "TypeScript adds type-safety to JavaScript and is now expected in most professional codebases.",
    "node.js": "Node.js enables full-stack JavaScript development — a popular choice for startups and enterprise alike.",
  };

  const getStackDescription = (techName: string): string => {
    return STACK_DESCRIPTIONS[techName.toLowerCase()] || `Master ${techName} with a structured, industry-aligned learning path.`;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tech.trim()) return;
    // S5.3: Show confirmation before generating
    setPendingTech(tech.trim());
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    setShowConfirm(false);
    try {
      await generateMutation.mutateAsync({ data: { technology: pendingTech } });
      toast({ title: "Success", description: "Roadmap generated successfully!" });
      queryClient.invalidateQueries({ queryKey: getListRoadmapsQueryKey() });
      setTech("");
      setPendingTech("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate roadmap.", variant: "destructive" });
    }
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Roadmaps</h1>
          <p className="text-muted-foreground mt-1">AI-generated paths to master the skills employers want.</p>
        </div>
      </div>

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

      {/* S5.3: Confirmation Dialog */}
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

      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmaps?.map((roadmap, i) => (
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
                    {/* S5.3: "Why this stack?" tooltip */}
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
                    {/* S5.2: Stack Detail link */}
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
      </TooltipProvider>
      
      {roadmaps?.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>You haven't generated any roadmaps yet.</p>
        </div>
      )}
    </div>
  );
}
