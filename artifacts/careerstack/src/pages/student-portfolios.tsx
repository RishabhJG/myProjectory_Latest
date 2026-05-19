import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Sparkles } from "lucide-react";
import { usePublicPortfolios } from "@/hooks/use-portfolio-api";

const projectCountFilters = [
  { value: "any", label: "Any" },
  { value: "1-3", label: "1-3 projects" },
  { value: "4-6", label: "4-6 projects" },
  { value: "7+", label: "7+ projects" },
];

function matchesProjectCount(count: number, filter: string) {
  if (filter === "1-3") return count >= 1 && count <= 3;
  if (filter === "4-6") return count >= 4 && count <= 6;
  if (filter === "7+") return count >= 7;
  return true;
}

export default function StudentPortfolios() {
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");
  const [projectCountFilter, setProjectCountFilter] = useState("any");
  const [allTechs, setAllTechs] = useState<string[]>([]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedTechs.length > 0) {
      params.set("tech", selectedTechs.join(","));
    } else {
      params.set("sort", sort);
    }
    return params.toString();
  }, [selectedTechs, sort]);

  const { data, isLoading } = usePublicPortfolios(query);

  useEffect(() => {
    if (!data || selectedTechs.length > 0) return;
    const uniqueTechs = new Set<string>();
    data.forEach((portfolio) => {
      portfolio.techScores.forEach((score) => uniqueTechs.add(score.technology));
    });
    setAllTechs(Array.from(uniqueTechs).sort());
  }, [data, selectedTechs.length]);

  const filteredPortfolios = useMemo(() => {
    if (!data) return [];
    return data.filter((portfolio) => matchesProjectCount(portfolio.projectsCount, projectCountFilter));
  }, [data, projectCountFilter]);

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
  };

  const clearFilters = () => {
    setSelectedTechs([]);
    setSort("newest");
    setProjectCountFilter("any");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Portfolios</h1>
          <p className="text-muted-foreground mt-1">Discover standout student work and skill growth.</p>
        </div>
      </div>

      <Card className="glass rounded-2xl border-border/50">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Filter & Sort</CardTitle>
              <p className="text-sm text-muted-foreground">Find portfolios by tech, score, and project depth.</p>
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters}>Clear All Filters</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                Tech Stack {selectedTechs.length > 0 ? `(${selectedTechs.length})` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72" align="start">
              <Command>
                <CommandInput placeholder="Search tech..." />
                <CommandList>
                  <CommandEmpty>No tech stacks found.</CommandEmpty>
                  <CommandGroup>
                    {allTechs.map((tech) => (
                      <CommandItem key={tech} onSelect={() => toggleTech(tech)}>
                        <Checkbox checked={selectedTechs.includes(tech)} className="mr-2" />
                        {tech}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={sort} onValueChange={setSort} disabled={selectedTechs.length > 0}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="most_projects">Most Projects</SelectItem>
              <SelectItem value="top_rated">Top Rated</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            {projectCountFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={projectCountFilter === filter.value ? "default" : "outline"}
                onClick={() => setProjectCountFilter(filter.value)}
                className="h-9"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Loading portfolios...</div>
      ) : filteredPortfolios.length === 0 ? (
        <Card className="glass rounded-2xl border-border/50">
          <CardContent className="py-16 text-center text-muted-foreground">
            No portfolios match your filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios.map((portfolio) => (
            <Card key={portfolio.id} className="glass rounded-2xl border-border/50 flex flex-col">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={portfolio.avatarUrl || portfolio.student.avatarUrl || ""} alt={portfolio.student.name} />
                    <AvatarFallback>{portfolio.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{portfolio.student.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{portfolio.projectsCount} projects</p>
                  </div>
                </div>
                {selectedTechs.length > 0 && portfolio.combinedTechScore !== null && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="w-4 h-4" />
                    Score: {portfolio.combinedTechScore} for {selectedTechs.join(" + ")}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {portfolio.topTechs.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
                  ))}
                </div>
                {selectedTechs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTechs.map((tech) => {
                      const score = portfolio.techScores.find((entry) => entry.technology.toLowerCase() === tech.toLowerCase());
                      if (!score) return null;
                      return (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech} score: {score.comfortScore}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-6">
                <Button asChild className="w-full">
                  <Link href={`/portfolio/${portfolio.slug}`}>View Portfolio</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
