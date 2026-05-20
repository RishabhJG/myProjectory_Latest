import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject, useCreateProject, useUpdateProject, getGetProjectQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus, X, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DurationRoller } from "@/components/ui/duration-roller";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PREDEFINED_CATEGORIES = [
  "Web App",
  "Mobile App",
  "Desktop App",
  "ML Model",
  "Data Analysis",
  "API",
  "Library",
  "CLI Tool",
  "Game",
  "Open Source",
  "Blockchain",
  "IoT",
].sort();

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  description: z.string().optional(),
  problemSolved: z.string().optional(),
  technologies: z.array(z.string()).min(1, "Add at least one technology."),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  completionStatus: z.enum(["planning", "in_progress", "completed"]),
  githubLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  liveLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  screenshotUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to calculate duration in months
const calculateDuration = (startDate: string | undefined, endDate: string | undefined): string => {
  if (!startDate || !endDate) return "";
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return "";
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months === 0) return "< 1 month";
    if (months === 1) return "1 month";
    return `${months} months`;
  } catch {
    return "";
  }
};

// Predefined list of popular technologies
const POPULAR_TECHNOLOGIES = [
  // Languages
  "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
  // Frontend
  "React", "Vue.js", "Angular", "Svelte", "Next.js", "Nuxt.js", "HTML5", "CSS3", "Tailwind CSS", "Bootstrap",
  // Backend
  "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET", "Laravel", "Ruby on Rails",
  // Databases
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "Firebase", "DynamoDB", "SQLite", "Cassandra",
  // DevOps & Tools
  "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Git", "GitHub", "GitLab", "CI/CD", "Jenkins",
  // Mobile
  "React Native", "Flutter", "Ionic", "Xamarin", "SwiftUI",
  // Other Tools
  "GraphQL", "REST API", "Microservices", "Serverless", "WebSockets", "TensorFlow", "PyTorch", "Machine Learning",
].sort();

export default function PortfolioDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !params.id || params.id === "new";
  const projectId = isNew ? 0 : parseInt(params.id!);

  const { data: project, isLoading: loadingProject } = useGetProject(projectId, {
    query: { enabled: !isNew && !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const [techInput, setTechInput] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      problemSolved: "",
      technologies: [],
      difficultyLevel: "intermediate",
      completionStatus: "in_progress",
      githubLink: "",
      liveLink: "",
      screenshotUrl: "",
      startDate: "",
      endDate: "",
      duration: "",
      role: "",
      category: "",
    },
  });

  useEffect(() => {
    if (project && !isNew) {
      form.reset({
        title: project.title,
        description: project.description || "",
        problemSolved: project.problemSolved || "",
        technologies: project.technologies || [],
        difficultyLevel: project.difficultyLevel,
        completionStatus: project.completionStatus,
        githubLink: project.githubLink || "",
        liveLink: project.liveLink || "",
        screenshotUrl: project.screenshotUrl || "",
        startDate: project.startDate ? project.startDate.substring(0, 7) : "",
        endDate: project.endDate ? project.endDate.substring(0, 7) : "",
        duration: project.duration || "",
        role: project.role || "",
        category: project.category || "",
      });
    }
  }, [project, isNew, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isNew) {
        await createMutation.mutateAsync({ data: values });
        toast({ title: "Success", description: "Project created successfully." });
      } else {
        await updateMutation.mutateAsync({ id: projectId, data: values });
        toast({ title: "Success", description: "Project updated successfully." });
      }
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      if (!isNew) {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
      setLocation("/portfolio");
    } catch (error) {
      console.error("Project save error:", error);
      toast({ title: "Error", description: "Failed to save project.", variant: "destructive" });
    }
  };

  const addTech = (tech?: string) => {
    const techToAdd = (tech || techInput).trim();
    const current = form.getValues("technologies");
    
    if (!techToAdd) return;

    // Find the canonical form from POPULAR_TECHNOLOGIES (case-insensitive match)
    const canonicalTech = POPULAR_TECHNOLOGIES.find(
      t => t.toLowerCase() === techToAdd.toLowerCase()
    ) || techToAdd; // Use the provided name if not in popular list

    // Check if already exists (case-insensitive comparison)
    const alreadyExists = current.some(t => t.toLowerCase() === canonicalTech.toLowerCase());
    
    if (!alreadyExists) {
      form.setValue("technologies", [...current, canonicalTech], { shouldValidate: true });
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    const current = form.getValues("technologies");
    form.setValue("technologies", current.filter(t => t.toLowerCase() !== tech.toLowerCase()), { shouldValidate: true });
  };

  if (loadingProject && !isNew) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/portfolio" className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "New Project" : "Edit Project"}</h1>
          <p className="text-muted-foreground">Detail your work to improve your portfolio score.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MyProjectory" {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What is this project about?" className="resize-none h-24 glass" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="problemSolved"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Problem Solved</FormLabel>
                        <FormDescription>Employers look for problem solvers. What specific issue did this fix?</FormDescription>
                        <FormControl>
                          <Textarea placeholder="e.g. Reduced data processing time by 40%..." className="resize-none h-24 glass" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Technical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">Technologies Used</label>
                    <div className="flex gap-2">
                      <Input 
                        value={techInput} 
                        onChange={e => setTechInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                        placeholder="Search or type a technology..."
                        className="glass"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="secondary" className="gap-1">
                            <ChevronDown className="w-4 h-4" />
                            Select
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
                          <DropdownMenuLabel>Popular Technologies</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {POPULAR_TECHNOLOGIES
                            .filter(tech => 
                              !form.watch("technologies").includes(tech) &&
                              (techInput === "" || tech.toLowerCase().includes(techInput.toLowerCase()))
                            )
                            .map(tech => (
                              <DropdownMenuItem
                                key={tech}
                                onClick={() => addTech(tech)}
                              >
                                {tech}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setShowOtherInput(!showOtherInput)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add other
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button type="button" onClick={() => addTech()} variant="secondary">Add</Button>
                    </div>
                    {showOtherInput && (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Enter custom technology..."
                          className="glass"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                          value={techInput}
                          onChange={e => setTechInput(e.target.value)}
                          autoFocus
                        />
                        <Button 
                          type="button" 
                          onClick={() => {
                            addTech();
                            setShowOtherInput(false);
                          }} 
                          variant="secondary"
                        >
                          Add Custom
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.watch("technologies").map(tech => (
                        <Badge key={tech} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1">
                          {tech}
                          <button type="button" onClick={() => removeTech(tech)} className="hover:bg-muted rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {form.formState.errors.technologies && (
                      <p className="text-sm font-medium text-destructive">{form.formState.errors.technologies.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficultyLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="glass">
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="completionStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="glass">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planning">Planning</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Links & Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="githubLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/..." {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="liveLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Live Demo</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="screenshotUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screenshot URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Timeline & Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="month" 
                              {...field} 
                              className="glass" 
                              onChange={(e) => {
                                field.onChange(e);
                                const endDate = form.getValues("endDate");
                                if (endDate) {
                                  const duration = calculateDuration(e.target.value, endDate);
                                  form.setValue("duration", duration);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="month" 
                              {...field} 
                              className="glass"
                              onChange={(e) => {
                                field.onChange(e);
                                const startDate = form.getValues("startDate");
                                if (startDate) {
                                  const duration = calculateDuration(startDate, e.target.value);
                                  form.setValue("duration", duration);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormDescription>Automatically calculated from dates or set manually</FormDescription>
                        <FormControl>
                          <div className="flex justify-center">
                            <DurationRoller
                              value={parseInt(field.value || "0") || 0}
                              onChange={(value) => field.onChange(value.toString())}
                              min={0}
                              max={120}
                              step={1}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Full Stack Developer" {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="glass">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PREDEFINED_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 rounded-xl" disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isNew ? "Create Project" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" className="flex-1 rounded-xl glass" onClick={() => setLocation("/portfolio")} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
