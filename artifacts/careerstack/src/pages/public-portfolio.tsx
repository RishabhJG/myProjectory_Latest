import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Github, Globe, Sparkles, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { usePublicPortfolioBySlug, usePublicPortfolioByToken } from "@/hooks/use-portfolio-api";

interface PublicPortfolioPageProps {
  mode: "slug" | "token";
}

function setMetaTag(key: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export default function PublicPortfolioPage({ mode }: PublicPortfolioPageProps) {
  const params = useParams();
  const slug = mode === "slug" ? params?.slug : undefined;
  const token = mode === "token" ? params?.token : undefined;

  const slugQuery = usePublicPortfolioBySlug(slug || "", {
    query: { enabled: mode === "slug" && !!slug },
  });
  const tokenQuery = usePublicPortfolioByToken(token || "", {
    query: { enabled: mode === "token" && !!token },
  });
  const portfolio = mode === "slug" ? slugQuery.data : tokenQuery.data;
  const isLoading = mode === "slug" ? slugQuery.isLoading : tokenQuery.isLoading;
  const error = mode === "slug" ? slugQuery.error : tokenQuery.error;

  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("portfolio-content");
    if (!element || !portfolio) return;

    try {
      setIsGeneratingPdf(true);
      toast({
        title: "Generating PDF",
        description: "Capturing your portfolio... This may take a few seconds.",
      });
      
      let canvas;
      try {
        // Try with CORS enabled first to get high-quality images
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: document.documentElement.classList.contains("dark") ? "#020817" : "#ffffff", 
        });
      } catch (corsErr) {
        console.warn("PDF generation with CORS failed, retrying without CORS...", corsErr);
        // Fallback to disabling CORS to avoid tained canvas / loading crashes
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: false,
          logging: false,
          backgroundColor: document.documentElement.classList.contains("dark") ? "#020817" : "#ffffff", 
        });
      }

      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${portfolio.student.name.replace(/\s+/g, "_")}_Portfolio.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Success",
        description: "Your portfolio PDF has been downloaded successfully.",
      });
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast({
        title: "Export Failed",
        description: "Could not export PDF. You can also print the page directly using Ctrl + P.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!portfolio) return;
    document.title = `${portfolio.student.name} - Portfolio`;

    if (mode === "token") {
      setMetaTag("robots", "noindex,nofollow");
      return;
    }

    setMetaTag("og:title", `${portfolio.student.name} - Portfolio`, "property");
    setMetaTag("og:description", portfolio.bio || "Student portfolio", "property");
    if (portfolio.avatarUrl) {
      setMetaTag("og:image", portfolio.avatarUrl, "property");
    }
  }, [mode, portfolio]);

  useEffect(() => {
    if (mode !== "token") return;
    setMetaTag("robots", "noindex,nofollow");
    return () => {
      const meta = document.querySelector("meta[name=\"robots\"]");
      if (meta) meta.remove();
    };
  }, [mode]);

  const topSkills = useMemo(() => {
    if (!portfolio?.techScores) return [];
    return portfolio.techScores;
  }, [portfolio]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse text-muted-foreground">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Portfolio not found</h1>
          <p className="text-sm text-muted-foreground">This portfolio may be private or unavailable.</p>
          {mode === "slug" && (
            <Link href="/student-portfolios" className="text-primary underline">Browse Student Portfolios</Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Actions Header - Excluded from PDF */}
        <div className="flex justify-between items-center mb-10" data-html2canvas-ignore="true">
          {mode === "slug" ? (
            <Link href="/student-portfolios" className="text-sm text-primary hover:underline">← Back to Portfolios</Link>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="gap-2">
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isGeneratingPdf ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* PDF Content Wrapper */}
        <div id="portfolio-content" className="space-y-12 p-4 sm:p-8 -m-4 sm:-m-8 rounded-xl bg-background">
          <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={portfolio.avatarUrl || portfolio.student.avatarUrl || ""} alt={portfolio.student.name} />
                <AvatarFallback>{portfolio.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{portfolio.student.name}</h1>
                <p className="text-sm text-muted-foreground">{portfolio.title}</p>
              </div>
            </div>
            <p className="text-base text-muted-foreground max-w-2xl">{portfolio.bio || "A focused builder showcasing their best work and tech growth."}</p>
            {portfolio.student.email && (
              <a className="text-sm text-primary hover:underline" href={`mailto:${portfolio.student.email}`}>
                {portfolio.student.email}
              </a>
            )}
          </div>
          <Card className="glass rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-4 h-4 text-primary" />
                Skills Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tech stacks added yet.</p>
              ) : (
                topSkills.map((score) => (
                  <Badge key={score.technology} variant="secondary" className="px-3 py-1">
                    {score.technology} - {score.comfortScore}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Projects</h2>
          {portfolio.projects.length === 0 ? (
            <Card className="glass rounded-2xl border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                No projects have been added to this portfolio yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.projects.map((project) => (
                <Card key={project.id} className="glass rounded-2xl border-border/50 overflow-hidden">
                  {project.screenshotUrl ? (
                    <div className="h-40 w-full bg-muted overflow-hidden">
                      <img src={project.screenshotUrl} alt={project.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-primary/40" />
                    </div>
                  )}
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "No description provided."}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
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
              ))}
            </div>
          )}
        </section>

          <footer className="text-sm text-muted-foreground text-center py-6">
            Built with MyProjectory
          </footer>
        </div>
      </div>
    </div>
  );
}
