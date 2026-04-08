import { useParams, Link } from "wouter";
import { useGetRoadmap, useToggleTask, getGetRoadmapQueryKey, getListRoadmapsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Circle, Clock, Milestone as MilestoneIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function RoadmapDetail() {
  const { id } = useParams();
  const roadmapId = parseInt(id!);
  const queryClient = useQueryClient();

  const { data: roadmap, isLoading } = useGetRoadmap(roadmapId, {
    query: { enabled: !!roadmapId, queryKey: getGetRoadmapQueryKey(roadmapId) }
  });

  const toggleMutation = useToggleTask();

  const handleToggle = async (taskId: number) => {
    try {
      // Optimistic update could go here
      await toggleMutation.mutateAsync({ roadmapId, taskId });
      queryClient.invalidateQueries({ queryKey: getGetRoadmapQueryKey(roadmapId) });
      queryClient.invalidateQueries({ queryKey: getListRoadmapsQueryKey() });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading roadmap...</div>
        </div>
      </div>
    );
  }

  if (!roadmap) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/roadmaps" className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{roadmap.technology} Roadmap</h1>
          <p className="text-muted-foreground">Step-by-step guide to mastery</p>
        </div>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {roadmap.milestones.map((milestone, index) => {
          const isCompleted = milestone.status === 'completed';
          const isInProgress = milestone.status === 'in_progress';
          const isNotStarted = milestone.status === 'not_started';

          return (
            <motion.div 
              key={milestone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              {/* Timeline dot */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-colors duration-300",
                isCompleted ? "bg-green-500" : isInProgress ? "bg-yellow-500" : "bg-muted"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : isInProgress ? (
                  <MilestoneIcon className="w-5 h-5 text-white" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Card */}
              <Card className={cn(
                "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass rounded-2xl border-border/50 transition-all duration-300",
                isCompleted ? "bg-green-500/5 border-green-500/20" : isInProgress ? "bg-yellow-500/5 border-yellow-500/20 ring-1 ring-yellow-500/20" : ""
              )}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight">{milestone.title}</CardTitle>
                    <Badge variant={isCompleted ? "default" : isInProgress ? "secondary" : "outline"} className={cn(
                      "shrink-0",
                      isCompleted ? "bg-green-500 hover:bg-green-600" : isInProgress ? "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30" : ""
                    )}>
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <CardDescription className="mt-2 text-sm">{milestone.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {milestone.estimatedDuration}</span>
                    <span className="px-2 py-0.5 rounded bg-muted/50 font-medium">Why: {milestone.industryRelevance}</span>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/50">
                    {milestone.tasks.map((task) => (
                      <div key={task.id} className="flex items-start space-x-3 group/task">
                        <Checkbox 
                          id={`task-${task.id}`} 
                          checked={task.completed}
                          onCheckedChange={() => handleToggle(task.id)}
                          className={cn(
                            "mt-0.5 transition-all data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                            !task.completed && "border-muted-foreground/50 group-hover/task:border-primary"
                          )}
                        />
                        <label 
                          htmlFor={`task-${task.id}`}
                          className={cn(
                            "text-sm leading-tight cursor-pointer select-none transition-colors",
                            task.completed ? "text-muted-foreground line-through" : "font-medium"
                          )}
                        >
                          {task.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
