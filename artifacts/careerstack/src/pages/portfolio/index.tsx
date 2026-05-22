import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  useGeneratePortfolio,
  useMyPortfolio,
  usePublishPortfolio,
  useUpdatePortfolio,
  useUpdatePortfolioProjects,
} from "@/hooks/use-portfolio-api";
import { ExternalLink, Github, Link as LinkIcon, RefreshCw, Sparkles, Star, Edit2 } from "lucide-react";

function buildTechSummary(technologies: string[]) {
  const counts = new Map<string, number>();
  for (const tech of technologies) {
    counts.set(tech, (counts.get(tech) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([tech]) => tech);
}

function formatDateRange(project: any) {
  if (!project.startDate) return "";
  
  const startDate = new Date(project.startDate);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  if (project.completionStatus === "completed" && project.endDate) {
    const endDate = new Date(project.endDate);
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }
  
  return `${startStr} - Present`;
}

function calculateDuration(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  
  if (months < 1) return "< 1 month";
  if (months === 1) return "1 month";
  return `${months} months`;
}

export default function Portfolio() {
  const { toast } = useToast();
  const { data: portfolio, isLoading, error } = useMyPortfolio();
  const generatePortfolio = useGeneratePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const updatePortfolioProjects = useUpdatePortfolioProjects();
  const publishPortfolio = usePublishPortfolio();

  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState<"public" | "private">("private");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [projects, setProjects] = useState(portfolio?.projects || []);

  useEffect(() => {
    if (!portfolio) return;
    setDraftTitle(portfolio.title);
    setDraftBio(portfolio.bio || "");
    setSelectedVisibility(portfolio.visibility);
    setProjects(portfolio.projects);
    if (portfolio.publishedAt) {
      if (portfolio.visibility === "public") {
        setShareLink(`${window.location.origin}/portfolio/${portfolio.slug}`);
      } else if (portfolio.shareToken) {
        setShareLink(`${window.location.origin}/portfolio/private/${portfolio.shareToken}`);
      }
    } else {
      setShareLink(null);
    }
  }, [portfolio]);

  const skillBadges = useMemo(() => {
    if (!portfolio) return [];
    const techs = portfolio.projects.flatMap((project) => project.technologies);
    return buildTechSummary(techs).slice(0, 8);
  }, [portfolio]);

  const statusLabel = portfolio?.publishedAt
    ? `Published - ${portfolio.visibility === "public" ? "Public" : "Private"}`
    : "Draft";

  const handleGenerate = async () => {
    try {
      await generatePortfolio.mutateAsync();
      toast({ title: "Portfolio synced", description: "Your portfolio now reflects your latest projects." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSaveIdentity = async () => {
    if (!portfolio) return;
    try {
      await updatePortfolio.mutateAsync({
        id: portfolio.id,
        data: { title: draftTitle, bio: draftBio },
      });
      setEditMode(false);
      toast({ title: "Portfolio updated", description: "Your title and bio have been saved." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const persistProjectUpdates = async (nextProjects: typeof projects) => {
    if (!portfolio) return;
    setProjects(nextProjects);
    try {
      await updatePortfolioProjects.mutateAsync({
        id: portfolio.id,
        projects: nextProjects.map((project, index) => ({
          projectId: project.id,
          displayOrder: index + 1,
          isFeatured: project.isFeatured,
        })),
      });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const toggleFeatured = (index: number) => {
    const next = projects.map((project, idx) => idx === index ? { ...project, isFeatured: !project.isFeatured } : project);
    persistProjectUpdates(next);
  };

  // Sort projects by date (newest first)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate) : new Date(a.createdAt || 0);
      const bDate = b.startDate ? new Date(b.startDate) : new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "planning":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  };

  const handlePublish = async () => {
    if (!portfolio) return;
    try {
      const result = await publishPortfolio.mutateAsync({ id: portfolio.id, visibility: selectedVisibility });
      const relativeLink = selectedVisibility === "public" ? result.portfolioUrl : result.shareLink;
      setShareLink(relativeLink ? `${window.location.origin}${relativeLink}` : null);
      toast({ title: "Portfolio published", description: "Your visibility settings are live." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copied", description: "Share it anywhere." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Unable to load portfolio.</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-16 text-center space-y-4">
          <h2 className="text-2xl font-semibold">Generate your portfolio</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pull in your projects and build a shareable portfolio in seconds. You can customize the details and decide how you want to publish.
          </p>
          <Button onClick={handleGenerate} disabled={generatePortfolio.isPending}>
            {generatePortfolio.isPending ? "Generating..." : "Generate Portfolio"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Portfolio & Share</h1>
          <p className="text-muted-foreground mt-1">Curate, publish, and share your best work.</p>
        </div>
        <Button variant="outline" onClick={handleGenerate} disabled={generatePortfolio.isPending} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${generatePortfolio.isPending ? "animate-spin" : ""}`} />
          Regenerate Portfolio
        </Button>
      </div>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={portfolio.avatarUrl || portfolio.student.avatarUrl || ""} />
              <AvatarFallback>{portfolio.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{portfolio.student.name}</CardTitle>
              <CardDescription className="text-sm">{portfolio.student.email}</CardDescription>
            </div>
          </div>
          <Badge variant={portfolio.publishedAt ? "default" : "secondary"}>{statusLabel}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Portfolio Preview</h2>
              <Button variant="outline" size="sm" onClick={() => setEditMode((prev) => !prev)}>
                {editMode ? "Cancel" : "Edit Bio / Title"}
              </Button>
            </div>
            {editMode ? (
              <div className="space-y-3">
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Portfolio title" />
                <Textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} placeholder="Short bio" />
                <Button onClick={handleSaveIdentity} disabled={updatePortfolio.isPending}>
                  Save Identity
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">{portfolio.title}</p>
                <p className="text-sm text-muted-foreground">{portfolio.bio || "Add a bio to introduce yourself."}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {skillBadges.length === 0 ? (
              <span className="text-sm text-muted-foreground">Skills will appear after you add tech to projects.</span>
            ) : (
              skillBadges.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Projects in Portfolio</CardTitle>
            <CardDescription>Reorder or feature projects for the spotlight.</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/portfolio/new">Add Project</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-muted-foreground text-sm">No projects yet. Add one to start building your portfolio.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project, index) => {
                const originalIndex = projects.findIndex(p => p.id === project.id);
                return (
                  <Card key={project.id} className="border-border/50 overflow-hidden flex flex-col">
                    {project.screenshotUrl && (
                      <div className="w-full h-40 bg-muted overflow-hidden">
                        <img 
                          src={project.screenshotUrl} 
                          alt={project.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader className="space-y-3 relative">
                      <Link href={`/portfolio/${project.id}`} className="absolute top-6 right-6 inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <div>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{project.description || "No description provided."}</CardDescription>
                      </div>
                      {project.startDate && (
                        <div className="text-sm text-muted-foreground pt-2 space-y-1">
                          <div>{formatDateRange(project)}</div>
                          {project.completionStatus === "completed" && project.endDate && (
                            <div>Duration: {calculateDuration(project.startDate, project.endDate)}</div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(project.completionStatus)}>
                          {formatStatus(project.completionStatus)}
                        </Badge>
                        {project.category && (
                          <Badge variant="outline">{project.category}</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => toggleFeatured(originalIndex)}>
                          <Star className={`w-4 h-4 mr-2 ${project.isFeatured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                          {project.isFeatured ? "Featured" : "Feature"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="outline">{tech}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.githubLink && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <a href={project.githubLink} target="_blank" rel="noreferrer">
                              <Github className="w-4 h-4" /> GitHub
                            </a>
                          </Button>
                        )}
                        {project.liveLink && (
                          <Button asChild variant="secondary" size="sm" className="gap-2">
                            <a href={project.liveLink} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4" /> Live
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Publish Your Portfolio</CardTitle>
              <CardDescription>Choose how your portfolio is shared with the world.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedVisibility("public")}
              className={`p-4 rounded-2xl border text-left transition-colors ${selectedVisibility === "public" ? "border-primary bg-primary/5" : "border-border/50"}`}
            >
              <h3 className="font-semibold mb-1">🌐 Make it Public</h3>
              <p className="text-sm text-muted-foreground">Your portfolio will appear in the Student Portfolios tab, sorted by your tech scores.</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedVisibility("private")}
              className={`p-4 rounded-2xl border text-left transition-colors ${selectedVisibility === "private" ? "border-primary bg-primary/5" : "border-border/50"}`}
            >
              <h3 className="font-semibold mb-1">🔗 Share Privately</h3>
              <p className="text-sm text-muted-foreground">Only people with your unique link can view it.</p>
            </button>
          </div>

          <Button onClick={handlePublish} disabled={publishPortfolio.isPending} className="w-full md:w-auto">
            {portfolio.publishedAt ? "Update Visibility" : "Publish"}
          </Button>

          {shareLink && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="w-4 h-4 text-primary" />
                <span className="break-all">{shareLink}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyLink}>Copy Link</Button>
                <Button variant="outline" onClick={() => window.open(shareLink, "_blank")}>Open Link</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
