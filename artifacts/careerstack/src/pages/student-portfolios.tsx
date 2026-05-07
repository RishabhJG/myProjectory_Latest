import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, UserRound, Sparkles, Filter, X } from "lucide-react";
import { motion } from "framer-motion";
import { useListPublicPortfolios, useListPublicPortfolioSkills } from "@/hooks/use-portfolio-api";

export default function StudentPortfolios() {
  const { data: skills, isLoading: loadingSkills } = useListPublicPortfolioSkills();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillToAdd, setSkillToAdd] = useState("");

  const { data: portfolios, isLoading: loadingPortfolios } = useListPublicPortfolios(selectedSkills);

  const availableSkills = useMemo(() => {
    const skillSet = new Set((skills || []).map((skill) => skill.trim()).filter(Boolean));
    selectedSkills.forEach((skill) => skillSet.delete(skill));
    return Array.from(skillSet).sort((a, b) => a.localeCompare(b));
  }, [skills, selectedSkills]);

  const addSkillFilter = () => {
    if (!skillToAdd || selectedSkills.includes(skillToAdd)) return;
    setSelectedSkills((prev) => [...prev, skillToAdd]);
    setSkillToAdd("");
  };

  const removeSkillFilter = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((item) => item !== skill));
  };

  const isLoading = loadingSkills || loadingPortfolios;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Portfolios</h1>
          <p className="text-muted-foreground mt-1">Explore public portfolios and filter by required skills.</p>
        </div>
      </div>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Filter by Skills</CardTitle>
              <CardDescription>Select multiple skills to rank matching portfolios.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Select value={skillToAdd} onValueChange={setSkillToAdd} disabled={availableSkills.length === 0}>
              <SelectTrigger className="glass md:w-[240px]">
                <SelectValue placeholder={loadingSkills ? "Loading skills..." : "Select skill"} />
              </SelectTrigger>
              <SelectContent>
                {availableSkills.length === 0 ? (
                  <SelectItem value="none" disabled>No skills available</SelectItem>
                ) : (
                  availableSkills.map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addSkillFilter} disabled={!skillToAdd}>
              Add Filter
            </Button>
            <Input
              value={selectedSkills.join(", ")}
              readOnly
              className="glass flex-1"
              placeholder="Selected skills"
            />
          </div>
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1.5">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkillFilter(skill)}
                    className="rounded-full hover:bg-muted px-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
            <div className="text-muted-foreground">Loading portfolios...</div>
          </div>
        </div>
      ) : !portfolios || portfolios.length === 0 ? (
        <Card className="glass rounded-2xl border-border/50">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No portfolios found</h3>
            <p className="text-muted-foreground">Try removing some filters or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio, index) => (
            <motion.div
              key={portfolio.shareId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col glass rounded-2xl border-border/50 hover-elevate">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <UserRound className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg line-clamp-1">{portfolio.user.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {portfolio.user.college || portfolio.user.degree || "Student"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {portfolio.projectCount} completed projects
                    {selectedSkills.length > 0 && (
                      <span className="ml-2">· {portfolio.matchCount} skill matches</span>
                    )}
                  </div>
                  {portfolio.topTechnologies.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top Technologies</div>
                      <div className="flex flex-wrap gap-2">
                        {portfolio.topTechnologies.map((tech) => (
                          <Badge key={tech.name} variant="outline" className="bg-background/50">
                            {tech.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {portfolio.skills.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {portfolio.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                            {skill}
                          </Badge>
                        ))}
                        {portfolio.skills.length > 6 && (
                          <Badge variant="outline">+{portfolio.skills.length - 6}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardContent className="pt-0">
                  <Link href={`/portfolio-share/${portfolio.shareId}`}>
                    <Button className="w-full" variant="secondary">
                      <Sparkles className="w-4 h-4 mr-2" />
                      View Portfolio
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
