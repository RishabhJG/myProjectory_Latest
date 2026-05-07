import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  RefreshCw,
  Plus,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Database,
  Clock,
  Shield,
  ExternalLink,
  BarChart3,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TechTrend {
  name: string;
  count: number;
  percentage: number;
}

interface StackCombo {
  stack: string;
  count: number;
}

interface TrendData {
  top_technologies: TechTrend[];
  top_stack_combinations: StackCombo[];
  all_technologies: TechTrend[];
  total_jobs_analyzed: number;
  analyzed_at: string;
}

interface ScrapeResult {
  scrape: {
    total: number;
    success: number;
    failed: number;
    results: { url: string; status: string; title?: string; stackCount?: number; error?: string }[];
  };
  trends: {
    top_technologies: TechTrend[];
    top_stack_combinations: StackCombo[];
    total_jobs_analyzed: number;
  };
}

interface JobSource {
  url: string;
  platform?: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const API_BASE = "/api";

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminScrapingPortal() {
  const { toast } = useToast();
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // ─── Load data on mount ──────────────────────────────────────────────────

  useEffect(() => {
    loadTrends();
    loadSources();
  }, []);

  async function loadTrends() {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/jobs/trending-stacks");
      if (res.ok) {
        const data = await res.json();
        setTrendData(data);
      }
    } catch (err) {
      console.error("Failed to load trends:", err);
      toast({
        title: "Error",
        description: "Failed to load trend data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSources() {
    setLoadingSources(true);
    try {
      const res = await fetchWithAuth("/jobs/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data.urls.map((url: string) => ({ url })));
      }
    } catch (err) {
      console.error("Failed to load sources:", err);
    } finally {
      setLoadingSources(false);
    }
  }

  // ─── Trigger Scrape ──────────────────────────────────────────────────────

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetchWithAuth("/jobs/scrape");
      if (res.ok) {
        const data = await res.json();
        setScrapeResult(data);
        await loadTrends();
        toast({
          title: "Success",
          description: `Scraped ${data.scrape.success} of ${data.scrape.total} sources`,
        });
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({
          title: "Scrape Failed",
          description: err.error || `Server returned ${res.status}`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Network Error",
        description: err.message || "Is the backend running?",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  }

  // ─── Add Source URL ──────────────────────────────────────────────────────

  async function handleAddUrl() {
    if (!newUrl.trim()) return;
    setAddingUrl(true);
    try {
      const res = await fetchWithAuth("/jobs/add-source", {
        method: "POST",
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setNewUrl("");
        await loadSources();
      } else {
        toast({
          title: "Error",
          description: data.error || data.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add URL",
        variant: "destructive",
      });
    } finally {
      setAddingUrl(false);
    }
  }

  // ─── Remove Source URL ───────────────────────────────────────────────────

  async function handleRemoveSource(urlToRemove: string) {
    // Note: The backend doesn't have a remove endpoint yet, 
    // but we can prepare the UI for when it's added
    toast({
      title: "Not Implemented",
      description: "Remove functionality requires backend update",
      variant: "destructive",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary animate-bounce" />
          </div>
          <div className="text-muted-foreground">Loading admin portal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Scraping Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage job data scraping, sources, and market intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {trendData?.total_jobs_analyzed || 0} jobs in database
          </span>
        </div>
      </div>

      {/* ─── Quick Actions Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scrape Jobs Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="glass rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-primary" />
                Run Scraper
              </CardTitle>
              <CardDescription>
                Scrape all configured job sources and update trend analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleScrape}
                disabled={scraping}
                className="w-full rounded-xl"
                size="lg"
              >
                {scraping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {scraping ? "Scraping..." : "Start Scraping Run"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass rounded-2xl border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Total Jobs Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{trendData?.total_jobs_analyzed || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {trendData?.analyzed_at 
                  ? new Date(trendData.analyzed_at).toLocaleString() 
                  : "Never"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tech Count Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass rounded-2xl border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Unique Technologies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{trendData?.all_technologies?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all scraped postings
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Manage Sources ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass rounded-2xl border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Manage Job Sources
              </CardTitle>
              <CardDescription>
                Add job posting URLs from Greenhouse, Lever, or any company career page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add URL Form */}
              <div className="flex gap-3">
                <Input
                  placeholder="https://boards.greenhouse.io/company/jobs/123"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  className="rounded-xl flex-1"
                />
                <Button
                  onClick={handleAddUrl}
                  disabled={addingUrl || !newUrl.trim()}
                  className="rounded-xl"
                >
                  {addingUrl ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add
                </Button>
              </div>

              {/* Source List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {loadingSources ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sources.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sources configured</p>
                  </div>
                ) : (
                  sources.map((source, i) => (
                    <motion.div
                      key={source.url}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{source.url}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/60 hover:text-destructive"
                        onClick={() => handleRemoveSource(source.url)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Top Stack Combinations ────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass rounded-2xl border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Tech Stack Combinations
              </CardTitle>
              <CardDescription>
                Most frequently appearing tech stacks in job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendData?.top_stack_combinations && trendData.top_stack_combinations.length > 0 ? (
                <div className="space-y-3">
                  {trendData.top_stack_combinations.map((combo, i) => (
                    <motion.div
                      key={combo.stack}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 justify-center">
                          #{i + 1}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {combo.stack.split(" + ").map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {combo.count} mentions
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No stack combinations found</p>
                  <p className="text-xs mt-1">Run the scraper to generate insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Scrape Results ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {scrapeResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="glass rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Latest Scrape Results
                </CardTitle>
                <CardDescription>
                  {scrapeResult.scrape.success} of {scrapeResult.scrape.total} URLs scraped successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                    <p className="text-2xl font-bold text-primary">{scrapeResult.scrape.total}</p>
                    <p className="text-xs text-muted-foreground">Total URLs</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                    <p className="text-2xl font-bold text-green-600">{scrapeResult.scrape.success}</p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                    <p className="text-2xl font-bold text-red-600">{scrapeResult.scrape.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {scrapeResult.scrape.results.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        result.status === "success"
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-red-500/20 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {result.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{result.title || result.url}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                          {result.error && (
                            <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                          )}
                        </div>
                      </div>
                      {result.stackCount !== undefined && (
                        <Badge variant="outline" className="shrink-0 ml-2">
                          {result.stackCount} techs
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Top Technologies Table ────────────────────────────────────────── */}
      {trendData?.all_technologies && trendData.all_technologies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                All Technologies ({trendData.all_technologies.length})
              </CardTitle>
              <CardDescription>
                Complete list of technologies found across all job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {trendData.all_technologies.map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/50"
                  >
                    <span className="text-sm font-medium truncate mr-2">{tech.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {tech.percentage}%
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
