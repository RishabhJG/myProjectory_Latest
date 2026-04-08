import { useListProjects, useDeleteProject } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Github, Globe, ExternalLink, Trash2, Edit2, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Portfolio() {
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading portfolio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Showcase your best work and technical depth.</p>
        </div>
        <Link href="/portfolio/new" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-xl px-6">
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="glass rounded-2xl border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your portfolio is the strongest signal to employers. Add your first project to start building your profile and readiness score.
            </p>
            <Link href="/portfolio/new" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-xl px-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full flex flex-col glass rounded-2xl border-border/50 hover-elevate overflow-hidden">
                {project.screenshotUrl ? (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img src={project.screenshotUrl} alt={project.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <Briefcase className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                
                <CardHeader className="flex-1 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-1" title={project.title}>
                      {project.title}
                    </CardTitle>
                    <Badge variant={project.completionStatus === 'completed' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {project.completionStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.technologies.slice(0, 3).map(tech => (
                      <Badge key={tech} variant="outline" className="bg-background/50">{tech}</Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Badge variant="outline" className="bg-background/50">+{project.technologies.length - 3}</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    {project.githubLink && (
                      <a href={project.githubLink} target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground transition-colors">
                        <Github className="w-4 h-4 mr-1.5" /> Code
                      </a>
                    )}
                    {project.liveLink && (
                      <a href={project.liveLink} target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground transition-colors">
                        <Globe className="w-4 h-4 mr-1.5" /> Live
                      </a>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-0 border-t border-border/50 bg-muted/20 flex justify-between p-4">
                  <span className="text-xs text-muted-foreground">
                    Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/portfolio/${project.id}`} className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
