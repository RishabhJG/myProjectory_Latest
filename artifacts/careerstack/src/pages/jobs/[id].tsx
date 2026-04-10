import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useJobDetail, useSaveJob } from "@/hooks/use-jobs-api";
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck,
  Calendar,
  Sparkles,
  Share2,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export default function JobDetailPage() {
  const [match, params] = useRoute("/jobs/:id");
  const [, setLocation] = useLocation();
  const jobId = params?.id ? parseInt(params.id) : 0;

  const { data: job, isLoading } = useJobDetail(jobId);
  const saveMutation = useSaveJob();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Job Not Found</h2>
        <p className="text-muted-foreground mt-2">The job listing you're looking for might have been removed.</p>
        <Button variant="outline" className="mt-6" onClick={() => setLocation("/jobs")}>
          Back to Careers
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    saveMutation.mutate(jobId, {
      onSuccess: (data) => {
        toast.success(data.saved ? "Job saved to your profile" : "Job removed from saved");
      }
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => setLocation("/jobs")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Jobs
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
                  {job.domain || "Full-time"}
                </Badge>
                {job.isActive && (
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-bold">
                    Active
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-foreground font-semibold">{job.company}</div>
                    <div className="text-xs">Direct Hirer</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-foreground font-semibold">{job.location}</div>
                    <div className="text-xs">Location</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="glass mt-8 border-border/40">
              <CardHeader>
                <CardTitle className="text-lg">Job Description</CardTitle>
              </CardHeader>
              <Separator className="mx-6 w-auto opacity-50" />
              <CardContent className="pt-6">
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {job.description || "No description provided."}
                </div>
                
                <div className="mt-10 space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Key Requirements & Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map(skill => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm bg-muted/50 border border-border/40 font-medium">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass sticky top-24 border-border/50">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Button 
                  className="w-full h-12 text-base font-bold gap-2" 
                  onClick={() => window.open(job.sourceUrl, "_blank")}
                >
                  Apply on Original Site
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 gap-2" 
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : job.isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-primary fill-primary" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Save Job
                    </>
                  )}
                </Button>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Posted At:
                  </span>
                  <span className="font-medium">{format(new Date(job.postedAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Source:
                  </span>
                  <span className="font-medium text-primary">Adzuna Sync</span>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground h-9 px-2 hover:bg-muted/30"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Job Listing
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary/70">Pro-Tip</h4>
              <p className="text-sm text-foreground/80 leading-snug">
                This job requires <strong>{job.requiredSkills.slice(0, 2).join(", ")}</strong>. 
                Make sure your portfolio projects showcase these skills for better visibility!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
