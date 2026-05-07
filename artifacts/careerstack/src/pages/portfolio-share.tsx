import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, CalendarDays, ExternalLink, Github, Globe } from "lucide-react";
import { format } from "date-fns";
import { useGetSharedPortfolio } from "@/hooks/use-portfolio-api";

export default function PortfolioSharePage() {
  const params = useParams();
  const shareId = params.shareId || "";
  const { data: portfolio, isLoading } = useGetSharedPortfolio(shareId);

  const shareTitle = useMemo(() => {
    if (!portfolio) return "Shared Portfolio";
    return `${portfolio.user.name}'s Portfolio`;
  }, [portfolio]);

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

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Portfolio not found</h2>
          <p className="text-muted-foreground mt-2">This share link may have expired or is invalid.</p>
          <Link href="/student-portfolios">
            <Button className="mt-4" variant="secondary">
              Browse Public Portfolios
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/student-portfolios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{shareTitle}</h1>
            <p className="text-muted-foreground">
              {portfolio.user.college || portfolio.user.degree || "Student portfolio"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="uppercase">
          {portfolio.share?.visibility || "private"}
        </Badge>
      </div>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Tech Stack Proficiency</CardTitle>
          <CardDescription>Overall strengths based on completed projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio.techStackSummary.length === 0 ? (
            <div className="text-sm text-muted-foreground">No completed projects yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {portfolio.techStackSummary.map((tech) => (
                <Badge key={tech.name} variant="secondary">
                  {tech.name} · {tech.projectCount}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Skills</CardTitle>
            <CardDescription>Declared proficiencies.</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio.skills.length === 0 ? (
              <div className="text-sm text-muted-foreground">No skills added yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {portfolio.skills.map((skill) => (
                  <Badge key={skill.name} variant="outline" className="bg-background/50">
                    {skill.name} · {skill.proficiencyLevel}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Highlights</CardTitle>
            <CardDescription>Completed project count and update info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-primary" />
              {portfolio.projects.length} completed projects
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-primary" />
              Generated on {format(new Date(portfolio.generatedAt), "MMM d, yyyy")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Completed projects with skills and tech stack.</p>
        </div>

        {portfolio.projects.length === 0 ? (
          <Card className="glass rounded-2xl border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">No completed projects yet.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {portfolio.projects.map((project) => (
              <Card key={project.id} className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                  <CardDescription>
                    Completed {format(new Date(project.completionDate), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {project.description || project.problemSolved || "No description provided."}
                  </p>
                  {project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech) => (
                        <Badge key={tech} variant="outline" className="bg-background/50">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {project.githubLink && (
                      <a href={project.githubLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Github className="w-4 h-4" /> Code
                      </a>
                    )}
                    {project.liveLink && (
                      <a href={project.liveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Globe className="w-4 h-4" /> Live
                      </a>
                    )}
                    {project.screenshotUrl && (
                      <a href={project.screenshotUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-4 h-4" /> Media
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
