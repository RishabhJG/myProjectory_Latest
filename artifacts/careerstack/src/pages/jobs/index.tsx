import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useListJobs, type ListJobsParams } from "@/hooks/use-jobs-api";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  Filter, 
  X,
  Building2,
  Clock,
  Sparkles,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function JobsPage() {
  const searchString = useSearch();
  const [_, setLocation] = useLocation();
  
  // URL Param Sync
  const params = new URLSearchParams(searchString);
  const [filters, setFilters] = useState<ListJobsParams>({
    domain: params.get("domain") || undefined,
    location: params.get("location") || undefined,
    skills: params.get("skills") || undefined,
    daysOld: params.get("daysOld") ? parseInt(params.get("daysOld")!) : undefined,
    page: params.get("page") ? parseInt(params.get("page")!) : 1,
  });

  const { data, isLoading } = useListJobs(filters);

  const updateURL = (newFilters: ListJobsParams) => {
    const sp = new URLSearchParams();
    if (newFilters.domain) sp.set("domain", newFilters.domain);
    if (newFilters.location) sp.set("location", newFilters.location);
    if (newFilters.skills) sp.set("skills", newFilters.skills);
    if (newFilters.daysOld) sp.set("daysOld", newFilters.daysOld.toString());
    if (newFilters.page && newFilters.page > 1) sp.set("page", newFilters.page.toString());
    
    const newSearch = sp.toString();
    if (newSearch !== searchString) {
      setLocation(`/jobs?${newSearch}`);
    }
  };

  const handleFilterChange = (key: keyof ListJobsParams, value: any) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    updateURL(next);
  };

  const clearFilters = () => {
    const next = { page: 1 };
    setFilters(next);
    setLocation("/jobs");
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Opportunities</h1>
          <p className="text-muted-foreground mt-1">Discover market roles optimized for your technology stack.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass sticky top-24 border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs font-normal">
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain</label>
                <Select 
                  value={filters.domain || "all"} 
                  onValueChange={(val) => handleFilterChange("domain", val === "all" ? undefined : val)}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="All Domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                    <SelectItem value="Data Science">Data Science</SelectItem>
                    <SelectItem value="Product Management">Product Management</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Remote, City..." 
                    className="pl-9 bg-background/50"
                    value={filters.location || ""}
                    onChange={(e) => handleFilterChange("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Key Skills</label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="React, Java..." 
                    className="pl-9 bg-background/50"
                    value={filters.skills || ""}
                    onChange={(e) => handleFilterChange("skills", e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Separate with commas</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Posted</label>
                <Select 
                  value={filters.daysOld?.toString() || "all"} 
                  onValueChange={(val) => handleFilterChange("daysOld", val === "all" ? undefined : parseInt(val))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Anytime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anytime</SelectItem>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="3">Last 3 days</SelectItem>
                    <SelectItem value="7">Last week</SelectItem>
                    <SelectItem value="30">Last month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {data?.jobs && (
              <span>Showing {data.jobs.length} relevant positions</span>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Real-time market sync</span>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Syncing latest market opportunities...</p>
              </div>
            ) : data?.jobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No matches found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>Reset All Filters</Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {data?.jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/jobs/${job.id}`}>
                      <Card className="group glass-card border-border/40 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
                                  {job.domain || "Engineering"}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4" />
                                  {job.company}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {job.requiredSkills.slice(0, 5).map(skill => (
                                  <Badge key={skill} variant="outline" className="bg-background/50 border-border/50 text-[11px] font-medium py-0 px-2">
                                    {skill}
                                  </Badge>
                                ))}
                                {job.requiredSkills.length > 5 && (
                                  <span className="text-[10px] text-muted-foreground font-medium flex items-center">
                                    +{job.requiredSkills.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-border group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Pagination Placeholder */}
          {data?.jobs && data.jobs.length >= 10 && (
            <div className="flex justify-center pt-8">
              <Button 
                variant="outline" 
                onClick={() => handleFilterChange("page", (filters.page || 1) + 1)}
                className="gap-2"
              >
                Load More
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
