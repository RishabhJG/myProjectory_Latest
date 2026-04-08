import { useListJobs, useGetJobMatches } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Briefcase, ExternalLink, Sparkles, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function Jobs() {
  const { data: jobMatches, isLoading: loadingMatches } = useGetJobMatches();
  const { data: jobs, isLoading: loadingJobs } = useListJobs();

  const isLoading = loadingMatches || loadingJobs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Finding the best roles for you...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Matches</h1>
          <p className="text-muted-foreground mt-1">Roles scored against your portfolio and skills.</p>
        </div>
      </div>

      {jobMatches && jobMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Sparkles className="w-5 h-5 text-primary mr-2" />
            Top Matches For You
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobMatches.map((match, i) => (
              <motion.div
                key={match.job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full flex flex-col glass rounded-2xl border-primary/20 bg-primary/5 hover-elevate overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold text-primary">{match.matchScore}%</span>
                      <span className="text-xs text-muted-foreground font-medium">Match</span>
                    </div>
                  </div>
                  <CardHeader className="pb-2 pr-24">
                    <CardTitle className="text-xl">{match.job.title}</CardTitle>
                    <div className="flex items-center text-muted-foreground mt-1 gap-4 text-sm">
                      <span className="flex items-center"><Building className="w-4 h-4 mr-1.5" />{match.job.company}</span>
                      {match.job.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" />{match.job.location}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <div className="space-y-4 mt-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Matching Skills ({match.matchingSkills.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.matchingSkills.map(skill => (
                            <Badge key={skill} variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      {match.missingSkills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Missing Skills ({match.missingSkills.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.missingSkills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-muted-foreground opacity-70">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 bg-background/40 p-4 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Posted {formatDistanceToNow(new Date(match.job.postedAt), { addSuffix: true })}
                    </div>
                    {match.job.applyLink && (
                      <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90" asChild>
                        <a href={match.job.applyLink} target="_blank" rel="noreferrer">
                          Apply Now <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">All Open Roles</h2>
        <div className="grid grid-cols-1 gap-4">
          {jobs?.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass rounded-xl border-border/50 hover-elevate p-5">
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{job.title}</h3>
                    <div className="flex flex-wrap items-center text-muted-foreground mt-1.5 gap-y-1 gap-x-4 text-sm">
                      <span className="flex items-center"><Building className="w-4 h-4 mr-1.5" />{job.company}</span>
                      {job.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" />{job.location}</span>}
                      {job.experience && <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1.5" />{job.experience}</span>}
                      <span className="flex items-center text-xs opacity-70"><Clock className="w-3 h-3 mr-1" />{formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.requiredSkills.slice(0, 5).map(skill => (
                        <Badge key={skill} variant="outline" className="bg-background/50 font-normal">{skill}</Badge>
                      ))}
                      {job.requiredSkills.length > 5 && (
                        <span className="text-xs text-muted-foreground self-center ml-1">+{job.requiredSkills.length - 5} more</span>
                      )}
                    </div>
                  </div>
                  {job.applyLink && (
                    <div className="shrink-0 self-start md:self-center">
                      <Button variant="outline" className="rounded-xl glass" asChild>
                        <a href={job.applyLink} target="_blank" rel="noreferrer">
                          View Role <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
