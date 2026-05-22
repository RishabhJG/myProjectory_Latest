import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Github, Globe, Sparkles, Download, Loader2 } from "lucide-react";
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

  const topSkills = useMemo(() => {
    if (!portfolio?.techScores) return [];
    return portfolio.techScores;
  }, [portfolio]);

  const handleDownloadPdf = async () => {
    if (!portfolio) return;

    try {
      setIsGeneratingPdf(true);
      toast({
        title: "Generating PDF",
        description: "Building your portfolio PDF...",
      });

      // Use a small timeout to allow the toast to render before the synchronous PDF work
      await new Promise((r) => setTimeout(r, 100));

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // ── Helpers ──
      const setFont = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", style);
      };

      const checkPage = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const drawWrappedText = (text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", maxWidth: number = contentWidth) => {
        setFont(fontSize, style);
        const lines: string[] = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.45;
        for (const line of lines) {
          checkPage(lineHeight + 2);
          pdf.text(line, margin, y);
          y += lineHeight;
        }
      };

      const drawHr = () => {
        checkPage(6);
        y += 3;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      // ── Header: Name & Title ──
      setFont(24, "bold");
      pdf.setTextColor(30, 30, 60);
      pdf.text(portfolio.student.name, margin, y);
      y += 9;

      if (portfolio.title) {
        setFont(12, "normal");
        pdf.setTextColor(100, 100, 120);
        pdf.text(portfolio.title, margin, y);
        y += 6;
      }

      if (portfolio.bio) {
        y += 2;
        setFont(10, "normal");
        pdf.setTextColor(80, 80, 100);
        const bioLines: string[] = pdf.splitTextToSize(portfolio.bio, contentWidth);
        for (const line of bioLines) {
          checkPage(5);
          pdf.text(line, margin, y);
          y += 4.5;
        }
        y += 2;
      }

      if (portfolio.student.email) {
        setFont(9, "normal");
        pdf.setTextColor(70, 70, 180);
        pdf.text(portfolio.student.email, margin, y);
        y += 6;
      }

      // ── Skills Snapshot ──
      if (topSkills.length > 0) {
        drawHr();
        setFont(14, "bold");
        pdf.setTextColor(30, 30, 60);
        pdf.text("Skills Snapshot", margin, y);
        y += 7;

        setFont(10, "normal");
        pdf.setTextColor(50, 50, 70);
        const skillChips = topSkills.map((s) => `${s.technology} (${s.comfortScore})`);
        const skillText = skillChips.join("  •  ");
        const skillLines: string[] = pdf.splitTextToSize(skillText, contentWidth);
        for (const line of skillLines) {
          checkPage(5);
          pdf.text(line, margin, y);
          y += 5;
        }
        y += 3;
      }

      // ── Projects ──
      if (portfolio.projects.length > 0) {
        drawHr();
        setFont(14, "bold");
        pdf.setTextColor(30, 30, 60);
        pdf.text(`Projects (${portfolio.projects.length})`, margin, y);
        y += 8;

        portfolio.projects.forEach((project, idx) => {
          checkPage(20);

          // Project title
          setFont(12, "bold");
          pdf.setTextColor(40, 40, 70);
          pdf.text(`${idx + 1}. ${project.title}`, margin, y);
          y += 6;

          // Description
          if (project.description) {
            drawWrappedText(project.description, 9, "normal");
            y += 2;
          }

          // Technologies
          if (project.technologies.length > 0) {
            setFont(9, "bold");
            pdf.setTextColor(60, 60, 90);
            checkPage(5);
            pdf.text("Technologies: ", margin, y);
            const techLabelWidth = pdf.getTextWidth("Technologies: ");
            setFont(9, "normal");
            pdf.setTextColor(80, 80, 110);
            const techStr = project.technologies.join(", ");
            const techLines: string[] = pdf.splitTextToSize(techStr, contentWidth - techLabelWidth);
            pdf.text(techLines[0], margin + techLabelWidth, y);
            y += 4.5;
            for (let i = 1; i < techLines.length; i++) {
              checkPage(5);
              pdf.text(techLines[i], margin, y);
              y += 4.5;
            }
            y += 1;
          }

          // Links
          const links: string[] = [];
          if (project.githubLink) links.push(`GitHub: ${project.githubLink}`);
          if (project.liveLink) links.push(`Live: ${project.liveLink}`);
          if (links.length > 0) {
            setFont(8, "normal");
            pdf.setTextColor(70, 70, 180);
            for (const link of links) {
              checkPage(5);
              const linkLines: string[] = pdf.splitTextToSize(link, contentWidth);
              for (const ll of linkLines) {
                pdf.text(ll, margin, y);
                y += 4;
              }
            }
          }

          y += 5;
        });
      }

      // ── Footer on every page ──
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        setFont(7, "normal");
        pdf.setTextColor(160, 160, 170);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        pdf.text("Built with MyProjectory", margin, pageHeight - 8);
        pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 8, { align: "right" });
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
