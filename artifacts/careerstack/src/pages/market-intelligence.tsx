import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Zap,
  Globe,
  Plus,
  RefreshCw,
  Trophy,
  BarChart3,
  Layers,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

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

// ─── API Helpers (direct fetch to avoid code-gen dependency) ────────────────

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

// ─── Chart Colors ───────────────────────────────────────────────────────────

const CHART_COLORS = [
  "hsl(250, 70%, 50%)",
  "hsl(25, 90%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 70%, 55%)",
  "hsl(45, 90%, 50%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(120, 50%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(180, 60%, 40%)",
];

// ─── Rank Medal Component ───────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  const colors = [
    "from-yellow-400 to-amber-500",
    "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-600",
  ];
  const emojis = ["🥇", "🥈", "🥉"];

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[rank] || "from-gray-300 to-gray-400"} flex items-center justify-center shadow-lg`}
    >
      <span className="text-lg">{emojis[rank] || `#${rank + 1}`}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MarketIntelligence() {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [addUrlMessage, setAddUrlMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // ─── Load trends on mount ──────────────────────────────────────────────

  useEffect(() => {
    loadTrends();
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
    } finally {
      setLoading(false);
    }
  }

  // ─── Trigger Scrape ────────────────────────────────────────────────────

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    setScrapeError(null);
    try {
      const res = await fetchWithAuth("/jobs/scrape");
      if (res.ok) {
        const data = await res.json();
        setScrapeResult(data);
        // Reload trends after scraping
        await loadTrends();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setScrapeError(err.error || `Server returned ${res.status}`);
      }
    } catch (err: any) {
      setScrapeError(err.message || "Network error — is the backend running?");
    } finally {
      setScraping(false);
    }
  }

  // ─── Add Source URL ────────────────────────────────────────────────────

  async function handleAddUrl() {
    if (!newUrl.trim()) return;
    setAddingUrl(true);
    setAddUrlMessage(null);
    try {
      const res = await fetchWithAuth("/jobs/add-source", {
        method: "POST",
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddUrlMessage({ type: "success", text: data.message });
        setNewUrl("");
      } else {
        setAddUrlMessage({ type: "error", text: data.error || data.message });
      }
    } catch (err) {
      setAddUrlMessage({ type: "error", text: "Failed to add URL" });
    } finally {
      setAddingUrl(false);
    }
  }

  // ─── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary animate-bounce" />
          </div>
          <div className="text-muted-foreground">Analyzing market trends...</div>
        </div>
      </div>
    );
  }

  const chartData = trendData?.all_technologies?.slice(0, 10) || [];
  const hasData = trendData && trendData.total_jobs_analyzed > 0;

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Job Market Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time tech stack trends scraped from job postings across the market.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleScrape}
            disabled={scraping}
            className="rounded-xl bg-primary hover:bg-primary/90"
          >
            {scraping ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {scraping ? "Scraping..." : "Run Scraper"}
          </Button>
        </div>
      </div>

      {/* ─── Scrape Error Alert ───────────────────────────────────── */}
      <AnimatePresence>
        {scrapeError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600">Scrape Failed</p>
              <p className="text-xs text-red-500/80 mt-0.5">{scrapeError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScrapeError(null)}
              className="text-red-500 hover:text-red-600 shrink-0"
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stats Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Jobs Analyzed</p>
                  <p className="text-3xl font-bold mt-1">{trendData?.total_jobs_analyzed || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Unique Technologies</p>
                  <p className="text-3xl font-bold mt-1">{trendData?.all_technologies?.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass rounded-2xl border-border/50 hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Stack Combos Found</p>
                  <p className="text-3xl font-bold mt-1">{trendData?.top_stack_combinations?.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Top 3 Trending Tech Stacks Hero Card ────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Top 3 Trending Tech Stacks in Market</CardTitle>
                <CardDescription className="mt-0.5">
                  Based on frequency analysis of {trendData?.total_jobs_analyzed || 0} scraped job postings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasData && trendData.top_stack_combinations.length > 0 ? (
              <div className="space-y-4 mt-2">
                {trendData.top_stack_combinations.slice(0, 3).map((combo, i) => (
                  <motion.div
                    key={combo.stack}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/60 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <RankMedal rank={i} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {combo.stack.split(" + ").map((tech, j) => (
                          <span key={j}>
                            {j > 0 && <span className="text-muted-foreground mx-1">+</span>}
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium px-3 py-1"
                            >
                              {tech}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-primary">{combo.count}</div>
                      <div className="text-xs text-muted-foreground">mentions</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : hasData && trendData.top_technologies.length > 0 ? (
              <div className="space-y-4 mt-2">
                {trendData.top_technologies.slice(0, 3).map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/60 border border-border/50 hover:border-primary/30 transition-all duration-300"
                  >
                    <RankMedal rank={i} />
                    <div className="flex-1">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium px-3 py-1"
                      >
                        {tech.name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{tech.count}</div>
                      <div className="text-xs text-muted-foreground">{tech.percentage}% share</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Globe className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No trend data yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Add job source URLs below and run the scraper to start analyzing market trends.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Two Column: Chart + Top Technologies ────────────────── */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="glass rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Technology Frequency Distribution
                </CardTitle>
                <CardDescription>Top 10 most in-demand technologies across all scraped postings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="hsl(var(--foreground))"
                        tick={{ fontSize: 12 }}
                        width={75}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${value} mentions (${props.payload.percentage}%)`,
                          "Frequency",
                        ]}
                      />
                      <Bar dataKey="count" name="Frequency" radius={[0, 8, 8, 0]}>
                        {chartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Technologies List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="glass rounded-2xl border-border/50 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5 text-green-500" />
                  Top Technologies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData?.all_technologies?.slice(0, 10).map((tech, i) => (
                    <motion.div
                      key={tech.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                          #{i + 1}
                        </span>
                        <span className="font-medium text-sm">{tech.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs tabular-nums">
                          {tech.count}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                          {tech.percentage}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ─── Add Source URL ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="glass rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Manage Job Sources
            </CardTitle>
            <CardDescription>
              Add job posting URLs from Greenhouse, Lever, or any company career page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                id="add-source-url"
                placeholder="https://boards.greenhouse.io/company/jobs/123"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                className="rounded-xl flex-1"
              />
              <Button
                onClick={handleAddUrl}
                disabled={addingUrl || !newUrl.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90"
              >
                {addingUrl ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Source
              </Button>
            </div>
            <AnimatePresence>
              {addUrlMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-3 flex items-center gap-2 text-sm ${
                    addUrlMessage.type === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {addUrlMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {addUrlMessage.text}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Scrape Results ──────────────────────────────────────── */}
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
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Latest Scrape Results
                </CardTitle>
                <CardDescription>
                  {scrapeResult.scrape.success} of {scrapeResult.scrape.total} URLs scraped successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
    </div>
  );
}
