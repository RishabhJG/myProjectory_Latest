import { useListRoadmaps, useGenerateRoadmap, getListRoadmapsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Map, Plus, ArrowRight, Loader2, Sparkles, Compass } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Roadmaps() {
  const { data: roadmaps, isLoading } = useListRoadmaps();
  const generateMutation = useGenerateRoadmap();
  const [tech, setTech] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tech.trim()) return;

    try {
      const res = await generateMutation.mutateAsync({ data: { technology: tech.trim() } });
      toast({ title: "Success", description: "Roadmap generated successfully!" });
      queryClient.invalidateQueries({ queryKey: getListRoadmapsQueryKey() });
      setTech("");
      // Uncomment to auto-navigate:
      // setLocation(`/roadmaps/${res.id}`);
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
            <form onSubmit={handleGenerate} className="flex gap-3 max-w-md">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps?.map((roadmap, i) => (
          <motion.div
            key={roadmap.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={`/roadmaps/${roadmap.id}`}>
              <Card className="h-full flex flex-col glass rounded-2xl border-border/50 hover-elevate transition-all cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-lg">
                    {roadmap.technology.charAt(0).toUpperCase()}
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {roadmap.technology}
                  </CardTitle>
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
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </CardFooter>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
      
      {roadmaps?.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>You haven't generated any roadmaps yet.</p>
        </div>
      )}
    </div>
  );
}
